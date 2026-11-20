# Web3.7.168: restore Chords document scrolling

Based on current main7c233aff. Only functional change is two scoped CSS rules: override the older collapsed-Chords root overflow lock and remove incidental content/grid overflow scrollers. Preserve card UI, chord data, gesture logic, audio and web Scales. Entry/cache/display identifiers advance3.7.167 to3.7.168.

Live reproduction at390x664: HTML overflow hidden, document1028px, scroll remained0. Fixed root overflow auto; scroll reaches364. Chromium trusted touch at320/390 scrolls225/364 without changing module. Chromium and iPhone-sized Windows WebKit at320x568,390x664,820x1180: eight existing objective/practice cards reached, expanded, collapsed, reopened with real visible bodies; no horizontal overflow or page errors. WebKit scrolling verified via page keyboard input and tap interactions, not physical iPhone/native touch drag. Existing module gesture regression run separately.

Production build passes.153 unit tests pass; one existing social-card test fails on Windows because URL.pathname produces /C:/... for Sharp. Equivalent actual asset check with valid Windows path passes1200x630 PNG. Earlier VM-based failures were CRLF checkout assumptions; tests run with LF JavaScript. No unrelated test or source changes shipped.

Repository has PWA manifest and no native iOS target. Push covers website and its installed PWA after update/reload; a separately bundled iPhone app remains unverified and is not submitted here. Android preview is separate and keeps Scales excluded.
