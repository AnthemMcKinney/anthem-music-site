# Web 3.7.167

Based on production 3e05ef3698764387d8e5bb8058db3bd7b1b097b2 and ukulele fix c60ac2aa003384bb4365bb5e6ad3ef55ceb50dd8.

Preserves automatic string targeting when changing instruments while the microphone is active or starting. Refreshes the microphone label after startup completes. Adds Baritone high D (D4 G3 B3 E4), retaining standard Baritone (D3 G3 B3 E4), and explains the octave difference in existing Notes. Pitch/audio processing is unchanged.

Display 3.7.167; cache anthem-music-3.7.167; changed entry points use web-167-final.

Validation: build, 153 unit tests, Chrome/WebKit target-state and responsive tests, three-green feedback regressions, 1215 synthetic signal cases and 180 recorded-guitar/resampled cases. No physical ukulele/microphone test; Windows WebKit audio unavailable. Android and Google Play unchanged and on hold.
