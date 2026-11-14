# Web 3.7.165

Fresh production candidate based on approved combined review `6d302b542a44a030cbf072131e9449274baa9c75` and production main `342a5c812ff519b0b9add4be81392f255eff2c7f`.

Includes tablet tuner readability, persistent play prompt and three-green-reading confirmation held through silence, compact lesson-style Tuner Notes and definitions, and visible tablet Metronome Options. Final polish reduces chord-card Play and alternate-shape faces to 36px while keeping their 44px touch targets, fixed columns, centered icons and existing state colors. Exercise transports and other control layouts are unchanged.

Display version: 3.7.165. Service-worker cache: anthem-music-3.7.165. Changed entry points/styles use web-165-final cache suffixes. This candidate supersedes the earlier unpublished release branch; it does not reuse that stale commit.

Validation: production build and 151 unit tests; Chrome/WebKit responsive control-face and tuner/Notes/metronome checks; existing chord centering and control-style checks. Windows WebKit lacks AudioContext; audio coverage uses Chrome. No physical microphone or device listening assessment. Android and Google Play are unchanged.
