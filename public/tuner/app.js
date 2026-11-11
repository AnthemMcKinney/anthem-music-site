import {instruments,frequency,centsBetween,nearestNote,transposeNote,tuningLabel} from './tuner/tunings.js?v=55';
import {TunerAudio} from './tuner/audio.js?v=web-audio-1';
import {GaugeState} from './tuner/gauge.js?v=3.7fh';
import {DisplayPitch} from './tuner/display.js';
import {PitchTrail} from './tuner/trail.js?v=71';
import {StringSelector} from './tuner/selection.js';
import {branding} from './branding.js';
import {attachDiagnostic} from './tuner/diagnostic.js';
import {initMetronome} from './tuner/metronome.js?v=web-playback-159';
import {initChords} from './tuner/chords.js?v=chord-layout-review-2';
const THEME_KEY='anthem-color-theme';
const savedTheme=(()=>{try{return localStorage.getItem(THEME_KEY)||'classic';}catch{return 'classic';}})();
document.documentElement.dataset.theme=['classic','soft','dark','dark-rose','dark-sage'].includes(savedTheme)?savedTheme:'classic';
const $=id=>document.getElementById(id);
let instrument=instruments[0],tuningIndex=0,stringIndex=0,listening=false,starting=false,lastGood=0,inTuneSince=0,playUntil=0;
let referenceTimer;let referenceRequest=0;
let auto=false;const selector=new StringSelector();let trend=null;
class ThreePluckConfirmation{
 constructor(onChange){this.onChange=onChange;this.reset();}
 reset(){this.count=0;this.started=0;this.lastOnset=-Infinity;this.lastRms=0;this.peak=.001;this.armed=true;this.active=false;this.qualified=false;this.onChange?.(0);}
 level(rms,now){rms=Number(rms)||0;const priorPeak=this.peak;this.peak=Math.max(rms,this.peak*.965);if(!this.armed&&(rms<Math.max(.0015,this.peak*.62)||now-this.lastOnset>700))this.armed=true;const onset=this.armed&&now-this.lastOnset>280&&rms>.002&&rms>Math.max(this.lastRms*1.22,priorPeak*.48);if(onset){if(this.started&&now-this.started>18000)this.reset();this.active=true;this.qualified=false;this.armed=false;this.lastOnset=now;this.peak=rms;if(!this.started)this.started=now;}if(this.active&&!this.qualified&&now-this.lastOnset>1600)this.active=false;this.lastRms=rms;}
 accept(reading,now){if(!this.active||this.qualified||now-this.lastOnset>1600||!reading.inZone)return false;this.qualified=true;this.count=Math.min(3,this.count+1);this.onChange?.(this.count);return true;}
}
const panel=document.querySelector('.tuning-panel');
const notes=()=>instrument.tunings[tuningIndex][1].split(' ');
const target=()=>notes()[stringIndex];
const chromatic=()=>instrument.mode==='chromatic';
const saxophone=()=>instrument.id==='saxophone';
const referencePitch=()=>instrument.id==='chromatic'?(instrument.tunings[tuningIndex][2]||440):440;
const saxTranspose=()=>instrument.tunings[tuningIndex][2]||0;
const shownNote=note=>saxophone()?transposeNote(note,saxTranspose()):note;
const pretty=note=>note.replace('b','♭').replace('#','♯');
const trail=new PitchTrail($('pitch-trail'));const confirmation=new ThreePluckConfirmation(count=>trail.setConfirmation(count));let trailTarget='';const displayPitch=new DisplayPitch();const gauge=new GaugeState();let confirmedUntil=0;
function message(title,hint,status=''){if($('guidance').textContent!==title)$('guidance').textContent=title;$('hint').textContent=hint;panel.dataset.status=status;}
function displayNote(note){note=shownNote(note);$('target-note').textContent=pretty(note.slice(0,-1));$('target-octave').textContent=note.at(-1);}
function clear(){gauge.reset();confirmation.reset();displayPitch.reset();lastGood=0;inTuneSince=0;trend=null;panel.dataset.stale='false';$('motion').textContent='';$('cents').textContent=$('frequency').textContent=$('heard').textContent='—';$('needle').style.opacity=0;if(chromatic()){$('target-note').textContent='—';$('target-octave').textContent='';}else displayNote(target());$('live-caption').textContent=saxophone()?'WRITTEN SAX NOTE':'WAITING FOR YOUR NOTE';message(chromatic()?'Play a note':'Pluck a string',listening?(saxophone()?'Hold one note steadily.':chromatic()?'Let one clear note ring.':'Let the string ring while you adjust it.'):(chromatic()?'Turn on Auto Detect, then play one note.':'Turn on Auto Detect, then pluck one string.'));}
function updateTarget(){const note=target(),shown=shownNote(note);const key=instrument.id+':'+tuningIndex+':'+stringIndex;if(key!==trailTarget){gauge.reset();confirmation.reset();trail.clear();trailTarget=key;}if(saxophone()){$('target-label').textContent=(saxTranspose()===9?'E♭ ALTO / BARITONE':'B♭ TENOR / SOPRANO')+' · YOUR NOTE';$('target-frequency').textContent='Your note '+pretty(shown)+' · sounding pitch '+pretty(note)+' · '+frequency(note).toFixed(2)+' Hz';}else if(chromatic()){$('target-label').textContent='CHROMATIC · NEAREST NOTE';$('target-frequency').textContent='A'+referencePitch()+' reference · Play any note';}else{$('target-label').textContent='STRING '+(notes().length-stringIndex);$('target-frequency').textContent='Target '+pretty(note)+' · '+frequency(note).toFixed(2)+' Hz';}}
function renderMode(){const on=listening||starting,label=starting?'Auto Detect (Allow Mic)':listening?'Auto Detect (Mic On)':'Auto Detect (Mic Off)';$('auto-mode').setAttribute('aria-pressed',on);$('auto-mode').setAttribute('aria-label',label);$('auto-mode').innerHTML=`<span>${label}</span><i aria-hidden="true"></i>`;updateTarget();}
function correctStringOctave(result,diagnostic){
 if(!result||chromatic())return result;
 const expected=frequency(target()),candidates=[];
 for(let shift=-3;shift<=3;shift++)candidates.push(result.hz*2**shift);
 if(expected>=250&&result.hz<expected*.55)for(let multiple=3;multiple<=8;multiple++)candidates.push(result.hz*multiple);
 const hz=candidates.reduce((best,value)=>Math.abs(centsBetween(value,expected))<Math.abs(centsBetween(best,expected))?value:best,result.hz);
 const ratio=hz/result.hz,octaveFold=Math.abs(Math.log2(ratio)-Math.round(Math.log2(ratio)))<.001,tolerance=octaveFold?135:110;
 if(hz===result.hz||Math.abs(centsBetween(hz,expected))>tolerance)return result;
 if(diagnostic)diagnostic.uiOctaveCorrection={fromHz:result.hz,toHz:hz,targetHz:expected};
 return {...result,hz};
}
const engine=new TunerAudio((result,diagnostic)=>{
 const now=performance.now();
 if(now<playUntil){if(diagnostic)diagnostic.uiRejectionReason='reference_playback';message(saxophone()?'Listen to the sax note':chromatic()?'Listen to the reference note':'Listen to your note',chromatic()?'Play after the reference tone finishes.':'Pluck your string after the tone finishes.');return;}
 if(now<confirmedUntil){if(diagnostic)diagnostic.uiRejectionReason='confirmation_hold';return;}
 result=correctStringOctave(result,diagnostic);
 result=displayPitch.update(result,now);
 if(diagnostic&&!result)diagnostic.uiRejectionReason??='display_confirmation';
 $('display-stage').textContent=result?'Updating gauge':'Holding last reading';
 if(!result){
  // Brief missing frames should not flash the whole interface between states.
  if(lastGood&&now-lastGood<450)return;
  inTuneSince=0;
  if(displayPitch.note){
   panel.dataset.stale='true';$('live-caption').textContent='LAST NOTE · PLUCK AGAIN';$('motion').textContent='';
   if(gauge.value?.zero&&now-lastGood<1200)message('✓ Close enough',chromatic()?'Repeat a few steady long tones in the green.':'Now check three steady plucks across the center line.','tuned');
   else message(chromatic()?'Play the note again':'Pluck your string',chromatic()?'Listening for a clear, steady note. The gray trace is your last reading.':'Listening for a clear note. The gray trace is your last reading.');
  }else clear();
  return;
 }
 lastGood=now;panel.dataset.stale='false';
 if(auto){const guitalele=instrument.id==='ukulele'&&instrument.tunings[tuningIndex][0]==='Guitalele',standardUkulele=instrument.id==='ukulele'&&!guitalele,selectionOptions=guitalele?{dwell:3,margin:55}:standardUkulele?{dwell:1,margin:55}:undefined;const next=selector.update(result.hz,notes(),stringIndex,chromatic()?true:guitalele?false:result.confirmedChange,selectionOptions);if(guitalele&&next===stringIndex&&selector.pending>=0){if(diagnostic)diagnostic.uiRejectionReason='confirming_guitalele_string';return;}if(next!==stringIndex){stringIndex=next;inTuneSince=0;trend=null;renderStrings();updateTarget();}}
 const activeNote=chromatic()?nearestNote(result.hz,referencePitch()):target(),activeFrequency=frequency(activeNote,referencePitch());
 if(chromatic()&&trailTarget!==activeNote){gauge.reset();trail.clear();trailTarget=activeNote;}
 const cents=centsBetween(result.hz,activeFrequency);
 const reading=gauge.update(cents,now),abs=Math.abs(reading.average);
 if(!chromatic())confirmation.accept(reading,now);
 if(diagnostic)Object.assign(diagnostic,{uiAccepted:true,uiRejectionReason:null,displayHz:result.hz,displayNote:result.displayNote,centsError:cents,gaugeCents:reading.average,confirmationTone:reading.ding});
 // The trace, note, and gauge share the same accepted, smoothed pitch.
 trail.add(cents,now,{...reading,rms:result.rms});
 // Keep microphone analysis continuous in the browser. Native packages can
 // restore an audible confirmation with a full-duplex audio session.

 displayNote(activeNote);$('live-caption').textContent=saxophone()?'WRITTEN NOTE YOU’RE PLAYING':chromatic()?'NEAREST NOTE':'TARGET NOTE';
 if(chromatic())$('target-frequency').textContent='Closest to '+pretty(activeNote)+' · '+activeFrequency.toFixed(2)+' Hz · A'+referencePitch();
 $('cents').textContent=(reading.average>0?'+':'')+reading.average.toFixed(1);$('frequency').textContent=result.hz.toFixed(2);$('heard').textContent=pretty(shownNote(nearestNote(result.hz,referencePitch())));$('needle').style.opacity=1;$('needle').style.left=(50+Math.max(-100,Math.min(100,reading.average))*.45)+'%';
 if(!trend||now-trend.time>=350)trend={cents,time:now};
 if(reading.inZone&&!chromatic())message(confirmation.count>=3?'✓ Tuned — 3 steady plucks':'✓ Close enough',confirmation.count?`${confirmation.count} of 3 good plucks. Keep going.`:'Pluck again to begin the three-pluck check.','tuned');
 else if(reading.zero)message(chromatic()?'✓ '+pretty(activeNote)+' — close enough':'✓ Close enough','Repeat a few steady long tones near the center line.','tuned');
 else if(abs<=8)message(chromatic()?pretty(activeNote)+' · Almost there':'Almost there','Hold that pitch for a moment.');
 else message(reading.average<0?'↑ Tune higher':'↓ Tune lower',abs>150?(chromatic()?'Center the pitch and hold the note steadily.':'Check the string. Tap its button to lock the target.'):(reading.average<0?'Too low':'Too high')+' for '+pretty(shownNote(activeNote))+'. Follow the fine line and cents pointer.',abs>150?'far':'');

},state=>{listening=state==='listening';if(!listening){starting=false;auto=false;}renderMode();clear();if(state==='ended'){$('error').hidden=false;$('error').textContent='The microphone disconnected. Tap Auto to reconnect.';}},(rms,diagnostic={})=>{
 if(!chromatic())confirmation.level(rms,performance.now());
 $('mic-source').textContent=diagnostic.microphone||'Microphone not active';
 $('pitch-stage').textContent=diagnostic.state||(diagnostic.rawHz?diagnostic.rawHz.toFixed(2)+' Hz · '+Math.round(diagnostic.confidence*100)+'% '+(diagnostic.confidenceMetric==='spectral_peak_clarity'?'spectral clarity':'periodicity')+(diagnostic.trackedHz?' · tracking':' · confirming'):'Sound level only · no clear pitch');
$('input-level').value=Math.max(0,Math.min(1,(20*Math.log10(Math.max(rms,1e-6))+70)/55));$('input-status').textContent=!listening?'Microphone off':rms<.0007?(chromatic()?'Quiet · play a long tone or move closer':'Quiet · pluck a string or move closer'):rms>.5?'Very loud · move a little farther away':'Sound reaching the microphone';});
attachDiagnostic(engine,()=>({instrument:instrument.id,tuning:instrument.tunings[tuningIndex][0],mode:auto?'auto':'locked',
 targetString:chromatic()?null:notes().length-stringIndex,targetNote:target(),targetWrittenNote:shownNote(target()),targetHz:frequency(target()),
 visibleNote:$('target-note').textContent+$('target-octave').textContent,visibleHz:$('frequency').textContent,
 visibleCents:$('cents').textContent,guidance:$('guidance').textContent,stale:panel.dataset.stale==='true'}));
