import {unlockAudioContext,releasePlayback} from './playback-session.js?v=1';
import {referenceSample} from './reference.js';

const midiHz=midi=>440*2**((midi-69)/12);
const tunings={
 guitar:[40,45,50,55,59,64],
 baritone:[50,55,59,64],
 ukulele:[67,60,64,69]
};

const pitchClasses={C:0,'C♯':1,'D♭':1,D:2,'D♯':3,'E♭':3,E:4,F:5,'F♯':6,'G♭':6,G:7,'G♯':8,'A♭':8,A:9,'A♯':10,'B♭':10,B:11};
const midiFor=(pitchClass,minimum)=>minimum+(pitchClass-minimum%12+12)%12;
const chordToneData=chord=>{
 const label=chord.measureName||chord.name||'C',match=label.match(/^([A-G](?:♯|♭)?)(.*)$/),root=pitchClasses[match?.[1]]??0,suffix=(match?.[2]||'').toLowerCase();
 const minor=suffix==='m'||suffix.startsWith('m7'),third=minor?3:4,seventh=suffix==='7'?10:suffix==='maj7'?11:null;
 return {root,intervals:[0,third,7,...(seventh===null?[]:[seventh]),...(suffix==='add9'?[14]:[])]};
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
 constructor(){this.ctx=null;this.bytes=new Map();this.buffers=new Map();this.sampleLevels=new WeakMap();this.sampleOffsets=new WeakMap();this.voices=[];this.loopTimer=0;this.loopToken=0;this.cueFrame=0;this.cueQueue=[];this.onCue=null;this.exerciseGroove='click';this.activeBackingMix=null;this.activeBackingSolo=null;this.backingBuses=null;this.exerciseGuitar=null;this.exerciseBacking=null;this.backingMasterVolume=1;this.exerciseTempoUpdater=null;}
 context(){
  if(this.ctx&&this.ctx.state!=='closed')return this.ctx;

  const AudioContext=window.AudioContext||window.webkitAudioContext;
  this.ctx=new AudioContext({latencyHint:'interactive'});
  this.master=this.ctx.createGain();this.master.gain.value=.78;
  this.compressor=this.ctx.createDynamicsCompressor();
  this.compressor.threshold.value=-12;this.compressor.knee.value=7;this.compressor.ratio.value=5;this.compressor.attack.value=.004;this.compressor.release.value=.2;
  this.master.connect(this.compressor).connect(this.ctx.destination);
  this.backingBuses={bass:this.ctx.createGain(),piano:this.ctx.createGain(),strings:this.ctx.createGain()};
  Object.values(this.backingBuses).forEach(bus=>bus.connect(this.master));
  this.exerciseGuitar=this.ctx.createGain();this.exerciseGuitar.connect(this.master);
  this.exerciseBacking=this.ctx.createGain();this.exerciseBacking.connect(this.master);
  // Keep the rhythm guide out of the chord compressor so guitar transients
  // cannot bury the click, kick, snare, or hi-hat.
  this.rhythm=this.ctx.createGain();this.rhythm.gain.value=.95;
  this.rhythmLimiter=this.ctx.createDynamicsCompressor();
  this.rhythmLimiter.threshold.value=-4;this.rhythmLimiter.knee.value=3;this.rhythmLimiter.ratio.value=10;this.rhythmLimiter.attack.value=.001;this.rhythmLimiter.release.value=.09;
  this.rhythm.connect(this.rhythmLimiter).connect(this.ctx.destination);
  return this.ctx;
 }
 fetchBytes(file){
  if(!this.bytes.has(file))this.bytes.set(file,fetch(new URL('../samples/'+file,import.meta.url)).then(response=>{if(!response.ok)throw Error('Chord sample unavailable');return response.arrayBuffer();}).catch(error=>{this.bytes.delete(file);throw error;}));
  return this.bytes.get(file);
 }
 async load(ctx,file){
  if(!this.buffers.has(file))this.buffers.set(file,this.fetchBytes(file).then(bytes=>ctx.decodeAudioData(bytes.slice(0))).catch(error=>{this.buffers.delete(file);this.bytes.delete(file);throw error;}));
  return this.buffers.get(file);
 }
 prepareChords(chords){
  // Warm visible lesson recordings before Play without creating an audio
  // context or taking the speaker route. Later selections can decode early
  // using a context that a previous user gesture already created.
  const files=new Set(chords.flatMap(chord=>{
   const pitches=this.pitches(chord);
   if(chord.id==='d')pitches.unshift(midiHz(tunings.guitar[1]));
   return pitches.map(hz=>referenceSample('guitar',hz).file);
  }));
  return Promise.all([...files].map(file=>this.ctx&&this.ctx.state!=='closed'?this.load(this.ctx,file):this.fetchBytes(file)));
 }
 unlock(){return unlockAudioContext(this.context(),this);}
 stop(release=true){clearTimeout(this.audioReleaseTimer);if(release)releasePlayback(this);clearTimeout(this.loopTimer);this.loopTimer=0;cancelAnimationFrame(this.cueFrame);this.cueFrame=0;this.cueQueue=[];this.loopToken++;this.exerciseTempoUpdater=null;if(this.onCue)this.onCue(null);this.onCue=null;for(const voice of this.voices){try{voice.stop()}catch{}}this.voices=[];this.activeBackingMix=null;this.activeBackingSolo=null;if(this.ctx){this.rhythm.gain.setValueAtTime(.95,this.ctx.currentTime);this.exerciseGuitar.gain.setValueAtTime(1,this.ctx.currentTime);this.exerciseBacking.gain.setValueAtTime(this.backingMasterVolume,this.ctx.currentTime);Object.values(this.backingBuses||{}).forEach(bus=>bus.gain.setValueAtTime(1,this.ctx.currentTime));}}
 trackVoice(source,start,event=this.exerciseEvent){
  this.voices.push(source);
  if(event){event.voices.push(source);event.firstAt=Math.min(event.firstAt,start);}
 }
 setExerciseTempo(value){this.exerciseTempoUpdater?.(Math.max(40,Math.min(240,Math.round(Number(value)||75))));}
 setExerciseGroove(groove){this.exerciseGroove=groove==='rock'?'rock':'click';this.applyBackingGains();}
 applyBackingGains(){
  if(!this.ctx)return;const now=this.ctx.currentTime,solo=this.activeBackingSolo,mix=this.activeBackingMix||{},master=this.backingMasterVolume;this.exerciseGuitar.gain.cancelScheduledValues(now);this.exerciseGuitar.gain.setTargetAtTime(solo?0:1,now,.025);this.exerciseBacking.gain.cancelScheduledValues(now);this.exerciseBacking.gain.setTargetAtTime(solo?0:master,now,.025);
  for(const track of ['drums','bass','piano','strings']){const target=track==='drums'?this.rhythm:this.backingBuses?.[track];if(!target)continue;const audible=(!solo||solo===track)&&(track==='drums'||mix[track]?.enabled!==false),amount=Math.max(0,Math.min(1,Number(mix[track]?.volume??1))),soloBoost=solo===track?({drums:1.05,bass:1.6,piano:1.55,strings:1.85}[track]||1):1,level=!audible?0:track==='drums'?(this.exerciseGroove==='rock' ? .95*amount*soloBoost : .95):Math.min(1.35,amount*soloBoost);target.gain.cancelScheduledValues(now);target.gain.setTargetAtTime(level*master,now,.025);}
 }
 setBackingMasterVolume(value){this.backingMasterVolume=Math.max(0,Math.min(1,Number(value)||0));this.applyBackingGains();}
 setBackingVolume(track,value){
  const amount=Math.max(0,Math.min(1,Number(value)||0));if(this.activeBackingMix?.[track])this.activeBackingMix[track].volume=amount;this.applyBackingGains();
 }
 setBackingEnabled(track,enabled){if(this.activeBackingMix?.[track])this.activeBackingMix[track].enabled=Boolean(enabled);if(track==='drums')this.setExerciseGroove(enabled?'rock':'click');else this.applyBackingGains();}
 setBackingStyle(track,style){if(this.activeBackingMix?.[track])this.activeBackingMix[track].style=style;}
 setBackingSolo(track=null){this.activeBackingSolo=track||null;this.applyBackingGains();}
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
  const {ctx,pitches,samples,buffers}=kit,order=strumStringIndexes(pitches,direction,range,exerciseStringCount),guitar=isGuitarChord(chord.id),spacing=guitar?(direction==='u'?.011:.014):direction==='u'?.008:.017;
  // Give guitar strings a little more separation while preserving beat onsets.
  // The soft attack envelope stays independent of the string spacing.
  order.forEach((sampleIndex,strokeIndex)=>{const buffer=buffers[sampleIndex],sample=samples[sampleIndex],source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter(),presence=ctx.createBiquadFilter(),start=when+strokeIndex*spacing,rate=sample.hz/sample.sourceHz,voiceDuration=Math.min(duration,buffer.duration/rate);source.buffer=buffer;source.playbackRate.value=rate;tone.type='lowpass';tone.frequency.value=familyTone(chord.id);tone.Q.value=.3;presence.type='highshelf';presence.frequency.value=2800;presence.gain.value=isGuitarChord(chord.id)?2.5:0;const level=({low:.4,mid:.42,high:.35,full:.64}[range]||.42)*strength,attack=isGuitarChord(chord.id)?.012:.015;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level,start+attack);gain.gain.exponentialRampToValueAtTime(level*.64,start+Math.min(.28,voiceDuration*.25));gain.gain.setValueAtTime(level*.64,start+Math.max(.3,voiceDuration-.28));gain.gain.exponentialRampToValueAtTime(.0001,start+voiceDuration);source.connect(tone).connect(presence).connect(gain).connect(this.exerciseBacking);source.start(start);source.stop(start+voiceDuration+.01);this.trackVoice(source,start);source.onended=()=>{source.disconnect();tone.disconnect();presence.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};});
 }
 click(ctx,buffer,when,accent=false,level=accent?.5:.38){const source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter();source.buffer=buffer;tone.type='highpass';tone.frequency.value=accent?2200:2800;gain.gain.setValueAtTime(level,when);gain.gain.exponentialRampToValueAtTime(.0001,when+.14);source.connect(tone).connect(gain).connect(this.rhythm);source.start(when);source.stop(when+.155);this.trackVoice(source,when);source.onended=()=>{source.disconnect();tone.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};}
 drum(ctx,buffer,when,level=.6,voice='snare'){const source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter();source.buffer=buffer;tone.type=voice==='kick'?'lowshelf':'peaking';tone.frequency.value=voice==='kick'?140:1900;tone.gain.value=voice==='kick'?8:4;if(voice!=='kick')tone.Q.value=.7;gain.gain.setValueAtTime(level,when);gain.gain.exponentialRampToValueAtTime(.0001,when+Math.min(.62,buffer.duration));source.connect(tone).connect(gain).connect(this.rhythm);source.start(when);source.stop(when+Math.min(.64,buffer.duration)+.02);this.trackVoice(source,when);source.onended=()=>{source.disconnect();tone.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};}
 sampleLevel(buffer,instrument){if(!instrument.startsWith('piano-')&&!instrument.startsWith('strings-'))return 1;if(this.sampleLevels.has(buffer))return this.sampleLevels.get(buffer);let sum=0,count=0;for(let channel=0;channel<buffer.numberOfChannels;channel++){const data=buffer.getChannelData(channel);for(let index=0;index<data.length;index+=64){sum+=data[index]*data[index];count++;}}const rms=Math.sqrt(sum/Math.max(1,count)),target=instrument.startsWith('strings-') ? .13 : .11,boost=Math.max(1,Math.min(12,target/Math.max(.006,rms)));this.sampleLevels.set(buffer,boost);return boost;}
 sampleOffset(buffer,instrument){if(!instrument.startsWith('strings-'))return 0;if(this.sampleOffsets.has(buffer))return this.sampleOffsets.get(buffer);let peak=0;for(let channel=0;channel<buffer.numberOfChannels;channel++){const data=buffer.getChannelData(channel);for(let index=0;index<data.length;index+=64)peak=Math.max(peak,Math.abs(data[index]));}const threshold=peak*.055;let onset=0;search:for(let index=0;index<buffer.length;index+=32){for(let channel=0;channel<buffer.numberOfChannels;channel++){if(Math.abs(buffer.getChannelData(channel)[index])>=threshold){onset=index/buffer.sampleRate;break search;}}}const offset=Math.max(0,Math.min(1.25,onset-.025));this.sampleOffsets.set(buffer,offset);return offset;}
 async prepareScaleTone(midi){const hz=midiHz(midi),sample=referenceSample('guitar',hz);await this.load(this.context(),sample.file);}
 async playScaleTone(midi,duration,when){const token=this.loopToken,event=this.exerciseEvent,ctx=this.context(),hz=midiHz(midi),sample=referenceSample('guitar',hz),buffer=await this.load(ctx,sample.file);if(token!==this.loopToken||event?.cancelled)return;const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),start=Math.max(ctx.currentTime+.003,Number(when)||ctx.currentTime+.01),rate=hz/sample.sourceHz,voiceDuration=Math.min(Math.max(.08,duration),(buffer.duration/rate));source.buffer=buffer;source.playbackRate.value=rate;filter.type='lowpass';filter.frequency.value=5200;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.62,start+.012);gain.gain.setValueAtTime(.44,start+Math.max(.03,voiceDuration-.1));gain.gain.exponentialRampToValueAtTime(.0001,start+voiceDuration);source.connect(filter).connect(gain).connect(this.exerciseGuitar);source.start(start);source.stop(start+voiceDuration+.025);this.trackVoice(source,start,event);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};}
 sampledTone(instrument,hz,buffer,sourceHz,when,duration,level){
  const ctx=this.context(),source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter(),panner=ctx.createStereoPanner?.(),rate=hz/sourceHz,bass=instrument==='bass',piano=instrument.startsWith('piano-'),strings=instrument.startsWith('strings-'),offset=this.sampleOffset(buffer,instrument),available=(buffer.duration-offset)/rate,voiceDuration=Math.max(.12,Math.min(duration,available)),attack=strings ? .07 : bass ? .008 : piano ? .008 : .008,release=Math.min(strings ? 1.15 : piano ? .82 : bass ? .065 : .2,voiceDuration*.5),start=Math.max(ctx.currentTime+.004,when),voiceLevel=Math.min(2.4,level*this.sampleLevel(buffer,instrument));
  source.buffer=buffer;source.playbackRate.value=rate;tone.type='lowpass';tone.frequency.value=bass?1900:piano?7200:4600;tone.Q.value=.2;if(panner)panner.pan.value=Math.max(-.28,Math.min(.28,(Math.log2(hz/261.63))*.16));
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,voiceLevel),start+Math.min(attack,voiceDuration*.3));gain.gain.setValueAtTime(Math.max(.0002,voiceLevel*(piano ? .58 : strings ? .9 : bass ? 1 : .82)),start+Math.max(attack+.01,voiceDuration-release));gain.gain.exponentialRampToValueAtTime(.0001,start+voiceDuration);
  const bus=instrument==='bass'?this.backingBuses.bass:piano?this.backingBuses.piano:this.backingBuses.strings;source.connect(tone);if(panner){tone.connect(panner);panner.connect(gain);}else tone.connect(gain);gain.connect(bus);source.start(start,offset);source.stop(start+voiceDuration+.02);this.trackVoice(source,start);source.onended=()=>{source.disconnect();tone.disconnect();panner?.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};
 }
 async play(chord){
  this.stop(false);const token=this.loopToken;try{const ctx=await this.unlock();
  const pitches=this.pitches(chord),samples=pitches.map(hz=>({hz,...referenceSample('guitar',hz)})),buffers=await Promise.all(samples.map(sample=>this.load(ctx,sample.file)));
  if(token!==this.loopToken)return null;
  const now=ctx.currentTime+.025,spacing=isGuitarChord(chord.id)?.015:pitches.length===4?.045:.038;
  buffers.forEach((buffer,index)=>{
   const sample=samples[index],source=ctx.createBufferSource(),gain=ctx.createGain(),tone=ctx.createBiquadFilter(),presence=ctx.createBiquadFilter(),start=now+index*spacing,rate=sample.hz/sample.sourceHz,duration=Math.min(1.85,buffer.duration/rate);
   source.buffer=buffer;source.playbackRate.value=rate;tone.type='lowpass';tone.frequency.value=familyTone(chord.id);tone.Q.value=.3;presence.type='highshelf';presence.frequency.value=2800;presence.gain.value=isGuitarChord(chord.id)?2.5:0;
   const level=Math.max(.46,.8-index*.045),attack=isGuitarChord(chord.id)?.022:.03,sustain=isGuitarChord(chord.id)?level*.7:level;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level,start+attack);gain.gain.exponentialRampToValueAtTime(sustain,start+Math.min(.12,duration*.2));gain.gain.setValueAtTime(sustain,start+Math.max(.13,duration-.28));gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
   source.connect(tone).connect(presence).connect(gain).connect(this.master);source.start(start);source.stop(start+duration+.02);this.trackVoice(source,start);
   source.onended=()=>{source.disconnect();tone.disconnect();presence.disconnect();gain.disconnect();this.voices=this.voices.filter(item=>item!==source);};
  });
  const duration=(pitches.length-1)*spacing*1000+1900;
  this.audioReleaseTimer=setTimeout(()=>{if(token===this.loopToken)releasePlayback(this);},duration+100);
  return duration;
  }catch(error){if(token===this.loopToken)this.stop();throw error;}
 }
 async playExercise(progression,pattern='d.d.d.d.',bpm=84,onCue=null,groove='click',startMeasure=0,subdivision='eighth',beatTicks=false,meter=4,countInBeats=0,beatTimeline=[],backing=null,{onSchedule=null}={}){
  this.stop(false);this.setExerciseGroove(groove);const token=this.loopToken;
  let tempo=Math.max(40,Math.min(240,Math.round(Number(bpm)||75))),retime=null;
  // Install before any await: rapid edits during unlock/sample loading must
  // start at the latest BPM, not the value captured by the original Play tap.
  this.exerciseTempoUpdater=value=>{if(value===tempo)return;if(retime)retime(value);else tempo=value;};
  try{
   const ctx=await this.unlock(),timeline=Array.isArray(beatTimeline)&&beatTimeline.length?beatTimeline:null,chords=timeline||progression.flat(),unique=[...new Map(chords.map(chord=>[chord.id,chord])).values()],kits=new Map(await Promise.all(unique.map(async chord=>[chord.id,await this.samples(chord)]))),hat=await this.load(ctx,'drums/closed-hat.wav'),kick=await this.load(ctx,'drums/kick.wav'),snare=await this.load(ctx,'drums/snare.wav'),beatsPerMeasure=meter===3?3:4,startIndex=Math.max(0,Math.min(progression.length-1,Math.trunc(Number(startMeasure)||0))),startBeat=startIndex*beatsPerMeasure,selectedTimeline=timeline?.slice(startBeat),selectedProgression=progression.slice(startIndex),cycleBeats=timeline?selectedTimeline.length:selectedProgression.length*beatsPerMeasure;
   if(token!==this.loopToken)return false;if(cycleBeats<=0){this.stop();return false;}
   const mix={drums:{enabled:groove==='rock',volume:.72},bass:{enabled:false,style:'roots',volume:.46},piano:{enabled:false,style:'simple',volume:.3},strings:{enabled:false,style:'low',volume:.2},...(backing||{})};
   this.activeBackingMix=mix;this.activeBackingSolo=null;this.applyBackingGains();
   const targetNotes=[];
   if(backing)for(const chord of unique){const tones=chordToneData(chord),bassRoot=midiFor(tones.root,36),pianoRoot=midiFor(tones.root,48),lowRoot=midiFor(tones.root,43),highRoot=midiFor(tones.root,60);targetNotes.push(['bass',midiHz(bassRoot)],['bass',midiHz(bassRoot+7)]);for(const interval of [0,3,4,7,12,15,16,19,24])for(const layer of ['piano-soft','piano-loud'])targetNotes.push([layer,midiHz(pianoRoot+interval)]);for(const interval of tones.intervals.slice(0,3)){targetNotes.push(['strings-low',midiHz(lowRoot+interval)]);targetNotes.push(['strings-high',midiHz(highRoot+interval)]);}}
   const backingSamples=new Map();
   await Promise.all(targetNotes.map(async([instrument,hz])=>{const sample=referenceSample(instrument,hz),key=`${instrument}:${hz}`;if(!backingSamples.has(key))backingSamples.set(key,{...sample,buffer:await this.load(ctx,sample.file)});}));
   if(token!==this.loopToken)return false;
   this.onCue=onCue;
   const strumLead=.032,slotsPerBeat=subdivision==='sixteenth'?4:2,slotTicks=4/slotsPerBeat,slotsPerMeasure=slotsPerBeat*beatsPerMeasure,patternBars=String(pattern).match(new RegExp(`.{1,${slotsPerMeasure}}`,'g'))||['d.d.d.d.'];
   const bars=patternBars.map(bar=>{const slots=[...bar.padEnd(slotsPerMeasure,'.')],strokes=slots.map((stroke,index)=>stroke==='d'||stroke==='u'?index:-1).filter(index=>index>=0);return {slots,strokes};});
   const playBacking=(instrument,hz,at,duration,level)=>{const sample=backingSamples.get(`${instrument}:${hz}`);if(sample)this.sampledTone(instrument,hz,sample.buffer,sample.sourceHz,at,duration,level);};
   let lastStringStyle=mix.strings?.style;
   // Each onset is scheduled at its own sixteenth-note clock tick. In
   // particular, an offbeat is never prequeued by a whole-beat callback.
   const scheduleBackingTick=(chord,timelineIndex,part,at,beat)=>{
    if(!chord)return;const tones=chordToneData(chord),beatInMeasure=timelineIndex%beatsPerMeasure;
    if(mix.bass?.enabled){const root=midiFor(tones.root,36),style=mix.bass.style||'roots',syncopated=style==='sync-roots'||style==='sync-fifths',fifths=style==='fifths'||style==='sync-fifths';if(syncopated){const onDownbeat=beatInMeasure%2===0,interval=fifths&&beatInMeasure>=2?7:0;if(part===(onDownbeat?0:2))playBacking('bass',midiHz(root+interval),at,beat*(onDownbeat?1.515:.515),onDownbeat?.44:.4);}else if(part===0){const interval=fifths&&beatInMeasure%2===1?7:0;playBacking('bass',midiHz(root+interval),at,beat*1.015,.44);}}
    if(mix.piano?.enabled&&part%2===0){const root=midiFor(tones.root,48),third=tones.intervals[1],style=mix.piano.style||'simple',patterns={simple:[0,third,7,third+12,7,third,12,7],octave:[0,7,12,third+12,19,12,7,third],wide:[0,7,third+12,19,24,19,third+12,7],thirds:[0,third,7,third+12,12,third+12,7,third]},notes=patterns[style]||patterns.simple,nudge=((timelineIndex*7)%5-2)*.003,step=(beatInMeasure*2+part/2)%8,interval=notes[step],accent=step===0,layer=accent?'piano-loud':'piano-soft',start=at+nudge,volume=accent?.42:.34;playBacking(layer,midiHz(root+interval),start,beat*1.6,volume);if(style==='thirds'&&step%4===0)playBacking('piano-loud',midiHz(root+interval+third),start+.012,beat*1.35,volume*.88);else if(style==='simple'&&step===0)playBacking('piano-soft',midiHz(root+third+12),start+.018,beat*1.55,volume*.62);}
    if(part!==0)return;
    const previousChord=selectedTimeline[(timelineIndex-1+selectedTimeline.length)%selectedTimeline.length],stringStyleChanged=lastStringStyle!==mix.strings?.style;
    if(mix.strings?.enabled&&(timelineIndex===0||previousChord?.id!==chord.id||stringStyleChanged)){let run=1;while(run<selectedTimeline.length&&selectedTimeline[(timelineIndex+run)%selectedTimeline.length]?.id===chord.id)run++;const high=mix.strings.style==='high',instrument=high?'strings-high':'strings-low',root=midiFor(tones.root,high?60:43),volume=high?.43:.48;tones.intervals.slice(0,3).forEach((interval,index)=>playBacking(instrument,midiHz(root+interval),at+index*.045,Math.max(beat*1.5,run*beat+1.05),volume*(index===0?1:.84)));lastStringStyle=mix.strings.style;}
   };
   const countInChoices=meter===3?[0,1,2,3]:[0,1,2,4],countIn=countInChoices.includes(Number(countInBeats))?Number(countInBeats):0,countTicks=countIn*4,cycleTicks=cycleBeats*4;
   let anchorAt=ctx.currentTime+.065,anchorTick=0,tickDuration=60/tempo/4,nextTick=0,events=[];
   const timeFor=tick=>anchorAt+(tick-anchorTick)*tickDuration;
   const scheduleTick=(tick,at)=>{
    const event={tick,at,firstAt:at,voices:[],cancelled:false,stringStyleBefore:lastStringStyle};events.push(event);this.exerciseEvent=event;
    try{
     if(tick<countTicks){if(tick%4===0)this.click(ctx,hat,at,tick===0,tick===0?.72:.58);return;}
     const elapsedTick=tick-countTicks,localTick=elapsedTick%cycleTicks,localBeat=Math.floor(localTick/4),part=localTick%4,beat=60/tempo,rhythmBeat=Math.floor(elapsedTick/4)%beatsPerMeasure;
     if(localTick%slotTicks===0){
      const absoluteBeat=startBeat+localBeat,measureIndex=Math.floor(absoluteBeat/beatsPerMeasure),slotIndex=absoluteBeat%beatsPerMeasure*slotsPerBeat+part/slotTicks,barIndex=measureIndex%bars.length,{slots,strokes}=bars[barIndex],stroke=slots[slotIndex]||'.',activeStrokeIndex=strokes.filter(index=>index<=slotIndex).at(-1)??strokes.at(-1)??0,entry=selectedProgression[Math.floor(localBeat/beatsPerMeasure)],beatChords=!!timeline||Array.isArray(entry),cue={measureIndex,slotIndex,activeStrokeIndex,isRest:stroke==='.',isDownbeat:part===0,beatChords,slotsPerBeat,playbackSlotIndex:elapsedTick/slotTicks,...(timeline?{timelineBeatIndex:absoluteBeat}:{})};
      if(onCue)this.cueQueue.push({at,data:cue,event});
      if(stroke==='d'||stroke==='u'){
       const chord=timeline?selectedTimeline[localBeat]:beatChords?entry[absoluteBeat%beatsPerMeasure]:entry,position=strokes.indexOf(slotIndex),priorStrokeCount=bars.slice(0,barIndex).reduce((sum,bar)=>sum+bar.strokes.length,0),clustered=strokeIsClustered(slotIndex,strokes,slotsPerBeat),voicing=exerciseStrokeVoicing(pattern,subdivision,priorStrokeCount+position,slotIndex,slotsPerBeat,stroke,clustered);
       if(chord)this.stroke(chord,kits.get(chord.id),at-strumLead,stroke,subdivision==='sixteenth'?1.65:2.2,voicing.range,voicing.strength,voicing.count);
      }
      // Audio belongs on this clock, never on requestAnimationFrame. A caller
      // derives notes from playbackSlotIndex, which is stable when retimed.
      if(onSchedule)onSchedule(cue,at,beat/slotsPerBeat);
      if(token!==this.loopToken)return;
     }
     if(selectedTimeline)scheduleBackingTick(selectedTimeline[localBeat],localBeat,part,at,beat);
     if(this.exerciseGroove==='rock'){
      const strongBeat=rhythmBeat===0;
      if(part===0){this.click(ctx,hat,at,strongBeat,strongBeat?.58:.44);if(beatsPerMeasure===3)this.drum(ctx,strongBeat?kick:snare,at,strongBeat?1.08:rhythmBeat===1?.72:.62,strongBeat?'kick':'snare');else{const kickBeat=rhythmBeat%2===0;this.drum(ctx,kickBeat?kick:snare,at,kickBeat?1.08:.9,kickBeat?'kick':'snare');}}
      else if(part===2)this.click(ctx,hat,at,false,.34);
     }else if(part===0)this.click(ctx,hat,at,beatTicks||rhythmBeat===0,rhythmBeat===0?(beatTicks?.72:.82):(beatTicks?.58:.64));
     else if(beatTicks)this.click(ctx,hat,at,false,.16);
    }finally{this.exerciseEvent=null;}
   };
   const cueTick=()=>{if(token!==this.loopToken)return;let cue=null;while(this.cueQueue[0]?.at<=ctx.currentTime+.025)cue=this.cueQueue.shift();if(cue)onCue(cue.data,cue.at);if(token===this.loopToken)this.cueFrame=requestAnimationFrame(cueTick);};
   const pump=()=>{
    if(token!==this.loopToken)return;const now=ctx.currentTime;
    events=events.filter(event=>event.at>=now-.2);
    // A suspended/backgrounded event loop must not dump missed beats into a
    // burst. Keep musical phase and resume at the next safe onset instead.
    if(timeFor(nextTick)<now-.025)nextTick=Math.max(nextTick,Math.ceil(anchorTick+(now+strumLead+.005-anchorAt)/tickDuration));
    while(token===this.loopToken&&timeFor(nextTick)<now+.12){const tick=nextTick++;scheduleTick(tick,timeFor(tick));}
    if(token===this.loopToken)this.loopTimer=setTimeout(pump,25);
   };
   retime=value=>{
    const now=ctx.currentTime,committed=events.filter(event=>event.firstAt<=now+.006),future=events.filter(event=>event.firstAt>now+.006),effectiveAt=Math.max(now,timeFor(0),...committed.map(event=>event.at)),phase=anchorTick+(effectiveAt-anchorAt)/tickDuration;
    // Preserve strokes that have already begun, including their string sweep.
    // All other prequeued sources and visual cues are replaced, not layered.
    if(future.length){lastStringStyle=future[0].stringStyleBefore;nextTick=Math.min(nextTick,future[0].tick);}
    for(const event of future){event.cancelled=true;for(const voice of event.voices){try{voice.stop();}catch{}}}
    this.cueQueue=this.cueQueue.filter(cue=>!cue.event?.cancelled);events=committed;
    anchorAt=effectiveAt;anchorTick=phase;tempo=value;tickDuration=60/tempo/4;
    clearTimeout(this.loopTimer);pump();
   };
   if(onCue)this.cueFrame=requestAnimationFrame(cueTick);pump();return token===this.loopToken;
  }catch(error){if(token===this.loopToken)this.stop();throw error;}
 }
}

const isGuitarChord=id=>!id.startsWith('uke-')&&!id.startsWith('bar-');
const familyTone=id=>id.startsWith('uke-')?5200:id.startsWith('bar-')?4700:7800;
