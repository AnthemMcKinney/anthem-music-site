import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {Clock} from '../public/tuner/tuner/metronome.js';
const source=readFileSync(new URL('../public/tuner/tuner/chords.js',import.meta.url),'utf8');
function harness(){
 const classes=new Set(),attrs={},play={dataset:{playChord:'g'},classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x)},setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k]};let resolve,reject,stops=0,delay;
 const sandbox={play,byId:{g:{name:'G'}},playbackRequest:0,previewEndTimer:null,stopIcon:()=>'<square/>',clearPlaybackError(){},reportPlaybackError(error){sandbox.error=error.message;},resetExamples(){sandbox.playbackRequest++;classes.clear();},setTimeout(fn,ms){delay=ms;sandbox.finish=fn;},chordPlayer:{stop(){stops++;},play(){return new Promise((a,b)=>{resolve=a;reject=b;});}}};
 vm.createContext(sandbox);const start=source.indexOf("if(play){if(play.classList.contains('playing'))"),end=source.indexOf('const drums=e.target.closest',start);vm.runInContext('function tap(){'+source.slice(start,end)+'}',sandbox);
 return{sandbox,attrs,classes,tap:()=>sandbox.tap(),resolve:value=>resolve(value),reject:error=>reject(error),stops:()=>stops,delay:()=>delay};
}
test('single-chord stop cancels pending request and ignores its late completion',async()=>{
 const h=harness();h.tap();assert.equal(h.attrs['aria-label'],'Stop G chord');assert.equal(h.sandbox.play.innerHTML,'<square/>');h.tap();assert.equal(h.stops(),1);h.resolve(2000);await new Promise(setImmediate);assert.equal(h.delay(),undefined);assert.equal(h.classes.has('playing'),false);
});
test('single chord remains active for returned audio duration and resets on completion',async()=>{
 const h=harness();h.tap();h.resolve(2175);await new Promise(setImmediate);assert.equal(h.delay(),2175);assert.ok(h.classes.has('playing'));h.sandbox.finish();assert.equal(h.classes.has('playing'),false);
});
test('single-chord failure restores controls and reports error',async()=>{
 const h=harness();h.tap();h.reject(Error('Audio unavailable'));await new Promise(setImmediate);assert.equal(h.classes.has('playing'),false);assert.equal(h.sandbox.error,'Audio unavailable');
});
test('metronome Stop cancels every scheduled sample and oscillator voice',()=>{
 const clock=new Clock(()=>{});let stops=0;clock.track({stop(){stops++;},disconnect(){}});clock.track({stop(){stops++;},disconnect(){}});clock.running=true;clock.stop(false);assert.equal(stops,2);assert.equal(clock.voices.size,0);assert.equal(clock.running,false);
});
