# Chord diagram and strum review

Review only. Based on production commit `424c8a4` (web 3.7.157). Do not merge or publish to the main web app until Dan has reviewed the sound. No Android project, packaged assets, or Google Play release is changed.

## Findings and changes

- Reproduced the screenshot on production with WebKit at 390 CSS pixels: the E card is fixed at 190px, but its title, diagram, and padding need 224px. The parent chord grid clips the overflowing bottom string. The existing mobile card now uses automatic height with the same 190px minimum. This reuses the content-sized behavior already used by Objective 1; card styling and SVG artwork are unchanged.
- The displayed Cadd9 is `x32033`. Preview and exercise playback both schedule C3, E3, G3, D4, G4 (MIDI 48, 52, 55, 62, 67). There is one E3, the chord's major third, and no low/open E. The custom progression picker prefers this same taught shape. No pitch or fingering was removed.
- Checked the actual D3, G3, and E4 source recordings by autocorrelation. Their fundamentals are consistent with the sample pitch metadata. The D4/G4 voices use a pitch-shifted E4 recording; its filename does not mean an extra E is played. This rules out a wrong-note scheduling or obvious mislabeled-sample explanation, not subjective muddiness on a phone speaker.
- Guitar preview spacing changes from 12 to 15ms per string, exercise downstrokes from 11 to 14ms, and upstrokes from 9 to 11ms. Cadd9's preview sweep is 60ms rather than 48ms. Beat onsets/BPM, voicings, gentle envelopes, and ukulele/baritone timing stay unchanged.
- Separate review cache/module identifiers and a `Chord review` version label make this build identifiable without advancing production.

## Verification

- 69 Node tests pass, including three new Cadd9 tests using the actual diagram definition and checking preview/downstroke/upstroke note identity and count.
- Astro build generates all 33 pages; JavaScript syntax checks and `git diff --check` pass. The build runs with `ASTRO_TELEMETRY_DISABLED=1` in this restricted environment.
- WebKit 27.2 geometry checks pass at 320, 390, 740, 768, 960, 1024, and 1280px across all four guitar objectives, primary chord tabs, repeated E/E7 alternation, and navigation away/back. 162 visible-card checks have no clipped diagrams or horizontal page overflow. Phone and desktop screenshots were visually inspected.
- Existing WebKit first-play checks pass for native playback routing and the injected Audio Session API, chord completion, metronome/Scales Stop/restart/navigation, and cancellation during sample loading.
- Physical iPhone/Android speakers, mute switches, Bluetooth, and installed PWA behavior have not been tested. Dan's listening review remains necessary before publication.

## Repeat locally

Serve `public/` on port 4331. Run `node --test tests/*.test.mjs` and `ASTRO_TELEMETRY_DISABLED=1 npm run build`. With Playwright/WebKit available, run `tests/browser-chord-fit.mjs`, `tests/browser-audio-start.mjs`, and `tests/browser-audio-articulation.mjs` with `BASE_URL=http://127.0.0.1:4331` and `PLAYWRIGHT_MODULE` if it is installed outside this repository.

## Review 2: faster chord starts and clearer playback controls

Dan approved the appearance and reported occasional chord delays, requested 4-bar Am–F Scales backing defaults, and asked for a universal stop icon. This remains a review branch, not a production release.

- Visible First Chords lessons and chord popups now prepare their recordings before Play. Before the first gesture this only fetches bytes, without creating an AudioContext, claiming the speaker route, or making sound. Later selections can decode into the already-created context. Fetch/decode promises are shared, and failed requests or decodes are evicted so a subsequent tap can retry.
- A controlled WebKit test with 600ms added to sample requests measured approximately 709ms from tap to scheduled first sound cold versus 106ms with recordings prepared. The prepared tap made no network requests. This demonstrates removal of a cold-download wait, not a measurement of Dan's device or proof that every intermittent delay is eliminated.
- First Chords speakers, Follow Along/progression controls, Scales note/backing/demo controls, and Metronome now show a stop square and accessible Stop label during startup/playback. Single-chord buttons remain active for the actual playback duration instead of reverting after 420ms; tapping again stops rather than restarts. Stop cancels pending sample starts and metronome voices that were already scheduled. Error and completion paths restore idle state.
- Scales starts with Am–F and four bars (Am · Am · F · F). Changing the progression or bar count remains respected through lesson changes and navigation.
- The optional short Sound Check remains a readiness check, and tuner string-selection controls retain their existing behavior. Review assets use `chord-review-2`, a separate cache, and the `Chord review 2` label.

Additional checks: 88 Node tests pass. Phone and desktop WebKit checks cover all active icons, natural completion, repeated taps, settings changes while playing, user-choice preservation, and cancellation during delayed loading. Browser artifacts were visually inspected. New reusable scripts are `tests/browser-chord-preload.mjs`, `tests/browser-playback-controls.mjs`, and `tests/browser-scales-controls.mjs`. Physical device/audio-route verification remains outstanding.


## Review 3: playback caption and state audit

Dan requested an audit after spotting a Stop square with a separate Play caption above it. This update remains preview-only.

- First Chords now renders the surrounding Play/Stop caption, icon, button text, tooltip, accessible label, pressed state, and selected starting measure together. This covers the unified exercise toolbar, custom progression builder, and other course layouts. Chord speakers start with matching tooltips and pressed states.
- Scales labels and all four transports were audited. Backing now says Starting while audio is loading, including tempo changes, and Playing only after startup. The initial hidden progression summary matches the Am–F four-bar default. Existing user selections remain respected.
- Metronome status distinguishes Starting, Playing, and Ready. Its tooltip follows Start/Stop, and the optional Sound Check no longer instructs Tap Start while playback is running.
- Tuner references now distinguish loading, playing, failure/retry, and completion. Leaving the tool or hiding the app clears stale playback guidance. String selection is deliberately still a one-shot/replay action, not a transport toggle.
- Review assets/cache use `chord-review-3` and the More screen displays `Chord review 3`. No styling changes, Android changes, or production publication.

Validation includes 103 passing Node tests, a 33-page Astro build, and WebKit phone/desktop checks of rendered captions, accessibility, tooltips and CSS-generated text. The exercise audit checks all 219 exercise/custom controls across five course variants, selected-measure labels, and pending cancellation/failure. Lifecycle checks cover repeated taps, natural chord/reference completion, errors/retry, settings changes, background/navigation and stale asynchronous results. Real audio-start and articulation regressions run separately from injected UI failure fixtures. Physical phones, speakers, mute switches, Bluetooth and installed PWA behavior remain untested.
