import {fileURLToPath} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

test('default social card is versioned and raster dimensions match metadata', async () => {
  const layout = readFileSync(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');
  assert.match(layout, /ogImage = "\/images\/og-card-v3\.png"/);
  assert.match(layout, /property="og:image:width" content="1200"/);
  assert.match(layout, /property="og:image:height" content="630"/);
  assert.match(layout, /property="og:image:alt"/);
  const metadata = await sharp(fileURLToPath(new URL('../public/images/og-card-v3.png', import.meta.url))).metadata();
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 630);
  assert.equal(metadata.format, 'png');
});
