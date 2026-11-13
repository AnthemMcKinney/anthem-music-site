// UI-state audit with controlled reference promises. Real audio startup is
// covered separately; no physical microphone permission is requested here.
import assert from 'node:assert/strict';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4331';
const browser=await webkit.launch({headless:true});
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({...devices['iPhone 13'],viewport:{width,height:900},isMobile:width<740}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));await page.goto(base+'/tuner/');await page.waitForFunction(()=>!document.getElementById('app-load-status'));
  await page.evaluate(async()=>{const {TunerAudio}=await import('/tuner/tuner/audio.js?v=web-audio-1');window.__references=[];TunerAudio.prototype.play=()=>new Promise((resolve,reject)=>__references.push({resolve,reject}));});
  const reference=page.locator('#strings .string').first(),guidance=page.locator('#guidance');
  await reference.click();assert.equal(await guidance.textContent(),'Loading reference note');
  await page.evaluate(()=>__references[0].resolve(300));await page.waitForFunction(()=>document.getElementById('guidance').textContent==='Listen to your string');
  assert.equal(await page.locator('#live-caption').textContent(),'REFERENCE NOTE');assert.match(await page.locator('#hint').textContent(),/Tap again to replay/);
  await page.waitForFunction(()=>document.getElementById('guidance').textContent==='Play a string');
  await reference.click();await page.evaluate(()=>__references[1].reject(Error('fixture recording failed')));await page.waitForFunction(()=>!document.getElementById('error').hidden);assert.equal(await guidance.textContent(),'Reference note unavailable');
  await reference.click();assert.equal(await page.locator('#error').isVisible(),false);assert.equal(await guidance.textContent(),'Loading reference note');await page.evaluate(()=>__references[2].resolve(2000));await page.waitForFunction(()=>document.getElementById('guidance').textContent==='Listen to your string');
  await page.getByRole('button',{name:'Metronome',exact:true}).click();await page.getByRole('button',{name:'Tuner',exact:true}).click();assert.equal(await guidance.textContent(),'Play a string');
  await reference.click();await page.getByRole('button',{name:'Chords',exact:true}).click();await page.evaluate(()=>__references[3].resolve(2000));await page.getByRole('button',{name:'Tuner',exact:true}).click();assert.equal(await guidance.textContent(),'Play a string');
  await reference.click();await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));__references[4].resolve(2000);});assert.equal(await guidance.textContent(),'Play a string');
  assert.deepEqual(errors,[]);await context.close();console.log(`${width}px: tuner loading, playing, completion, error/retry and navigation captions passed`);
 }
}finally{await browser.close();}
