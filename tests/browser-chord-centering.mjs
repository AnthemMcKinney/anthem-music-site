import assert from 'node:assert/strict';
const {webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const browser=await webkit.launch();
try{for(const width of [320,390,768,1280]){
 const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:4335')+'/tuner/#chords');await page.locator('.objective-tabs').waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('link[rel=stylesheet]')].every(l=>l.sheet));
 const offsets=await page.locator('.chord-card-heading .chord-variant-nav:visible').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().left-e.closest('.chord-card-heading').getBoundingClientRect().left));for(const x of offsets)assert.ok(Math.abs(x-98)<.6,`${width}: stable arrow column`);

 const centered=await page.locator('.play-chord:visible').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect(),s=e.querySelector('svg').getBoundingClientRect();return [Math.abs(b.x+b.width/2-s.x-s.width/2),Math.abs(b.y+b.height/2-s.y-s.height/2)];}));for(const [x,y] of centered){assert.ok(x<.6&&y<.6,`chord icon centered ${width}: ${x},${y}`);}
 for(const sectionName of ['Strumming','Practice']){await page.getByRole('button',{name:sectionName,exact:true}).click();
 await page.locator('.objective-panel:visible').evaluate(p=>{p.querySelectorAll('details').forEach(d=>d.open=true);p.querySelectorAll('.practice-exercise-panel').forEach(e=>e.hidden=false);});
 const results=await page.locator('.objective-panel:visible .unified-exercise-toolbar').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width).map(e=>{
 const center=e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
 const groups=[...e.querySelectorAll('.exercise-tool')].map(g=>({label:center(g.querySelector('.exercise-tool-label')),control:center(g.querySelector(':scope>:not(.exercise-tool-label)'))}));
 const button=e.querySelector('.play-exercise'),svg=button.querySelector('svg'),pattern=e.parentElement.querySelector('.measure-row,.sixteenth-beat-guide'),cluster=e.querySelector('.exercise-transport-group');
 return {groups,button:center(button),svg:center(svg),cluster:center(cluster),toolbar:center(e),pattern:pattern&&center(pattern)};
 }));assert.ok(results.length>10);
 for(const r of results){for(const g of r.groups)assert.ok(Math.abs(g.label.x-g.control.x)<.6,`${width}: label centered`);assert.ok(Math.abs(r.button.x-r.svg.x)<.6&&Math.abs(r.button.y-r.svg.y)<.6,`${width}: exercise icon centered`);assert.ok(r.cluster.left>=r.toolbar.left-1&&r.cluster.right<=r.toolbar.right+1,`${width}: transport fits ${JSON.stringify(r)}`);if(r.pattern)assert.ok(r.toolbar.top>=r.pattern.bottom-1,`${width}: toolbar below pattern`);}
 console.log(`${width}/${sectionName}: ${centered.length} chord icons; ${results.length} exercise toolbars centered and contained`);}
 await page.close();
}}finally{await browser.close();}
