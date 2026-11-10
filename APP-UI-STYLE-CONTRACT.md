# Anthem App UI Style Contract

This is the app-wide visual contract for the tuner and lesson modules. It extends the detailed First Chords guidance in `FIRST-CHORDS-UI-SYSTEM.md`. Existing app patterns are the default; new modules must fit them.

## Page and card hierarchy

- Keep the app canvas beige, the main module shell white, and the shell’s thin orange outline consistent with existing modules.
- Use cream/beige for content cards, with a light beige border, a narrow orange top rule, and the established rounded corners. Use white for the lesson content inside a card when it needs its own reading surface, such as tablature.
- A card header uses a small orange uppercase kicker, a navy title, and optional muted blue-gray supporting text. Keep title and controls from colliding or changing order at breakpoints.
- Keep info callouts visually distinct from the main card content. Leave clear vertical space between a callout and the next major reading surface.

## Disclosures

- Objective Notes is one expandable notes section per objective. Use the existing gray notes bar and filled orange plus/minus circle at the left. Put new terms, definitions, and instructional context in its expanded white body. Do not create duplicate notes disclosures for every card within the objective.
- A collapsible section card uses the standard small orange outlined circle with a plus or minus at the far right of its header. Do not substitute a text pill, caret, filled yellow/orange badge, or a control beside the title.
- Keep disclosure state and accessible labels synchronized. Collapsing a content panel does not stop its audio unless that behavior is explicitly requested.

## Existing controls and color roles

- Reuse the shared tempo, Play, and Stop controls already used by chord exercises. Do not recreate them inside a new module.
- Keep playback actions green at rest and red only for Stop/active stopping states, consistent with First Chords. Keep the app’s orange accent for headings, borders, and disclosure controls; reserve yellow for the established “now playing” cue.
- Use existing CSS variables and component classes wherever possible. If a style must be shared across modules, extract it once rather than copy/paste a new variation.

## Preflight and visual review

Before changing UI, identify the closest existing example and state which classes/components will be reused. After the change, compare a phone and desktop view against that example. Check card surface, border, title hierarchy, disclosure position/icon, spacing, and responsive behavior. Do not call the work complete based on a build alone.
