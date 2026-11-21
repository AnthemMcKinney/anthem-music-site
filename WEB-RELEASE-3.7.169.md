# Web/PWA3.7.169

Approved candidate22d9875140677c1e9428215258c2c491221f545f, based on verified production21b127d7c1d6fe92f4d5152b577441c70aeea61e. Release-only delta: app display3.7.169, coherent web-169-final entry/style/module keys, cache anthem-music-3.7.169. All scoped parity/curriculum changes and limitations are recorded in PARITY-CURRICULUM-REVIEW.md. No additional feature changes.

Release build and154 unit tests pass (documented Windows LF harness). Private same-origin staged baseline→release→rollback passes warm worker update and new offline page at each phase. Baseline rollback commit is retained. A browser context was warmed on actual production3.7.168 before push for post-deploy update/offline verification without clearing site data.

Expected deployment workflow: ordinary fast-forward push to origin main triggers the existing Cloudflare Pages production integration. Verify exact remote SHA, deployment check, live public assets and mobile runtime after push; repository status alone is insufficient. Any material release regression requires scoped rollback to the known baseline with coherent fresh cache identifiers, followed by public verification.

No Android candidate change or package, native iOS build, Play/App Store submission, signing or credential changes. Web/iPhone coverage is the website/PWA only. Browser emulation is not physical iPhone verification.
