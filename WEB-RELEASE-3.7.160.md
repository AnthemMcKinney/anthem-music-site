# Web release 3.7.160

Approved chord-card structural and responsive fixes, based on web 3.7.159. The separate Android port is managed independently; this web release does not submit anything to Google Play.

## Changes

- Use the available card width for chord diagrams without reducing readable labels or 44px touch targets.
- Align title, centered variation chevron, audio control and bold navy 13px spoken chord name. Keep the spoken name in normal case.
- Use standard orange uppercase orientation eyebrows near the nut, with correct high-G ukulele wording.
- Keep string shadows uninterrupted across the nut and center a proportional fret-position dot.
- Align finger/open/muted keys under the nut. All visible cards switch together between one and two rows, with intact finger labels on narrow phones.
- Preserve selected variations across resizing and rotation; place dividers by chord-family position.
- Advance the visible version to Beta 3.7.160 and affected entry/module/cache identities to web-layout-160.

The chord definitions, pitches, fingerings, audio engine, G7 correction and Scales mix remain unchanged from the released web baseline. No new feature is introduced.

## Verification

- 137 Node tests, JavaScript syntax checks, git diff --check, and the 33-page Astro build pass.
- 890 WebKit card checks cover seven phone/tablet/desktop sizes, all guitar objectives and alternate shapes, ukulele/baritone objectives, all-marker legends, keyboard, dark theme, width sweep, resizing and rotation.
- Direct checks at the reported 970px and 1280px widths confirm consistent two-row and one-row legends respectively. Updated screenshots were visually inspected.
- G7 and chord-fit regressions and phone/desktop playback-control checks pass. Hosted review checks at 390,768,970 and1280px confirm layout, typography, shadow continuity, Play/Stop and no page errors, with deployed assets matching the tested checkout.
- Physical devices, their speakers and microphone behavior remain untested.
