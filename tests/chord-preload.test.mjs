import test from 'node:test';
import assert from 'node:assert/strict';
import {ChordPlayer} from '../public/tuner/tuner/chord-audio.js';

const cadd9={id:'cadd9',frets:['x',3,2,0,3,3]};
const sampleResponse=()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});

test('warming a chord fetches only unique recordings without audio initialization',async()=>{
 const original=globalThis.fetch,calls=[];globalThis.fetch=async url=>{calls.push(String(url).split('/').at(-1));return sampleResponse();};
 try{
  const player=new ChordPlayer();player.context=()=>assert.fail('preload must not create an AudioContext');player.unlock=()=>assert.fail('preload must not take the audio session');
  await player.prepareChords([cadd9,cadd9]);await player.prepareChords([cadd9]);
  assert.deepEqual(calls.sort(),['guitar-acoustic-D3.wav','guitar-acoustic-E4.wav','guitar-acoustic-G3.wav']);assert.equal(player.ctx,null);assert.equal(player.buffers.size,0);
 }finally{globalThis.fetch=original;}
});

test('playback shares an in-flight preload and keeps cached bytes safe from decoding',async()=>{
 const original=globalThis.fetch;let release,fetches=0,decodes=0;
 globalThis.fetch=()=>{fetches++;return new Promise(resolve=>release=()=>resolve(sampleResponse()));};
 try{
  const player=new ChordPlayer(),ctx={decodeAudioData:async bytes=>{decodes++;structuredClone(bytes,{transfer:[bytes]});return {duration:2};}};
  const preload=player.fetchBytes('guitar-acoustic-D3.wav'),first=player.load(ctx,'guitar-acoustic-D3.wav'),second=player.load(ctx,'guitar-acoustic-D3.wav');
  release();await Promise.all([preload,first,second]);assert.equal(fetches,1);assert.equal(decodes,1);assert.equal((await preload).byteLength,8);
 }finally{globalThis.fetch=original;}
});

test('a failed background sample fetch is evicted and a later Play can retry',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>++calls===1?{ok:false}:sampleResponse();
 try{
  const player=new ChordPlayer(),ctx={decodeAudioData:async()=>({duration:2})};
  await assert.rejects(player.fetchBytes('guitar-acoustic-D3.wav'),/sample unavailable/);
  assert.equal(player.bytes.has('guitar-acoustic-D3.wav'),false);
  assert.equal((await player.load(ctx,'guitar-acoustic-D3.wav')).duration,2);assert.equal(calls,2);
 }finally{globalThis.fetch=original;}
});

test('later chord preparation decodes into an existing context but creates no source',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>sampleResponse();
 try{
  const player=new ChordPlayer();let decodes=0;
  player.ctx={state:'suspended',decodeAudioData:async()=>{decodes++;return {duration:2};},createBufferSource:()=>assert.fail('preload cannot sound')};
  await player.prepareChords([cadd9]);await player.prepareChords([cadd9]);assert.equal(decodes,3);assert.equal(player.buffers.size,3);
 }finally{globalThis.fetch=original;}
});

test('a decode failure evicts both caches so later playback can refetch clean bytes',async()=>{
 const original=globalThis.fetch;let fetches=0,decodes=0;globalThis.fetch=async()=>{fetches++;return sampleResponse();};
 try{
  const player=new ChordPlayer(),ctx={decodeAudioData:async()=>{if(++decodes===1)throw Error('bad recording');return {duration:2};}};
  await assert.rejects(player.load(ctx,'guitar-acoustic-D3.wav'),/bad recording/);
  assert.equal(player.bytes.size,0);assert.equal(player.buffers.size,0);
  await player.load(ctx,'guitar-acoustic-D3.wav');assert.equal(fetches,2);assert.equal(decodes,2);
 }finally{globalThis.fetch=original;}
});
