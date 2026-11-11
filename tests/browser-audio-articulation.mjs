// Requires Playwright/WebKit and a local or deployed tuner. Optional
// BASELINE_AUDIO_FILE points to the previous chord-audio.js for rendered A/B metrics.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4330';
const browser=await webkit.launch({headless:true});
const report={base,engine:await browser.version()};
try{
 const context=await browser.newContext({...devices['iPhone 13']});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${base}/tuner/#scales`);await page.locator('.pattern-play').first().waitFor();
 await page.evaluate(async()=>{
  const {ChordPlayer}=await import('/tuner/tuner/chord-audio.js?v=chord-review-1');
  window.__articulation={note:0,click:0,drum:0};
  for(const [name,label] of [['playScaleTone','note'],['click','click'],['drum','drum']]){
   const original=ChordPlayer.prototype[name];ChordPlayer.prototype[name]=function(...args){window.__articulation[label]++;return original.apply(this,args);};
  }
 });
 // Each Play Notes button must remain note-only, including after a backing demo.
 const notes=page.locator('#fretboard-play');await notes.click();
 await page.waitForFunction(()=>__articulation.note>=3);
 report.notes=await page.evaluate(()=>({...__articulation}));assert.equal(report.notes.click,0);assert.equal(report.notes.drum,0);
 await notes.click();
 // Explicitly selected drums still play in the scale/backing demo.
 await page.locator('#mix-drums').check();await page.locator('#play').click();
 await page.waitForFunction(()=>__articulation.drum>=2&&__articulation.click>=2);
 report.backing=await page.evaluate(()=>({...__articulation}));await page.locator('#play').click();
 await page.evaluate(()=>{for(const key of Object.keys(__articulation))__articulation[key]=0;});
 await page.locator('#tab-play').click();await page.waitForFunction(()=>__articulation.note>=2);
 report.notesAfterBacking=await page.evaluate(()=>({...__articulation}));assert.equal(report.notesAfterBacking.click,0);assert.equal(report.notesAfterBacking.drum,0);
 await page.locator('#tab-play').click();assert.deepEqual(errors,[]);assert.deepEqual(await page.locator('[role=alert]:visible').allTextContents(),[]);
 if(process.env.BASELINE_AUDIO_FILE){
  const baseline=await readFile(process.env.BASELINE_AUDIO_FILE,'utf8');
  report.rendered=await page.evaluate(async({baseline})=>{
   const absolute=baseline.replaceAll("'./playback-session.js?v=1'",JSON.stringify(new URL('/tuner/tuner/playback-session.js?v=1',location.href).href)).replaceAll("'./reference.js'",JSON.stringify(new URL('/tuner/tuner/reference.js',location.href).href));
   const blob=URL.createObjectURL(new Blob([absolute],{type:'text/javascript'}));
   const Before=(await import(blob)).ChordPlayer,After=(await import('/tuner/tuner/chord-audio.js?v=chord-review-1')).ChordPlayer;
   const decoded=new Map();
   async function render(Player,chord,mode){
    const ctx=new OfflineAudioContext(1,48000*3,48000),p=new Player();
    p.context=()=>ctx;p.unlock=async()=>ctx;p.stop=()=>p.loopToken++;
    p.master=ctx.createGain();p.master.gain.value=.78;
    const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.knee.value=7;compressor.ratio.value=5;compressor.attack.value=.004;compressor.release.value=.2;
    p.master.connect(compressor).connect(ctx.destination);p.exerciseBacking=p.master;
    p.load=async(_ctx,file)=>{if(!decoded.has(file))decoded.set(file,fetch('/tuner/samples/'+file).then(r=>r.arrayBuffer()).then(bytes=>ctx.decodeAudioData(bytes)));return decoded.get(file);};
    if(mode==='play'){await p.play(chord);clearTimeout(p.audioReleaseTimer);}else{const kit=await p.samples(chord);p.stroke(chord,kit,.025,mode,1.85,'full');}
    const audio=await ctx.startRendering(),data=audio.getChannelData(0);
    const stats=(from,to)=>{let sum=0,peak=0,count=0;for(let i=Math.round(from*audio.sampleRate);i<Math.round(to*audio.sampleRate);i++){sum+=data[i]**2;peak=Math.max(peak,Math.abs(data[i]));count++;}return{rms:Math.sqrt(sum/count),peak};};
    // Isolate the first onset before overlapping strings can cancel in phase.
    return{initial:stats(.025,.041),early:stats(.025,.055),body:stats(.175,.425),full:stats(0,2.2)};
   }
   const results=[];
   for(const chord of [{id:'g',frets:[3,2,0,0,3,3]},{id:'e',frets:[0,2,2,1,0,0]},{id:'d',frets:['x','x',0,2,3,2]}])for(const mode of ['play','d','u']){
    const before=await render(Before,chord,mode),after=await render(After,chord,mode);
    results.push({chord:chord.id,mode,before,after,initialRatio:after.initial.rms/before.initial.rms,earlyRatio:after.early.rms/before.early.rms,bodyRatio:after.body.rms/before.body.rms});
   }
   URL.revokeObjectURL(blob);return results;
  },{baseline});
  for(const result of report.rendered){assert.ok(result.after.full.rms>.001,'renders pitched audio');assert.ok(result.after.full.peak<1,'does not clip');assert.ok(result.initialRatio<1,'initial attack is measurably gentler');assert.ok(result.bodyRatio>.8&&result.bodyRatio<1.2,'preserves the sustained body');}
 }
 await context.close();console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
