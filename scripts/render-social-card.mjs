// Uses sharp (already installed with Astro). Keep meaningful content within
// x=315..885 so Facebook's centered square comment crop retains the brand.
import sharp from 'sharp';
await sharp(new URL('../public/images/og-card-v3.svg', import.meta.url).pathname)
  .png().toFile(new URL('../public/images/og-card-v3.png', import.meta.url).pathname);
