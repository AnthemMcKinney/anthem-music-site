# Social link preview correction (November 17, 2026)

The live homepage correctly advertised the prior 1200x630 image. Facebook's compact comment tile center-cropped that split photo/text artwork to a square, cutting off both sides. The fetched live image matched the repository byte-for-byte. A cache refresh alone does not repair that composition.

The new v3 card reuses Anthem's existing crest, navy/cream/orange colors and stacked brand treatment. All meaningful content sits inside the middle square with extra horizontal margin. The large card remains 1200x630; the square thumbnail retains the complete brand. No website layout, tuner, lesson app, or page-specific booking artwork was changed.

Regenerate PNG after editing the SVG: `node scripts/render-social-card.mjs` (sharp is installed with Astro). Keep the rendered PNG in git; social crawlers receive that PNG rather than SVG.

Validation: production Astro build; full node test suite; rendered pixel inspection at 1200x630 and center-cropped 210x210. Facebook's actual cached preview cannot be verified through these local tests. After deployment, use Meta Sharing Debugger for https://anthemmusic.net/ and https://www.anthemmusic.net/ and request a new scrape if the old art persists. Existing comments may retain their earlier preview.
