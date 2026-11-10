import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {ChordPlayer} from '../public/tuner/tuner/chord-audio.js';

function context(resume){
 const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
 const node=()=>({gain:param,connect(){return this;},disconnect(){},start(){},stop(){}});
 return {state:'suspended',currentTime:0,destination:{},createGain:node,createOscillator:node,resume};
}
test('unlock invokes resume synchronously, shares pending request, and can resume again',async()=>{
 let resolve,count=0;const p=new ChordPlayer(),ctx=context(()=>{count++;return new Promise(r=>resolve=r);});p.context=()=>ctx;
 const a=p.unlock();assert.equal(count,1);assert.equal(p.unlock(),a);ctx.state='running';resolve();assert.equal(await a,ctx);assert.equal(p.unlocking,null);
 ctx.state='suspended';const b=p.unlock();assert.equal(count,2);ctx.state='running';resolve();await b;
});
test('rejected resume is surfaced and a new tap can retry',async()=>{
 const p=new ChordPlayer(),ctx=context(()=>Promise.reject(Error('blocked')));p.context=()=>ctx;
 await assert.rejects(p.unlock(),/blocked/);assert.equal(p.unlocking,null);
 ctx.resume=()=>{ctx.state='running';return Promise.resolve();};await p.unlock();
});
test('hung resume times out, clears the lock, and permits retry',async()=>{
 const p=new ChordPlayer(),ctx=context(()=>new Promise(()=>{}));p.context=()=>ctx;
 const original=globalThis.setTimeout;globalThis.setTimeout=(fn,ms)=>original(fn,ms===4000?5:ms);
 try{await assert.rejects(p.unlock(),/Tap Play again/);assert.equal(p.unlocking,null);ctx.resume=()=>{ctx.state='running';return Promise.resolve();};await p.unlock();}finally{globalThis.setTimeout=original;}
});
test('single chord cancelled while samples load cannot start afterward',async()=>{
 const p=new ChordPlayer();let resolve,started=0;
 p.stop=()=>p.loopToken++;p.unlock=async()=>({currentTime:0,createBufferSource(){started++;throw Error('unexpected playback');}});
 p.pitches=()=>[440];p.load=()=>new Promise(r=>resolve=r);
 const playing=p.play({id:'a'});await Promise.resolve();p.stop();resolve({duration:1});assert.equal(await playing,null);assert.equal(started,0);
});
const scaleSource=readFileSync(new URL('../public/tuner/scales-lab/scales.js',import.meta.url),'utf8');
function scaleHarness(){
 const calls=[];let release;
 const elements=new Map();const $=id=>{if(!elements.has(id))elements.set(id,{value:id==='#backing-bars'?'1':id==='#tempo'?'75':'demo',textContent:''});return elements.get(id);};
 const sandbox={$,tabSteps:()=>[{midi:60}],backingPatterns:{demo:['c']},backingChords:{c:{id:'c'}},backingMix:()=>({drums:{enabled:false}}),setBackingButton(){},setDemoButton(){},showStep(){},calls,
 chordPlayer:{unlock(){calls.push('unlock');return new Promise(r=>release=r);},async prepareScaleTone(){calls.push('sample');},async playExercise(){calls.push('play');return true;},stop(){}}};
 vm.createContext(sandbox);
 const play=scaleSource.slice(scaleSource.indexOf('async function play('),scaleSource.indexOf('function setDemoButton'));
 const stopBacking=scaleSource.slice(scaleSource.indexOf('function stopBacking(){'),scaleSource.indexOf('\n',scaleSource.indexOf('function stopBacking(){')));
 vm.runInContext('let playing=false,backingPlaying=false,demoWithBacking=false,playToken=0,activeId="";function stop(){playToken++;playing=false;}'+play+stopBacking,sandbox);
 return {sandbox,calls,release:()=>release(),status:()=>$('#play-status').textContent};
}
test('scale Play unlocks before any sample preparation, then starts',async()=>{
 const h=scaleHarness(),pending=vm.runInContext('play("quarter")',h.sandbox);assert.deepEqual(h.calls,['unlock']);h.release();await pending;assert.deepEqual(h.calls,['unlock','sample','play']);
});
test('scale Stop while unlocking prevents delayed sample loading/playback',async()=>{
 const h=scaleHarness(),pending=vm.runInContext('play("quarter")',h.sandbox);vm.runInContext('stopBacking()',h.sandbox);h.release();await pending;assert.deepEqual(h.calls,['unlock']);
});
test('scale unlock failure gives error feedback and resets controls',async()=>{
 const h=scaleHarness();h.sandbox.chordPlayer.unlock=()=>Promise.reject(Error('Audio is paused. Tap Play again.'));
 await vm.runInContext('play("quarter")',h.sandbox);assert.match(h.status(),/Audio is paused/);assert.equal(vm.runInContext('playing||backingPlaying',h.sandbox),false);
});
test('main chord Play has no separate iPhone enable gate and reports failures',()=>{
 const source=readFileSync(new URL('../public/tuner/tuner/chords.js',import.meta.url),'utf8');assert.doesNotMatch(source,/requireSound\(/);assert.match(source,/reportPlaybackError\(error\)/);assert.match(source,/await chordPlayer\.unlock\(\);iosPrimed=true/);
});

test('older cancelled scale startup cannot stop a newer demo',async()=>{
 const h=scaleHarness();h.sandbox.chordPlayer.unlock=async()=>{};const pending=[];
 h.sandbox.chordPlayer.playExercise=()=>new Promise(r=>pending.push(r));
 const first=vm.runInContext('play("quarter")',h.sandbox);await new Promise(setImmediate);
 vm.runInContext('stopBacking()',h.sandbox);
 const second=vm.runInContext('play("quarter")',h.sandbox);await new Promise(setImmediate);
 pending[0](false);await first;assert.equal(vm.runInContext('playing&&backingPlaying',h.sandbox),true);
 pending[1](true);await second;
});

test('cancelled exercise cannot replace the newer tempo updater',async()=>{
 const p=new ChordPlayer();let resolve;const ctx={state:'running',currentTime:0};
 p.stop=()=>p.loopToken++;p.setExerciseGroove=()=>{};p.unlock=async()=>ctx;p.load=async()=>({});p.samples=()=>new Promise(r=>resolve=r);
 const playing=p.playExercise([{id:'c'}]);await Promise.resolve();p.stop();const newer=()=>{};p.exerciseTempoUpdater=newer;resolve({});
 assert.equal(await playing,false);assert.equal(p.exerciseTempoUpdater,newer);
});
test('a closed context does not reuse the old pending unlock',async()=>{
 const p=new ChordPlayer();let oldResolve;const old=context(()=>new Promise(r=>oldResolve=r));p.ctx=old;
 const originalContext=p.context;p.context=()=>old;const first=p.unlock();p.context=originalContext;old.state='closed';
 const parameter={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}};
 const node=()=>({gain:parameter,threshold:parameter,knee:parameter,ratio:parameter,attack:parameter,release:parameter,connect(){return this;},start(){},stop(){},disconnect(){}});
 const next={state:'suspended',currentTime:0,destination:{},createGain:node,createDynamicsCompressor:node,createOscillator:node,resume(){this.state='running';return Promise.resolve();}};
 const previous=globalThis.window;globalThis.window={AudioContext:function(){return next;}};
 try{const rejected=assert.rejects(first,/Audio is paused/);assert.equal(await p.unlock(),next);oldResolve();await rejected;}finally{globalThis.window=previous;}
});

test('reset on stop/new playback clears single-chord button state',()=>{
 const source=readFileSync(new URL('../public/tuner/tuner/chords.js',import.meta.url),'utf8'),start=source.indexOf('const resetExamples='),code=source.slice(start,source.indexOf('\n',start));
 const classes=new Set(['playing']),button={classList:{remove:name=>classes.delete(name)}};
 const sandbox={section:{querySelectorAll:selector=>selector==='[data-play-chord].playing'?[button]:[]},clearExerciseCue(){}};
 vm.createContext(sandbox);vm.runInContext(code+';resetExamples();',sandbox);assert.equal(classes.has('playing'),false);
});
