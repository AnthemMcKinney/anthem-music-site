import {referenceSample} from './reference.js';

const midiHz=midi=>440*2**((midi-69)/12);
const tunings={
 guitar:[40,45,50,55,59,64],
 baritone:[50,55,59,64],
 ukulele:[67,60,64,69]
};

export class ChordPlayer{
 constructor(){this.ctx=null;this.buffers=new Map();this.voices=[];this.loopTimer=0;this.loopToken=0;this.cueFrame=0;this.cueQueue=[];this.onCue=null;this.exerciseGroove='click';this.unlocking=null;}
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
 unlock(){const ctx=this.context();if(ctx.state==='running')return Promise.resolve(ctx);if(this.unlocking)return this.unlocking;const resume=ctx.resume(),oscillator=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.00001,now+.025);oscillator.connect(gain).connect(ctx.destination);oscillator.start(now);oscillator.stop(now+.03);this.unlocking=Promise.resolve(resume).then(()=>{if(ctx.state!=='running')throw Error('Audio remains paused');return ctx;}).finally(()=>{this.unlocking=null;});return this.unlocking;}
 stop(){clearTimeout(this.loopTimer);this.loopTimer=0;cancelAnimationFrame(this.cueFrame);this.cueFrame=0;this.cueQueue=[];this.loopToken++;if(this.onCue)this.onCue(null);this.onCue=null;for(const voice of this.voices){try{voice.stop()}catch{}}this.voices=[];}
 setExerciseGroove(groove){this.exerciseGroove=groove==='rock'?'rock':'click';}
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
 click(ctx,buffer,when,accent=false){const source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter();source.buffer=buffer;tone.type='highpass';tone.frequency.value=accent?3600:4200;gain.gain.setValueAtTime(accent?.38:.27,when);gain.gain.exponentialRampToValueAtTime(.0001,when+.11);source.connect(tone).connect(gain).connect(this.master);source.start(when);source.stop(when+.125);this.voices.push(source);source.onended=()=>{source.disconnect();tone.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};}
 drum(ctx,buffer,when,level=.48){const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.setValueAtTime(level,when);gain.gain.exponentialRampToValueAtTime(.0001,when+Math.min(.48,buffer.duration));source.connect(gain).connect(this.master);source.start(when);source.stop(when+Math.min(.5,buffer.duration)+.02);this.voices.push(source);source.onended=()=>{source.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};}
 async play(chord){
  this.stop();const ctx=await this.unlock();
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
 async playExercise(progression,pattern='d.d.d.d.',bpm=84,onCue=null,groove='click'){
  this.stop();this.setExerciseGroove(groove);const token=this.loopToken,ctx=await this.unlock(),chords=progression.flat(),unique=[...new Map(chords.map(chord=>[chord.id,chord])).values()],kits=new Map(await Promise.all(unique.map(async chord=>[chord.id,await this.samples(chord)]))),hat=await this.load(ctx,'drums/closed-hat.wav'),kick=groove==='rock'?await this.load(ctx,'drums/kick.wav'):null,snare=groove==='rock'?await this.load(ctx,'drums/snare.wav'):null,beat=60/bpm,eighth=beat/2,measure=beat*4,cycle=progression.length*measure;
  if(token!==this.loopToken)return false;
  this.onCue=onCue;
  const strumLead=.032,slots=[...pattern.padEnd(8,'.').slice(0,8)],strokeIndexes=slots.map((stroke,index)=>stroke==='d'||stroke==='u'?index:-1).filter(index=>index>=0);
  const queueCue=(at,data)=>{if(onCue)this.cueQueue.push({at,data});};
  const cueTick=()=>{if(token!==this.loopToken)return;let cue=null;while(this.cueQueue[0]?.at<=ctx.currentTime+.025)cue=this.cueQueue.shift();if(cue)onCue(cue.data);this.cueFrame=requestAnimationFrame(cueTick);};
  const scheduleCycle=start=>progression.forEach((entry,measureIndex)=>{
   const measureStart=start+measureIndex*measure,beatChords=Array.isArray(entry);
   for(let index=0;index<8;index++){
    const activeStrokeIndex=strokeIndexes.filter(strokeIndex=>strokeIndex<=index).at(-1)??strokeIndexes.at(-1)??0;
    queueCue(measureStart+index*eighth,{measureIndex,slotIndex:index,activeStrokeIndex,isRest:slots[index]==='.',isDownbeat:index%2===0,beatChords});
   }
   strokeIndexes.forEach((index,position)=>{
    const next=strokeIndexes[position+1]??8,gap=(next-index)*eighth,duration=Math.min(2.3,Math.max(.82,gap+.38)),chord=beatChords?entry[Math.floor(index/2)]:entry;
    if(chord)this.stroke(chord,kits.get(chord.id),measureStart+index*eighth-strumLead,slots[index],duration);
   });
  });
  let nextCycleAt=ctx.currentTime+.065,nextBeatAt=nextCycleAt,rhythmBeat=0;
  const pump=()=>{if(token!==this.loopToken)return;while(nextCycleAt<ctx.currentTime+.3){scheduleCycle(nextCycleAt);nextCycleAt+=cycle;}while(nextBeatAt<ctx.currentTime+.3){if(this.exerciseGroove==='rock'&&kick&&snare){this.click(ctx,hat,nextBeatAt,rhythmBeat%4===0);this.click(ctx,hat,nextBeatAt+eighth,false);this.drum(ctx,rhythmBeat%2===0?kick:snare,nextBeatAt,rhythmBeat%2===0?.56:.5);}else this.click(ctx,hat,nextBeatAt,rhythmBeat%4===0);nextBeatAt+=beat;rhythmBeat=(rhythmBeat+1)%4;}this.loopTimer=setTimeout(pump,45);};
  if(onCue)this.cueFrame=requestAnimationFrame(cueTick);pump();return true;
 }
}

const familyTone=id=>id.startsWith('uke-')?5200:id.startsWith('bar-')?4700:4300;
