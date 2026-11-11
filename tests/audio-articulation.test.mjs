import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {ChordPlayer} from '../public/tuner/tuner/chord-audio.js';

const source=readFileSync(new URL('../public/tuner/scales-lab/scales.js',import.meta.url),'utf8');
function notesHarness({waitForSamples=false}={}){
 const calls=[],timers=new Map(),ctx={currentTime:0};let release;
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{value:id==='#tempo'?'75':'',hidden:false,textContent:''});return elements.get(id);};
 const steps=[{midi:60},{midi:62},{midi:64}];
 const sandbox={$,canPlay:()=>true,tabSteps:()=>steps,showStep(){},setTabPlayButton(){},stopBacking(){},
  setInterval(fn){calls.push(['timer']);timers.set(1,fn);return 1;},clearInterval(id){timers.delete(id);},setTimeout(){},
  chordPlayer:{stop(){calls.push(['stop']);},async unlock(){calls.push(['unlock']);return ctx;},
   prepareScaleTone(midi){calls.push(['prepare',midi]);return waitForSamples?new Promise(resolve=>release=resolve):Promise.resolve();},
   load(...args){calls.push(['load',...args]);return Promise.resolve({});},click(...args){calls.push(['click',...args]);},drum(...args){calls.push(['drum',...args]);},playScaleTone(...args){calls.push(['note',...args]);}}};
 // One pending sample is enough to exercise cancellation at the preload boundary.
 if(waitForSamples)sandbox.tabSteps=()=>[steps[0]];
 vm.createContext(sandbox);
 vm.runInContext('let tabPlaying=false,backingPlaying=false,playing=false,tabToken=0,tabTimer=0,tabIndex=0,tabNextAt=0;'+source.slice(source.indexOf('function stopTabPlayback(){'),source.indexOf('async function play(noteValue=')),sandbox);
 return {calls,timers,ctx,start:()=>sandbox.playTabPattern(),stop:()=>sandbox.stopTabPlayback(),release:()=>release()};
}
test('Play Notes schedules only pitched tones, with no hidden click or drum sample',async()=>{
 const h=notesHarness();await h.start();assert.equal(h.timers.size,1);
 for(let i=0;i<3;i++){h.ctx.currentTime=i*.8;h.timers.get(1)();}
 assert.deepEqual(h.calls.filter(([kind])=>kind==='note').map(([,midi,duration,at])=>[midi,duration,Number(at.toFixed(2))]),[[60,.768,.08],[62,.768,.88],[64,.768,1.68]]);
 assert.equal(h.calls.filter(([kind])=>['load','click','drum'].includes(kind)).length,0);
 h.stop();assert.equal(h.timers.size,0);
});
test('Stop during Play Notes sample preload cannot install a late scheduler',async()=>{
 const h=notesHarness({waitForSamples:true}),pending=h.start();await new Promise(setImmediate);h.stop();h.release();await pending;
 assert.equal(h.timers.size,0);assert.equal(h.calls.some(([kind])=>kind==='timer'||kind==='note'),false);
});

function audioHarness(){
 const sources=[],gains=[];
 const param=()=>({value:0,events:[],setValueAtTime(value,at){this.events.push(['set',value,at]);},exponentialRampToValueAtTime(value,at){this.events.push(['ramp',value,at]);}});
 const node=()=>({connect(){return this;},disconnect(){}});
 const ctx={currentTime:0,createBufferSource(){const result={...node(),playbackRate:param(),start(at){this.started=at;},stop(at){this.stopped=at;}};sources.push(result);return result;},createGain(){const result={...node(),gain:param()};gains.push(result);return result;},createBiquadFilter(){return {...node(),frequency:param(),Q:param(),gain:param()};}};
 const player=new ChordPlayer();player.context=()=>ctx;player.unlock=async()=>ctx;player.stop=()=>player.loopToken++;player.load=async()=>({duration:3});player.master=node();player.exerciseBacking=node();
 return {player,ctx,sources,gains};
}
const chords=[{id:'g',frets:[3,2,0,0,3,3],attack:.022,spacing:.012},{id:'uke-c',frets:[0,0,0,3],attack:.03,spacing:.045},{id:'bar-g',frets:[0,0,0,3],attack:.03,spacing:.045}];
for(const chord of chords)test(`${chord.id} standalone chord has a gentler attack and unchanged string timing`,async()=>{
 const h=audioHarness();await h.player.play(chord);clearTimeout(h.player.audioReleaseTimer);
 assert.equal(h.sources.length,chord.frets.length);
 h.sources.forEach((voice,i)=>{
  assert.ok(Math.abs(voice.started-(.025+i*chord.spacing))<1e-10);
  const [initial,peak,sustain]=h.gains[i].gain.events;
  assert.equal(initial[1],.0001);assert.ok(Math.abs(peak[2]-voice.started-chord.attack)<1e-10);
  assert.equal(peak[1],Math.max(.46,.8-i*.045));assert.ok(sustain[2]>peak[2]);
 });
});
for(const chord of chords)for(const direction of ['d','u'])test(`${chord.id} ${direction} stroke softens the envelope without slowing its string sequence`,async()=>{
 const h=audioHarness(),kit=await h.player.samples(chord);h.player.stroke(chord,kit,1,direction,.72,'full');
 const guitar=chord.id==='g',attack=guitar?.012:.015,spacing=guitar?(direction==='u'?.009:.011):(direction==='u'?.008:.017);
 assert.equal(h.sources.length,chord.frets.length);
 h.sources.forEach((voice,i)=>{assert.ok(Math.abs(voice.started-(1+i*spacing))<1e-10);const peak=h.gains[i].gain.events[1];assert.ok(Math.abs(peak[2]-voice.started-attack)<1e-10);assert.equal(peak[1],.64);});
});
