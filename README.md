# Anthem Music — Website

Astro static site for Anthem Music LLC, McKinney TX. Deploys to Cloudflare Pages.

## Local development
```
npm install
npm run dev
```
Site runs at http://localhost:4321

## Build
```
npm run build
```
Output goes to `dist/`.

## Deploy to Cloudflare Pages
1. Push this repo to GitHub (AnthemMcKinney/anthem-music-site)
2. In Cloudflare dashboard: Workers & Pages > Create > Pages > Connect to Git
3. Select the repo
4. Build settings:
   - Framework preset: Astro
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Deploy. Cloudflare gives you a *.pages.dev URL to preview.
6. When ready, add custom domain anthemmusic.net in Cloudflare Pages settings.

## Structure
- `src/pages/` — each page (index, schedule, instructors, about, contact, guitar-lessons, piano-lessons, programs)
- `src/layouts/Base.astro` — shared shell, SEO meta, structured data
- `src/components/` — Header, Footer, Shield
- `src/styles/global.css` — design tokens + base styles
- `public/instructors/` — instructor photos (dan.jpg, christine.jpg are real; jonah.jpg, britton.jpg are placeholders — replace when photos ready)
- `public/images/hero.jpg` — homepage hero (currently Dan's headshot — swap for a wider studio/action shot when available)

## To update before launch
- [ ] Replace jonah.jpg and britton.jpg placeholders with real photos
- [ ] Replace hero.jpg with a stronger wide hero image
- [ ] Swap placeholder logo (public/anthem-logo.svg) with final logo when designed
- [ ] Verify Facebook/Instagram URLs in Footer.astro
- [ ] Confirm MMS booking widget renders correctly once live

## MMS booking widget
Embedded on `/schedule`. If the widget script changes in MyMusicStaff, update it in `src/pages/schedule.astro`.
