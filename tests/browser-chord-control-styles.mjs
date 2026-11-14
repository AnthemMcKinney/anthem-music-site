import assert from 'node:assert/strict';
const {webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await webkit.launch();
try{for(const width of [390,1280]){
 const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:4335')+'/tuner/#chords');
 await page.locator('.objective-tabs').waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('link[rel="stylesheet"]')].every(l=>l.sheet));
 const result=await page.evaluate(()=>{
 const all=s=>[...document.querySelectorAll(s)],bg=e=>getComputedStyle(e).backgroundColor;
 const transports=all('.chords-view .play-chord,.chords-view .play-exercise');
 const transport=transports.map(e=>{const idle=bg(e);e.classList.add('playing');const active=bg(e);e.classList.remove('playing');return {idle,active};});
 const drums=all('.chords-view .groove-toggle').map(e=>{const sw=e.querySelector('.groove-switch');e.setAttribute('aria-pressed','false');const off=bg(sw);e.setAttribute('aria-pressed','true');const on=bg(sw);e.setAttribute('aria-pressed','false');return {off,on};});
 return {transport,drums,measures:all('.chords-view .music-measure').map(bg)};
 });
 assert.ok(result.transport.length>200);assert.ok(result.drums.length>100);assert.ok(result.measures.length>100);
 for(const t of result.transport){assert.equal(t.idle,'rgb(40, 122, 69)');assert.equal(t.active,'rgb(173, 85, 82)');}
 for(const d of result.drums){assert.equal(d.off,'rgb(235, 236, 232)');assert.equal(d.on,'rgb(40, 122, 69)');}
 for(const m of result.measures)assert.equal(m,'rgb(255, 255, 255)');
 console.log(`${width}: ${result.transport.length} transports, ${result.drums.length} drum toggles, ${result.measures.length} white measures passed`);
 await page.screenshot({path:`/tmp/chord4-controls-${width}.png`,fullPage:false});await page.close();
}}finally{await browser.close();}
