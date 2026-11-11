# Chord-card layout review

Review branch `chord-layout-eyebrow-review`, rebased onto production `7d7d131` (web 3.7.159). It includes the released G7 correction and Scales mix. This branch is for isolated visual review, not a production merge.

## What changed

- Removed the unused header eyebrow row. All objective cards now share a 29–36px chord name, bold navy 13px supporting text, centered forward chevron, and aligned speaker/Stop control. Chord controls and selectors have 44px targets.
- Removed the diagram's orientation side columns and unused SVG margins. The diagram fills the card's content width. At 1440px, the diagram is 602px wide instead of a 390px SVG box with a much smaller centered drawing. At a 390px phone viewport it uses all 308px of content width.
- Moved introductory orientation next to the nut. It appears only in Objective 1, on the first two-column row or the selected single card. Standard ukulele uses A/high-G labels, avoiding the inaccurate implication that its re-entrant G is its lowest note.
- Reused the finger and open/muted keys in two small theme-colored boxes. They share a left anchor under the nut and switch together between one and two rows at a common section-width threshold, retaining 12px text. Muted retains “do not play” in its accessible label.
- Centered the fret-3 position dot precisely between the fret wires and string edges, with a 14-unit diameter in a 59-unit fret. String shadows run continuously across the nut and fretboard, following Dan’s latest visual direction.
- Fixed divider placement based on chord-family position, instead of hidden alternate cards. Selected variations now stay selected through resizes and rotation. Wide landscape phones reuse the established two-column layout rather than stretching one diagram beyond their useful height.
- Titles split shape descriptions into the subtitle consistently, including the full F barre. The chord definitions, frets, fingers, anchors, voicings, samples and audio engine are unchanged.

## Verification

- All 137 Node tests pass, including six new diagram/title checks. JavaScript syntax and `git diff --check` pass. Astro builds all 33 pages.
- All 890 new WebKit card checks pass. They cover 320×800 and 390×844 phones, 844×390 landscape, 768×1024 and 1024×768 tablets, and 1280×900 and 1440×1000 desktops. They cover every guitar objective, repeated variants, baritone/standard ukulele objectives, diagram/legend fit, readable type, 44px targets, dividers, keyboard activation, dark-theme layout, navigation, resizing and rotation. A continuous 16px-step width sweep checks the intermediate sizes too.
- Existing chord-fit regressions pass across 320, 390, 740, 768, 960, 1024 and 1280px.
- Existing playback-control regressions pass at phone and desktop widths, auditing 219 exercise/custom controls across five courses, plus chord completion/toggle, popup playback, loading cancellation, error recovery, navigation, metronome and BFCache return.
- Actual screenshots were visually inspected at phone, narrow phone, landscape, portrait tablet, landscape tablet and desktop sizes, against the existing app cards and the supplied annotated image.
- This is browser emulation, not physical iOS/Android device testing. The preview uses distinct `chord-layout-review-2` module/cache identifiers and the visible “Chord layout review 2” version label. Production remains web 3.7.159.

## Repeat

Run `node --test tests/*.test.mjs`, `ASTRO_TELEMETRY_DISABLED=1 npm run build`, and `git diff --check`. Serve `public/` on a local port and run `tests/browser-chord-card-layout.mjs`, `tests/browser-chord-fit.mjs`, and `tests/browser-playback-controls.mjs` with `BASE_URL` and `PLAYWRIGHT_MODULE` as needed. `ARTIFACT_DIR` is optional for screenshots.


## Eyebrow refinement

Dan approved the updated cards and requested the standard all-cap orange eyebrow treatment for TOP/HIGH and BOTTOM/LOW. These labels now reuse `chords-kicker` and share the exact 11px objective-heading eyebrow rule: 900 weight, 1.25 line height, 1px tracking and `--theme-accent-deep`. This retains the readable size rather than shrinking them to the smaller section kicker. Browser checks compare the computed typography/color directly with the existing app eyebrow at every tested width.

## Continuous string shadows

Dan requested uninterrupted depth across the nut in his follow-up screenshot. Every string shadow now begins at x=58, exactly like its string, and ends at x=303. The nut is drawn behind the shadows, with no mask or clip. The prior style-contract instruction to cut shadows off at the fretboard is replaced. Unit and browser checks verify continuity for all six- and four-string diagrams, and updated phone/desktop screenshots are inspected before sharing.


## Legend alignment and spoken chord names

Dan identified inconsistent legend offsets and wrapping in two desktop-width screenshots. Independent flex centering made open-only legends start farther right, and their shorter content stayed on one row when the open+muted key wrapped. The keys now share a left anchor under the nut. A named section-container rule switches all cards together between one and two rows, allowing for the widest finger/open/muted combination. Stacked rows align left; very narrow cards reduce the inset enough to retain all four finger labels on one line. Spoken chord-name text is now bold navy at 13px, retaining normal capitalization and a clear hierarchy below the large chord title.

The review uses `chord-layout-review-2` cache/module identities. Automated geometry checks cover all-marker cards and assert consistent row counts, aligned stacked keys, intact finger rows, and readable bold subtitles through intermediate resize widths. The two reported desktop widths are also checked directly: at 970px, all four keys use two left-aligned rows; at 1280px, all four use one row.
