import {instruments,frequency,centsBetween,nearestNote,transposeNote,tuningLabel} from './tuner/tunings.js?v=50';
import {TunerAudio} from './tuner/audio.js';
import {GaugeState} from './tuner/gauge.js';
import {DisplayPitch} from './tuner/display.js';
import {PitchTrail} from './tuner/trail.js';
import {StringSelector} from './tuner/selection.js';
import {branding} from './branding.js';
import {attachDiagnostic} from './tuner/diagnostic.js';
import {initMetronome} from './tuner/metronome.js?v=51';
const $=id=>document.getElementById(id);
let instrument=instruments[0],tuningIndex=0,stringIndex=0,listening=false,starting=false,lastGood=0,inTuneSince=0,playUntil=0;
let referenceTimer;let referenceRequest=0;
let auto=false;const selector=new StringSelector();let trend=null;
const panel=document.querySelector('.tuning-panel');
const notes=()=>instrument.tunings[tuningIndex][1].split(' ');
const target=()=>notes()[stringIndex];
const chromatic=()=>instrument.mode==='chromatic';
const saxTranspose=()=>instrument.tunings[tuningIndex][2]||0;
const shownNote=note=>chromatic()?transposeNote(note,saxTranspose()):note;
const pretty=note=>note.replace('b','♭').replace('#','♯');
const trail=new PitchTrail($('pitch-trail'));let trailTarget='';const displayPitch=new DisplayPitch();const gauge=new GaugeState();let confirmedUntil=0;
function message(title,hint,status=''){if($('guidance').textContent!==title)$('guidance').textContent=title;$('hint').textContent=hint;panel.dataset.status=status;}
function displayNote(note){note=shownNote(note);$('target-note').textContent=pretty(note.slice(0,-1));$('target-octave').textContent=note.at(-1);}
function clear(){gauge.reset();displayPitch.reset();lastGood=0;inTuneSince=0;trend=null;panel.dataset.stale='false';$('motion').textContent='';$('cents').textContent=$('frequency').textContent=$('heard').textContent='—';$('needle').style.opacity=0;displayNote(target());$('live-caption').textContent=chromatic()?'WRITTEN SAX NOTE':'WAITING FOR YOUR NOTE';message(listening?(chromatic()?'Play a long tone':'Pluck a string'):'Ready when you are',listening?(chromatic()?'Hold any note steadily. The tuner handles the transposition.':'Let it ring. The needle follows as you turn the peg.'):(chromatic()?'Turn on Auto Detect, then play any comfortable note.':'Turn on Auto Detect, then pluck one string.'));}
function updateTarget(){const note=target(),shown=shownNote(note);const key=instrument.id+':'+tuningIndex+':'+stringIndex;if(key!==trailTarget){gauge.reset();trail.clear();trailTarget=key;}if(chromatic()){$('target-label').textContent=(saxTranspose()===9?'E♭ ALTO / BARITONE':'B♭ TENOR / SOPRANO')+' · YOUR NOTE';$('target-frequency').textContent='Your note '+pretty(shown)+' · sounding pitch '+pretty(note)+' · '+frequency(note).toFixed(2)+' Hz';}else{$('target-label').textContent='STRING '+(notes().length-stringIndex);$('target-frequency').textContent='Target '+pretty(note)+' · '+frequency(note).toFixed(2)+' Hz';}}
function renderMode(){const on=listening||starting,label=starting?'Auto Detect (Allow Mic)':listening?'Auto Detect (Mic On)':'Auto Detect (Mic Off)';$('auto-mode').setAttribute('aria-pressed',on);$('auto-mode').setAttribute('aria-label',label);$('auto-mode').innerHTML=`<span>${label}</span><i aria-hidden="true"></i>`;updateTarget();}
const engine=new TunerAudio((result,diagnostic)=>{
 const now=performance.now();
 if(now<playUntil){if(diagnostic)diagnostic.uiRejectionReason='reference_playback';message('Listen to your note','Pluck your string after the tone finishes.');return;}
 if(now<confirmedUntil){if(diagnostic)diagnostic.uiRejectionReason='confirmation_hold';return;}
 result=displayPitch.update(result,now);
 if(diagnostic&&!result)diagnostic.uiRejectionReason??='display_confirmation';
 $('display-stage').textContent=result?'Updating gauge':'Holding last reading';
 if(!result){
  // Brief missing frames should not flash the whole interface between states.
  if(lastGood&&now-lastGood<450)return;
  inTuneSince=0;
  if(displayPitch.note){
   panel.dataset.stale='true';$('live-caption').textContent='LAST NOTE · PLUCK AGAIN';$('motion').textContent='';
   if(gauge.value?.zero&&now-lastGood<1200)message('✓ Close enough',chromatic()?'Repeat a few steady long tones in the green.':'Now check five plucks across the center line.','tuned');
   else message('Pluck your string','Listening for a clear note. The gray trace is your last reading.');
  }else clear();
  return;
 }
 lastGood=now;panel.dataset.stale='false';
 if(auto){const guitalele=instrument.id==='ukulele'&&instrument.tunings[tuningIndex][0]==='Guitalele';const next=selector.update(result.hz,notes(),stringIndex,guitalele?false:result.confirmedChange,guitalele?{dwell:3,margin:55}:undefined);if(guitalele&&next===stringIndex&&selector.pending>=0){if(diagnostic)diagnostic.uiRejectionReason='confirming_guitalele_string';return;}if(next!==stringIndex){stringIndex=next;inTuneSince=0;trend=null;renderStrings();updateTarget();}}
 const cents=centsBetween(result.hz,frequency(target()));
 const reading=gauge.update(cents,now),abs=Math.abs(reading.average);
 if(diagnostic)Object.assign(diagnostic,{uiAccepted:true,uiRejectionReason:null,displayHz:result.hz,displayNote:result.displayNote,centsError:cents,gaugeCents:reading.average,confirmationTone:reading.ding});
 // The trace, note, and gauge share the same accepted, smoothed pitch.
 trail.add(cents,now,{...reading,rms:result.rms});
 if(reading.ding){confirmedUntil=now+engine.confirm();}

 displayNote(result.displayNote);$('live-caption').textContent=chromatic()?'WRITTEN NOTE YOU’RE PLAYING':'NOTE YOU’RE PLAYING';
 $('cents').textContent=(reading.average>0?'+':'')+reading.average.toFixed(1);$('frequency').textContent=result.hz.toFixed(2);$('heard').textContent=pretty(shownNote(nearestNote(result.hz)));$('needle').style.opacity=1;$('needle').style.left=(50+Math.max(-100,Math.min(100,reading.average))*.45)+'%';
 if(!trend)trend={cents,time:now};
 if(now-trend.time>=350){const delta=cents-trend.cents;const closer=abs<Math.abs(trend.cents);$('motion').textContent=Math.abs(delta)>=2?(delta>0?'Pitch rising':'Pitch falling')+' · '+(closer?'getting closer':'moving away'):'';trend={cents,time:now};}
 if(reading.zero)message('✓ Close enough',chromatic()?'Repeat a few steady long tones in the green.':'Now check five plucks across the center line.','tuned');
 else if(abs<=5)message('Almost there','Hold that pitch for a moment.');
 else message(reading.average<0?'↑ Tune higher':'↓ Tune lower',abs>150?(chromatic()?'Center the pitch and hold the note steadily.':'Check the string. Tap its button to lock the target.'):(reading.average<0?'Too low':'Too high')+' for '+pretty(shownNote(target()))+'. Follow the fine line and cents pointer.',abs>150?'far':'');

},state=>{listening=state==='listening';if(!listening){starting=false;auto=false;}renderMode();clear();if(state==='ended'){$('error').hidden=false;$('error').textContent='The microphone disconnected. Tap Auto to reconnect.';}},(rms,diagnostic={})=>{
 $('mic-source').textContent=diagnostic.microphone||'Microphone not active';
 $('pitch-stage').textContent=diagnostic.state||(diagnostic.rawHz?diagnostic.rawHz.toFixed(2)+' Hz · '+Math.round(diagnostic.confidence*100)+'% '+(diagnostic.confidenceMetric==='spectral_peak_clarity'?'spectral clarity':'periodicity')+(diagnostic.trackedHz?' · tracking':' · confirming'):'Sound level only · no clear pitch');
$('input-level').value=Math.max(0,Math.min(1,(20*Math.log10(Math.max(rms,1e-6))+70)/55));$('input-status').textContent=!listening?'Microphone off':rms<.0007?(chromatic()?'Quiet · play a long tone or move closer':'Quiet · pluck a string or move closer'):rms>.5?'Very loud · move a little farther away':'Sound reaching the microphone';});
attachDiagnostic(engine,()=>({instrument:instrument.id,tuning:instrument.tunings[tuningIndex][0],mode:auto?'auto':'locked',
 targetString:chromatic()?null:notes().length-stringIndex,targetNote:target(),targetWrittenNote:shownNote(target()),targetHz:frequency(target()),
 visibleNote:$('target-note').textContent+$('target-octave').textContent,visibleHz:$('frequency').textContent,
 visibleCents:$('cents').textContent,guidance:$('guidance').textContent,stale:panel.dataset.stale==='true'}));
