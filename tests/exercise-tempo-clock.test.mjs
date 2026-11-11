import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/tuner/tuner/chord-audio.js',import.meta.url),'utf8')
 .replace(/^import .*;\n/gm,'').replaceAll('export ','').replace('import.meta.url','"http://test.invalid/"');
const chord=id=>({id,name:id.toUpperCase(),frets:[0,0,0,0,0,0]});
const mix={bass:{enabled:true,style:'roots'},piano:{enabled:true,style:'simple'},strings:{enabled:true,style:'low'}};
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-8,`${message||'time'}: ${actual} != ${expected}`);
function harness(){
 const timers=new Map(),frames=new Map(),audio=[],scheduled=[],visual=[];let serial=0;
 const param=()=>({setValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){},exponentialRampToValueAtTime(){}}),node=()=>({gain:param(),frequency:param(),Q:param(),playbackRate:param(),connect(){return this;},disconnect(){}});
 const ctx={currentTime:0,createGain:node,createBiquadFilter:node,createBufferSource(){const voice={...node(),start(at){this.at=at;this.kind='demo';this.event=player.exerciseEvent;audio.push(this);},stop(at){if(at===undefined)this.cancelled=true;}};return voice;}};
 const sandbox={Math,Map,WeakMap,Set,Number,Array,String,Promise,window:{},releasePlayback(){},referenceSample:(instrument,hz)=>({sourceHz:hz,file:`${instrument}:${hz}`}),
  setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,at:ctx.currentTime+ms/1000});return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame(fn){const id=++serial;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
 vm.createContext(sandbox);vm.runInContext(source+';globalThis.ChordPlayer=ChordPlayer;',sandbox);
 const player=new sandbox.ChordPlayer();player.context=()=>ctx;player.ctx=ctx;player.unlock=async()=>ctx;player.samples=async()=>({});player.load=async()=>({duration:10});
 const trackVoice=player.trackVoice;player.trackVoice=function(source,start,event=this.exerciseEvent){source.event=event;trackVoice.call(this,source,start,event);};
 player.rhythm=node();player.exerciseGuitar=node();player.exerciseBacking=node();player.backingBuses={bass:node(),piano:node(),strings:node()};
 const record=(kind,at,extra={})=>{const event=player.exerciseEvent,voice={kind,at,event,...extra,stop(){this.cancelled=true;}};audio.push(voice);player.trackVoice(voice,at);};
 player.stroke=(chord,kit,at,direction,duration,range,strength,count)=>record('guitar',at,{chord:chord.id,direction,duration,range,strength,count});
 player.click=(ctx,buffer,at,accent,level)=>record('click',at,{accent,level});player.drum=(ctx,buffer,at,level,drum)=>record('drum',at,{level,drum});
 player.sampledTone=(instrument,hz,buffer,sourceHz,at,duration,level)=>record(instrument,at,{duration,level});
 const onSchedule=(cue,at,duration)=>scheduled.push({cue,at,duration,event:player.exerciseEvent});
 const onCue=(cue,at)=>visual.push({cue,at});
 const flush=async()=>{await Promise.resolve();await Promise.resolve();};
 const advance=async to=>{while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>to)break;ctx.currentTime=next[1].at;timers.delete(next[0]);next[1].fn();await flush();}ctx.currentTime=to;await flush();};
 const jump=async to=>{ctx.currentTime=to;const next=[...timers][0];if(next){timers.delete(next[0]);next[1].fn();}await flush();};
 const frame=()=>{const pending=[...frames];frames.clear();for(const [,fn] of pending)fn();};
 const start=({bpm=50,pattern='dudududu',groove='rock',progression=[chord('c'),chord('g')],timeline=progression.flatMap(value=>Array(4).fill(value)),backing=mix,meter=4,countIn=0,startMeasure=0,subdivision='eighth',beatTicks=false,onSchedule:callback=onSchedule}={})=>player.playExercise(progression,pattern,bpm,onCue,groove,startMeasure,subdivision,beatTicks,meter,countIn,timeline,backing,{onSchedule:callback});
 return {player,ctx,audio,scheduled,visual,timers,frames,onSchedule,advance,jump,frame,start,flush};
}

