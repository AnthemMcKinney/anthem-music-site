# Web release 3.7.162

Approved metronome and Scales responsive layout updates.

- Metronome columns respond to width instead of browser height; controls remain reachable.
- Normal document scrolling for lesson and metronome pages.
- Scales fretboard and tablature share equal-width, equal-height cards on displays 1440px and wider.
- Backing-track card defaults closed; stacked tablature also defaults closed.
- Wide tablature stays open; smaller layouts retain expandable cards and remember their state.
- Changed asset URLs and service-worker cache version advance together.
- No audio behavior changes. Android receives only applicable structural fixes separately; Scales remains web-only.

Validation: 138 Node tests, Astro build, six-width WebKit layout/disclosure checks, existing metronome and scrolling preview checks.
