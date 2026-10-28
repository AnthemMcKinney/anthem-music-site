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
- Give only the open numbered exercise row a muted navy/beige tint and soft drop shadow. Keep orange on the small category label and number badge; do not turn the item title orange. Keep section-card headers visually unchanged when their cards expand.
- Place every open numbered exercise panel immediately beneath its row across Objectives, Strumming, Practice, Requested Songs, and Custom Patterns. Inset its left edge, align its right edge with the row, and use a slightly darker secondary soft surface to show that it is nested detail.

## Responsive and theme rules

- Preserve this hierarchy on phone, tablet, and desktop in portrait and landscape orientations.
- Allow type and spacing to scale, but do not change component order or visual meaning at a breakpoint.
- Use theme variables for surface, border, accent, ink, and muted colors. Do not hard-code a theme-specific replacement for these components.
- A section card may become narrower or taller, but its number, label, title, and disclosure control must never overlap or clip.

## Content decisions

- Core 4/4 strumming, 3/4 strumming, and sixteenth-note strumming are separate section cards because they teach different counting systems. Numbering restarts in each card.
- Practice uses separate section cards for Common Progression Patterns, Custom Patterns, and Requested Patterns.
- Objective practice uses separate section cards for Chord Pairs, 4-Chord Progressions, and First Songs. Do not place these distinct activities beneath divider headings inside one card.
- Supporting note disclosures use one orange uppercase label only, such as Objective Notes, Practice Notes, Strumming Notes, or How These Patterns Work. Do not add a second title to the collapsed row.
- Objective chord cards retain the same page-level title and notes hierarchy, while their chord diagrams remain the primary card content.
- When a chord has other shapes or variations, place one forward arrow directly beside the chord name. The arrow cycles through the available options; the first chord shown remains the primary chord to learn.
- Continuous down-up strumming is a chord-pair training option. Exclude it from four-chord progressions, first songs, fully customizable progressions, and requested songs.
- Objective 1 Practice Notes contain the compact beat-grid legend: down arrow, up arrow, movement dot, numbered beats, and the `&` subdivision.
- Fully Customizable progressions let each chord last 1–6 beats while the selected strumming pattern continues across chord changes.
- Guitar Objective 3 orders A, Dm, F-Alternative, and B7 by frequency, musical importance, and playability. It introduces the manageable F alternative before the full barre lesson.
- Guitar Objective 4 mirrors the existing objective hierarchy and focuses only on the two movable shape families at fret 2: B/Bm from A/Am and F♯/F♯m from E/Em. Higher positions and additional chord names are reserved for a future chord library.
- Chord diagrams stay anchored to the real white nut and use a faint fret-3 position marker. Strings receive only a tight black depth shadow beginning at the fretboard edge, so the shadow does not pass over the nut.
- Chord-card titles contain only the chord name. Full names, shape families, and starting-fret guidance use the smaller subheader row directly below the title.
- Requested songs use a numbered song row followed by indented, numbered part rows. Every part retains its badge, disclosure control, and active-panel treatment, including long chorus progressions.
- Fully Customizable defaults to four short, equal-width ruler-style chord tiles that fill one horizontal row, with a slim add tile at the end. Narrow screens scroll this row instead of wrapping it. The gray ruler line and beat ticks connect directly to the tile's gray outline and communicate each chord's 1–6 beat duration without a separate duration label.
- Chord tiles use a navy root name and a small superscript quality. Tapping a tile opens a focused editor with the chromatic root list, the common Major, minor, 7, maj7, add9, and m7 qualities available for that instrument, and the 1–6 beat duration. Include visible Cancel, green Save, and red Delete actions.
- The advanced control row has no enclosing panel: green icon-only Play aligns left, the labeled Strumming button centers, and the labeled Settings button aligns right. Settings contains time signature, count-in, drums, and BPM; drums default on. Strumming defaults to D D-u — u-D-u and contains the optional detailed rhythm-grid toggle.
- Every Follow Along button uses the same solid green action treatment; its playing state uses a darker green.
- The detailed rhythm grid stays hidden until the user chooses to show it. Opting into strumming may use additional rows because the user has requested the extra detail. Follow Along actions and active cues use green throughout the app.
- Objective 4 is guitar-specific. Baritone and standard ukulele keep the existing Objective 1–3, Strumming, and Practice navigation.

