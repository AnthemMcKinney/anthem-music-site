# Anthem App UI Style Contract

This is the app-wide visual contract for the tuner and lesson modules. It extends the detailed First Chords guidance in `FIRST-CHORDS-UI-SYSTEM.md`. Existing app patterns are the default; new modules must fit them.

## Page and card hierarchy

- Keep the app canvas beige, the main module shell white, and the shell’s thin orange outline consistent with existing modules.
- Use cream/beige for content cards, with a light beige border, a 4px orange top rule, and 10px rounded corners. Use white for the lesson content inside a card when it needs its own reading surface, such as tablature.
- A card header uses a 9px orange uppercase kicker, a 21px navy title, and optional muted blue-gray supporting text. Set supporting text to 12px, regular weight, with a 1.4 line-height. Keep title and controls from colliding or changing order at breakpoints.
- Put related controls in the existing horizontal control row and use its open space before adding another row. Allow wrapping only when the viewport is too narrow for the controls to fit legibly.
- Keep info callouts visually distinct from the main card content. Leave clear vertical space between a callout and the next major reading surface.
- Only the tuner uses a fixed-height desktop instrument surface. Lesson pages and the metronome keep normal document scrolling, with enough space to reach controls above the fixed navigation. Choose the metronome's desktop columns by width, not window height; a short window may reduce the pulse display smoothly but must not rearrange or clip controls.

## Disclosures

- Objective Notes is one expandable notes section per objective. Use the existing gray notes bar and filled orange plus/minus circle at the left. Put new terms, definitions, and instructional context in its expanded white body. Do not create duplicate notes disclosures for every card within the objective.
- A collapsible section card uses the standard small orange outlined circle with a plus or minus at the far right of its header. The full title/header area is the disclosure target, not just the icon. Do not substitute a text pill, caret, filled yellow/orange badge, or a control beside the title.
- Keep disclosure state and accessible labels synchronized. Collapsing a content panel does not stop its audio unless that behavior is explicitly requested.

## Existing controls and color roles

- Reuse the shared tempo, Play, and Stop controls already used by chord exercises. Do not recreate them inside a new module.
- Keep playback actions green at rest and red only for Stop/active stopping states, consistent with First Chords. Keep the app’s orange accent for headings, borders, and disclosure controls; reserve yellow for the established “now playing” cue.
- Active transport controls show a filled stop square and an accessible Stop label, including while audio is loading. A second tap cancels pending playback or stops current playback. Restore the idle icon and label on completion, cancellation, or failure. Synchronize surrounding action captions, tooltips, and hidden labels with the same state. Status copy distinguishes loading from playing and must not instruct the user to press Play/Start when the visible action is Stop.
- Use existing CSS variables and component classes wherever possible. If a style must be shared across modules, extract it once rather than copy/paste a new variation.

## Preflight and visual review

Before changing UI, identify the closest existing example and state which classes/components will be reused. After the change, compare a phone and desktop view against that example. Check card surface, border, title hierarchy, disclosure position/icon, spacing, and responsive behavior. Do not call the work complete based on a build alone.

## Web Scales integration

- Scales reuses the prototype's cream cards, navy header, notes disclosure, right-edge plus/minus buttons, and fretboard/tab layout. The app loads it inside a scoped component so generic lesson selectors cannot change the tuner or First Chords.
- Base tempo and Play icon styles live in public/tuner/lesson-controls.css and are shared by First Chords and Scales. Their green action colors use shared light/dark tokens for readable contrast.
- The five-button web navigation uses the existing 24px rounded-line icon language. The Scales icon shows three ascending notes across horizontal fretboard/string lines.
- Leaving Scales or hiding the page stops current and pending playback. Collapsing a card does not stop its audio.

- App startup must show only one tool before JavaScript finishes. Optional lessons load separately and cannot block navigation. Keep lesson content hidden until its stylesheet is ready; use a contained retry state on load failure.

- Audio starts from the requested Play/Start control. Sound Check is optional and must not require a tuner note or a separate unlock step before playing a lesson. Preserve the existing controls and layout.
- Scales keeps a local tempo control beside Notes, Backing, and Demo playback. The two Notes controls mirror one notes setting; each playback mode remembers its own BPM. Changing an inactive mode does not change the current sound. Only one mode plays at a time; Demo notes and accompaniment share one audio clock. Tempo taps, press-and-hold, and valid typed values update live without restarting playback.
