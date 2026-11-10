# UI implementation rules

Before editing any user-facing tuner or lesson UI, read `APP-UI-STYLE-CONTRACT.md` and the relevant module guide. For First Chords, that guide is `FIRST-CHORDS-UI-SYSTEM.md`.

Use the closest existing component and its behavior before adding markup or CSS. Do not create a new card, disclosure, button, icon, spacing rule, or responsive treatment when an established pattern already exists. If a genuinely new pattern is needed, derive it from the existing system, document it in the contract, and tell Dan what changed.

Before calling a UI change finished, inspect it at phone and desktop widths and compare it with the established app examples. A successful build alone does not verify visual consistency. If browser verification is unavailable, say so plainly.
