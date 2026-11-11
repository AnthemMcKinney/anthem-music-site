# Web release 3.7.161

Small follow-up to approved chord-card layout release 3.7.160. Desktop Chromium reserves a 15px body scrollbar at a 320px window, leaving a 223px diagram and scaling the 15px SVG labels to 11.53px. This was reproduced on the live site during the separate Android port.

- Raise only string names, finger numbers and barre numbers from 15px to 16px in cards at most 280px wide. This keeps that case above 12px without changing layout, chord content or audio.
- Add the narrow desktop body-gutter case to the responsive browser regression test. Retain the existing phone, tablet, desktop, resize and rotation checks.
- Advance the visible version and affected module/cache identities to 3.7.161 / web-layout-161.

The Android port uses the same three-declaration correction independently. No new feature or Google Play submission is included here.
