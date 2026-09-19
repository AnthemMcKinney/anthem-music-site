import {centsBetween} from './tunings.js';
import {DETECTOR_VERSION} from './pitch.js';

// One monotonic clock for all telemetry. MediaRecorder boundaries are observations,
// not sample-accurate timestamps; codec/device buffering can introduce an offset.
export class DiagnosticRecorder {
 constructor({context=()=>({}),changed=()=>{},clock=()=>performance.now(),Recorder=globalThis.MediaRecorder}={}){
  Object.assign(this,{context,changed,clock,Recorder});this.active=false;this.finishing=false;
 }
 event(type,detail={}){if(this.session)this.session.events.push({tMs:this.clock()-this.origin,type,...detail});}
 start(stream,ctx){
  if(this.active||this.finishing)throw new Error('A diagnostic is already recording or finishing.');
  if(!stream?.getAudioTracks().some(t=>t.readyState==='live'))throw new Error('Start the microphone above, then start the diagnostic.');
  this.origin=this.clock();this.active=true;this.audioBlob=null;this.recorder=null;this.chunks=[];this.stopPromise=null;
  this.session={schemaVersion:2,detectorVersion:DETECTOR_VERSION,id:new Date().toISOString().replace(/[:.]/g,'-'),startedAtUtc:new Date().toISOString(),
   performanceTimeOrigin:performance.timeOrigin,startPerformanceMs:this.origin,
   startAudioContextSeconds:ctx.currentTime,sampleRate:ctx.sampleRate,analysisWindowSamples:8192,nominalIntervalMs:65,
   browser:globalThis.navigator?.userAgent??null,
   microphone:stream.getAudioTracks().map(t=>({label:t.label,settings:t.getSettings?.()??{}})),
   initialContext:this.context(),
   timing:{unit:'milliseconds since startPerformanceMs',frameTimestamp:'time analyser window was read',
    window:'Each frame covers the preceding windowMs; windows overlap. This is not an exact physical pluck timestamp.',
    audioAlignment:'Audio zero is approximately audio.startRequestedMs. startEventMs and chunk events are browser delivery times. MediaRecorder/device/codec buffering is not sample-accurately exposed.',
    confidence:'See frame confidenceMetric: yin_periodicity is 1 minus normalized difference; spectral_peak_clarity measures local spectral peak/noise separation. Neither is a calibrated probability. yinHz/yinConfidence preserve the original YIN attempt.',
    acceptance:'accepted = tracker output; uiAccepted = used to update gauge. Held visible readings are separate context fields.'},
   audio:{status:'unavailable',mimeType:null,startRequestedMs:null,startEventMs:null,stopRequestedMs:null,stopEventMs:null,error:null},
   frames:[],events:[]};
  this.event('diagnostic_started');
  try{
   if(!this.Recorder)throw new Error('MediaRecorder is unavailable in this browser; telemetry still records.');
   const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(m=>this.Recorder.isTypeSupported?.(m));
   const recorder=new this.Recorder(stream,mime?{mimeType:mime}:undefined);this.recorder=recorder;
   recorder.onstart=()=>{this.session.audio.startEventMs=this.clock()-this.origin;this.event('audio_started');};
   recorder.ondataavailable=e=>{if(e.data.size)this.chunks.push(e.data);this.event('audio_chunk',{bytes:e.data.size,recorderTimecode:e.timecode??null});};
   recorder.onerror=e=>{this.session.audio.status='error';this.session.audio.error=e.error?.message||'Audio recording failed';this.event('audio_error',{message:this.session.audio.error});this.changed();};
   recorder.onstop=()=>{
    this.session.audio.stopEventMs=this.clock()-this.origin;
    this.audioBlob=new Blob(this.chunks,{type:recorder.mimeType||mime||'application/octet-stream'});
    this.session.audio.bytes=this.audioBlob.size;
    if(this.session.audio.status!=='error')this.session.audio.status=this.audioBlob.size?'recorded':'empty';
    this.event('audio_stopped');this.resolveAudio?.();
   };
   this.audioDone=new Promise(resolve=>{this.resolveAudio=resolve;});
   this.session.audio.startRequestedMs=this.clock()-this.origin;
   recorder.start(1000);this.session.audio.status='recording';this.session.audio.mimeType=recorder.mimeType||mime||null;
  }catch(error){this.recorder=null;this.session.audio.error=error.message;this.session.audio.status='unavailable';}
  this.limitTimer=setTimeout(()=>void this.stop('ten_minute_limit'),600000);this.changed();return this.session;
 }
 frame(data,sampledAt=this.clock()){
  if(!this.active)return;
  const context=this.context(),previous=this.session.frames.at(-1);
  const tMs=sampledAt-this.origin;
  this.session.frames.push({index:this.session.frames.length,tMs,intervalMs:previous?tMs-previous.tMs:null,...data,
   rawCentsError:data.rawHz?centsBetween(data.rawHz,context.targetHz):null,
   acceptedCentsError:data.acceptedHz?centsBetween(data.acceptedHz,context.targetHz):null,...context});
  if(this.session.frames.length%15===0)this.changed();
 }
 stop(reason='user_stopped'){
  if(this.stopPromise)return this.stopPromise;
  if(!this.active)return Promise.resolve(this.session);
  this.active=false;this.finishing=true;clearTimeout(this.limitTimer);
  this.session.durationMs=this.clock()-this.origin;this.session.stoppedAtUtc=new Date().toISOString();this.session.stopReason=reason;
  this.event('diagnostic_stopped',{reason});
  this.stopPromise=(async()=>{
   if(this.recorder){
    if(this.recorder.state!=='inactive'){
     this.session.audio.stopRequestedMs=this.clock()-this.origin;
     try{this.recorder.stop();}catch(error){this.session.audio.status='error';this.session.audio.error=error.message;this.resolveAudio?.();}
    }
    await this.audioDone;
   }
   this.finishing=false;this.changed();return this.session;
  })();
  this.changed();return this.stopPromise;
 }
 json(){return JSON.stringify(this.session,null,2);}
}

