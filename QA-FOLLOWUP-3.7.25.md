# Anthem Music beta 3.7.25 — response to independent QA

This pass combines Claude's 3.7.24 findings with the owner's additional lesson and metronome feedback. It is a stabilization pass for the website/PWA. It does not rebuild the Android APK or certify real-device audio.

## Addressed

- **H1 navigation:** module changes now follow URL hash history. Android/browser Back and Forward restore the visible module and stop playback in the module left behind.
- **M3 metronome tempo:** changing BPM no longer restarts the measure at beat 1. The pulse-stage position now derives from the audio clock's most recent beat instead of applying the new BPM to elapsed time since Start.
- **M4 background work:** the metronome canvas animation pauses outside the metronome view and when the page is hidden; it resumes on entry.
- **M1/L5/L4 theme polish:** the Music wordmark and inactive beat dots use theme tokens. The browser/PWA theme-color meta updates when the user changes theme. The upcoming beat-one line in the pulse stage is heavier and accent-colored, so the return to beat 1 is visible in advance.
- **M2 title:** the standard-uke C–Em–F–C request is labeled by its chords rather than by the title of a song whose actual arrangement may differ.
- **L1/L2/L3/L6 polish:** superseded arrow animation CSS was removed; active rest dots change weight/glow without changing size; all page CSS links carry the new cache revision; iPhone Sound Check readiness is shared between metronome and chords for the current foreground session.
- **Owner's baritone request:** the easier Fm option is now `x111` (mute D, bar G–B–E at fret 1).
- **Owner's split-measure request:** chord names sit in the dark measure header above their numbered downbeats. All requested bars with split chords, and the surrounding bars in those requested phrases, display and play DDDUDU while retaining slow tap backing. Chord changes occur on the numbered beats; up-strums keep the chord of that beat.

## Verification completed

- Production Astro build and JavaScript syntax checks passed.
- Browser smoke checks passed across all five themes and five viewport sizes, with all four modules and requested lessons navigable without horizontal page overflow. Expanded requested lessons could scroll above the fixed bottom navigation.
- Focused browser checks passed for Back/Forward navigation, split-bar labels and the eight-slot DDDUDU display, split-bar overflow, tempo changes without a beat-one reset, and no continuing metronome canvas redraw after navigating away. A simulated iPhone browser check confirmed that Sound Check readiness carries from Metronome to Chords; physical iPhone audio remains unverified.
- On phone portrait, split measures stack vertically so all four chord names remain legible directly above their beat positions. Landscape keeps the wider two-column layout.

## Device checks still required

- Listen on iPhone and Android for exact alignment of the 1–2–3–4 visual, accented beat-one line, clicks/drums, and chord strums—especially immediately after a tempo change. Browser timing checks cannot prove speaker output timing.
- Confirm iPhone Safari/PWA Sound Check primes both modules without a second prompt, including after background/foreground, silent switch, and Bluetooth/headphone changes.
- Recheck three-pluck tuner accuracy with real instrument/microphone input, in quiet and noisy rooms.
- Play the baritone requested phrases against the student's *Remember Me* melody. These are practice phrases based on the owner's chords, not a verified transcription.
- Repeat Android Back, orientation, large text, accessibility, and update checks in a newly built APK. Website updates do not change the existing beta APK.
