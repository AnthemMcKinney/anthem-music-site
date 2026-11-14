import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const engines=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),dir=process.env.ARTIFACT_DIR||'/tmp';await mkdir(dir,{recursive:true});const report=[];
for(const name of (process.env.BROWSER_ENGINES||'chromium,webkit').split(',')){
 const browser=await engines[name].launch({headless:true,...(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:process.env.ALLOW_SW?'allow':'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:4359')+'/tuner/');await page.waitForFunction(()=>!document.querySelector('#app-load-status'));await page.locator('.nav-item').filter({hasText:'Metronome'}).click();
 const settings=page.locator('#metronome-settings'),options=page.locator('#metronome-options');
 const checkState=async open=>{assert.equal(await options.evaluate(e=>e.hidden),!open);assert.equal(await settings.getAttribute('aria-expanded'),String(open));assert.equal(await options.isVisible(),open);};
 await checkState(false);await settings.click();await checkState(true);await page.locator('#metronome-options-close').click();await checkState(false);
 for(const [width,height]of [[390,844],[740,700],[741,1024],[826,1280],[1024,768],[844,390],[826,450],[1099,700],[1100,700],[1440,900],[1440,450]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(60);await checkState(width>=741);
  if(width<741)await settings.click();
  const g=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON(),o=rect('#metronome-options'),a=rect('.metronome-actions'),stage=rect('.pulse-stage'),f=[...document.querySelectorAll('#metronome-options fieldset')].map(e=>e.getBoundingClientRect().toJSON());return{options:o,actions:a,stage,fields:f,overflow:document.documentElement.scrollWidth>innerWidth,documentOverflow:getComputedStyle(document.documentElement).overflowY,bodyOverflow:getComputedStyle(document.body).overflowY,controls:[...document.querySelectorAll('#metronome-options button')].filter(e=>e.getClientRects().length).map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,overflow:e.scrollWidth>e.clientWidth+1}))};});
  assert.equal(g.overflow,false);assert.ok(!['hidden','clip'].includes(g.documentOverflow));assert.ok(!['hidden','clip'].includes(g.bodyOverflow));
  if(width<1100)assert.ok(g.options.top>=g.actions.bottom);else assert.ok(g.options.left>=g.stage.right);
  if(width>=741&&width<1100){assert.ok(Math.abs(g.fields[0].top-g.fields[1].top)<1);assert.ok(g.fields[1].left>=g.fields[0].right);assert.ok(g.controls.every(c=>c.height>=44&&!c.overflow));assert.equal(g.stage.height,260);}
  await page.locator('.accent-option').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));const reachable=await page.evaluate(()=>document.querySelector('.accent-option').getBoundingClientRect().bottom<=document.querySelector('.bottom-nav').getBoundingClientRect().top);assert.ok(reachable,'accent control reachable above fixed navigation');
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${dir}/metronome-${name}-${width}x${height}.png`,fullPage:true});report.push({engine:name,width,height,...g});
  if(width<741){await page.locator('#metronome-options-close').click();await checkState(false);}
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(60);await checkState(false);await settings.click();await page.setViewportSize({width:826,height:1280});await page.waitForTimeout(60);await checkState(true);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(60);await checkState(true);await page.locator('#metronome-options-close').click();
 await page.setViewportSize({width:826,height:1280});await page.waitForTimeout(60);await page.locator('[data-meter="3"]').click();assert.equal(await page.locator('#beat-dots .beat-dot').count(),3);await page.locator('[data-subdivision="2"]').click();assert.equal(await page.locator('[data-subdivision="2"]').getAttribute('aria-pressed'),'true');await page.locator('[data-sound="wood"]').click();assert.equal(await page.locator('[data-sound="wood"]').getAttribute('aria-pressed'),'true');await page.locator('.accent-option').click();assert.equal(await page.locator('#accent-one').isChecked(),false);
 const audioSupported=await page.evaluate(()=>typeof AudioContext==='function');
 if(audioSupported){await page.locator('#metronome-start').click();assert.equal(await page.locator('#metronome-start').getAttribute('aria-pressed'),'true',await page.locator('#metronome-status').textContent());await page.locator('#metronome-start').click();assert.equal(await page.locator('#metronome-start').getAttribute('aria-pressed'),'false');}
 report.push({engine:name,audioSupported,playback:audioSupported?'Start/Stop passed':'Not tested: this browser build has no AudioContext'});
 assert.deepEqual(errors,[]);console.log(`${name}: 11 layouts, phone disclosure memory, synchronized state, scrolling and option controls passed (playback availability recorded)`);
 }finally{await browser.close();}
}
await writeFile(`${dir}/metronome-report.json`,JSON.stringify(report,null,2));
