import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const engines=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),dir=process.env.ARTIFACT_DIR||'/tmp/spacing';await mkdir(dir,{recursive:true});const report=[];
for(const name of ['chromium','webkit']){
 const browser=await engines[name].launch({headless:true,...(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{const page=await browser.newPage({serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.BASE_URL||'http://127.0.0.1:4359')+'/tuner/');await page.waitForFunction(()=>!document.querySelector('#app-load-status'));
 const inventory=await page.evaluate(()=>[...document.querySelectorAll('.objective-panel[data-objective=practice]')].map(p=>({course:p.dataset.course,groups:[...p.querySelectorAll('details.library-section')].map(d=>({title:d.querySelector('summary strong')?.textContent||d.querySelector('summary')?.textContent,open:d.open})),songs:[...p.querySelectorAll('.first-song-tab strong')].map(e=>e.textContent),open:p.querySelectorAll('details[open]').length,keys:[...p.querySelectorAll('.first-song-key-select option')].map(e=>e.textContent)})));
 assert.equal(inventory.length,5);
 for(const p of inventory){assert.equal(p.open,0);const titles=p.groups.map(g=>g.title),first=titles.findIndex(t=>t.startsWith('First Songs')),common=titles.findIndex(t=>t.includes('Common')),custom=titles.findIndex(t=>t.includes('Custom')),requested=titles.findIndex(t=>t.includes('Requested'));assert.ok(first>=0&&first<common&&common<custom&&custom<requested,JSON.stringify(p));assert.equal(p.songs.length,p.course==='guitar'||p.course.endsWith('general')?3:1);}
 assert.equal(await page.locator('.strumming-panel details[open]').count(),0);
 assert.equal(await page.locator('.objective-panel:not([data-objective=practice]) .first-song-tab').count(),0);
 for(const [width,height]of [[390,844],[740,700],[741,1024],[825,1280],[1099,700],[1100,700],[1200,800],[1600,900]]){
  await page.setViewportSize({width,height});await page.locator('.nav-item').filter({hasText:'Metronome'}).click();await page.waitForTimeout(70);
  await page.evaluate(()=>{document.querySelector('#portal').hidden=false;document.querySelector('#portal').textContent='Student Portal ↗';});
  const geometry=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),h=r('.app-shell>header'),logo=r('.brand'),portal=r('#portal'),o=r('#metronome-options'),fields=[...document.querySelectorAll('#metronome-options fieldset,#metronome-options .accent-option')].map(e=>e.getBoundingClientRect());return {overflow:document.documentElement.scrollWidth>innerWidth,left:logo.left-h.left,right:h.right-portal.right,optionLeft:fields[0].left-o.left,optionRight:o.right-Math.max(...fields.map(f=>f.right))};});
  assert.equal(geometry.overflow,false);if(width>=741){assert.ok(geometry.left>=15&&geometry.right>=15);assert.ok(Math.abs(geometry.left-geometry.right)<=2);}if(width>=1100)assert.ok(Math.abs(geometry.optionLeft-geometry.optionRight)<=2,JSON.stringify(geometry));
  await page.screenshot({path:`${dir}/metronome-${name}-${width}.png`,fullPage:true});report.push({name,width,...geometry});
  if([390,825,1200].includes(width)){
   await page.locator('.nav-item').filter({hasText:'Chords'}).click();await page.evaluate(()=>document.querySelector('[data-objective-tab=practice]').click());await page.screenshot({path:`${dir}/practice-${name}-${width}.png`,fullPage:true});
   for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);for(const active of [false,true]){await page.locator('.nav-item').filter({hasText:active?'Scales':'Tuner'}).click();const icon=page.locator('.scales-nav-icon');assert.equal(await icon.locator('circle').count(),12);assert.equal(await icon.locator('circle').first().evaluate(e=>getComputedStyle(e).stroke),'none');await icon.screenshot({path:`${dir}/icon-${name}-${width}-${theme}-${active}.png`});}}await page.evaluate(()=>document.documentElement.dataset.theme='light');
  }
 }
 // Existing disclosure and song controls still open, retain their key choices, and close.
 await page.locator('.nav-item').filter({hasText:'Chords'}).click();
 for(const course of ['guitar','bar-general','uke-general','bar-young','uke-young']){await page.evaluate(c=>{document.querySelector(`[data-course-tab="${c.replace("-young","-general")}"]`).click();if(c.endsWith("-young"))document.querySelector(`.objective-panel[data-course="${c.replace("-young","-general")}"][data-objective=one] [data-path-switch]`).click();document.querySelector('[data-objective-tab=practice]').click();},course);const group=page.locator(`.objective-panel[data-course="${course}"][data-objective=practice] [data-song-objective]`).first();await group.locator(':scope>summary').click();await group.locator('.first-song-tab').first().click();assert.ok(await group.locator('.first-song-panel').first().isVisible());await group.locator(':scope>summary').click();assert.equal(await group.evaluate(e=>e.open),false);}
 assert.deepEqual(errors,[]);report.push({name,inventory});
 }finally{await browser.close();}
}
await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2));console.log('Practice inventory, closed defaults, gutters, icon states, responsive layouts and controls passed in Chrome and WebKit.');