test('guitar, drums, backing and demo share one phase through 50→160→75 BPM and rapid edits',async()=>{
 const h=harness();await h.start({onSchedule(cue,at,duration){h.onSchedule(cue,at,duration);h.player.playScaleTone(60+cue.playbackSlotIndex%5,duration*.96,at);}});await h.flush();
 assert.equal(h.scheduled.length,1,'only the short lookahead is scheduled, not a full cycle');
 await h.advance(.35);h.player.setExerciseTempo(160);
 // Original first beat is .065. At .35 we are .2375 beats into it.
 const nextEighth=.35+(.5-(.35-.065)/1.2)*.375;
 await h.advance(nextEighth+.02);
 near(h.scheduled.filter(x=>!x.event.cancelled).find(x=>x.cue.playbackSlotIndex===1).at,nextEighth);
 h.player.setExerciseTempo(75);h.player.setExerciseTempo(160);h.player.setExerciseTempo(50);h.player.setExerciseTempo(75);
 assert.equal(h.timers.size,1,'edits replace the timer, never start a parallel loop');
 await h.advance(4);h.frame();
 const cues=h.scheduled.filter(x=>!x.event.cancelled),unique=new Set();
 for(const item of cues){
  assert.equal(unique.has(item.cue.playbackSlotIndex),false,'no duplicate audible slot');unique.add(item.cue.playbackSlotIndex);
  const group=h.audio.filter(voice=>voice.event===item.event&&!voice.cancelled);
  near(group.find(x=>x.kind==='guitar').at,item.at-.032,'guitar onset');
  near(group.find(x=>x.kind==='demo').at,item.at,'demo onset');
  near(group.find(x=>x.kind==='click').at,item.at,'rhythm onset');
  if(item.cue.isDownbeat){near(group.find(x=>x.kind==='drum').at,item.at,'drum onset');near(group.find(x=>x.kind==='bass').at,item.at,'bass onset');}
  assert.ok(group.some(x=>x.kind.startsWith('piano-')),'piano eighth shares the same event');
 }
 const settled=cues.filter(x=>x.at>1);for(let index=1;index<settled.length;index++)near(settled[index].at-settled[index-1].at,.4,'75 BPM eighth');
 assert.ok(h.visual.at(-1).cue.playbackSlotIndex>0,'visuals follow the same stable sequence');h.player.stop();
});

test('retiming cancels old queued sources/cues and keeps only the latest pending slot',async()=>{
 const h=harness();await h.start({bpm:160});await h.advance(.15);
 const old=h.scheduled.find(x=>x.cue.playbackSlotIndex===1);assert.ok(old);assert.ok(old.event.firstAt>h.ctx.currentTime);
 h.player.setExerciseTempo(50);assert.equal(old.event.cancelled,true);
 assert.ok(old.event.voices.every(voice=>voice.cancelled));assert.ok(h.player.cueQueue.every(cue=>cue.event!==old.event));
 for(const tempo of [55,70,120,160,75,50,160,75])h.player.setExerciseTempo(tempo);
 await h.advance(1.2);
 const audible=h.scheduled.filter(x=>!x.event.cancelled&&x.cue.playbackSlotIndex===1);assert.equal(audible.length,1);
 const expected=.15+(.5-(.15-.065)/.375)*.8;near(audible[0].at,expected);
 h.player.stop();assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);assert.equal(h.player.cueQueue.length,0);assert.ok(h.audio.every(voice=>voice.cancelled));
});

test('a stroke already begun keeps its strum and anchors the tempo change for every layer',async()=>{
 const h=harness();await h.start({bpm:160});await h.advance(.23);
 const committed=h.scheduled.find(x=>x.cue.playbackSlotIndex===1);assert.ok(committed.event.firstAt<h.ctx.currentTime&&committed.at>h.ctx.currentTime);
 h.player.setExerciseTempo(50);assert.equal(committed.event.cancelled,false);
 await h.advance(1);const next=h.scheduled.filter(x=>!x.event.cancelled).find(x=>x.cue.playbackSlotIndex===2);near(next.at,committed.at+.6);h.player.stop();
});

test('tempo changes during sample preload are retained without reinstalling a stale updater',async()=>{
 const h=harness();let release;h.player.samples=()=>new Promise(resolve=>release=resolve);
 const pending=h.start({bpm:50,progression:[chord('c')]});h.player.setExerciseTempo(160);await h.flush();h.player.setExerciseTempo(75);release({});await pending;
 await h.advance(.6);near(h.scheduled.find(x=>x.cue.playbackSlotIndex===1).at,.465);h.player.stop();
});

test('cancelled async demo samples cannot create late voices after a tempo edit or stop',async()=>{
 const h=harness(),pending=[];await h.start({bpm:160,pattern:'........',backing:null,onSchedule(cue,at,duration){h.onSchedule(cue,at,duration);const load=h.player.load;h.player.load=()=>new Promise(resolve=>pending.push(resolve));h.player.playScaleTone(60,duration,at);h.player.load=load;}});
 await h.advance(.15);assert.equal(pending.length,2);h.player.setExerciseTempo(50);pending[1]({duration:2});await h.flush();assert.equal(h.audio.filter(x=>x.kind==='demo').length,0);
 h.player.stop();pending[0]({duration:2});await h.flush();assert.equal(h.audio.filter(x=>x.kind==='demo').length,0);assert.equal(h.timers.size,0);
});

