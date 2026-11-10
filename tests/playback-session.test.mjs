import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=name=>readFileSync(new URL('../public/tuner/tuner/'+name,import.meta.url),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness({modern=false,throwing=false,ios=true,play}={}){
 const events=[],media=[],listeners={},navigator={userAgent:ios?'iPhone':'Linux'};
 if(modern)navigator.audioSession={type:'auto'};
 if(throwing)Object.defineProperty(navigator,'audioSession',{get(){throw Error('unsupported');}});
 class Audio{constructor(){media.push(this);}play(){events.push('native-play');return play?.()??Promise.resolve();}pause(){events.push('native-pause');}}
 const sandbox={URL,Promise,Map,WeakMap,navigator,Audio,setTimeout,clearTimeout,cancelAnimationFrame(){},document:{hidden:false,addEventListener(type,fn){listeners[type]=fn;}},window:{addEventListener(type,fn){listeners[type]=fn;}},referenceSample:()=>({file:'guitar.wav',sourceHz:440})};
 vm.createContext(sandbox);
 const transform=s=>s.replace(/^import .*\n/gm,'').replace(/export /g,'').replaceAll('import.meta.url',JSON.stringify('https://example.com/tuner/tuner/module.js'));
 vm.runInContext(transform(source('playback-session.js'))+'\nglobalThis.api={createPlaybackSession,unlockAudioContext,releasePlayback,prepareForMicrophone};',sandbox);
 vm.runInContext(transform(source('chord-audio.js'))+'\nglobalThis.ChordPlayer=ChordPlayer;',sandbox);
 vm.runInContext(transform(source('metronome.js'))+'\nglobalThis.Clock=Clock;',sandbox);
 return {sandbox,...sandbox.api,events,media,listeners,navigator};
}
function context(events,state='running',resume){
 const param={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}};
 const node=()=>({gain:param,frequency:param,threshold:param,knee:param,ratio:param,attack:param,release:param,connect(){return this;},disconnect(){},start(){events.push('source-start');},stop(){}});
 const ctx={state,currentTime:0,destination:{},createGain:node,createOscillator:node,createDynamicsCompressor:node,resume(){events.push('resume');if(resume)return resume(ctx);ctx.state='running';return Promise.resolve();}};return ctx;
}
for(const name of ['ChordPlayer','Clock'])test(`${name} first Play activates playback even with an already-running context`,async()=>{
 const h=harness({modern:true}),player=new h.sandbox[name](()=>{}),ctx=context(h.events);player.context=()=>ctx;
 const pending=player.unlock();assert.equal(h.navigator.audioSession.type,'playback');assert.equal(h.media.length,0);assert.equal(await pending,ctx);player.stop();assert.equal(h.navigator.audioSession.type,'auto');
});
for(const throwing of [false,true])test(`legacy iOS ${throwing?'throwing':'missing'} audioSession starts native media before resume or await`,async()=>{
 const h=harness({throwing});let finish;const ctx=context(h.events,'suspended',()=>new Promise(resolve=>finish=resolve)),owner={};
 const pending=h.unlockAudioContext(ctx,owner);assert.deepEqual(h.events.slice(0,2),['native-play','resume']);assert.equal(h.media[0].loop,true);assert.equal(h.media[0].volume,1);assert.notEqual(h.media[0].muted,true);ctx.state='running';finish();await pending;h.releasePlayback(owner);assert.equal(h.events.at(-1),'native-pause');
});
test('unsupported session API on non-iOS does not introduce native media playback',async()=>{
 const h=harness({ios:false,throwing:true}),owner={};await h.unlockAudioContext(context(h.events),owner);assert.equal(h.media.length,0);h.releasePlayback(owner);
});
test('native activation failure releases ownership and next gesture retries',async()=>{
 let attempts=0;const h=harness({play:()=>++attempts===1?Promise.reject(Error('blocked')):Promise.resolve()}),owner={},ctx=context(h.events);
 await assert.rejects(h.unlockAudioContext(ctx,owner),/blocked/);assert.equal(h.events.at(-1),'native-pause');await h.unlockAudioContext(ctx,owner);assert.equal(attempts,2);h.releasePlayback(owner);
});
test('owners share media; releasing an older lease cannot release its replacement',async()=>{
 const h=harness(),session=h.createPlaybackSession(),a={},b={},old=session.activate(a),other=session.activate(b);await Promise.all([old.ready,other.ready]);assert.equal(h.events.filter(x=>x==='native-play').length,1);
 old.release();assert.equal(h.events.includes('native-pause'),false);const replacement=session.activate(a);old.release();assert.equal(replacement.active,true);other.release();assert.equal(h.events.includes('native-pause'),false);replacement.release();assert.equal(h.events.at(-1),'native-pause');
});
test('stale rejected startup cannot tear down a newer lease for the same player',async()=>{
 const starts=[];const h=harness({play:()=>new Promise((resolve,reject)=>starts.push({resolve,reject}))}),owner={},ctx=context(h.events);
 const old=h.unlockAudioContext(ctx,owner),rejection=assert.rejects(old,/old failed/);h.releasePlayback(owner);const next=h.unlockAudioContext(ctx,owner);starts[1].resolve();await next;const pauses=h.events.filter(x=>x==='native-pause').length;starts[0].reject(Error('old failed'));await rejection;assert.equal(h.events.filter(x=>x==='native-pause').length,pauses);h.releasePlayback(owner);
});
for(const cause of ['release','microphone','visibilitychange','pagehide'])test(`${cause} cancels pending activation and requires a fresh lease`,async()=>{
 let finish;const h=harness({play:()=>new Promise(resolve=>finish=resolve)}),owner={},ctx=context(h.events),pending=h.unlockAudioContext(ctx,owner),rejection=assert.rejects(pending,/cancelled/);
 if(cause==='release')h.releasePlayback(owner);else if(cause==='microphone')h.prepareForMicrophone();else{h.sandbox.document.hidden=true;h.listeners[cause]();}finish();await rejection;assert.equal(h.events.at(-1),'native-pause');
});
test('microphone reset clears playback owners and switches session to auto',async()=>{
 const h=harness({modern:true}),owner={};h.navigator.audioSession.type='ambient';await h.unlockAudioContext(context(h.events),owner);assert.equal(h.navigator.audioSession.type,'playback');h.prepareForMicrophone();assert.equal(h.navigator.audioSession.type,'auto');h.releasePlayback(owner);assert.equal(h.navigator.audioSession.type,'auto');
});
test('TunerAudio requests microphone session before resuming context or asking permission',async()=>{
 const h=harness({modern:true});await h.unlockAudioContext(context(h.events),{});let requested=false;
 h.sandbox.isSecureContext=true;h.navigator.mediaDevices={getUserMedia(){requested=true;assert.equal(h.navigator.audioSession.type,'auto');throw Error('test stops before recording');}};
 h.sandbox.ReferencePlayer=class{};h.sandbox.PitchTracker=class{};
 const text=source('audio.js').replace(/^import .*\n/gm,'').replace(/export /g,'').replaceAll('import.meta.url',JSON.stringify('https://example.com/tuner/tuner/audio.js'));
 vm.runInContext(text+'\nglobalThis.TunerAudio=TunerAudio;',h.sandbox);const tuner=new h.sandbox.TunerAudio(()=>{},()=>{});tuner.context=async()=>{assert.equal(h.navigator.audioSession.type,'auto');return {};};await assert.rejects(tuner.start(),/test stops/);assert.equal(requested,true);
});
for(const name of ['ChordPlayer','Clock'])test(`${name} Stop during activation cannot schedule playback`,async()=>{
 let finish;const h=harness({play:()=>new Promise(resolve=>finish=resolve)}),player=new h.sandbox[name](()=>{}),ctx=context(h.events);player.context=()=>ctx;let scheduled=false;
 if(name==='Clock')player.schedule=()=>scheduled=true;else{player.pitches=()=>[440];player.load=async()=>({duration:1});ctx.createBufferSource=()=>{scheduled=true;throw Error('unexpected source');};}
 const pending=name==='Clock'?player.start():player.play({id:'c'});const result=Promise.resolve(pending).catch(error=>error);player.stop();finish();await result;assert.equal(scheduled,false);assert.equal(h.events.at(-1),'native-pause');
});
test('chord sample failure releases native output rather than leaving silent loop running',async()=>{
 const h=harness(),player=new h.sandbox.ChordPlayer(),ctx=context(h.events);player.context=()=>ctx;player.pitches=()=>[440];player.load=async()=>{throw Error('sample unavailable');};await assert.rejects(player.play({id:'c'}),/sample unavailable/);await flush();assert.equal(h.events.at(-1),'native-pause');
});
test('exercise sample failure also releases native playback ownership',async()=>{
 const h=harness(),player=new h.sandbox.ChordPlayer(),ctx=context(h.events);player.context=()=>ctx;player.samples=async()=>{throw Error('exercise sample unavailable');};await assert.rejects(player.playExercise([{id:'c'}]),/exercise sample unavailable/);assert.equal(h.events.at(-1),'native-pause');
});
test('older chord sample failure cannot release newer playback ownership',async()=>{
 let fail;const h=harness(),player=new h.sandbox.ChordPlayer(),ctx=context(h.events);player.context=()=>ctx;player.pitches=()=>[440];player.load=()=>new Promise((resolve,reject)=>fail=reject);
 const pending=player.play({id:'c'}),rejected=assert.rejects(pending,/old sample/);await flush();player.stop();await player.unlock();const pauses=h.events.filter(x=>x==='native-pause').length;fail(Error('old sample'));await rejected;assert.equal(h.events.filter(x=>x==='native-pause').length,pauses);player.stop();
});
