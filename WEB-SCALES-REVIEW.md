# Web Scales review

This is an isolated web-only review branch based on main b0f8d636e94f6061710b474f4837c53f68a0be53. The web-scales-review branch is published through the existing Cloudflare Pages branch-preview workflow. No production deployment, Android build, or Google Play upload was performed.

## Review on any device

Open https://web-scales-review.anthem-music-site.pages.dev/tuner/#scales . This is an HTTPS branch preview, separate from production, and can be reviewed on iPhone.

## Review locally

The built preview is running on AnthemDesktop at http://127.0.0.1:4323/tuner/#scales . This loopback address works only on that computer.

To restart from this worktree:

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4323
```

Open Scales in the bottom navigation. Try First Notes, Box 1, pentatonic/diatonic layers, root selection, Play Notes, the backing mix, and Scale + Backing. Switching to another tool stops audio; returning preserves lesson choices but does not restart playback. Card collapse preserves playback by design.

## Changes

- Fifth navigation tool and matching rounded-line Scales icon, also saved as public/tuner/images/scales-icon.svg.
- Existing Scales content mounted as a scoped module with shared app palette and lesson controls.
- Current and pending Scales playback stop on tool exit, page hiding, and pagehide. Tuner reference notes also stop when leaving the tuner.
- Fixed an asynchronous scale-tone race that could otherwise start a note after Stop.
- Shared control tokens retain green actions and readable dark-theme contrast.
- Updated PWA cache, all backing samples, and safe static-asset fallback for versioned module URLs and Vary: Origin.
- Visible playback error messages and retryable lesson-load failure.
- Hosted audio range responses are returned without trying to cache partial recordings, preserving the full offline samples.

## Verification

- PASS: all 55 Node tests, including pending playback cancellation, root scoping, navigation/hash state, cache coverage, and offline header fallback.
- PASS: npm run build (33 static pages).
- PASS: syntax checks and git diff --check.
- VISUALLY CHECKED: desktop at 1920 pixels and phone emulation at 390 pixels; First Notes, Box 1 diatonic, tablature, backing card, classic/dark themes, and the existing Chords screen.
- BROWSER CHECKED: direct Scales link, tool switching, browser Back restoring Scales with playback stopped, collapse, Play Notes, backing and scale demo, all backing instruments enabled, and offline reload with demo playback from cached samples.
- Not tested on physical iPhone/Android hardware, actual microphone input, or Google Play. Phone emulation does not replace a real-device audio/silent-mode check.

## Android boundary

The original checkout remains on main. No native Android project or packaged assets were touched. Do not copy this review branch into the Android build; continue that release from its separate no-Scales baseline. Review and approval are still needed before any production publication.

## iPhone review correction

Dan reported multiple tools appearing as one continuous page. His screenshot shows Tuner and Metronome together, with styling present. That matches the former pre-initialization state. The exact iPhone exception was not observable from the screenshot.

- HTML now starts in a single Tuner view, with Metronome initially hidden. Navigation explicitly sets hidden state on every module.
- Scales imports are lazy and isolated. A failed optional module cannot block core app startup; it has a retry state.
- A failed core startup shows a reload message instead of silently exposing the static page.
- Scales content is only exposed after its stylesheet has loaded. The original Scales Lab card/heading/fretboard design remains intact.
- Browser fault injection returned 503 for scales-view.js: the retry state appeared, and Metronome still opened as a separate tool.
- Physical iPhone Safari re-test is still needed; phone emulation is not an actual WebKit/device test.


## First-use iPhone audio correction

Dan reported silent chords on a fresh page, followed by working chords after playing a tuner string. Code comparison confirmed that tuner strings use native HTML media playback, while Chords/Scales and Metronome previously resumed only Web Audio. They considered an already-running AudioContext successful even though it does not establish iOS playback routing. This is consistent with the observed dependency; Dan's actual ringer/silent-switch state was not observed.

- Every musical Play/Start now establishes a shared playback session synchronously, before resume or sample loading, including already-running contexts.
- Feature-detected Audio Session API selects `playback`. Older/unsupported iOS uses an unmuted, zero-signal PCM WAV through native media, with no audible tuner note. The native loop exists only while a player owns it.
- Stop, navigation, page hiding, sample failure, and completed single chords release that ownership. A late failed/cancelled attempt cannot release a newer one.
- Tuner microphone startup releases playback owners and restores the automatic audio session before capture.
- Metronome Start no longer requires Sound Check. The existing Sound Check control is an optional audible preview, and Chords retains its optional reconnect button.
- Offline precache includes the shared module and generated zero-signal WAV; cache identity and module versions were advanced.

Validation: 55 Node tests pass, build creates 33 pages, and syntax/diff checks pass. `tests/browser-audio-start.mjs` runs actual Linux WebKit 27.2 with an iPhone 13 profile in fresh contexts. It verifies first-action Chords, Metronome, Scales notes and scale/backing demo produce non-zero rendered audio; no tuner note is played to initialize them. It checks Stop, restart, navigation, single-chord cleanup, and delayed sample cancellation. It also exercises the modern API branch with an injected Audio Session API because Linux WebKit does not expose the iOS API. Screenshots at phone and desktop widths retain the existing layout.

Run the browser check with Playwright/WebKit installed, a local server for `public/`, and `BASE_URL=http://127.0.0.1:4330 node tests/browser-audio-start.mjs`. `PLAYWRIGHT_MODULE` can point to an existing Playwright `index.mjs`; `ARTIFACT_DIR` chooses the screenshot folder.

Remaining limit: Linux WebKit rendering is not an iPhone speaker, ringer-switch, Bluetooth, or installed-PWA test. A physical iPhone check is still needed before production approval. This change is only on the web review branch; production and Android are untouched.