test('late scheduler tick skips missed onsets instead of bursting or starting a second tempo',async()=>{
 const h=harness();await h.start({bpm:160});const before=h.scheduled.length;await h.jump(2.4);
 assert.ok(h.scheduled.slice(before).every(x=>x.at>=2.4+.032),'missed beats are not replayed');
 h.player.setExerciseTempo(50);await h.advance(3.8);const future=h.scheduled.filter(x=>!x.event.cancelled&&x.at>2.6);for(let i=1;i<future.length;i++)near(future[i].at-future[i-1].at,.6);
 assert.equal(h.timers.size,1);h.player.stop();
});

for(const id of ['c','uke-c','bar-c'])test(`${id}: 3/4 count-in, start measure and sixteenth pattern retain their musical position`,async()=>{
 const h=harness(),first=chord(id),second={...chord(id+'2'),id:id==='c'?'g':id.replace('c','g')};
 await h.start({bpm:120,progression:[first,[second,first,second]],timeline:[],backing:null,meter:3,countIn:3,startMeasure:1,pattern:'d.u.d.u.d.u.',subdivision:'sixteenth',groove:'click',beatTicks:true});
 await h.advance(1.5);assert.equal(h.scheduled.length,1);near(h.scheduled[0].at,1.565);assert.equal(h.scheduled[0].cue.measureIndex,1);assert.equal(h.scheduled[0].cue.playbackSlotIndex,0);
 const countClicks=h.audio.filter(x=>x.kind==='click'&&x.at<1.565);assert.equal(countClicks.length,3);assert.deepEqual(countClicks.map(x=>x.at),[.065,.565,1.065]);
 await h.advance(3.2);const audible=h.scheduled.filter(x=>!x.event.cancelled);assert.equal(audible[12].cue.measureIndex,1);assert.equal(audible[12].cue.playbackSlotIndex,12);
 const guitar=h.audio.filter(x=>x.kind==='guitar');assert.deepEqual(guitar.slice(0,6).map(x=>[x.chord,x.direction]),[[second.id,'d'],[second.id,'u'],[first.id,'d'],[first.id,'u'],[second.id,'d'],[second.id,'u']]);
 assert.ok(guitar.every(x=>x.duration===1.65));h.player.stop();
});

test('tempo changes also retime count-in before the first exercise cue',async()=>{
 const h=harness();await h.start({bpm:50,countIn:2});await h.advance(.5);h.player.setExerciseTempo(160);await h.advance(1.3);
 const beatOne=.5+(1-(.5-.065)/1.2)*.375,exercise=.5+(2-(.5-.065)/1.2)*.375;
 const countClicks=h.audio.filter(x=>x.kind==='click'&&!x.cancelled&&x.at<exercise-1e-8);assert.equal(countClicks.length,2);near(countClicks[1].at,beatOne);near(h.scheduled.filter(x=>!x.event.cancelled)[0].at,exercise);h.player.stop();
});

test('edits before the first audible onset retain a safe initial lead',async()=>{
 const h=harness();await h.start({bpm:50});h.player.setExerciseTempo(160);h.player.setExerciseTempo(240);h.player.setExerciseTempo(75);await h.advance(.6);
 const first=h.scheduled.filter(x=>!x.event.cancelled&&x.cue.playbackSlotIndex===0);assert.equal(first.length,1);near(first[0].at,.065);
 assert.ok(h.audio.filter(x=>!x.cancelled).every(x=>x.at>=.033));h.player.stop();
});

test('custom beat timelines retain chord changes, pattern bars and stable slots across short cycles',async()=>{
 const h=harness(),c=chord('c'),g=chord('g'),timeline=[c,c,g,g,g];
 await h.start({bpm:120,progression:[c,g],timeline,pattern:'dudududu........',backing:null});await h.advance(5.2);
 const cues=h.scheduled.filter(x=>!x.event.cancelled);
 assert.equal(cues[8].cue.measureIndex,1);assert.equal(cues[8].cue.isRest,true);assert.equal(cues[10].cue.measureIndex,0);assert.equal(cues[10].cue.playbackSlotIndex,10);
 assert.deepEqual(h.audio.filter(x=>x.kind==='guitar').slice(0,8).map(x=>x.chord),['c','c','c','c','g','g','g','g']);h.player.stop();
});

test('Stop from an audio callback cancels the whole tick without installing more voices or timers',async()=>{
 const h=harness();assert.equal(await h.start({onSchedule(){h.player.stop();}}),false);
 assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);assert.ok(h.audio.every(x=>x.cancelled));assert.equal(h.audio.some(x=>x.kind==='drum'),false);
});
