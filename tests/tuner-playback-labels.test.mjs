import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../public/tuner/app.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('async function playTargetReference(){'),source.indexOf('function suspendForBackground(){'));
function harness(){
 const elements=new Map(),pending=[],timers=new Map();let id=0;
 const $=key=>{if(!elements.has(key))elements.set(key,{textContent:'',hidden:true});return elements.get(key);};
 const sandbox={$,trail:{clear(){}},performance:{now:()=>100},instrument:{id:'guitar'},frequency:()=>82.4,target:()=> 'E2',saxophone:()=>false,chromatic:()=>false,updateTarget(){},
  engine:{play:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))},
  message(title,hint){$('guidance').textContent=title;$('hint').textContent=hint;},
  clear(){ $('live-caption').textContent='WAITING FOR YOUR NOTE';$('guidance').textContent='Play a string';},
  setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(id){timers.delete(id);}};
 vm.createContext(sandbox);vm.runInContext('let referenceRequest=0,referenceTimer,playUntil=0;'+body,sandbox);
 return {$,pending,timers,start:()=>sandbox.playTargetReference(),invalidate:()=>vm.runInContext('referenceRequest++;playUntil=0;clear();',sandbox)};
}

test('tuner reference copy follows loading, playing, and natural completion',async()=>{
 const h=harness(),run=h.start();assert.equal(h.$('guidance').textContent,'Loading reference note');
 h.pending[0].resolve(2000);await run;assert.equal(h.$('guidance').textContent,'Listen to your string');assert.equal(h.$('live-caption').textContent,'REFERENCE NOTE');assert.match(h.$('hint').textContent,/Tap again to replay/);
 [...h.timers.values()][0]();assert.equal(h.$('guidance').textContent,'Play a string');assert.equal(h.$('live-caption').textContent,'WAITING FOR YOUR NOTE');
});

test('reference failure clears stale playing text and retry clears the error',async()=>{
 const h=harness(),first=h.start();h.pending[0].reject(Error('unavailable'));await first;
 assert.equal(h.$('guidance').textContent,'Reference note unavailable');assert.equal(h.$('error').hidden,false);assert.match(h.$('hint').textContent,/Tap the string again/);
 const retry=h.start();assert.equal(h.$('error').hidden,true);assert.equal(h.$('guidance').textContent,'Loading reference note');h.pending[1].resolve(100);await retry;assert.equal(h.$('guidance').textContent,'Listen to your string');
});

test('older completion or failure cannot replace newer reference copy',async()=>{
 for(const failure of [false,true]){
  const h=harness(),first=h.start(),second=h.start();h.pending[1].resolve(100);await second;
  failure?h.pending[0].reject(Error('old failure')):h.pending[0].resolve(100);await first;
  assert.equal(h.$('guidance').textContent,'Listen to your string');assert.equal(h.$('error').hidden,true);assert.equal(h.timers.size,1);
 }
});

test('cancelled reference cannot leave loading/playing copy behind',async()=>{
 const h=harness(),run=h.start();h.invalidate();h.pending[0].resolve(100);await run;assert.equal(h.$('guidance').textContent,'Play a string');assert.equal(h.timers.size,0);
 assert.match(source,/function suspendForBackground\(\)[^\n]*playUntil=0;clear\(\)/);
 assert.match(source,/if\(!tuner\)[^\n]*playUntil=0;clear\(\)/);
});
