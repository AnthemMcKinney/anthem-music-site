import {samplePitches} from './sample-pitches.js';
export const sampleFamily=instrument=>instrument==='bass'?'bass-electric':instrument==='violin'?'violin':instrument==='alto-sax'?'saxophone':'guitar-acoustic';
export function referenceSample(instrument,hz){
 const family=sampleFamily(instrument);
 return Object.entries(samplePitches).filter(([file])=>file.startsWith(family+'-')).map(([file,sourceHz])=>({file,sourceHz,distance:Math.abs(Math.log2(hz/sourceHz))})).sort((a,b)=>a.distance-b.distance)[0];
}
export class ReferencePlayer{
 constructor(){this.buffers=new Map();this.request=0;this.voice=null;}
 load(ctx,file){
  if(!this.buffers.has(file)){
   const promise=fetch(new URL('../samples/'+file,import.meta.url)).then(r=>{if(!r.ok)throw Error('Reference recording unavailable');return r.arrayBuffer();}).then(bytes=>ctx.decodeAudioData(bytes)).catch(error=>{this.buffers.delete(file);throw error;});
   this.buffers.set(file,promise);
  }
  return this.buffers.get(file);
 }
 prepare(ctx,instrument){return Promise.all(Object.keys(samplePitches).filter(file=>file.startsWith(sampleFamily(instrument)+'-')).map(file=>this.load(ctx,file)));}
 stop(){this.request++;this.voice?.stop();this.voice=null;}
 async play(ctx,instrument,hz){
  const request=++this.request;
  const sample=referenceSample(instrument,hz),buffer=await this.load(ctx,sample.file);
  if(request!==this.request)return null;
  this.voice?.stop();
  const source=ctx.createBufferSource(),gain=ctx.createGain(),now=ctx.currentTime;
  const rate=hz/sample.sourceHz,duration=Math.min(2.4,buffer.duration/rate);
  source.buffer=buffer;source.playbackRate.value=rate;
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.7,now+.003);
  gain.gain.setValueAtTime(.7,now+Math.max(.004,duration-.12));gain.gain.linearRampToValueAtTime(0,now+duration);
  source.connect(gain);gain.connect(ctx.destination);
  let stopped=false;
  const voice={stop:()=>{if(stopped)return;stopped=true;const time=ctx.currentTime;gain.gain.cancelAndHoldAtTime(time);gain.gain.linearRampToValueAtTime(0,time+.003);source.stop(time+.004);}};
  this.voice=voice;
  source.onended=()=>{stopped=true;source.disconnect();gain.disconnect();if(this.voice===voice)this.voice=null;};
  source.start(now);source.stop(now+duration+.005);
  return duration*1000+200;
 }
}
