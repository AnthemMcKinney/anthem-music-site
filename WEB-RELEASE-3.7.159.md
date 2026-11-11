# Web release 3.7.159

Web-only follow-up to 3.7.158. Includes the pending G7 correction and Scales backing update. No Android sources, APK/AAB, or Google Play changes. The separate chord-card layout project is not included.

## Changes

- Correct G7's 320001 finger labels to 3, 2, open, open, open, 1. Pitches and the shape itself do not change.
- Enable Scales bass and piano by default. Bass uses the existing syncopated root/fifth preset at 72%; piano uses the existing **Eighths + thirds** preset at 28%, replacing the Wide eighths review choice. Drums stay at 62%, optional low strings at 22%, and the visible backing volume defaults to 80%. Backing and Demo share these controls.
- Eighths + thirds adds a second accented note on beats 1 and 3, making its identity clearer in a busy accompaniment. Actual-sample comparison at equal piano gain measured about 1.3 dB more 700–4,000 Hz energy than Wide eighths. This supports the arrangement choice; it is not a physical-speaker listening test.
- Add the previously missing upper minor-third piano preload, needed for complete minor-chord patterns.
- Apply a 0.65 final output trim to Scales only. Previously separate instrument and drum buses could sum above full scale; the trim preserves their relative balance. First Chords keeps unity output, existing compressors, and its existing playback levels.
- Advance visible version, service-worker cache, entry points, and affected module identities to 3.7.159 / web-playback-159.

## Verification

- 131 Node tests pass; JavaScript syntax and whitespace checks pass; Astro builds 33 pages.
- Actual WebKit offline renders use the application's own samples, mix function, output setting, scheduling, and processing graph. Eleven scenarios cover default Backing/Demo, 50/75/160 BPM, 100% backing volume, dense guitar, optional strings, four-chord changes, and eighth-note melody. No samples reach full scale. Default peaks are 0.812–0.819; maximum tested peak is 0.913 (about 0.79 dB of sample-peak headroom). These are sampled test cases, not a guarantee for every possible signal combination.
- Reusable render check: `tests/browser-scales-mix-render.mjs`, with `BASE_URL`, `PLAYWRIGHT_MODULE`, and optional `ARTIFACT_DIR`.
- G7 phone/desktop and first-play browser checks pass. Broader audio, tempo, and control regression results are recorded in the release PR.
- Corrected the articulation test to instrument the module actually loaded by the app, instead of an obsolete hard-coded version URL.
- Physical devices, their speakers, mute switches, Bluetooth routes, and microphone behavior remain untested.
