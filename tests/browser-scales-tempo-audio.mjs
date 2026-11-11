// Real WebKit audio is retained. Observe accepted musical cues and scheduled
// note/percussion times, rather than replacing playback with a fake promise.
import assert from 'node:assert/strict';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4331';
const browser=await webkit.launch({headless:true}),report={base,engine:await browser.version()};
try{
 const context=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  window.__meters=[];window.__peak=0;
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(destination===this.context.destination){const meter=this.context.createAnalyser();meter.fftSize=2048;connect.call(this,meter);__meters.push(meter);}return result;};
  setInterval(()=>{for(const meter of __meters){const data=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(data);let power=0;for(const value of data)power+=value*value;__peak=Math.max(__peak,Math.sqrt(power/data.length));}},10);
 });
 await page.goto(base+'/tuner/#scales');await page.locator('#demo-tempo').waitFor();
 await page.evaluate(async()=>{
  const url=performance.getEntriesByType('resource').map(entry=>entry.name).find(url=>url.includes('/tuner/chord-audio.js'));
  const {ChordPlayer}=await import(url),prototype=ChordPlayer.prototype;
  window.__timeline={cues:[],notes:[],drums:[],strokes:[],generation:0};
  const mode=()=>{const root=document.querySelector('#scales-view').shadowRoot;return root.querySelector('#play').getAttribute('aria-pressed')==='true'?'demo':root.querySelector('#backing-play').getAttribute('aria-pressed')==='true'?'backing':'notes';};
  const exercise=prototype.playExercise;
  prototype.playExercise=function(...args){window.__player=this;const generation=++__timeline.generation,kind=mode(),cue=args[3];args[3]=(data,at)=>{if(data)__timeline.cues.push({generation,mode:kind,at,sequence:data.playbackSlotIndex,slot:data.slotIndex});cue?.(data,at);};return exercise.apply(this,args);};
  for(const [name,key,timeIndex] of [['playScaleTone','notes',2],['drum','drums',2],['stroke','strokes',2]]){
   const original=prototype[name];prototype[name]=function(...args){window.__player=this;__timeline[key].push({mode:mode(),at:args[timeIndex],calledAt:this.context().currentTime,midi:name==='playScaleTone'?args[0]:null,duration:name==='playScaleTone'?args[1]:null});return original.apply(this,args);};
  }
 });
 const setTempo=async(id,value)=>page.locator(id).evaluate((input,value)=>{input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));return __player?.context().currentTime||0;},value);
 const windowCues=async(mode,after,count=8)=>{await page.waitForFunction(({mode,after,count})=>__timeline.cues.filter(cue=>cue.mode===mode&&cue.at>after+.3).length>=count,{mode,after,count},{timeout:20000});return page.evaluate(({mode,after})=>__timeline.cues.filter(cue=>cue.mode===mode&&cue.at>after+.3),{mode,after});};
 function cadence(cues,bpm){assert.ok(cues.length>=4);for(let i=1;i<cues.length;i++){assert.equal(cues[i].sequence,cues[i-1].sequence+1,'no skipped/duplicate accepted slots');assert.ok(Math.abs(cues[i].at-cues[i-1].at-30/bpm)<.00001,`one ${bpm} BPM clock: ${cues[i].at-cues[i-1].at}`);}}
 await page.locator('#play').click();await page.waitForFunction(()=>__timeline.cues.length>=4&&__peak>.001);
 const fastAt=await setTempo('#demo-tempo',150),fast=await windowCues('demo',fastAt);cadence(fast,150);
 const slowAt=await page.locator('#demo-tempo').evaluate(input=>{for(const value of [50,160,80,130,55,150,60]){input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));}return __player.context().currentTime;});
 const slow=await windowCues('demo',slowAt);cadence(slow,60);
 const inactiveAt=await setTempo('#backing-tempo',160),unchanged=await windowCues('demo',inactiveAt,4);cadence(unchanged,60);
 const samples=await page.evaluate(()=>({notes:__timeline.notes,drums:__timeline.drums,strokes:__timeline.strokes,peak:__peak}));
 for(const cue of [...fast,...slow,...unchanged].filter(cue=>cue.slot%2===0)){
  const note=samples.notes.find(note=>note.mode==='demo'&&Math.abs(note.at-cue.at)<.00001);assert.ok(note,'demo note shares accompaniment onset');assert.ok(note.calledAt<=note.at+.005,'notes are audio-scheduled, not driven by late visual callbacks');
  assert.ok(samples.drums.some(drum=>Math.abs(drum.at-cue.at)<.00001),'drum shares beat');
  assert.ok(samples.strokes.some(stroke=>Math.abs(stroke.at+.032-cue.at)<.00001),'guitar strum shares beat with its existing lead');
 }
 report.demo={fastBpm:150,slowBpm:60,rapidEdits:7,inactiveBackingEdit:'does not alter demo',matchedBeats:[...fast,...slow,...unchanged].filter(c=>c.slot%2===0).length,peak:samples.peak};
 await page.locator('#fretboard-play').click();assert.match(await page.locator('#play').innerText(),/^Play/);assert.match(await page.locator('#backing-play').innerText(),/^Play/);
 const notesAt=await setTempo('#notes-tempo',150);await page.waitForFunction(after=>__timeline.notes.filter(note=>note.mode==='notes'&&note.at>after+.3).length>=5,notesAt,{timeout:15000});
 const notes=await page.evaluate(after=>__timeline.notes.filter(note=>note.mode==='notes'&&note.at>after+.3),notesAt);for(let i=1;i<notes.length;i++)assert.ok(Math.abs(notes[i].at-notes[i-1].at-.4)<.00001,'Notes updates live to 150 BPM');
 const notesSlowAt=await page.locator('#notes-tempo').evaluate(input=>{for(const value of [50,160,65,140,75]){input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));}return __player.context().currentTime;});
 await page.waitForFunction(after=>__timeline.notes.filter(note=>note.mode==='notes'&&note.at>after+.3).length>=4,notesSlowAt,{timeout:15000});const slowerNotes=await page.evaluate(after=>__timeline.notes.filter(note=>note.mode==='notes'&&note.at>after+.3),notesSlowAt);for(let i=1;i<slowerNotes.length;i++)assert.ok(Math.abs(slowerNotes[i].at-slowerNotes[i-1].at-.8)<.00001,'rapid Notes changes settle at75 BPM without duplicated notes');
 const cuesAtNotes=await page.evaluate(()=>__timeline.cues.length);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>__timeline.cues.length),cuesAtNotes,'demo scheduler stopped on Notes transition');
 await page.locator('#backing-play').click();assert.match(await page.locator('#fretboard-play').innerText(),/^Play/);const backingAt=await page.evaluate(()=>__player.context().currentTime),backing=await windowCues('backing',backingAt);cadence(backing,160);
 const noteCount=await page.evaluate(()=>__timeline.notes.length);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>__timeline.notes.length),noteCount,'backing-only cannot retain note loop');
 await page.locator('#backing-play').click();const counts=await page.evaluate(()=>[__timeline.cues.length,__timeline.notes.length,__timeline.drums.length,__timeline.strokes.length]);await page.waitForTimeout(500);assert.deepEqual(await page.evaluate(()=>[__timeline.cues.length,__timeline.notes.length,__timeline.drums.length,__timeline.strokes.length]),counts,'Stop removes every scheduler');
 assert.deepEqual(errors,[]);assert.deepEqual(await page.locator('[role=alert]:visible').allTextContents(),[]);report.transitions='demo → notes → backing → stop, only one active clock';report.notesBpm=[150,75];report.backingBpm=160;report.pageErrors=errors;console.log(JSON.stringify(report,null,2));await context.close();
}finally{await browser.close();}
