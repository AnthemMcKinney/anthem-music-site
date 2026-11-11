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
function exerciseControlHarness(){
 const start=source.indexOf('const renderExerciseControl='),code=source.slice(start,source.indexOf('\n',start)),classes=new Set(),attrs={},caption={textContent:'Play'},span={},svg={},card={dataset:{startMeasure:'0'}},builderClasses=new Set();let custom=false;
 const button={classList:{contains:name=>classes.has(name),toggle(name,on){if(on)classes.add(name);else classes.delete(name);}},closest(selector){return selector==='.custom-dynamic-progression'?custom?{classList:{toggle(name,on){if(on)builderClasses.add(name);else builderClasses.delete(name);}}}:null:selector==='[data-audio-progression]'?card:selector==='.exercise-tool-play'&&!custom?{querySelector:()=>caption}:null;},setAttribute:(k,v)=>attrs[k]=v,querySelector:selector=>selector==='svg'?svg:span};
 const sandbox={button,playIcon:()=>'<play/>',stopIcon:()=>'<stop/>'};vm.createContext(sandbox);vm.runInContext(code+';globalThis.render=renderExerciseControl;',sandbox);
 return{render:active=>sandbox.render(button,active),button,attrs,caption,span,svg,card,custom:()=>custom=true};
}
test('exercise caption, tooltip, accessible label and icon change together for pending/active and reset',()=>{
 const h=exerciseControlHarness();h.render(true);assert.equal(h.caption.textContent,'Stop');assert.equal(h.span.textContent,'Stop');assert.equal(h.svg.outerHTML,'<stop/>');assert.equal(h.attrs['aria-pressed'],'true');assert.equal(h.button.title,h.attrs['aria-label']);assert.match(h.button.title,/^Stop/);
 h.render(false);assert.equal(h.caption.textContent,'Play');assert.equal(h.span.textContent,'Play');assert.equal(h.svg.outerHTML,'<play/>');assert.equal(h.attrs['aria-pressed'],'false');assert.equal(h.button.title,'Play exercise from measure 1');
});
test('nonfirst-measure label refresh preserves Stop when active and restores selected idle measure',()=>{
 const h=exerciseControlHarness();h.render(true);h.card.dataset.startMeasure='2';h.render();assert.equal(h.button.title,'Stop progression');assert.equal(h.caption.textContent,'Stop');h.render(false);assert.equal(h.button.title,'Play exercise from measure 3');assert.equal(h.attrs['aria-label'],h.button.title);
});
test('custom progression shares the same state renderer without an external caption',()=>{
 const h=exerciseControlHarness();h.custom();h.card.dataset.startMeasure='1';h.render(true);assert.equal(h.span.textContent,'Stop');assert.equal(h.button.title,'Stop progression');h.render(false);assert.equal(h.span.textContent,'Play');assert.equal(h.button.title,'Play progression from measure 2');
});
