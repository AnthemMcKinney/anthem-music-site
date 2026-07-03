import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://anthemmusic.net',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
