// Optional real-engine check: install Playwright and its WebKit browser, serve
// public/ locally, then BASE_URL=http://127.0.0.1:4330 node tests/browser-audio-start.mjs.
// Linux WebKit + an iPhone profile is not a physical iPhone/silent-switch test.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4330';
const artifacts=process.env.ARTIFACT_DIR||'/tmp/anthem-audio-browser';
await mkdir(artifacts,{recursive:true});
const browser=await webkit.launch({headless:true});
const results=[];
async function fresh(view,{modern=false,desktop=false}={}){
 const context=await browser.newContext(desktop?{viewport:{width:1280,height:900}}:{...devices['iPhone 13']});
 await context.addInitScript(({modern})=>{
  const probe=window.__audioProbe={events:[],peak:0,contexts:[],meters:[],media:[]};
  const event=(type,extra={})=>probe.events.push({type,time:performance.now(),...extra});
  if(modern){let type='auto';Object.defineProperty(navigator,'audioSession',{configurable:true,value:{get type(){return type;},set type(value){type=value;event('session',{value});}}});}
  const Original=window.AudioContext||window.webkitAudioContext;
  class AudioContextProbe extends Original{constructor(...args){super(...args);probe.contexts.push(this);event('context');}resume(){event('resume',{state:this.state});return super.resume();}}
  window.AudioContext=AudioContextProbe;window.webkitAudioContext=AudioContextProbe;
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(destination===this.context.destination){const meter=this.context.createAnalyser();meter.fftSize=2048;connect.call(this,meter);probe.meters.push(meter);}return result;};
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){event('sample',{duration:this.buffer?.duration});return start.apply(this,args);};
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(...args){probe.media.push(this);event('native',{src:this.src});return play.apply(this,args);};
  setInterval(()=>{for(const meter of probe.meters){const data=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(data);let power=0;for(const x of data)power+=x*x;probe.peak=Math.max(probe.peak,Math.sqrt(power/data.length));}},10);
 },{modern});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/tuner/#${view}`);await page.waitForFunction(()=>!document.getElementById('app-load-status'));
 return {page,context,errors};
}
const report=async(page)=>page.evaluate(()=>({peak:__audioProbe.peak,events:__audioProbe.events,states:__audioProbe.contexts.map(ctx=>ctx.state),nativePlaying:__audioProbe.media.some(audio=>!audio.paused)}));
async function noErrors(page,errors){assert.deepEqual(errors,[]);assert.deepEqual(await page.locator('[role=alert]:visible').allTextContents(),[]);}
try{
 for(const modern of [false,true]){
  const {page,context,errors}=await fresh('chords',{modern});
  assert.equal((await report(page)).events.length,0,'no audio is initialized merely by loading Chords');
  await page.locator('[data-play-chord]:visible').first().click();
  await page.waitForFunction(()=>__audioProbe.events.some(e=>e.type==='sample'));await page.waitForTimeout(300);
  let evidence=await report(page);assert.ok(evidence.peak>.001,`chord graph must render non-silent audio (${evidence.peak})`);
  assert.ok(evidence.events.findIndex(e=>e.type===(modern?'session':'native'))<evidence.events.findIndex(e=>e.type==='sample'));
  if(!modern)assert.ok(evidence.events.filter(e=>e.type==='native').every(e=>e.src.endsWith('/audio-unlock.wav')),'no tuner string workaround');
  await noErrors(page,errors);await page.screenshot({path:`${artifacts}/chords-${modern?'session':'native'}.png`});
  await page.waitForTimeout(2500);assert.equal((await report(page)).nativePlaying,false,'one chord releases the silent route when it ends');
  await page.locator('[data-play-chord]:visible').first().click();await page.waitForTimeout(100);
  await page.getByRole('button',{name:'Tuner',exact:true}).click();await page.waitForTimeout(150);assert.equal((await report(page)).nativePlaying,false);
  results.push({flow:`fresh chord / ${modern?'session API (injected)':'native fallback (real WebKit)'}`,peak:evidence.peak});await context.close();
 }
 for(const view of ['metronome','scales','scale-demo']){
  const {page,context,errors}=await fresh(view==='scale-demo'?'scales':view);
  const button=view==='metronome'?page.locator('#metronome-start'):view==='scale-demo'?page.locator('#play'):page.locator('.pattern-play').first();
  if(view!=='metronome')await button.waitFor();
  await button.click();await page.waitForFunction(()=>__audioProbe.peak>.001);await page.waitForTimeout(400);
  const evidence=await report(page);assert.ok(evidence.peak>.001,`${view} renders audible signal from its own first Play`);assert.equal(evidence.nativePlaying,true);await noErrors(page,errors);
  await page.screenshot({path:`${artifacts}/${view}-phone.png`});
  await button.click();await page.waitForTimeout(200);assert.equal((await report(page)).nativePlaying,false);
  await button.click();await page.waitForTimeout(600);await page.getByRole('button',{name:'Chords',exact:true}).click();await page.waitForTimeout(200);assert.equal((await report(page)).nativePlaying,false);
  results.push({flow:`fresh ${view}, stop, restart, navigation`,peak:evidence.peak});await context.close();
 }
 // Simulate a slow first sample; leaving the tool must prevent delayed playback.
 const {page,context,errors}=await fresh('chords');
 await page.route('**/samples/guitar-acoustic-*',async route=>{await new Promise(resolve=>setTimeout(resolve,700));await route.continue();});
 await page.locator('[data-play-chord]:visible').first().click();await page.getByRole('button',{name:'Metronome',exact:true}).click();await page.waitForTimeout(1200);
 const cancelled=await report(page);assert.equal(cancelled.events.filter(e=>e.type==='sample').length,0);assert.equal(cancelled.nativePlaying,false);await noErrors(page,errors);await context.close();results.push({flow:'navigation during first chord sample loading'});
 const desktop=await fresh('metronome',{desktop:true});await desktop.page.locator('#metronome-start').click();await desktop.page.waitForTimeout(600);await desktop.page.screenshot({path:`${artifacts}/metronome-desktop.png`});
 await desktop.context.close();
 console.log(JSON.stringify({engine:await browser.version(),results,artifacts,limitation:'No physical iPhone or iOS mute-switch/output-route verification.'},null,2));
}finally{await browser.close();}