function selectString(index,lock=false){referenceRequest++;clearTimeout(referenceTimer);engine.stopReference();playUntil=0;if(lock){auto=false;if(listening||starting)stopListening();}stringIndex=index;selector.reset();engine.tracker.reset();clear();renderStrings();renderMode();}
function renderStrings(){
 const guitar=instrument.id==='guitar', container=$('strings');
 panel.dataset.instrument=instrument.id;
 container.dataset.instrument=instrument.id;
 container.classList.toggle('guitar-neck',!chromatic());container.classList.toggle('sax-guide',chromatic());
 container.style.setProperty('--string-count',notes().length);
 document.querySelector('.string-heading h2').textContent=chromatic()?'Tap Auto, then play any note':'Tap to hear the note';
 if(chromatic()){
  const eb=saxTranspose()===9;
  container.innerHTML=`<div class="sax-mark" aria-hidden="true">🎷</div><div class="sax-copy"><strong>${eb?'E♭ sax':'B♭ sax'} translation</strong><span>Play it. We translate it.</span><small>The big note matches the note you finger and read.</small></div><div class="sax-transpose"><span>YOU PLAY</span><b>${eb?'F♯':'C'}</b><i>→</i><span>IT SOUNDS</span><b>${eb?'A':'B♭'}</b></div>`;
  $('string-order').textContent=eb?'E♭ ALTO / BARITONE':'B♭ TENOR / SOPRANO';$('neck-top').hidden=$('neck-bottom').hidden=true;
  document.querySelector('.string-tip').textContent='No transposition math. Play a comfortable note and read the large note you finger on your saxophone.';
  const help=document.querySelectorAll('.help p');help[0].innerHTML='<strong>Set the mouthpiece.</strong> Push in if you are consistently flat; pull out if you are consistently sharp.';help[1].innerHTML='<strong>Steady air.</strong> Hold a long tone, then use small embouchure adjustments without biting.';
  $('pitch-expectation').textContent='Pitch moves with your air and embouchure. Aim for a steady average in the green.';
  $('tune-reminder').innerHTML='<strong>Set up before you play.</strong> Saxophone pitch changes with mouthpiece position and embouchure. Check it with a comfortable long tone.';
  $('mic-help-action').textContent='Turn on Auto Detect and play a long, comfortable note. If the sound bar moves, the app can hear you.';
  $('tuning-help-first').innerHTML='<strong>Set the saxophone:</strong> play a comfortable long tone with steady air. If you are consistently flat, push the mouthpiece in a little. If you are consistently sharp, pull it out a little.';
  $('tuning-help-check').innerHTML='<strong>Check your embouchure:</strong> keep it relaxed and repeat the note. Tightening tends to raise the pitch; loosening tends to lower it. Aim for a steady average in the green.';
  $('tuning-help-reference').innerHTML='<strong>Check more than one note:</strong> test a few comfortable notes after setting the mouthpiece. The large note matches the note you finger and read on your music.';
  $('tuning-help-safety').textContent='Small changes are enough. Use steady air and avoid squeezing the mouthpiece to force the tuner into the center.';
  document.querySelector('.string-tip').classList.add('guitar-tip');
  void engine.prepareReference(instrument.id).catch(()=>{});return;
 }
 const entries=notes().map((note,index)=>({note,index}));entries.reverse();
 container.replaceChildren(...entries.map(({note,index})=>{
 const button=document.createElement('button'), number=notes().length-index;
 button.className='string';button.dataset.stringIndex=index;
 button.classList.toggle('short-string',instrument.id==='banjo'&&number===5);
 const highG=instrument.id==='ukulele'&&tuningIndex===0;
 const thickness=highG?[1.5,4.8,3,1.4][index]:instrument.id==='banjo'&&number===5?1.15:1.15+4.35*(number-1)/Math.max(1,notes().length-1);
 button.style.setProperty('--thickness',thickness+'px');
 button.setAttribute('aria-pressed',index===stringIndex);
 button.setAttribute('aria-label',`String ${number}, ${note}${guitar?(number===1?', thinnest string':number===6?', thickest string':''):''}`);
 const pitchName=note.slice(0,-1).replace('b','♭').replace('#','♯');
 const label=guitar&&number===1&&pitchName==='E'?'e':pitchName;
 button.innerHTML=`<span class="string-name"><small>${number}</small><strong>${label}</strong><sub>${note.at(-1)}</sub></span><span class="string-wire" aria-hidden="true"></span><span class="string-pick" aria-hidden="true">${index===stringIndex?'◀':''}</span>`;
 button.onclick=()=>{selectString(index,true);container.querySelector(`[data-string-index="${index}"]`).focus();void playTargetReference();};return button;
 }));
 $('string-order').textContent='OPEN STRINGS';
 $('neck-top').hidden=$('neck-bottom').hidden=false;
 const reentrant=instrument.id==='ukulele'&&tuningIndex===0;
 $('neck-top').textContent=guitar||instrument.id==='bass'||instrument.id==='violin'?'Thinnest string · higher sound':'String 1 · '+notes().at(-1);
 $('neck-bottom').textContent=instrument.id==='banjo'?'Short 5th string · high G':reentrant?'String 4 · high G (higher than C and E)':instrument.id==='ukulele'?'String 4 · '+notes()[0]:'Thickest string · lower sound';
 document.querySelector('.string-tip').textContent=instrument.id==='violin'?'Tap a string, then play it open — no fingers on the fingerboard.':'Tap a string, then play it open — no fingers on the frets.';
 const help=document.querySelectorAll('.help p');help[0].innerHTML='<strong>One string at a time.</strong> Let it ring. Keep the others quiet.';help[1].innerHTML='<strong>Small turns.</strong> Keep plucking about once a second while you adjust the peg.';
 $('pitch-expectation').textContent='The ding means close. Finish with five steady plucks crossing the center line.';
 $('tune-reminder').innerHTML='<strong>Tune before you play.</strong> String instruments drift while you play. Check your tuning every time you sit down, and check it again as you play.';
 $('mic-help-action').textContent='Turn on Auto Detect and pluck a string. If the sound bar moves, the app can hear you.';
 $('tuning-help-first').innerHTML='<strong>Find the note:</strong> pluck about once each second and make small turns until you hear the ding. The ding means you are close, not finished.';
 $('tuning-help-check').innerHTML='<strong>Do the five-pluck check:</strong> pluck five more times and watch the trail. If most readings drift to one side, make one tiny adjustment and count five again. Move on when the five plucks average around the center line.';
 $('tuning-help-reference').innerHTML='<strong>If you are not sure where to start:</strong> tap the string to hear its note. Match it by ear, then turn Auto Detect back on to finish.';
 $('tuning-help-safety').textContent='Stop tightening if a string feels unusually tight. Check the selected instrument, tuning, and string before continuing.';
 document.querySelector('.string-tip').classList.add('guitar-tip');
 void engine.prepareReference(instrument.id).catch(()=>{});
}
function renderInstrument(){
 $('instrument-choice').replaceChildren(...instruments.map((item,index)=>new Option(item.name,index)));
 $('instrument-choice').value=instruments.indexOf(instrument);
 $('tuning').replaceChildren(...instrument.tunings.map((entry,i)=>new Option(tuningLabel(instrument,entry),i)));
 $('tuning').disabled=instrument.tunings.length===1;
 selectString(chromatic()?notes().indexOf('A4'):0);
}
$('instrument-choice').onchange=()=>{instrument=instruments[Number($('instrument-choice').value)];tuningIndex=0;auto=false;renderInstrument();};
$('auto-mode').onclick=()=>{if(listening||starting){auto=false;stopListening();renderMode();return;}auto=true;selector.reset();trend=null;renderMode();void startListening();};
$('tuning').onchange=()=>{tuningIndex=Number($('tuning').value);selectString(chromatic()?notes().indexOf('A4'):0);};
let requestId=0,resumeWanted=false,resuming=false;
function stopListening(){trail.clear();requestId++;starting=false;engine.stop();engine.resetContext();}
async function startListening(){
 if(listening||starting){stopListening();return;}
 const request=++requestId;starting=true;$('error').hidden=true;
 renderMode();
 message('Allow the microphone','Use your browser’s permission prompt, or cancel below.');
 try{await engine.start();}
 catch(error){if(request!==requestId)return;engine.stop();$('error').hidden=false;$('error').textContent=error.name==='NotAllowedError'?'Microphone access was blocked. Allow it in your browser’s site settings, then try again.':error.name==='NotFoundError'?'No microphone found. Connect one and try again.':error.name==='NotReadableError'?'The microphone is busy or unavailable. Close other audio apps and try again.':error.message;}
 finally{if(request===requestId)starting=false;}
}
async function restoreMicrophone(){
 if(resuming||document.hidden)return;
 const returning=resumeWanted;if(!returning&&!listening&&!starting&&!auto)return;
 resuming=true;resumeWanted=false;
 try{
  // Installed iOS web apps can report a live microphone while delivering no
  // samples after suspension. An honest OFF state is safer than a false ON.
  if(returning){if(listening||starting)stopListening();auto=false;renderMode();clear();message('Tap Auto Detect to reconnect','Your phone paused the microphone while the tuner was idle.');return;}
  if(listening&&await engine.resumeInput())return;
  if(listening||starting)stopListening();auto=false;renderMode();clear();message('Tap Auto Detect to reconnect','The microphone needs a fresh connection.');
 }finally{resuming=false;}
}
async function playTargetReference(){
 const request=++referenceRequest;clearTimeout(referenceTimer);trail.clear();
 try{
  const duration=await engine.play(frequency(target()),instrument.id);
  if(request!==referenceRequest||duration===null)return;
  playUntil=performance.now()+duration;clear();message(chromatic()?'Listen to the sax note':'Listen to your string',chromatic()?'Tap again to replay. Match this written note after it fades.':'Tap again to replay. Pluck your string when the sound fades.');
  referenceTimer=setTimeout(()=>{if(request===referenceRequest){playUntil=0;clear();}},duration);
 }catch{if(request!==referenceRequest)return;$('error').hidden=false;$('error').textContent='The string recording could not load. Reload the page and try again.';}
 finally{if(request===referenceRequest)updateTarget();}
}
function suspendForBackground(){resumeWanted=resumeWanted||auto||listening||starting;if(listening||starting)stopListening();referenceRequest++;clearTimeout(referenceTimer);engine.stopReference();playUntil=0;}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendForBackground();else setTimeout(()=>void restoreMicrophone(),180);});
window.addEventListener('pagehide',suspendForBackground);
window.addEventListener('pageshow',()=>setTimeout(()=>void restoreMicrophone(),180));
window.addEventListener('focus',()=>setTimeout(()=>void restoreMicrophone(),180));
if(branding.studentPortalUrl){const url=new URL(branding.studentPortalUrl);if(url.protocol==='https:'){$('portal').href=url.href;$('portal').hidden=false;}}
document.querySelector('.sample-credits p')?.insertAdjacentHTML('beforeend',' Alto-sax recordings come from the same collection (Karoryfer source) and are pitch-adjusted for the selected written note. Tuning-success sound: “Smooth Completed Notify Starting Alert” from <a href="https://pixabay.com/sound-effects/search/completed/" target="_blank" rel="noopener">Pixabay</a>, used under the Pixabay Content License.');
const more=document.createElement('details'),moreSummary=document.createElement('summary'),moreBody=document.createElement('div');
more.className='more-menu';moreSummary.innerHTML='<span class="nav-icon" aria-hidden="true">☰</span><span>More</span>';moreBody.className='more-menu-body';more.append(moreSummary,moreBody);
const tuningTitle=document.createElement('h2');tuningTitle.className='more-section-title';tuningTitle.textContent='Tuning';moreBody.append(tuningTitle);document.querySelectorAll('main > .tune-reminder, main > .help, main > details').forEach(item=>moreBody.append(item));
const rhythmTitle=document.createElement('h2');rhythmTitle.className='more-section-title';rhythmTitle.textContent='Metronome';const rhythmCopy=document.createElement('p');rhythmCopy.className='metronome-more';rhythmCopy.innerHTML='<strong>Rhythm holds the music together.</strong> We do not make up the timing as we go—we learn to lock in with a steady pulse. Practice with a metronome, another musician, or a recording until staying with the beat feels natural.';moreBody.append(rhythmTitle,rhythmCopy);
const copyright=document.createElement('p');copyright.className='more-copyright';copyright.textContent='© 2026 Anthem Music. All rights reserved.';const version=document.createElement('p');version.className='app-version';version.textContent='Version 51';moreBody.append(copyright,version);
const metronome=initMetronome(),bottomNav=document.createElement('nav'),tunerNav=document.createElement('button'),metronomeNav=document.createElement('button');
bottomNav.className='bottom-nav';bottomNav.setAttribute('aria-label','App tools');
tunerNav.className='nav-item';tunerNav.innerHTML='<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/><path d="M6 18h12"/></svg></span><span>Tuner</span>';
metronomeNav.className='nav-item';metronomeNav.innerHTML='<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 3h8l3 18H5L8 3Z"/><path d="M12 7v9"/><path d="m12 16 3-4"/></svg></span><span>Metronome</span>';
bottomNav.append(tunerNav,metronomeNav,more);document.body.append(bottomNav);
function showView(view){
 const metro=view==='metronome';document.body.dataset.view=metro?'metronome':'tuner';
 tunerNav.classList.toggle('active',!metro);metronomeNav.classList.toggle('active',metro);tunerNav.setAttribute('aria-current',metro?'false':'page');metronomeNav.setAttribute('aria-current',metro?'page':'false');
 document.querySelector('.edition').textContent=metro?'THE METRONOME':'THE TUNER';
 if(metro){if(listening||starting)stopListening();location.hash='metronome';}else{metronome.stop();history.replaceState(null,'',location.pathname+location.search);}
 window.scrollTo(0,0);
}
tunerNav.onclick=()=>showView('tuner');metronomeNav.onclick=()=>showView('metronome');
more.addEventListener('toggle',()=>{moreSummary.textContent=more.open?'← Back': '';if(!more.open)moreSummary.innerHTML='<span class="nav-icon" aria-hidden="true">☰</span><span>More</span>';else metronome.stop();});
renderInstrument();
showView(location.hash==='#metronome'?'metronome':'tuner');
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});





