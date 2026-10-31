# Anthem Tuner Android Device Test Checklist

Use this checklist after the manifest, icon, and offline-cache updates are complete. Test the **web app/PWA first**, then repeat the essential checks in the **packaged APK**. The Play Store release will ultimately use an AAB, but the APK is easier to install directly during testing.

## Test record

| Item | Details |
| --- | --- |
| Tester |  |
| Date |  |
| Device |  |
| Android version |  |
| Browser and version |  |
| App version |  |
| Test type | Web / Installed PWA / APK |
| Connection | Wi-Fi / Cellular / Offline |
| Theme | Classic / Soft / Dark / Dark Rose / Dark Sage |

For every failed item, record what you expected, what happened, whether it happens every time, and a screenshot or short screen recording when useful.

## Recommended device coverage

Complete the full checklist on at least one current Android phone. Repeat the critical checks on:

- One older or lower-memory Android phone.
- One Android tablet in portrait and landscape.
- The packaged APK on at least two physical devices.

## Phase 1: Web app and installed PWA

### Installation and startup

- [ ] Open `https://anthemmusic.net/tuner/` in Chrome.
- [ ] Confirm the app loads without a blank screen or visibly broken styling.
- [ ] Add/install the app from Chrome.
- [ ] Confirm the installed icon is centered and fills the Android launcher shape cleanly.
- [ ] Launch from the home screen and confirm it opens as a standalone app.
- [ ] Close it completely, reopen it, and confirm the last selected theme is retained.
- [ ] Confirm Tuner, Metronome, Chords, and More are all reachable from the bottom navigation.
- [ ] Confirm the Android Back button behaves sensibly and does not unexpectedly close the app while a popup is open.

### Layout and display

- [ ] Check phone portrait and landscape.
- [ ] Check tablet portrait and landscape.
- [ ] Confirm no page scrolls horizontally.
- [ ] Confirm Objective 1–4, Strumming, and Practice labels remain on one line.
- [ ] Confirm the bottom navigation does not cover the final controls or text.
- [ ] Confirm chord strings continue visibly across the nut and fretboard.
- [ ] Confirm chord diagrams, finger dots, open circles, mute symbols, and fret markers remain legible in Classic and one Dark theme.
- [ ] Increase Android font size one step and confirm controls remain usable.
- [ ] Increase browser zoom or Android display size and confirm important controls do not overlap.

### Tuner and microphone

- [ ] Choose Guitar and allow microphone access.
- [ ] Play every open string and confirm the displayed string/note follows correctly.
- [ ] Confirm flat, centered, and sharp readings move in the expected direction.
- [ ] Confirm the live pitch trail updates and clears appropriately.
- [ ] Stop playing and confirm the display returns to a sensible waiting state.
- [ ] Deny microphone permission, confirm the app explains the problem, then grant permission and recover without reinstalling.
- [ ] Switch among Guitar, Ukulele, Bass, Violin, Banjo, Chromatic Tuner, and Saxophone.
- [ ] Confirm Saxophone and Chromatic Tuner say **play a note**, never **pluck a string**.
- [ ] Confirm saxophone transposition labels match the selected E-flat or B-flat instrument.
- [ ] Tap reference notes and confirm they play promptly without overlapping indefinitely.
- [ ] Turn the phone volume down/up and confirm reference-note loudness follows the hardware volume.

### Metronome

- [ ] Start and stop the metronome repeatedly.
- [ ] Change tempo with buttons, slider, and tap tempo.
- [ ] Test 2/4, 3/4, and 4/4.
- [ ] Test available subdivision and sound choices.
- [ ] Confirm beat one is visibly and audibly accented when enabled.
- [ ] Change settings while running and confirm the rhythm updates without hanging or layering two metronomes.
- [ ] Lock and unlock the screen, return to the app, and confirm it can restart normally.

### First Chords lessons

- [ ] Open each objective, Strumming, and Practice.
- [ ] Confirm selected tabs and expanded title rows visibly change state.
- [ ] Open and close lesson notes by tapping both the title and expand control.
- [ ] Play several chord sounds and confirm the selected chord matches what is heard.
- [ ] Check Guitar, Standard Ukulele, and Baritone Ukulele for matching controls and layout.
- [ ] Confirm chord names, variations, finger numbers, open strings, and muted strings remain readable.
- [ ] Confirm no chord diagram appears cut off at any tested orientation.

### Exercise playback

- [ ] Start a two-chord exercise and watch the highlight move to the currently playing measure.
- [ ] Start a four-chord exercise and confirm every measure plays once in the correct order.
- [ ] Listen closely to a split-measure exercise and confirm measure 2 does not trigger an extra or doubled chord.
- [ ] Select a different starting measure and confirm looping begins there.
- [ ] Change tempo during playback and confirm the new tempo takes effect cleanly.
- [ ] Change strumming during playback and confirm it takes effect without restarting from the wrong chord.
- [ ] Toggle drums during playback and confirm there is no overlapping or orphaned rhythm.
- [ ] Stop playback and confirm all audio stops promptly and the first measure returns to its ready highlight.
- [ ] Switch objectives or instruments during playback and confirm the previous audio stops.

### Custom Chord Progressions

- [ ] Confirm the default four chord boxes occupy one row.
- [ ] Add a fifth chord and confirm it begins a second row with no horizontal scrolling.
- [ ] Build an eight-chord progression and confirm it displays as two complete rows.
- [ ] Build a nine-chord progression and confirm it begins a third row.
- [ ] Edit root, quality, beats, and transpose; save and cancel each change.
- [ ] Confirm the chord-editor close control is centered and reliably dismisses the popup.
- [ ] Transpose upward and downward and confirm the preview changes before applying.
- [ ] Apply a transpose and confirm every chord changes by the same interval.
- [ ] Test 3/4 time and confirm each chord ruler shows two internal beat lines.
- [ ] Confirm 3/4 defaults to the intended `DDuDu` strumming pattern.
- [ ] Start playback and confirm only the current chord tile is highlighted.
- [ ] Change a setting during playback and confirm it takes effect promptly rather than waiting for a complete pass.
- [ ] Confirm the play button is green while ready/starting and red when it acts as Stop.

