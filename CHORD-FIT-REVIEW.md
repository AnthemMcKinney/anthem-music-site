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
