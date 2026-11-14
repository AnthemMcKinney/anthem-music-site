import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
import {instruments} from '../public/tuner/tuner/tunings.js';
const engines=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),dir=process.env.ARTIFACT_DIR||'/tmp';await mkdir(dir,{recursive:true});const report=[];
for(const name of (process.env.BROWSER_ENGINES||'chromium,webkit').split(',')){
 const browser=await engines[name].launch({headless:true,...(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{const page=await browser.newPage({hasTouch:true,serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:4359')+'/tuner/');await page.waitForFunction(()=>!document.querySelector('#app-load-status'));
 const notes=page.locator('#instrument-notes'),summary=page.locator('#instrument-info-open');assert.equal(await notes.evaluate(e=>e.open),false);
 for(const [width,height]of [[390,844],[844,390],[820,1280],[1280,820]]){
  await page.setViewportSize({width,height});await summary.click();assert.equal(await notes.evaluate(e=>e.open),true);
  assert.ok(await page.locator('.tuner-definitions li').count()>0);assert.ok(await page.locator('.tuner-key-points li').count()>0);
  const g=await page.evaluate(()=>{const h=document.querySelector('.string-heading'),s=getComputedStyle(h);return{overflow:document.documentElement.scrollWidth>innerWidth,font:getComputedStyle(h.querySelector('h2')).fontSize,top:parseFloat(s.paddingTop),bottom:parseFloat(s.paddingBottom),rule:s.borderBottomWidth};});
  assert.equal(g.overflow,false);assert.ok(g.top>g.bottom);assert.equal(g.rule,'1px');if(width>=741)assert.equal(g.font,'24px');report.push({engine:name,width,height,...g});
  await page.locator('.tuner-note-image').click();assert.equal(await page.locator('#tuner-note-dialog').evaluate(e=>e.open),true);await page.locator('.tuner-note-dialog-close').click();assert.equal(await page.locator('#tuner-note-dialog').evaluate(e=>e.open),false);
  await page.screenshot({path:`${dir}/notes-${name}-${width}-open.png`,fullPage:true});await summary.click();assert.equal(await notes.evaluate(e=>e.open),false);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${dir}/notes-${name}-${width}-closed.png`,fullPage:true});
 }
 const options=await page.locator('#instrument-choice option').evaluateAll(es=>es.map(e=>({value:e.value,text:e.textContent})));
 for(const option of options){await page.selectOption('#instrument-choice',option.value);const chromatic=instruments[Number(option.value)].mode==='chromatic';assert.equal(await notes.isVisible(),!chromatic);if(!chromatic){if(!await notes.evaluate(e=>e.open))await summary.click();assert.equal(await page.locator('.tuner-definitions').count(),1);assert.equal(await page.locator('.tuner-key-points').count(),1);assert.ok((await page.locator('#instrument-notes-title').textContent()).length>3);}report.push({engine:name,instrument:option.text,notesVisible:!chromatic});}
 assert.deepEqual(errors,[]);console.log(`${name}: notes toggle, image enlargement, four layouts and ${options.length} instrument switches passed`);
 }finally{await browser.close();}
}
await writeFile(`${dir}/notes-report.json`,JSON.stringify(report,null,2));