### Backing instruments

- [ ] Turn Drums, Bass, Piano, and Strings on and off independently.
- [ ] Move each volume control during playback and confirm the level changes in real time.
- [ ] Change each arrangement style during playback and confirm the new style takes effect without losing the current position.
- [ ] Solo each instrument and confirm every other accompaniment is muted.
- [ ] Confirm strings are clearly audible in solo mode and begin without an excessive baked-in delay.
- [ ] Confirm piano arpeggios use eighth-note motion.
- [ ] Confirm the piano thirds style places the stronger third treatment evenly on beats 1 and 3.
- [ ] Confirm bass has adequate volume, sustained notes, and no abrupt robotic cutoff.
- [ ] Listen through at least five minutes of continuous playback and check for stuck notes, drift, missing chords, crackling, or growing delay.
- [ ] Stop, restart, and switch solo modes repeatedly to check for orphaned audio.

### Offline and interrupted-network behavior

- [ ] While online, open the app and play at least one guitar chord, bass style, piano style, and string style.
- [ ] Close the app completely.
- [ ] Enable airplane mode and relaunch the installed PWA.
- [ ] Confirm the interface loads offline.
- [ ] Confirm previously used guitar, bass, piano, and string sounds play offline.
- [ ] Confirm unavailable uncached sounds fail gracefully rather than freezing playback.
- [ ] Reconnect and confirm missing sounds become available without reinstalling.
- [ ] Start playback online, briefly disable the network, and confirm already loaded audio continues.

### Accessibility and controls

- [ ] Enable TalkBack and move through the main navigation.
- [ ] Confirm buttons have understandable names rather than being announced only as “button.”
- [ ] Confirm selected tabs, toggles, and expanded sections announce their state.
- [ ] Confirm Play changes to Stop in both visible text/state and TalkBack output.
- [ ] Connect a Bluetooth keyboard if available and confirm visible focus can reach and activate important controls.
- [ ] Confirm popups keep focus inside while open and return focus to the opening control when closed.

## Phase 2: Packaged APK

Install the APK fresh rather than installing over the PWA. Repeat these checks because the Android wrapper may handle audio, permissions, caching, links, and Back differently.

- [ ] Install without a security or parsing error.
- [ ] Confirm the launcher icon and app name are correct.
- [ ] Launch from a cold start and confirm there is no blank or flashing page.
- [ ] Grant, deny, and later re-enable microphone permission.
- [ ] Repeat the tuner checks for Guitar, Chromatic Tuner, and Saxophone.
- [ ] Repeat metronome start/stop and live setting changes.
- [ ] Repeat one standard exercise and one custom eight-chord progression.
- [ ] Repeat Drums, Bass, Piano, and Strings playback, live volume, style switching, Solo, and Stop.
- [ ] Test Android Back with an editor popup, settings popup, expanded section, and the main screen.
- [ ] Put the app in the background during playback, return, and confirm it recovers predictably.
- [ ] Lock/unlock the phone and confirm no audio remains stuck.
- [ ] Rotate during playback and confirm playback and the current-measure highlight remain synchronized.
- [ ] Repeat the airplane-mode/offline test.
- [ ] Leave the app playing for at least ten minutes and check heat, battery use, memory-related restarts, timing drift, and audio degradation.
- [ ] Uninstall and reinstall; confirm the first-run experience and permissions are clean.

## Release-stopping failures

Treat any of these as a blocker before the Google Play test release:

- Crash, blank screen, or app unable to launch.
- Microphone permission cannot recover after denial.
- Tuner consistently reports incorrect notes on a supported instrument.
- Audio becomes stuck, overlaps after Stop, or repeatedly plays the wrong chord.
- Current-measure highlight and audible progression disagree.
- Piano, strings, bass, or required interface assets fail after their expected offline cache is populated.
- Controls are unreachable, hidden behind navigation, or unusable with normal Android text scaling.
- APK Back behavior closes the app when it should dismiss an open popup.
- Launcher icon is badly cropped or letterboxed.

## Issue report template

**Test item:**  
**Device / Android version:**  
**Web, PWA, or APK:**  
**App version:**  
**Connection:**  
**Steps to reproduce:**  
1.  
2.  
3.  

**Expected:**  
**Actual:**  
**Every time or intermittent:**  
**Screenshot/video attached:** Yes / No  
**Does restarting fix it:** Yes / No  

## Completion summary

| Area | Web/PWA | APK | Notes |
| --- | --- | --- | --- |
| Installation and startup | Pass / Fail | Pass / Fail |  |
| Layout and themes | Pass / Fail | Pass / Fail |  |
| Tuner and microphone | Pass / Fail | Pass / Fail |  |
| Metronome | Pass / Fail | Pass / Fail |  |
| Lessons and chord diagrams | Pass / Fail | Pass / Fail |  |
| Exercise playback | Pass / Fail | Pass / Fail |  |
| Custom progressions | Pass / Fail | Pass / Fail |  |
| Backing instruments | Pass / Fail | Pass / Fail |  |
| Offline behavior | Pass / Fail | Pass / Fail |  |
| Accessibility | Pass / Fail | Pass / Fail |  |

**Overall result:** Ready / Fix and retest  
**Tester sign-off:**  
**Date:**  
