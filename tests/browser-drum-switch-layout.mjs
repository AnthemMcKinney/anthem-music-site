// iPhone WebKit regression: specific active CSS must retain vertical centering during the entire transition.
import assert from 'node:assert/strict';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await webkit.launch();
try{for(const width of [320,390]){
 const page=await browser.newPage({...devices['iPhone 13'],viewport:{width,height:844},serviceWorkers:'block'});
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:4373')+'/tuner/#chords');await page.locator('.objective-tabs').waitFor();
 await page.evaluate(()=>{document.querySelector('[data-objective-tab="strumming"]').click();const b=document.querySelector('.objective-panel:not([hidden]) .groove-toggle');for(let e=b;e;e=e.parentElement)if(e.tagName==='DETAILS')e.open=true;});
 const button=page.locator('.objective-panel:visible .groove-toggle:visible').first();await button.scrollIntoViewIfNeeded();
 const inspect=()=>button.evaluate(b=>{const el=b.querySelector('.groove-switch'),s=getComputedStyle(el),p=getComputedStyle(el,'::after'),r=el.getBoundingClientRect(),m=new DOMMatrix(p.transform==='none'?undefined:p.transform),borderLeft=parseFloat(s.borderLeftWidth),borderTop=parseFloat(s.borderTopWidth),left=r.left+borderLeft+parseFloat(p.left)+m.m41,top=r.top+borderTop+parseFloat(p.top)+m.m42;const thumb={left,top,right:left+parseFloat(p.width),bottom:top+parseFloat(p.height)},track={left:r.left,top:r.top,right:r.right,bottom:r.bottom};const matches=[];const walk=rules=>{for(const rule of rules){if(rule.selectorText?.includes('groove-switch')&&rule.selectorText.includes('after')){try{if(el.matches(rule.selectorText.replace(/::?after/g,'')))matches.push({selector:rule.selectorText,css:rule.style.cssText});}catch{}}else if(rule.cssRules)walk(rule.cssRules);}};for(const sheet of document.styleSheets){try{walk(sheet.cssRules);}catch{}}return {state:b.getAttribute('aria-pressed'),width:s.width,height:s.height,top:p.top,transform:p.transform,thumb,track,contained:thumb.left>=track.left&&thumb.top>=track.top&&thumb.right<=track.right&&thumb.bottom<=track.bottom,matches};});
 const off=await inspect();await button.screenshot({path:`/tmp/drum-after-${width}-off.png`});await button.tap();await page.waitForTimeout(300);const on=await inspect();await button.screenshot({path:`/tmp/drum-after-${width}-on.png`});
 console.log(`${width}px touch: OFF/ON thumb containment checked`);if(true){assert.ok(off.contained);assert.ok(on.contained);}
 if(true){
  for(const direction of ['off','on']){
   const frames=button.evaluate(async b=>{const el=b.querySelector('.groove-switch'),results=[];b.click();const start=performance.now();while(performance.now()-start<240){await new Promise(requestAnimationFrame);const s=getComputedStyle(el),p=getComputedStyle(el,'::after'),m=new DOMMatrix(p.transform),left=parseFloat(s.borderLeftWidth)+parseFloat(p.left)+m.m41,top=parseFloat(s.borderTopWidth)+parseFloat(p.top)+m.m42;results.push({at:performance.now()-start,x:m.m41,y:m.m42,contained:left>=0&&top>=0&&left+parseFloat(p.width)<=el.getBoundingClientRect().width&&top+parseFloat(p.height)<=el.getBoundingClientRect().height});}return results;});
   await page.waitForTimeout(65);await button.screenshot({path:`/tmp/drum-after-${width}-${direction}-transition.png`});
   const samples=await frames;assert.ok(samples.every(s=>s.contained),'thumb remains inside throughout '+direction);assert.ok(samples.some(s=>s.x>0&&s.x<14),'sampled an intermediate frame '+direction);assert.ok(samples.every(s=>s.y===-7),'vertical center unchanged '+direction);console.log(`${width}px ${direction}: ${samples.length} animation frames centered and contained`);
  }
 }
 await page.close();
}}finally{await browser.close();}
