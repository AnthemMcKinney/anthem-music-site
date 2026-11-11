// Demonstrate cold-request latency under a controlled network delay, not a
// claim about a physical phone's output latency or Dan's exact connection.
import assert from 'node:assert/strict';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4331';
const browser=await webkit.launch({headless:true}),report=[];
try{
 for(const warm of [false,true]){
  const context=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'block'}),page=await context.newPage();let sampleRequests=0;
  await page.route(/\/samples\/guitar-acoustic-.*\.wav/,async route=>{sampleRequests++;await new Promise(resolve=>setTimeout(resolve,600));await route.continue();});
  await page.goto(base+'/tuner/');await page.waitForFunction(()=>!document.getElementById('app-load-status'));
  await page.evaluate(async warm=>{
   const {ChordPlayer}=await import('/tuner/tuner/chord-audio.js');
   const player=new ChordPlayer(),chord={id:'cadd9',frets:['x',3,2,0,3,3]};
   window.__preloadProbe={warm,startedAt:0,firstScheduledMs:null,beforeContext:null,voices:0};
   const start=AudioBufferSourceNode.prototype.start;
   AudioBufferSourceNode.prototype.start=function(at,...args){const p=__preloadProbe;p.voices++;p.firstScheduledMs??=performance.now()-p.startedAt+(at-this.context.currentTime)*1000;return start.call(this,at,...args);};
   if(warm)await player.prepareChords([chord]);__preloadProbe.beforeContext=player.ctx;
   const button=document.createElement('button');button.id='latency-probe';button.textContent='Test chord latency';button.onclick=()=>{__preloadProbe.startedAt=performance.now();void player.play(chord);};document.body.prepend(button);
  },warm);
  assert.equal(await page.evaluate(()=>__preloadProbe.beforeContext),null,'warming makes no audio context');
  const beforeRequests=sampleRequests;await page.locator('#latency-probe').click();await page.waitForFunction(()=>__preloadProbe.voices===5);
  const result=await page.evaluate(()=>({...__preloadProbe,beforeContext:null}));result.requestsAfterTap=sampleRequests-beforeRequests;
  if(warm){assert.equal(result.requestsAfterTap,0);assert.ok(result.firstScheduledMs<300,'warm chord should not wait on delayed requests');}
  else{assert.equal(result.requestsAfterTap,3);assert.ok(result.firstScheduledMs>=550,'cold chord includes the controlled network wait');}
  report.push(result);await context.close();
 }
 assert.ok(report[0].firstScheduledMs-report[1].firstScheduledMs>300,'warming removes most of the controlled delay');
 console.log(JSON.stringify({base,networkDelayMs:600,report},null,2));
}finally{await browser.close();}
