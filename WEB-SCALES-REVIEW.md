# Web Scales review

This is an isolated web-only review branch based on main b0f8d636e94f6061710b474f4837c53f68a0be53. No production deployment, remote push, Android build, or Google Play upload was performed.

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

## Verification

- PASS: all 25 Node tests, including pending playback cancellation, root scoping, navigation/hash state, cache coverage, and offline header fallback.
- PASS: npm run build (33 static pages).
- PASS: syntax checks and git diff --check.
- VISUALLY CHECKED: desktop at 1920 pixels and phone emulation at 390 pixels; First Notes, Box 1 diatonic, tablature, backing card, classic/dark themes, and the existing Chords screen.
- BROWSER CHECKED: direct Scales link, tool switching, browser Back restoring Scales with playback stopped, collapse, Play Notes, backing and scale demo, all backing instruments enabled, and offline reload with demo playback from cached samples.
- Not tested on physical iPhone/Android hardware, actual microphone input, or Google Play. Phone emulation does not replace a real-device audio/silent-mode check.

## Android boundary

The original checkout remains on main. No native Android project or packaged assets were touched. Do not copy this review branch into the Android build; continue that release from its separate no-Scales baseline. Review and approval are still needed before any production publication.