function selectString(index,lock=false){referenceRequest++;clearTimeout(referenceTimer);engine.stopReference();playUntil=0;if(lock){auto=false;if(listening||starting)stopListening();}stringIndex=index;selector.reset();engine.tracker.reset();clear();renderStrings();renderMode();}
function renderInstrumentNotes(){
 const details=$('instrument-notes'),open=$('instrument-info-open'),title=$('instrument-notes-title'),body=$('instrument-notes-body');
 if(!details||!open||!body)return;
 const pitchNames=notes().map(note=>note.replace(/\d$/,'').replace('b','♭').replace('#','♯'));
 details.hidden=open.hidden=chromatic();
 if(details.hidden&&details.open)details.close();
 if(details.hidden)return;
 if(instrument.id==='guitar'){
  title.textContent='Know your guitar';
  body.innerHTML='<p><strong>Remember the open strings:</strong> From the lowest/thickest string to the highest/thinnest string, say “<b>E</b>ddie <b>A</b>te <b>D</b>ynamite <b>G</b>ood <b>B</b>ye <b>E</b>ddie.”</p><p><strong>What the small number means:</strong> The number beside a note is its octave—the same note name in a higher or lower pitch range. For example, E2 is the low E string and E4 is the high E string.</p><p><strong>Read the frets:</strong> A fret is the playing space between two metal strips. Count those spaces from the headstock: fret 1, fret 2, fret 3, and so on. Position markers vary by manufacturer, but commonly appear at frets 3, 5, 7, 9, and 12; the pattern begins again after fret 12.</p><button type="button" class="tuner-note-image" aria-label="Enlarge guitar string and fret map"><img src="./images/objective-one/guitar-string-and-fret-map.png" alt="Guitar open-string names, fret spaces, and high and low orientation"></button>';
  return;
 }
 if(instrument.id==='ukulele'){
  const baritone=instrument.tunings[tuningIndex][0]==='Baritone',phrase=baritone?'<b>D</b>onkeys <b>G</b>row <b>B</b>ig <b>E</b>ars':'<b>G</b>ood <b>C</b>hildren <b>E</b>at <b>A</b>pples';
  title.textContent=baritone?'Know your baritone ukulele':'Know your ukulele';
  body.innerHTML=`<p><strong>Remember the open strings:</strong> Say “${phrase}.” Your selected tuning is ${pitchNames.join(' · ')}.</p><p><strong>What the small number means:</strong> It is the note’s octave—the same note name in a higher or lower pitch range. High-G ukulele uses G4; low-G uses the deeper G3.</p><p><strong>Read the frets:</strong> A fret is the playing space between two metal strips. Count those spaces from the headstock: fret 1, fret 2, fret 3, and so on. Position markers vary, but commonly appear on odd-numbered frets with a special marker at fret 12.</p>`;
  return;
 }
 title.textContent=`Know your ${instrument.name.toLowerCase()}`;
 body.innerHTML=`<p><strong>Open strings:</strong> From the lowest listed string to the highest, this tuning is ${pitchNames.join(' · ')}. Tap each string above to hear its target note before tuning.</p><p><strong>What the small number means:</strong> It is the note’s octave—the same note name in a higher or lower pitch range.</p>`;
}
function renderStrings(){
 const guitar=instrument.id==='guitar', container=$('strings');
 renderInstrumentNotes();
 panel.dataset.instrument=instrument.id;
 container.dataset.instrument=instrument.id;
 container.classList.toggle('guitar-neck',!chromatic());container.classList.toggle('sax-guide',chromatic());container.classList.toggle('chromatic-guide',instrument.id==='chromatic');
 container.style.setProperty('--string-count',notes().length);
 document.querySelector('.string-heading h2').textContent=chromatic()?'Tap Auto, then play any note':'Tap to hear the note';
 if(chromatic()){
  if(instrument.id==='chromatic'){
   container.innerHTML='<div class="sax-mark" aria-hidden="true">♪</div><div class="sax-copy"><strong>Chromatic tuning</strong><span>Play any single note.</span><small>The tuner follows the nearest concert-pitch note automatically.</small></div><div class="sax-transpose"><span>PLAY</span><b>Any note</b><i>→</i><span>READ</span><b>Pitch</b></div>';
   $('string-order').textContent='CONCERT PITCH';$('neck-top').hidden=$('neck-bottom').hidden=true;
   document.querySelector('.string-tip').textContent='Use one clear note at a time. The large note and cents display update automatically.';
   const help=document.querySelectorAll('.help p');help[0].innerHTML='<strong>One note at a time.</strong> Let it ring clearly and keep other strings or notes quiet.';help[1].innerHTML='<strong>Watch the center.</strong> Adjust until the cents reading and pitch trail settle in the green.';
   $('pitch-expectation').textContent='The tuner follows the nearest note automatically. Aim for a steady average at the center line.';
   $('tune-reminder').innerHTML='<strong>Check one note at a time.</strong> Background sound and overlapping notes can make a chromatic tuner choose the wrong pitch.';
   $('mic-help-action').textContent='Turn on Auto Detect and play one clear note. If the sound bar moves, the app can hear you.';
   $('tuning-help-first').innerHTML='<strong>Find the note:</strong> play one clear note and let it ring. The large letter shows the nearest concert-pitch note.';
   $('tuning-help-check').innerHTML='<strong>Center the pitch:</strong> adjust higher or lower until the cents reading and pitch trail settle around the center line.';
   $('tuning-help-reference').innerHTML='<strong>Reduce interference:</strong> mute unused strings, avoid playing chords, and move closer to the microphone when the displayed note jumps.';
   $('tuning-help-safety').textContent='Make small adjustments. Stop tightening a string if it feels unusually tight and confirm that you are aiming for the intended note.';
   document.querySelector('.string-tip').classList.add('guitar-tip');return;
  }
  const eb=saxTranspose()===9;
  container.innerHTML=`<div class="sax-mark" aria-hidden="true">🎷</div><div class="sax-copy"><strong>${eb?'E♭ sax':'B♭ sax'} translation</strong><span>Play it. We translate it.</span><small>The big note matches the note you finger and read.</small></div><div class="sax-transpose"><span>YOU PLAY</span><b>${eb?'F♯':'C'}</b><i>→</i><span>IT SOUNDS</span><b>${eb?'A':'B♭'}</b></div>`;
  $('string-order').textContent=eb?'E♭ ALTO / BARITONE':'B♭ TENOR / SOPRANO';$('neck-top').hidden=$('neck-bottom').hidden=true;
  document.querySelector('.string-tip').textContent='No transposition math. Play a comfortable note and read the large note you finger on your saxophone.';
  const help=document.querySelectorAll('.help p');help[0].innerHTML='<strong>Set the mouthpiece.</strong> Push in if you are consistently flat; pull out if you are consistently sharp.';help[1].innerHTML='<strong>Steady air.</strong> Hold a long tone, then use small embouchure adjustments without biting.';
  $('pitch-expectation').textContent='Pitch moves with your air and embouchure. Aim for a steady average at the center line.';
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
 $('pitch-expectation').textContent='Use the center line and cents near zero. Finish with three steady plucks.';
 $('tune-reminder').innerHTML='<strong>Tune before you play.</strong> String instruments drift while you play. Check your tuning every time you sit down, and check it again as you play.';
 $('mic-help-action').textContent='Turn on Auto Detect and pluck a string. If the sound bar moves, the app can hear you.';
 $('tuning-help-first').innerHTML='<strong>Find the note:</strong> pluck about once each second and make small turns until the reading reaches green. Green means you are close, not finished.';
 $('tuning-help-check').innerHTML='<strong>Do the three-pluck check:</strong> pluck three more times and watch the trail. If most readings drift to one side, make one tiny adjustment and count three again. Move on when the three plucks average around the center line.';
 $('tuning-help-reference').innerHTML='<strong>If you are not sure where to start:</strong> tap the string to hear its note. Match it by ear, then turn Auto Detect back on to finish.';
 $('tuning-help-safety').textContent='Stop tightening if a string feels unusually tight. Check the selected instrument, tuning, and string before continuing.';
 document.querySelector('.string-tip').classList.add('guitar-tip');
 void engine.prepareReference(instrument.id).catch(()=>{});
}
function renderInstrument(){
 engine.setDetectorOptions({allowStrongHalfPeriod:saxophone()});
 $('instrument-choice').replaceChildren(...instruments.map((item,index)=>new Option(item.name,index)));
 $('instrument-choice').value=instruments.indexOf(instrument);
 $('tuning').replaceChildren(...instrument.tunings.map((entry,i)=>new Option(tuningLabel(instrument,entry),i)));
 $('tuning').disabled=instrument.tunings.length===1;
 selectString(chromatic()?notes().indexOf('A4'):0);
}
$('instrument-choice').onchange=()=>{instrument=instruments[Number($('instrument-choice').value)];tuningIndex=0;auto=false;renderInstrument();};
$('instrument-info-open').onclick=()=>$('instrument-notes').showModal();
$('instrument-notes').addEventListener('click',event=>{if(event.target===$('instrument-notes')||event.target.closest('.instrument-info-close'))$('instrument-notes').close();else if(event.target.closest('.tuner-note-image'))$('tuner-note-dialog').showModal();});
$('tuner-note-dialog').addEventListener('click',event=>{if(event.target===$('tuner-note-dialog')||event.target.closest('.tuner-note-dialog-close'))$('tuner-note-dialog').close();});
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
 const request=++referenceRequest;clearTimeout(referenceTimer);trail.clear();playUntil=0;$('error').hidden=true;message('Loading reference note','The selected note will play when it is ready.');
 try{
  const duration=await engine.play(frequency(target()),instrument.id);
  if(request!==referenceRequest)return;
  if(duration===null){playUntil=0;clear();return;}
  playUntil=performance.now()+duration;clear();$('live-caption').textContent='REFERENCE NOTE';message(saxophone()?'Listen to the sax note':chromatic()?'Listen to the reference note':'Listen to your string',saxophone()?'Tap again to replay. Match this written note after it fades.':chromatic()?'Tap again to replay. Play the same concert-pitch note after it fades.':'Tap again to replay. Pluck your string when the sound fades.');
  referenceTimer=setTimeout(()=>{if(request===referenceRequest){playUntil=0;clear();}},duration);
 }catch{if(request!==referenceRequest)return;playUntil=0;clear();message('Reference note unavailable','Tap the string again to retry.');$('error').hidden=false;$('error').textContent='The string recording could not load. Tap the string to try again.';}
 finally{if(request===referenceRequest)updateTarget();}
}
function suspendForBackground(){resumeWanted=resumeWanted||auto||listening||starting;if(listening||starting)stopListening();referenceRequest++;clearTimeout(referenceTimer);engine.stopReference();playUntil=0;clear();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendForBackground();else setTimeout(()=>void restoreMicrophone(),180);});
window.addEventListener('pagehide',suspendForBackground);
window.addEventListener('pageshow',()=>setTimeout(()=>void restoreMicrophone(),180));
window.addEventListener('focus',()=>setTimeout(()=>void restoreMicrophone(),180));
if(branding.studentPortalUrl){const url=new URL(branding.studentPortalUrl);if(url.protocol==='https:'){$('portal').href=url.href;$('portal').hidden=false;}}
document.querySelector('.sample-credits p')?.insertAdjacentHTML('beforeend',' Alto-sax recordings come from the same collection (Karoryfer source) and are pitch-adjusted for the selected written note.');
const moreView=document.createElement('section'),moreBody=document.createElement('div');
moreView.className='more-view';moreView.hidden=true;moreBody.className='more-menu-body';moreView.append(moreBody);document.body.append(moreView);
const moreIntro=document.createElement('section');moreIntro.className='more-overview';moreIntro.innerHTML='<p>ANTHEM MUSIC</p><h2>Tools for better practice.</h2><span>Tune your instrument, build steady rhythm, and learn the first chords in a clear lesson sequence.</span>';moreBody.append(moreIntro);
const moreSection=(title,html)=>{const details=document.createElement('details');details.className='more-card';details.innerHTML=`<summary>${title}</summary><div>${html}</div>`;moreBody.append(details);return details;};
const appearance=moreSection('Appearance','<p>Choose a color palette that feels comfortable for longer practice sessions.</p><div class="theme-picker" role="group" aria-label="Color scheme"><button data-theme-choice="classic"><i></i><span>Anthem Classic</span></button><button data-theme-choice="soft"><i></i><span>Soft Neutral</span></button><button data-theme-choice="dark"><i></i><span>Dark Studio</span></button><button data-theme-choice="dark-rose"><i></i><span>Dark Rose</span></button><button data-theme-choice="dark-sage"><i></i><span>Dark Sage</span></button></div>');
const applyTheme=theme=>{document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',getComputedStyle(document.documentElement).getPropertyValue('--theme-nav').trim());appearance.querySelectorAll('[data-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===theme)));try{localStorage.setItem(THEME_KEY,theme);}catch{}};
appearance.addEventListener('click',event=>{const button=event.target.closest('[data-theme-choice]');if(button)applyTheme(button.dataset.themeChoice);});applyTheme(document.documentElement.dataset.theme);
moreSection('About this app','<p>These tools turn the same ideas used in Anthem Music lessons into something students and families can use between sessions.</p><p>The approach comes from teaching hundreds of students, designing practical curriculum over many years, collaborating with professional musicians and music programs, and refining lessons through student and user feedback.</p>');
const tuningHelp=moreSection('Tuner and sound help','');document.querySelectorAll('main > .tune-reminder, main > .help, main > details').forEach(item=>tuningHelp.lastElementChild.append(item));
moreSection('Metronome and rhythm','<p><strong>Rhythm holds the music together.</strong> Use the metronome to connect the count, your foot, and your hands to one steady pulse. Tap Start to play. Sound Check is available if you want to test the output.</p>');
moreSection('First-chord lessons','<p>First Chords follows a progressive lesson path for guitar, baritone ukulele, and standard ukulele. Chord shapes, transitions, strumming, and familiar progressions become more challenging one objective at a time.</p>');
moreSection('Scales','<p>Learn guitar note names, connect scale patterns, and practice with tablature and backing tracks. Scales is part of the web app.</p>');
moreSection('Strumming','<p>Strumming is part of First Chords because the rhythm and the chord shape need to work together. Choose your instrument and learning path in First Chords, then open the Strumming tab.</p><p>Start with the practice patterns and build toward the common, two-bar, and sixteenth-note patterns. Choose a chord in an exercise to hear that pattern with the shape you are learning; tap the chord name to see its diagram.</p>');
moreSection('Privacy and credits','<p>Microphone audio stays on this device and is used only for live tuning. Recording credits and license details are included in the Tuner and sound help section.</p>');
const copyright=document.createElement('p');copyright.className='more-copyright';copyright.textContent='© 2026 Anthem Music. All rights reserved.';const feedback=document.createElement('p');feedback.className='more-feedback';feedback.innerHTML='Please provide feedback to <a href="mailto:info@anthemmusic.net">info@anthemmusic.net</a>.';const version=document.createElement('p');version.className='app-version';version.textContent='Beta 3.7.159 · Chord layout review 2';moreBody.append(copyright,feedback,version);
const metronome=initMetronome(),chordsModule=initChords();
// Keep Scales dependencies out of the core app startup path.
const scalesView=document.createElement('section');scalesView.id='scales-view';scalesView.className='scales-view';scalesView.hidden=true;scalesView.setAttribute('aria-label','Guitar scales');document.querySelector('main').append(scalesView);
let scalesController=null,scalesLoading=null;
function loadScalesView(){
 if(scalesController||scalesLoading)return;
 scalesView.innerHTML='<p role="status">Loading Scales.</p>';
 scalesLoading=import('./tuner/scales-view.js?v=web-playback-159').then(({initScalesView})=>{
  scalesController=initScalesView(scalesView);scalesController.show(!scalesView.hidden);
 }).catch(()=>{
  scalesView.innerHTML='<p role="alert">Scales could not load. Your other tools are still available.</p><button type="button">Try again</button>';
  scalesView.querySelector('button').addEventListener('click',loadScalesView);
 }).finally(()=>{scalesLoading=null;});
}
const scalesModule={show(active){scalesView.hidden=!active;if(scalesController)scalesController.show(active);else if(active)loadScalesView();},stopPlayback(){scalesController?.stopPlayback();}};
const bottomNav=document.createElement('nav'),tunerNav=document.createElement('button'),metronomeNav=document.createElement('button'),chordsNav=document.createElement('button'),scalesNav=document.createElement('button'),moreNav=document.createElement('button');
bottomNav.className='bottom-nav';bottomNav.setAttribute('aria-label','App tools');
tunerNav.className='nav-item';tunerNav.innerHTML='<span class="nav-icon tuner-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 3v7a3 3 0 0 0 6 0V3M12 13v8"/><path d="M6.5 7a5 5 0 0 0 0 6M17.5 7a5 5 0 0 1 0 6"/><path d="M4 5a8 8 0 0 0 0 10M20 5a8 8 0 0 1 0 10"/></svg></span><span>Tuner</span>';
metronomeNav.className='nav-item';metronomeNav.innerHTML='<span class="nav-icon metronome-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 4h8l3 17H5L8 4Z"/><path d="M7 17h10M11 17 15.5 3"/><rect class="metronome-weight" x="11.75" y="7.9" width="3" height="4.2" rx=".6" transform="rotate(18 13.25 10)"/></svg></span><span>Metronome</span>';
chordsNav.className='nav-item';chordsNav.innerHTML='<span class="nav-icon chords-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path class="chord-nut" d="M5 2h14"/><path d="M5 2v20M7.8 2v20M10.6 2v20M13.4 2v20M16.2 2v20M19 2v20M5 8.67h14M5 15.33h14M5 22h14"/><circle cx="16.2" cy="5.34" r="1.65"/><circle cx="10.6" cy="12" r="1.65"/><circle cx="13.4" cy="12" r="1.65"/></svg></span><span>Chords</span>';
scalesNav.className='nav-item';scalesNav.innerHTML='<span class="nav-icon scales-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="6" r="2"/></svg></span><span>Scales</span>';
moreNav.className='nav-item';moreNav.innerHTML='<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg></span><span>More</span>';
bottomNav.append(tunerNav,metronomeNav,chordsNav,scalesNav,moreNav);document.body.append(bottomNav);
function showView(view,{updateHash=true}={}){
 const metro=view==='metronome',chords=view==='chords',more=view==='more',scales=view==='scales',tuner=!metro&&!chords&&!more&&!scales;document.body.dataset.view=view;document.documentElement.dataset.view=view;moreView.hidden=!more;
 [[tunerNav,tuner],[metronomeNav,metro],[chordsNav,chords],[scalesNav,scales],[moreNav,more]].forEach(([item,active])=>{item.classList.toggle('active',active);item.setAttribute('aria-current',active?'page':'false');});
 document.querySelector('.edition').textContent=metro?'THE METRONOME':chords?'FIRST CHORDS':scales?'SCALES':more?'MORE':'THE TUNER';
 // Explicit hidden state remains correct even when a stylesheet fails to load.
 document.querySelector('.intro').hidden=!tuner;document.querySelector('#tuner').hidden=!tuner;document.querySelector('.metronome-view').hidden=!metro;document.querySelector('.chords-view').hidden=!chords;
 scalesModule.show(scales);
 if(!tuner){referenceRequest++;clearTimeout(referenceTimer);engine.stopReference();playUntil=0;clear();resumeWanted=false;if(listening||starting)stopListening();}if(!metro)metronome.stop();else metronome.resumeVisual();if(!chords)chordsModule.stopPlayback();else chordsModule.syncSound();if(updateHash&&location.hash!==`#${view}`)location.hash=view;
 window.scrollTo(0,0);
}
tunerNav.onclick=()=>showView('tuner');metronomeNav.onclick=()=>showView('metronome');chordsNav.onclick=()=>showView('chords');scalesNav.onclick=()=>showView('scales');moreNav.onclick=()=>showView('more');
window.addEventListener('hashchange',()=>{const view=['metronome','chords','scales','more'].includes(location.hash.slice(1))?location.hash.slice(1):'tuner';if(document.body.dataset.view!==view)showView(view,{updateHash:false});});
renderInstrument();
showView(location.hash==='#metronome'?'metronome':location.hash==='#chords'?'chords':location.hash==='#scales'?'scales':location.hash==='#more'?'more':'tuner',{updateHash:false});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
