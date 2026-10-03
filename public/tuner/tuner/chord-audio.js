import {referenceSample} from './reference.js';

const midiHz=midi=>440*2**((midi-69)/12);
const tunings={
 guitar:[40,45,50,55,59,64],
 baritone:[50,55,59,64],
 ukulele:[67,60,64,69]
};

export class ChordPlayer{
 constructor(){this.ctx=null;this.buffers=new Map();this.voices=[];}
 context(){
  if(this.ctx)return this.ctx;
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  this.ctx=new AudioContext({latencyHint:'interactive'});
  this.master=this.ctx.createGain();this.master.gain.value=.78;
  this.compressor=this.ctx.createDynamicsCompressor();
  this.compressor.threshold.value=-12;this.compressor.knee.value=7;this.compressor.ratio.value=5;this.compressor.attack.value=.004;this.compressor.release.value=.2;
  this.master.connect(this.compressor).connect(this.ctx.destination);
  return this.ctx;
 }
 async load(ctx,file){
  if(!this.buffers.has(file))this.buffers.set(file,fetch(new URL('../samples/'+file,import.meta.url)).then(response=>{if(!response.ok)throw Error('Chord sample unavailable');return response.arrayBuffer();}).then(bytes=>ctx.decodeAudioData(bytes)).catch(error=>{this.buffers.delete(file);throw error;}));
  return this.buffers.get(file);
 }
 stop(){for(const voice of this.voices){try{voice.stop()}catch{}}this.voices=[];}
 pitches(chord){
  const family=chord.id.startsWith('bar-')?'baritone':chord.id.startsWith('uke-')?'ukulele':'guitar',open=tunings[family];
  return chord.frets.map((fret,index)=>fret==='x'?null:midiHz(open[index]+Number(fret))).filter(Boolean);
 }
 async samples(chord){
  const ctx=this.context(),pitches=this.pitches(chord),samples=pitches.map(hz=>({hz,...referenceSample('guitar',hz)})),buffers=await Promise.all(samples.map(sample=>this.load(ctx,sample.file)));
  return {ctx,pitches,samples,buffers};
 }
 stroke(chord,kit,when,direction='d',duration=.72){
  const {ctx,pitches,samples,buffers}=kit,all=pitches.map((_,index)=>index),order=direction==='u'?all.slice(-Math.min(4,all.length)).reverse():all,spacing=direction==='u'?.018:.024;
  order.forEach((sampleIndex,strokeIndex)=>{const buffer=buffers[sampleIndex],sample=samples[sampleIndex],source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter(),start=when+strokeIndex*spacing,rate=sample.hz/sample.sourceHz,voiceDuration=Math.min(duration,buffer.duration/rate);source.buffer=buffer;source.playbackRate.value=rate;tone.type='lowpass';tone.frequency.value=familyTone(chord.id);tone.Q.value=.3;const level=direction==='u'?.36:.53;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level,start+.008);gain.gain.setValueAtTime(level,start+Math.max(.02,voiceDuration-.18));gain.gain.exponentialRampToValueAtTime(.0001,start+voiceDuration);source.connect(tone).connect(gain).connect(this.master);source.start(start);source.stop(start+voiceDuration+.02);this.voices.push(source);source.onended=()=>{source.disconnect();tone.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};});
 }
 click(ctx,buffer,when,accent=false){const source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter();source.buffer=buffer;tone.type='highpass';tone.frequency.value=accent?4200:5000;gain.gain.setValueAtTime(accent?.18:.115,when);gain.gain.exponentialRampToValueAtTime(.0001,when+.085);source.connect(tone).connect(gain).connect(this.master);source.start(when);source.stop(when+.1);this.voices.push(source);source.onended=()=>{source.disconnect();tone.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};}
 async play(chord){
  const ctx=this.context();if(ctx.state!=='running')await ctx.resume();this.stop();
  const pitches=this.pitches(chord),samples=pitches.map(hz=>({hz,...referenceSample('guitar',hz)})),buffers=await Promise.all(samples.map(sample=>this.load(ctx,sample.file)));
  const now=ctx.currentTime+.025,spacing=pitches.length===4?.045:.038;
  buffers.forEach((buffer,index)=>{
   const sample=samples[index],source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter(),start=now+index*spacing,rate=sample.hz/sample.sourceHz,duration=Math.min(1.85,buffer.duration/rate);
   source.buffer=buffer;source.playbackRate.value=rate;tone.type='lowpass';tone.frequency.value=familyTone(chord.id);tone.Q.value=.3;
   const level=.8-index*.045;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.46,level),start+.012);gain.gain.setValueAtTime(Math.max(.46,level),start+Math.max(.03,duration-.28));gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
   source.connect(tone).connect(gain).connect(this.master);source.start(start);source.stop(start+duration+.02);this.voices.push(source);
   source.onended=()=>{source.disconnect();tone.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};
  });
  return (pitches.length-1)*spacing*1000+1900;
 }
 async playExercise(progression,pattern='d.d.d.d.',bpm=84){
  const ctx=this.context();if(ctx.state!=='running')await ctx.resume();this.stop();const chords=progression.flat(),unique=[...new Map(chords.map(chord=>[chord.id,chord])).values()],kits=new Map(await Promise.all(unique.map(async chord=>[chord.id,await this.samples(chord)]))),hat=await this.load(ctx,'drums/closed-hat.wav'),beat=60/bpm,eighth=beat/2,measure=beat*4,start=ctx.currentTime+.08;
  progression.forEach((entry,measureIndex)=>{const measureStart=start+measureIndex*measure;for(let beatIndex=0;beatIndex<4;beatIndex++)this.click(ctx,hat,measureStart+beatIndex*beat,beatIndex===0);if(Array.isArray(entry)){entry.slice(0,4).forEach((chord,index)=>this.stroke(chord,kits.get(chord.id),measureStart+index*beat,'d',Math.min(1.45,beat*1.7)));return;}const slots=[...pattern.padEnd(8,'.').slice(0,8)],strokeIndexes=slots.map((stroke,index)=>stroke==='d'||stroke==='u'?index:-1).filter(index=>index>=0);strokeIndexes.forEach((index,position)=>{const next=strokeIndexes[position+1]??8,gap=(next-index)*eighth,duration=Math.min(1.5,Math.max(.68,gap*1.62));this.stroke(entry,kits.get(entry.id),measureStart+index*eighth,slots[index],duration);});});
  return (progression.length*measure+.4)*1000;
 }
}

const familyTone=id=>id.startsWith('uke-')?5200:id.startsWith('bar-')?4700:4300;