export function attachDiagnostic(engine,context){
 // Developer tools are only exposed on this computer's loopback host.
 if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))return;
 const area=document.createElement('details');area.className='mic-check';area.id='developer-diagnostic';
 area.innerHTML=`<summary>Developer only · Diagnostic recorder</summary><p id="diagnostic-build">Detector build: ${DETECTOR_VERSION} · Log format 2</p>
 <p>Start the microphone, then record a short test. Pluck one string and let it ring. This records microphone audio and every detector response locally, including rejected readings. Maximum 10 minutes.</p>
 <p><button type="button" id="diagnostic-start">Start Diagnostic</button> <button type="button" id="diagnostic-stop" disabled>Stop Diagnostic</button></p>
 <p id="diagnostic-status" role="status">No diagnostic recorded.</p>
 <p><a id="diagnostic-json" hidden>Download telemetry JSON</a> <a id="diagnostic-audio" hidden style="margin-left:1em">Download microphone audio</a></p>
 <p>Stop before closing or refreshing this page, then download both files. Downloads share a session ID. Starting another session replaces these downloads. Telemetry timing is about 65 ms with overlapping audio windows; audio alignment is approximate, not sample-exact.</p>`;
 document.querySelector('.mic-check').after(area);
 const start=area.querySelector('#diagnostic-start'),stop=area.querySelector('#diagnostic-stop'),status=area.querySelector('#diagnostic-status');
 const json=area.querySelector('#diagnostic-json'),audio=area.querySelector('#diagnostic-audio');let exported=null;const urls=[];
 const clearLinks=()=>{urls.splice(0).forEach(url=>URL.revokeObjectURL(url));json.hidden=audio.hidden=true;};
 const download=(link,blob,name)=>{const url=URL.createObjectURL(blob);urls.push(url);link.href=url;link.download=name;link.hidden=false;};
 const recorder=new DiagnosticRecorder({context,changed:()=>{
  start.disabled=recorder.active||recorder.finishing;stop.disabled=!recorder.active;
  const s=recorder.session;if(!s)return;
  if(recorder.active){status.textContent=`Recording · ${s.frames.length} frames · audio ${s.audio.status}${s.audio.error?' · '+s.audio.error:''}`;return;}
  if(recorder.finishing){status.textContent='Finishing audio export…';return;}
  if(exported!==s){
   clearLinks();const prefix='anthem-diagnostic-'+s.id;
   if(recorder.audioBlob?.size){
    const ext=s.audio.mimeType?.includes('ogg')?'ogg':s.audio.mimeType?.includes('mp4')?'m4a':'webm';
    s.audio.fileName=prefix+'.'+ext;download(audio,recorder.audioBlob,s.audio.fileName);
   }
   download(json,new Blob([recorder.json()],{type:'application/json'}),prefix+'.json');exported=s;
  }
  status.textContent=`Stopped · ${s.frames.length} frames · ${(s.durationMs/1000).toFixed(1)} seconds · ${s.stopReason.replaceAll('_',' ')}. Audio: ${s.audio.status}.${s.audio.error?' '+s.audio.error:''} Download your files below.`;
 }});
 engine.diagnostic=recorder;
 start.onclick=()=>{try{recorder.start(engine.stream,engine.ctx);clearLinks();}catch(error){status.textContent=error.message;}};
 stop.onclick=()=>void recorder.stop();
 return recorder;
}

