# First Chords UI System

This file is the formatting reference for every First Chords objective, Practice, and Strumming screen. New content should use these layers instead of adding one-off card or breakpoint styles.

## Page hierarchy

1. **White tab canvas:** The content area remains white and visually connects to the navy First Chords header with the orange outline.
2. **Tab eyebrow:** Small uppercase orange text names the category, such as `STRUMMING` or `PRACTICE`.
3. **Tab title:** Large navy text names the specific page, such as `Strumming patterns` or `Practice patterns`.
4. **Information disclosure:** The notes row follows the title and uses the shared circular plus/minus control.
5. **Section cards:** Each major concept uses one beige card with an orange top border. Examples are Core Strumming Patterns, 3/4 Strumming Patterns, Sixteenth-Note Patterns, Common Progression Patterns, Custom Patterns, and Requested Patterns.

## Section card hierarchy

Each section card contains:

1. A small uppercase orange section label.
2. A large navy section title.
3. Optional concise supporting text.
4. A section-level plus/minus control when the section can collapse.
5. Numbered expandable rows separated by the standard light beige divider.

## Numbered exercise rows

- Reset numbering inside each major section.
- Use a filled orange number circle at the left.
- Use small uppercase orange text for the exercise group or type.
- Use larger navy text for the exercise-specific name or rhythm.
- Make the entire row clickable.
- Place the plus/minus indicator at the right.
- Use a single horizontal divider between rows. Do not wrap each closed row in its own outlined card.

## Responsive and theme rules

- Preserve this hierarchy on phone, tablet, and desktop in portrait and landscape orientations.
- Allow type and spacing to scale, but do not change component order or visual meaning at a breakpoint.
- Use theme variables for surface, border, accent, ink, and muted colors. Do not hard-code a theme-specific replacement for these components.
- A section card may become narrower or taller, but its number, label, title, and disclosure control must never overlap or clip.

## Content decisions

- Core 4/4 strumming, 3/4 strumming, and sixteenth-note strumming are separate section cards because they teach different counting systems. Numbering restarts in each card.
- Practice uses separate section cards for Common Progression Patterns, Custom Patterns, and Requested Patterns.
- Objective chord cards retain the same page-level title and notes hierarchy, while their chord diagrams remain the primary card content.

