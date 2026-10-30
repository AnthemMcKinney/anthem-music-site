import {referenceSample} from './reference.js';

const midiHz=midi=>440*2**((midi-69)/12);
const tunings={
 guitar:[40,45,50,55,59,64],
 baritone:[50,55,59,64],
 ukulele:[67,60,64,69]
};

// Downstrokes use the chord's full intended voicing. Upstrokes stay lighter
// and favor the upper strings, as they do on a real guitar.
export function strokeIsClustered(slotIndex,strokeIndexes,slotsPerBeat){
 const fastStep=slotsPerBeat/2;
 return strokeIndexes.some(other=>other!==slotIndex&&Math.abs(other-slotIndex)<=fastStep);
}

export function exerciseStrokeVoicing(pattern,subdivision,position,slotIndex,slotsPerBeat,direction,clustered=false){
 const accent=pattern==='d.d.d.du.ud.d.du'&&(position%10===2||position%10===7)
  ||pattern==='d...d.du.ud.d...'&&(position%7===2||position%7===6);
 const range=direction==='d'?'full':direction==='u'?'high':'low';
 return {range,strength:accent?.88:slotIndex%slotsPerBeat===0?.76:.64};
}

export function strumStringIndexes(pitches,direction,range,stringCount){
 const all=pitches.map((_,index)=>index),count=all.length;
 const take=Math.max(1,Math.min(count,stringCount??(count<=4?3:4)));
 const selected=range==='low'?all.slice(0,take):range==='high'?all.slice(-take):all;
 return direction==='u'?selected.reverse():selected;
}

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
  // Keep the rhythm guide out of the chord compressor so guitar transients
  // cannot bury the click, kick, snare, or hi-hat.
  this.rhythm=this.ctx.createGain();this.rhythm.gain.value=.95;
  this.rhythmLimiter=this.ctx.createDynamicsCompressor();
  this.rhythmLimiter.threshold.value=-4;this.rhythmLimiter.knee.value=3;this.rhythmLimiter.ratio.value=10;this.rhythmLimiter.attack.value=.001;this.rhythmLimiter.release.value=.09;
  this.rhythm.connect(this.rhythmLimiter).connect(this.ctx.destination);
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
  const ctx=this.context(),pitches=this.pitches(chord);
  // A is the fifth under the guitar D shape; include it for the downstroke.
  if(chord.id==='d')pitches.unshift(midiHz(tunings.guitar[1]));
  const samples=pitches.map(hz=>({hz,...referenceSample('guitar',hz)})),buffers=await Promise.all(samples.map(sample=>this.load(ctx,sample.file)));
  return {ctx,pitches,samples,buffers};
 }
 stroke(chord,kit,when,direction='d',duration=.72,range='full',strength=1,stringCount){
  // Keep the fretted D on the B string audible in the anchored 320033 G shape.
  // Four-string low-range playback otherwise stops at the G string and makes
  // the exercise sound like the open-B 320003 voicing that we do not teach.
  const exerciseStringCount=chord.id==='g'&&direction==='d'&&range==='low'?5:chord.id==='d'&&direction==='u'?3:stringCount;
  const {ctx,pitches,samples,buffers}=kit,order=strumStringIndexes(pitches,direction,range,exerciseStringCount),guitar=isGuitarChord(chord.id),spacing=guitar?(direction==='u'?.009:.011):direction==='u'?.008:.017;
  order.forEach((sampleIndex,strokeIndex)=>{const buffer=buffers[sampleIndex],sample=samples[sampleIndex],source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter(),presence=ctx.createBiquadFilter(),start=when+strokeIndex*spacing,rate=sample.hz/sample.sourceHz,voiceDuration=Math.min(duration,buffer.duration/rate);source.buffer=buffer;source.playbackRate.value=rate;tone.type='lowpass';tone.frequency.value=familyTone(chord.id);tone.Q.value=.3;presence.type='highshelf';presence.frequency.value=2800;presence.gain.value=isGuitarChord(chord.id)?2.5:0;const level=({low:.4,mid:.42,high:.35,full:.64}[range]||.42)*strength,attack=isGuitarChord(chord.id)?.003:.006;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level,start+attack);gain.gain.exponentialRampToValueAtTime(level*.64,start+Math.min(.28,voiceDuration*.25));gain.gain.setValueAtTime(level*.64,start+Math.max(.3,voiceDuration-.28));gain.gain.exponentialRampToValueAtTime(.0001,start+voiceDuration);source.connect(tone).connect(presence).connect(gain).connect(this.master);source.start(start);source.stop(start+voiceDuration+.01);this.voices.push(source);source.onended=()=>{source.disconnect();tone.disconnect();presence.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};});
 }
 click(ctx,buffer,when,accent=false,level=accent?.5:.38){const source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter();source.buffer=buffer;tone.type='highpass';tone.frequency.value=accent?2200:2800;gain.gain.setValueAtTime(level,when);gain.gain.exponentialRampToValueAtTime(.0001,when+.14);source.connect(tone).connect(gain).connect(this.rhythm);source.start(when);source.stop(when+.155);this.voices.push(source);source.onended=()=>{source.disconnect();tone.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};}
 drum(ctx,buffer,when,level=.6,voice='snare'){const source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter();source.buffer=buffer;tone.type=voice==='kick'?'lowshelf':'peaking';tone.frequency.value=voice==='kick'?140:1900;tone.gain.value=voice==='kick'?8:4;if(voice!=='kick')tone.Q.value=.7;gain.gain.setValueAtTime(level,when);gain.gain.exponentialRampToValueAtTime(.0001,when+Math.min(.62,buffer.duration));source.connect(tone).connect(gain).connect(this.rhythm);source.start(when);source.stop(when+Math.min(.64,buffer.duration)+.02);this.voices.push(source);source.onended=()=>{source.disconnect();tone.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};}
 async play(chord){
  this.stop();const ctx=await this.unlock();
  const pitches=this.pitches(chord),samples=pitches.map(hz=>({hz,...referenceSample('guitar',hz)})),buffers=await Promise.all(samples.map(sample=>this.load(ctx,sample.file)));
  const now=ctx.currentTime+.025,spacing=isGuitarChord(chord.id)?.012:pitches.length===4?.045:.038;
  buffers.forEach((buffer,index)=>{
   const sample=samples[index],source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter(),presence=ctx.createBiquadFilter(),start=now+index*spacing,rate=sample.hz/sample.sourceHz,duration=Math.min(1.85,buffer.duration/rate);
   source.buffer=buffer;source.playbackRate.value=rate;tone.type='lowpass';tone.frequency.value=familyTone(chord.id);tone.Q.value=.3;presence.type='highshelf';presence.frequency.value=2800;presence.gain.value=isGuitarChord(chord.id)?2.5:0;
   const level=Math.max(.46,.8-index*.045),attack=isGuitarChord(chord.id)?.004:.012,sustain=isGuitarChord(chord.id)?level*.7:level;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level,start+attack);gain.gain.exponentialRampToValueAtTime(sustain,start+Math.min(.12,duration*.2));gain.gain.setValueAtTime(sustain,start+Math.max(.13,duration-.28));gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
   source.connect(tone).connect(presence).connect(gain).connect(this.master);source.start(start);source.stop(start+duration+.02);this.voices.push(source);
   source.onended=()=>{source.disconnect();tone.disconnect();presence.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};
  });
  return (pitches.length-1)*spacing*1000+1900;
 }
  async playExercise(progression,pattern='d.d.d.d.',bpm=84,onCue=null,groove='click',startMeasure=0,subdivision='eighth',beatTicks=false,meter=4,countInBeats=0,beatTimeline=[]){
  this.stop();this.setExerciseGroove(groove);const token=this.loopToken,ctx=await this.unlock(),timeline=Array.isArray(beatTimeline)&&beatTimeline.length?beatTimeline:null,chords=timeline||progression.flat(),unique=[...new Map(chords.map(chord=>[chord.id,chord])).values()],kits=new Map(await Promise.all(unique.map(async chord=>[chord.id,await this.samples(chord)]))),hat=await this.load(ctx,'drums/closed-hat.wav'),kick=await this.load(ctx,'drums/kick.wav'),snare=await this.load(ctx,'drums/snare.wav'),beat=60/bpm,eighth=beat/2,beatsPerMeasure=meter===3?3:4,measure=beat*beatsPerMeasure,startIndex=Math.max(0,Math.min(progression.length-1,Math.trunc(Number(startMeasure)||0))),startBeat=startIndex*beatsPerMeasure,selectedTimeline=timeline?.slice(startBeat),selectedProgression=progression.slice(startIndex),cycle=timeline?selectedTimeline.length*beat:selectedProgression.length*measure;
  if(token!==this.loopToken||cycle<=0)return false;
  this.onCue=onCue;
   const strumLead=.032,slotsPerBeat=subdivision==='sixteenth'?4:2,slotsPerMeasure=slotsPerBeat*beatsPerMeasure,slotDuration=beat/slotsPerBeat,patternBars=String(pattern).match(new RegExp(`.{1,${slotsPerMeasure}}`,'g'))||['d.d.d.d.'];
  const queueCue=(at,data)=>{if(onCue)this.cueQueue.push({at,data});};
  const cueTick=()=>{if(token!==this.loopToken)return;let cue=null;while(this.cueQueue[0]?.at<=ctx.currentTime+.025)cue=this.cueQueue.shift();if(cue)onCue(cue.data);this.cueFrame=requestAnimationFrame(cueTick);};
  const scheduleBeatTimeline=start=>{
   for(let localSlot=0;localSlot<selectedTimeline.length*slotsPerBeat;localSlot++){
    const absoluteBeat=startBeat+Math.floor(localSlot/slotsPerBeat),measureIndex=Math.floor(absoluteBeat/beatsPerMeasure),slotIndex=absoluteBeat%beatsPerMeasure*slotsPerBeat+localSlot%slotsPerBeat,slots=[...patternBars[measureIndex%patternBars.length].padEnd(slotsPerMeasure,'.')],strokeIndexes=slots.map((stroke,index)=>stroke==='d'||stroke==='u'?index:-1).filter(index=>index>=0),stroke=slots[slotIndex]||'.',activeStrokeIndex=strokeIndexes.filter(index=>index<=slotIndex).at(-1)??strokeIndexes.at(-1)??0,at=start+localSlot*slotDuration;
     queueCue(at,{measureIndex,slotIndex,activeStrokeIndex,isRest:stroke==='.',isDownbeat:slotIndex%slotsPerBeat===0,beatChords:true,slotsPerBeat,timelineBeatIndex:absoluteBeat});
    if(stroke!=='d'&&stroke!=='u')continue;
    const chord=selectedTimeline[Math.floor(localSlot/slotsPerBeat)],position=strokeIndexes.indexOf(slotIndex),priorStrokeCount=patternBars.slice(0,measureIndex%patternBars.length).reduce((sum,bar)=>sum+[...bar].filter(value=>value==='d'||value==='u').length,0),clustered=strokeIsClustered(slotIndex,strokeIndexes,slotsPerBeat),voicing=exerciseStrokeVoicing(pattern,subdivision,priorStrokeCount+Math.max(0,position),slotIndex,slotsPerBeat,stroke,clustered),duration=subdivision==='sixteenth'?1.65:2.2;
    if(chord)this.stroke(chord,kits.get(chord.id),at-strumLead,stroke,duration,voicing.range,voicing.strength,voicing.count);
   }
  };
  const scheduleMeasures=start=>selectedProgression.forEach((entry,offset)=>{
   const measureIndex=startIndex+offset,measureStart=start+offset*measure,beatChords=Array.isArray(entry),slots=[...patternBars[measureIndex%patternBars.length].padEnd(slotsPerMeasure,'.')],strokeIndexes=slots.map((stroke,index)=>stroke==='d'||stroke==='u'?index:-1).filter(index=>index>=0);
   for(let index=0;index<slotsPerMeasure;index++){const activeStrokeIndex=strokeIndexes.filter(strokeIndex=>strokeIndex<=index).at(-1)??strokeIndexes.at(-1)??0;queueCue(measureStart+index*slotDuration,{measureIndex,slotIndex:index,activeStrokeIndex,isRest:slots[index]==='.',isDownbeat:index%slotsPerBeat===0,beatChords,slotsPerBeat});}
   const priorStrokeCount=patternBars.slice(0,measureIndex%patternBars.length).reduce((sum,bar)=>sum+[...bar].filter(stroke=>stroke==='d'||stroke==='u').length,0);
   strokeIndexes.forEach((index,position)=>{const duration=subdivision==='sixteenth'?1.65:2.2,chord=beatChords?entry[Math.floor(index/slotsPerBeat)]:entry,clustered=strokeIsClustered(index,strokeIndexes,slotsPerBeat),voicing=exerciseStrokeVoicing(pattern,subdivision,priorStrokeCount+position,index,slotsPerBeat,slots[index],clustered);if(chord)this.stroke(chord,kits.get(chord.id),measureStart+index*slotDuration-strumLead,slots[index],duration,voicing.range,voicing.strength,voicing.count);});
  });
  const scheduleCycle=timeline?scheduleBeatTimeline:scheduleMeasures;
  const countInChoices=meter===3?[0,1,2,3]:[0,1,2,4],countIn=countInChoices.includes(Number(countInBeats))?Number(countInBeats):0,leadStart=ctx.currentTime+.065;
  for(let index=0;index<countIn;index++)this.click(ctx,hat,leadStart+index*beat,index===0,index===0?.72:.58);
  let nextCycleAt=leadStart+countIn*beat,nextBeatAt=nextCycleAt,rhythmBeat=0;
  const pump=()=>{if(token!==this.loopToken)return;while(nextCycleAt<ctx.currentTime+.3){scheduleCycle(nextCycleAt);nextCycleAt+=cycle;}while(nextBeatAt<ctx.currentTime+.3){if(this.exerciseGroove==='rock'){const measureBeat=rhythmBeat%beatsPerMeasure,strongBeat=measureBeat===0;this.click(ctx,hat,nextBeatAt,strongBeat,strongBeat?.58:.44);this.click(ctx,hat,nextBeatAt+eighth,false,.34);if(beatsPerMeasure===3)this.drum(ctx,strongBeat?kick:snare,nextBeatAt,strongBeat?1.08:measureBeat===1?.72:.62,strongBeat?'kick':'snare');else{const kickBeat=rhythmBeat%2===0;this.drum(ctx,kickBeat?kick:snare,nextBeatAt,kickBeat?1.08:.9,kickBeat?'kick':'snare');}}else if(beatTicks){this.click(ctx,hat,nextBeatAt,true,rhythmBeat%beatsPerMeasure===0?.72:.58);for(let part=1;part<4;part++)this.click(ctx,hat,nextBeatAt+part*beat/4,false,.16);}else this.click(ctx,hat,nextBeatAt,rhythmBeat%beatsPerMeasure===0,rhythmBeat%beatsPerMeasure===0?.82:.64);nextBeatAt+=beat;rhythmBeat=(rhythmBeat+1)%beatsPerMeasure;}this.loopTimer=setTimeout(pump,45);};
  if(onCue)this.cueFrame=requestAnimationFrame(cueTick);pump();return true;
 }
}

const isGuitarChord=id=>!id.startsWith('uke-')&&!id.startsWith('bar-');
const familyTone=id=>id.startsWith('uke-')?5200:id.startsWith('bar-')?4700:7800;
