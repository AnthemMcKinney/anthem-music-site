import {ReferencePlayer} from './reference.js';
import {detectPitch,PitchTracker,DETECTOR_VERSION} from './pitch.js';
import {nearestNote} from './tunings.js';
export class TunerAudio{
 constructor(onPitch,onState,onLevel=()=>{}){this.onPitch=onPitch;this.onState=onState;this.onLevel=onLevel;this.tracker=new PitchTracker();this.generation=0;this.reference=new ReferencePlayer();this.referenceRequest=0;this.successSound=null;this.successPromise=null;}
 getContext(){return this.ctx??=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});}
 async prepareSuccess(ctx){
  this.successPromise??=fetch(new URL('../samples/tuning-success.mp3',import.meta.url)).then(r=>{if(!r.ok)throw Error('Success sound unavailable');return r.arrayBuffer();}).then(bytes=>ctx.decodeAudioData(bytes)).then(buffer=>{
   let peak=0,first=buffer.length,last=0;
   for(let channel=0;channel<buffer.numberOfChannels;channel++){const data=buffer.getChannelData(channel);for(const value of data)peak=Math.max(peak,Math.abs(value));}
   const threshold=peak*.01;
   for(let channel=0;channel<buffer.numberOfChannels;channel++){const data=buffer.getChannelData(channel);let start=0,end=data.length-1;while(start<data.length&&Math.abs(data[start])<threshold)start++;while(end>start&&Math.abs(data[end])<threshold)end--;first=Math.min(first,start);last=Math.max(last,end);}
   const offset=Math.max(0,first/buffer.sampleRate-.004),duration=Math.min(1.2,last/buffer.sampleRate-offset+.08);
   return this.successSound={buffer,offset,duration,gain:Math.min(2.2,.92/Math.max(peak,.001))};
  }).catch(()=>null);
  return this.successPromise;
 }
 async context(){const ctx=this.getContext();if(ctx.state!=='running')await ctx.resume();void this.prepareSuccess(ctx);return ctx;}
 async start(){
  const generation=++this.generation;
  if(!isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access needs HTTPS on phones, or localhost on this computer.');
  const ctx=await this.context();if(generation!==this.generation)return;
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1},video:false});
  if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
  this.stream=stream;this.source=ctx.createMediaStreamSource(stream);this.analyser=ctx.createAnalyser();this.analyser.fftSize=8192;this.source.connect(this.analyser);
  this.buffer=new Float32Array(8192);this.tracker.reset();this.onState('listening');
  stream.getAudioTracks()[0].onended=()=>{this.stop();this.onState('ended');};
  this.timer=setInterval(()=>{
   if(this.diagnostic?.active){this.diagnosticFrame(ctx,stream);return;}
   if(ctx.state!=='running'){this.onLevel(0,{state:'Audio paused'});this.onPitch(null);return;}
   if(performance.now()<(this.mutedUntil||0)){this.onLevel(0,{state:'Pausing for playback'});this.onPitch(null);return;}
   this.analyser.getFloatTimeDomainData(this.buffer);let power=0;for(const x of this.buffer)power+=x*x;
   const raw=detectPitch(this.buffer,ctx.sampleRate),tracked=this.tracker.update(raw,performance.now());
   this.onLevel(Math.sqrt(power/this.buffer.length),{rawHz:raw?.hz,confidence:raw?.confidence,confidenceMetric:raw?.confidenceMetric,trackedHz:tracked?.hz,microphone:stream.getAudioTracks()[0].label,sampleRate:ctx.sampleRate});this.onPitch(tracked);
  },65);
 }
 diagnosticFrame(ctx,stream){
  const sampledAt=performance.now(),audioContextTime=ctx.currentTime;
  const paused=ctx.state!=='running',muted=sampledAt<(this.mutedUntil||0);
  const detector={},tracker={};let raw=null,tracked=null,rms=null,peak=null;
  if(!paused){
   this.analyser.getFloatTimeDomainData(this.buffer);let power=0;peak=0;
   for(const x of this.buffer){power+=x*x;peak=Math.max(peak,Math.abs(x));}rms=Math.sqrt(power/this.buffer.length);
   if(!muted){raw=detectPitch(this.buffer,ctx.sampleRate,detector);tracked=this.tracker.update(raw,performance.now(),tracker);}
  }
  const reason=paused?'audio_context_paused':muted?'reference_or_confirmation_playback':detector.reason||tracker.reason;
  const frame={audioContextTime,windowMs:this.buffer.length/ctx.sampleRate*1000,rms,peak,
   acRms:detector.rms??null,clippedFraction:detector.clippedFraction??null,
   rawHz:raw?.hz??detector.candidateHz??null,rawNote:raw?nearestNote(raw.hz):null,
   confidence:detector.confidence??null,confidenceMetric:detector.confidenceMetric??null,
   detectorVersion:DETECTOR_VERSION,pitchMethod:detector.method??null,yinHz:detector.yinHz??null,yinConfidence:detector.yinConfidence??null,
   harmonicHz:detector.harmonicHz??null,harmonicCount:detector.harmonicCount??null,
   harmonicCandidates:detector.harmonicCandidates??null,detectorAccepted:!!raw,
   acceptedHz:tracked?.hz??null,acceptedNote:tracked?nearestNote(tracked.hz):null,
   accepted:!!tracked,rejectionReason:tracked?null:reason,
   trackerCandidateHz:this.tracker.candidate,trackerCandidateCount:this.tracker.candidateCount,
   uiAccepted:false,uiRejectionReason:reason,displayHz:null,displayNote:null,centsError:null,gaugeCents:null};
  this.onLevel(rms??0,{rawHz:raw?.hz,confidence:raw?.confidence,confidenceMetric:raw?.confidenceMetric,trackedHz:tracked?.hz,
   microphone:stream.getAudioTracks()[0].label,sampleRate:ctx.sampleRate,
   state:paused?'Audio paused':muted?'Pausing for playback':undefined});
  this.onPitch(tracked,frame);
  frame.processingMs=performance.now()-sampledAt;
  this.diagnostic.frame(frame,sampledAt);
 }
 stop(){void this.diagnostic?.stop('microphone_stopped');this.generation++;clearInterval(this.timer);this.source?.disconnect();this.stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});this.stream=null;this.tracker.reset();this.onPitch(null);this.onState('stopped');this.onLevel(0);}
 confirm(){
  const ctx=this.ctx;if(!ctx||ctx.state!=='running')return 0;
  const now=ctx.currentTime;
  if(this.successSound){
   const {buffer,offset,duration,gain:level}=this.successSound,source=ctx.createBufferSource(),gain=ctx.createGain(),output=ctx.createDynamicsCompressor();
   output.threshold.value=-8;output.knee.value=6;output.ratio.value=6;output.attack.value=.002;output.release.value=.1;
   gain.gain.setValueAtTime(level,now);gain.gain.setValueAtTime(level,now+Math.max(.01,duration-.06));gain.gain.linearRampToValueAtTime(0,now+duration);
   source.buffer=buffer;source.connect(gain);gain.connect(output);output.connect(ctx.destination);source.start(now,offset,duration);source.stop(now+duration+.01);
   source.onended=()=>{source.disconnect();gain.disconnect();output.disconnect();};
   const holdMs=Math.ceil(duration*1000)+180;this.mutedUntil=performance.now()+holdMs;this.tracker.reset();return holdMs;
  }
  // A modern completion notification: one quick cue and a bright octave/fifth
  // arrival. A compressor keeps it present without clipping small speakers.
  // Keep the entire chime and a short room-decay margin out of pitch detection.
  const notes=[{hz:659.255114,offset:0,length:.13,level:.23},{hz:987.766603,offset:.095,length:.34,level:.34},{hz:1318.510228,offset:.105,length:.42,level:.22}];
  const output=ctx.createDynamicsCompressor();
  output.threshold.value=-12;output.knee.value=8;output.ratio.value=8;output.attack.value=.002;output.release.value=.12;
  output.connect(ctx.destination);
  for(const note of notes){
   for(const [multiple,weight] of [[1,1],[2,.16],[3,.035]]){
    const oscillator=ctx.createOscillator(),gain=ctx.createGain(),start=now+note.offset;
    oscillator.type='sine';oscillator.frequency.value=note.hz*multiple;
    gain.gain.setValueAtTime(0,start);
    gain.gain.linearRampToValueAtTime(note.level*weight,start+.006);
    gain.gain.exponentialRampToValueAtTime(.0001,start+note.length);
    oscillator.connect(gain);gain.connect(output);
    oscillator.start(start);oscillator.stop(start+note.length+.01);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
   }
  }
  setTimeout(()=>output.disconnect(),750);
  const holdMs=750;
  this.mutedUntil=performance.now()+holdMs;this.tracker.reset();
  return holdMs;
 }
 prepareReference(instrument){const ctx=this.getContext();return this.reference.prepare(ctx,instrument);}
 stopReference(){this.referenceRequest++;this.reference.stop();this.mutedUntil=0;}
 async play(hz,instrument='guitar'){
  const request=++this.referenceRequest,ctx=this.getContext();
  if(ctx.state!=='running'){const oscillator=ctx.createOscillator(),silent=ctx.createGain();silent.gain.value=0;oscillator.connect(silent);silent.connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+.03);oscillator.onended=()=>{oscillator.disconnect();silent.disconnect();};}
  await this.context();
  if(request!==this.referenceRequest)return null;
  const duration=await this.reference.play(ctx,instrument,hz);
  if(duration===null||request!==this.referenceRequest)return null;
  this.mutedUntil=performance.now()+duration;this.tracker.reset();this.onPitch(null);
  return duration;
 }
}
