// A running AudioContext does not guarantee audible output on iOS. Native
// tuner recordings select a media playback session; Web Audio alone may stay
// on the ringer/silent route. Every musical Play gesture takes the same route.
export function createPlaybackSession({navigator=globalThis.navigator,Audio=globalThis.Audio}={}){
 const owners=new Map();let media=null,mediaStart=null,previousType=null;
 const isiOS=/iPad|iPhone|iPod/.test(navigator?.userAgent||'')||(navigator?.platform==='MacIntel'&&navigator?.maxTouchPoints>1);
 function restore(){
  media?.pause();mediaStart=null;
  if(previousType!==null){try{if(navigator.audioSession.type==='playback')navigator.audioSession.type=previousType;}catch{}previousType=null;}
 }
 function release(owner){const lease=owners.get(owner);if(!lease)return;lease.active=false;owners.delete(owner);if(!owners.size)restore();}
 function activate(owner){
  const lease=owners.get(owner)||{active:true,ready:null,release(){if(owners.get(owner)===lease)release(owner);}};owners.set(owner,lease);
  try{
   let playback=false;
   try{const session=navigator?.audioSession;if(session){const prior=session.type;session.type='playback';playback=session.type==='playback';if(playback&&previousType===null)previousType=prior||'auto';}}catch{}
   if(playback||!isiOS){lease.ready=Promise.resolve();return lease;}
   if(!Audio)throw Error('Audio playback is unavailable.');
   // Older iOS has no Audio Session API. Keep an unmuted, zero-signal native
   // recording alive only while musical playback owns the output session.
   // play() MUST run in this tap, before resume, fetch, decode, or any await.
   if(!media){media=new Audio(new URL('../samples/audio-unlock.wav',import.meta.url));media.preload='auto';media.playsInline=true;media.loop=true;media.volume=1;}
   if(!mediaStart||media.paused)mediaStart=Promise.resolve(media.play());
   lease.ready=mediaStart;
  }catch(error){lease.ready=Promise.reject(error);}
  return lease;
 }
 function reset(){for(const owner of [...owners.keys()])release(owner);}
 function microphone(){reset();try{if(navigator?.audioSession)navigator.audioSession.type='auto';}catch{}}
 return {activate,release,reset,microphone};
}

let session;
const pending=new WeakMap();
function output(){return session??=createPlaybackSession();}
export function releasePlayback(owner){output().release(owner);}
export function prepareForMicrophone(){output().microphone();}
export function unlockAudioContext(ctx,owner){
 const prior=pending.get(owner);
 if(prior&&prior.ctx!==ctx)prior.lease.release();
 const lease=output().activate(owner);
 if(prior?.ctx===ctx&&prior.lease===lease)return prior.promise;
 let timer,resume;
 try{
  if(ctx.state==='closed')throw Error('Audio is paused. Tap Play again to reconnect sound.');
  resume=ctx.state==='running'?Promise.resolve():ctx.resume();
  if(ctx.state!=='running'){
   const oscillator=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
   gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.00001,now+.025);
   oscillator.connect(gain).connect(ctx.destination);oscillator.start(now);oscillator.stop(now+.03);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
 }catch(error){resume=Promise.reject(error);}
 const entry={ctx,lease,promise:null};
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Audio did not start. Tap Play again to reconnect sound.')),4000);});
 entry.promise=Promise.race([Promise.all([lease.ready,resume]),timeout]).then(()=>{
  if(!lease.active)throw Error('Audio start cancelled.');
  if(ctx.state!=='running')throw Error('Audio is paused. Tap Play again to reconnect sound.');
  return ctx;
 }).catch(error=>{lease.release();throw error;}).finally(()=>{clearTimeout(timer);if(pending.get(owner)===entry)pending.delete(owner);});
 pending.set(owner,entry);return entry.promise;
}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)session?.reset();});
if(typeof window!=='undefined')window.addEventListener('pagehide',()=>session?.reset());
