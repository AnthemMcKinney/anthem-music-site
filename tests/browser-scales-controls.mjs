import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await webkit.launch({headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:4333';
const artifacts=process.env.ARTIFACT_DIR||'/tmp/anthem-scales-controls';
await mkdir(artifacts,{recursive:true});
try{
 for(const desktop of [false,true]){
  const context=await browser.newContext(desktop?{viewport:{width:1280,height:900}}:{...devices['iPhone 13']});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/tuner/#scales`);
  const progression=page.locator('#backing-progression'),bars=page.locator('#backing-bars');
  await progression.waitFor({state:'attached'});
  assert.equal(await progression.inputValue(),'am-f');assert.equal(await bars.inputValue(),'4');
  await progression.selectOption('c-g');await bars.selectOption('2');
  const retained=async()=>{assert.equal(await progression.inputValue(),'c-g');assert.equal(await bars.inputValue(),'2');};
  await page.locator('[data-pattern="box1"]').click();await retained();
  await page.locator('[data-layer="diatonic"]').click();await retained();
  await page.locator('[data-pattern="natural"]').click();await retained();
  await page.evaluate(()=>location.hash='metronome');await page.waitForFunction(()=>document.body.dataset.view==='metronome');
  await page.evaluate(()=>location.hash='scales');await page.waitForFunction(()=>document.body.dataset.view==='scales');await retained();
  const state=async(button,active)=>{
   assert.equal(await button.getAttribute('aria-pressed'),String(active));
   assert.match(await button.getAttribute('aria-label'),active?/^Stop/:/^(Play|Start)/);
   assert.equal(await button.locator('.play-fill').getAttribute('d'),active?'M8 8h8v8H8Z':'m10 8 6 4-6 4V8Z');
  };
  for(const selector of ['#fretboard-play','#tab-play','#backing-play','#play']){
   const button=page.locator(selector);await button.click();await state(button,true);
   await page.waitForTimeout(800);await state(button,true);
   await button.screenshot({path:`${artifacts}/${desktop?'desktop':'phone'}-${selector.slice(1)}-stop.png`});
   await button.click();await state(button,false);
   await button.click();await state(button,true);await button.click();await state(button,false);
  }
  await page.locator('#fretboard-play').click();await page.locator('#fretboard-play').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${artifacts}/${desktop?'desktop':'phone'}-scales.png`,fullPage:true});
  await page.locator('#fretboard-play').click();
  assert.deepEqual(errors,[]);await context.close();
 }
 // Delay actual sample fetches in a fresh browser context to exercise cancellation during preload.
 for(const selector of ['#fretboard-play','#tab-play','#backing-play','#play']){
  const context=await browser.newContext({...devices['iPhone 13']});
  const page=await context.newPage();let release,requested=false;
  const gate=new Promise(resolve=>release=resolve);
  await page.route('**/samples/**',async route=>{requested=true;await gate;await route.continue().catch(()=>{});});
  await page.addInitScript(()=>{window.__starts=0;const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){window.__starts++;return start.apply(this,args);};});
  await page.goto(`${base}/tuner/#scales`);const button=page.locator(selector);await button.click();
  await page.waitForTimeout(250);assert.equal(requested,true);
  assert.equal(await button.locator('.play-fill').getAttribute('d'),'M8 8h8v8H8Z');
  const startsBeforeStop=await page.evaluate(()=>window.__starts);
  await button.click();assert.equal(await button.getAttribute('aria-pressed'),'false');
  release();await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.__starts),startsBeforeStop,'No sample may start after cancellation');
  assert.equal(await button.locator('.play-fill').getAttribute('d'),'m10 8 6 4-6 4V8Z');await context.close();
 }
 console.log('PASS: phone/desktop defaults, retained settings, all four stop controls, repeated taps, delayed preload cancellation; screenshots '+artifacts);
}finally{await browser.close();}
