# Web/iPhone PWA parity and ukulele prerequisites — local review only

Baseline verified: remote main21b127d7c1d6fe92f4d5152b577441c70aeea61e, live3.7.168 HTML bootstrap key web-168-final; live Chords JS matches archived main after line-ending normalization. Existing dirty chords-scroll-hotfix checkout was left untouched. Candidate is separate web-parity-review. No push/merge/deployment, signing, APK/AAB or console operation.

## Scoped web transfer
First Chords real grouped header and exact two-line tagline (second bold italic), blue single logical instrument selector; short Guitar Objective1 text and Objective3 “To expand the chord family”; named alternate destination with Alt shape/Original for same-name voicings; control alignment and matched20px legend capsules. Existing web cards, two Notes disclosures, responsive diagrams, scrolling, lesson data, audio/mic, routing and Scales remain. New CSS is scoped to Chords; no wholesale app.js/index/bootstrap or Android stylesheet replacement. App/bootstrap/index only receive coherent review asset identifiers. Objective2 shape-note text now follows actual selected arrows instead of claiming only the final and. Existing approved3-point objective-specific practice coaching is reused.

Practice panel heading says Practice & Songs. Rail retains compact Practice below1100px; full label above that width, full accessible name throughout. This avoids squeezing existing tabs.

## Exact ukulele audit and candidate inventory
These are existing simplified named song patterns/opening phrases, not claims of complete arrangements.

| Path | Chords introduced | First Songs in final Practice |
|---|---|---|
| Baritone normal | O1 G/C/D/Em; O2 F/Am/B7/G7; O3 E/D7/A/Bm (existing alternates retained) | Jingle Bells and Twinkle afterO1; Mary default C/G7 afterO2; Mary G/D alternative afterO1 |
| Standard normal | O1 C/F/G/Am; O2 Bb/Dm/E7/C7; O3 A/G7/D/Em (alternates retained) | Jingle Bells and Twinkle afterO1; Mary default F/C7 afterO2; Mary C/G alternative afterO1 |
| Baritone Youth | O1 G/Em; O2 C/G7; O3 D/D7 | Mary default afterO2; G/D alternate explicitly afterO3 |
| Standard Youth | O1 C/Am; O2 F/C7; O3 G/G7 | Mary default afterO2; C/G alternate explicitly afterO3 |

Web already relocated First Songs at runtime. No second move/duplicate was introduced. Counts remain3/3/1/1, zero First Songs panels in Objectives. Chord pairs and4-chord technique drills stay in Objectives. Original default key remains selectable; alternate prerequisites are visible in its option and selected arrangement note, with no fake completion gate.

Requested inventory retained: baritone normal and Youth each6 (Country Roads, Remember Me, Jingle Bell Rock, Go Tell It on the Mountain, Rudolph the Red-Nosed Reindeer, Frosty the Snowman); standard normal2 (Frosty, Somewhere Over the Rainbow); standard Youth1 (Somewhere Over the Rainbow). All sections remain accessible. Labels derive from actual course chord IDs: Youth baritone advanced requests show additional shapes (F; Fm/Ab/E7/Am/C7; Dmaj7/D6/A7/A/Gm/E/E7/B7; A7; F/Dm/Am respectively); Go Tell It is afterO2 C/G7. Youth standard Rainbow explicitly lists additional Em as bonus/challenge. Song data, IDs, links, rhythm/backing and Custom Progressions are unchanged.

Android differs: delivered code47 still had3 First Songs in O1 in every ukulele path. Separate android-curriculum-review stages the existing web move/order mechanism. Normal paths now match3 songs in Practice; Youth retains its already-existing Jingle/Twinkle as afterO3 rather than deleting them, so Android Youth has3 rather than web's1. Mary moves toO2; its existing Android rhythm is preserved. All4 Android paths now have zero First Songs in Objectives. No new songs/chords added. Baseline Android package remains untouched.

## Validation and limits
-Web build passed.154 unit tests pass using scripts/windows-test-normalize.mjs (test-only LF normalization for Windows VM harness). Social-card test now uses fileURLToPath, correcting its Windows-only /C:/ path bug. Initial unadapted run had39 platform failures; after LF normalization only the path test remained. No audio source was modified to satisfy tests.
-Android47 tests pass. Chord definition arrays are byte-equivalent after LF normalization on both candidates.
-Chromium and installed Windows WebKit:320/390/820, both classic/dark; final1100 rail check included; all4 courses, counts, zero objective song leftovers, Mary default/alternate prerequisite labels, key changes, split progression data, tempo and pattern controls, visible expansion and scrolling. Screenshots retained in parent qa-parity. Actual phone/tablet/dark pixels inspected, including corrections for inherited alternate-label styling.
-Real Chromium WebAudio: Mary's split measures, key switch while playing, tempo/pattern change, chord preview, route cleanup, credits; web retains Scales nav and Android excludes it. Windows WebKit audio and physical iPhone/Android mic/speakers are not verified.
-Trusted Chromium CDP touch: vertical diagram drags scroll165px(web)/163px(Android) without switching modules; plain interior horizontal swipes navigate toScales(web)/More(Android) and reset top; alternate buttons guard navigation. Existing web diagram-variation behavior retained.
-Private same-origin4378 PWA sequence: baseline→candidate→rollback, warm worker update and new offline page each phase passed. This is Chromium browser/service-worker simulation; not actual iPhone Home Screen installation, OS process kill, standalone-mode or physical device testing. No production origin/cache touched.
-No Anthem native iOS target found in current main or local anthem-android overlay. Overlay is Capacitor8 with Android/app/core dependencies and Android-only scripts; noios directory/Xcode project or @capacitor/ios. A web push covers the PWA, not a separately signed native iPhone binary. No Stillwater target used.

## Rollback / release boundary
Candidate uses review suffix web-168-parity-review-1 and cache anthem-music-3.7.168-parity-review-1; public release remains3.7.168. Before any authorized release, parent should review these commits and choose normal next release/cache IDs. Keep baseline21b127d available. Rollback by restoring its scoped runtime files with a fresh rollback cache identifier, retaining any unrelated later changes. Local staged rollback restored baseline and reopened offline successfully. Android rollback is simply retaining delivered code47; no package has been generated from this curriculum candidate.
