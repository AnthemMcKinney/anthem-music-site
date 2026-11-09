import {ChordPlayer} from '../tuner/chord-audio.js?v=40';

const strings=[{label:'e',open:64},{label:'B',open:59},{label:'G',open:55},{label:'D',open:50},{label:'A',open:45},{label:'E',open:40}];
const noteNames=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const noteName=midi=>noteNames[midi%12]+(Math.floor(midi/12)-1);
const position=(string,fret)=>({string,fret,midi:strings[string].open+fret,note:noteName(strings[string].open+fret),id:`${string}:${fret}`});
const sequence=positions=>positions.map(([string,fret])=>position(string,fret));

const naturalAA=sequence([[4,0],[4,2],[4,3],[3,0],[3,2],[3,3],[2,0],[2,2]]);
const naturalExpanded=sequence([[5,0],[5,1],[5,3],[4,0],[4,2],[4,3],[3,0],[3,2],[3,3],[2,0],[2,2],[1,0],[1,1],[1,3],[0,0],[0,1],[0,3]]);
const boxPentatonic=sequence([[5,5],[5,8],[4,5],[4,7],[3,5],[3,7],[2,5],[2,7],[1,5],[1,8],[0,5],[0,8]]);
const boxDiatonic=sequence([[5,5],[5,7],[5,8],[4,5],[4,7],[4,8],[3,5],[3,7],[2,4],[2,5],[2,7],[1,5],[1,6],[1,8],[0,5],[0,7],[0,8]]);

const patterns={
 natural:{kicker:'FIRST NOTES · FIRST THREE FRETS',layers:{
  aa:{label:'A<sub>2</sub> – A<sub>3</sub>',title:'Musical Notes ABCDEFG · A',copy:'Trace the notes from open A through A on the G string.',positions:naturalAA},
  expanded:{label:'E<sub>2</sub> – G<sub>4</sub>',title:'Expanded notes E–G',copy:'Full natural-note range: E2 through G4.',positions:naturalExpanded}
 }},
 box1:{kicker:'CAGED · FRETS 4–8',layers:{
  pentatonic:{label:'Pentatonic',title:'Box 1 pentatonic',copy:'C/Am at the 5th fret: a first pentatonic shape beyond open position.',positions:boxPentatonic},
  diatonic:{label:'Diatonic',title:'Box 1 diatonic',copy:'The full seven-note C/Am scale: this same shape with B and F added.',positions:boxDiatonic}
 }}
};

let pattern='natural',layer='aa',root='C',playing=false,playToken=0,activeId='',activeStep=-1,backingPlaying=false,demoWithBacking=false;
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)],current=()=>patterns[pattern].layers[layer];
const chordPlayer=new ChordPlayer();
const backingChords={am:{id:'am',name:'Am',frets:['x',0,2,2,1,0]},c:{id:'c',name:'C',frets:['x',3,2,0,1,0]},f:{id:'f',name:'F',frets:['x','x',3,2,1,1]},g:{id:'g',name:'G',frets:[3,2,0,0,3,3]}};
const backingPatterns={'am-c':['am','c'],'c-f':['c','f'],'c-g':['c','g'],'am-f':['am','f'],'c-f-am-g':['c','f','am','g']};

function scaleSequence(){return current().positions;}
const tabDirections=()=>{const up=scaleSequence(),down=[...up].reverse();return {up,down,all:[...up,...down]};};
const tabSteps=()=>tabDirections().all;

function renderControls(){
 $$('.pattern-tabs button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pattern===pattern)));
 $('#layer-buttons').innerHTML=Object.entries(patterns[pattern].layers).map(([key,item])=>`<button type="button" data-layer="${key}" aria-pressed="${key===layer}">${item.label}</button>`).join('');
 const box=pattern==='box1',diatonic=box&&layer==='diatonic';$('#root-control').hidden=!box;$('#root-legend').hidden=!box;$('#natural-legend').hidden=box;$('#foundation-legend').hidden=!box;$('#added-legend').hidden=!diatonic;
 $$('[data-root]').forEach(input=>input.checked=input.dataset.root===root);
 const fingers=box?['1|Pointer','2|Middle','3|Ring','4|Pinky']:layer==='expanded'?['1|Pointer','2|Middle','3|Ring']:['1|Pointer','2|Middle'];
 $('#finger-legend').innerHTML=fingers.map(item=>{const [number,name]=item.split('|');return `<span role="listitem"><b>${number}</b> ${name}</span>`;}).join('');
 $('#backing-panel').hidden=false;updateBackingSummary();
}
function updateBackingSummary(){
 const progression=$('#backing-progression').value,bars=Number($('#backing-bars').value),ids=backingPatterns[progression],isFour=ids.length===4;
 if(isFour&&bars===2){$('#backing-bars').value='4';}
 const effectiveBars=Number($('#backing-bars').value),repeat=effectiveBars/ids.length;
 $('#backing-summary').textContent=ids.flatMap(id=>Array(repeat).fill(backingChords[id].name)).join(' · ');
 $('#backing-help').textContent=isFour?'Four-chord loops play one bar per chord. This progression loops until you stop it and follows the BPM above.':'Choose 2 bars for one measure per chord or 4 bars for two measures per chord. The loop follows the BPM above and plays until you stop it.';
}
function renderCopy(){
 const item=current();
 $('#scale-kicker').textContent=patterns[pattern].kicker;$('#scale-title').textContent=pattern==='box1'?`Box 1 ${layer==='diatonic'?'Diatonic':'Pentatonic'}`:item.title;
 $('#scale-copy').textContent=item.copy;
 $('#tab-title').textContent=pattern==='box1'?'Pattern tablature':'Scale tablature';
 $('#tab-copy').textContent=pattern==='natural'?(layer==='aa'?'Follow the notes in order, one at a time.':'Work from E2 up through G4, following each note on the tab.'):(layer==='diatonic'?'The diatonic is the full scale. Most of the strings now have 3 notes per string. Be sure to match the correct finger to the corresponding fret.':'Tabs show which frets to play, in order. Continue from Obj 1: start on low E (bottom), move up, and follow each note’s finger number.');
 $('#rhythm-heading').textContent=pattern==='box1'?'PRACTICE THE SHAPE':layer==='expanded'?'EXPAND THE PATTERN':'USE THE PATTERN IN A MUSICAL FRAMEWORK';
 $('#rhythm-copy').textContent=pattern==='box1'?'Focus on how the pattern flows. Practice it up and back down in rhythm.':layer==='expanded'?'Identify and play the notes that fall below and above the first A octave pattern. This pattern contains all the natural notes on the guitar for the first three frets. Continue to lock the pattern in by repeating it, up and down to a steady beat.':'Remember these notes. Once you get a feel for the patterns, play them to a steady beat. Rhythm trains your hands to connect separate positions into a phrase you can actually use.';
 $('#objective-kicker').textContent=pattern==='box1'?'OBJECTIVE 2 · CAGED':'OBJECTIVE 1 · FIRST NOTES';
 $('#objective-title').textContent=pattern==='box1'?'CAGED Box 1':'Identifying the musical notes on guitar';
 $('#objective-copy').textContent=pattern==='box1'?'A chord-shaped five-note pattern used to practice scales and play fills, melodies, riffs, and solos.':'Learn the note names, then find and play them across the first three frets.';
 $('#notes-title').textContent=pattern==='box1'?'BOX 1 NOTES':'OBJECTIVE 1 NOTES';
 $('#notes-lead').textContent=pattern==='box1'?'Use one fretboard pattern to find two related scales.':'Find notes across the guitar neck.';
 $('#notes-why').textContent=pattern==='box1'?'Box 1 is a reusable section of the neck. The pattern stays in place while the musical resolution changes: C feels like home for C major, and A feels like home for A minor.':'The seven note names repeat across the fretboard. “Natural notes” is the formal music term for A through G before sharps and flats are added. In order: A · BC · D · EF · G · A. B–C and E–F sit next to each other with no note between them.';
 $('#finger-guide').innerHTML=pattern==='box1'?'<li><strong>Pattern and scale:</strong> The complete Box 1 pattern begins on low E with fingers 1–3–4. It contains both C major and A minor. Resolve a major phrase on C; resolve a minor phrase on A.</li><li><strong>Four-fret position:</strong> Frets 5–8 use fingers 1–4. Reach back to the fourth-fret B on the G string with finger 1, then return to the box.</li>':'<li><strong>Think in patterns:</strong> Guitar is full of repeating patterns. Memorizing a short pattern is easier than starting from an unfamiliar fretboard.</li><li><strong>A–A pattern:</strong> 0–2–3, 0–2–3, 0–2. Here 0 means open string; 2 and 3 mean fret 2 and fret 3.</li><li><strong>Open string names:</strong> A, D, and G are the three strings used in this pattern.</li><li><strong>Fingers:</strong> Use fingers 1 and 2 for A–A; use fingers 1 and 3 for the expanded E, B, and high-e pattern.</li>';
}
function fingerFor(note){
 if(pattern==='box1'){
  if(layer==='diatonic'&&note.string===2)return ({4:'1',5:'2',7:'4'})[note.fret]||'';
  return note.fret===4?'1':String(note.fret-4);
 }
 if(note.fret===0)return '';
 const outer=note.string===0||note.string===1||note.string===5;
 if(outer)return note.fret===1?'1':note.fret===3?'3':'';
 return note.fret===2?'1':note.fret===3?'2':'';
}
function renderFretboard(){
 const svg=$('#fretboard'),positions=current().positions,isBox=pattern==='box1',minFret=isBox?4:1,maxFret=isBox?8:3,width=860,height=310,left=82,right=22,top=55,boardWidth=width-left-right,boardHeight=220,row=boardHeight/5,fretCount=maxFret-minFret+1,fretWidth=boardWidth/fretCount,xFor=fret=>!isBox&&fret===0?left-28:left+(fret-minFret+.5)*fretWidth,yFor=string=>top+string*row;
 const frets=Array.from({length:fretCount+1},(_,i)=>({x:left+i*fretWidth,i})).map(({x,i})=>`<line class="${!isBox&&i===0?'nut':'fret'}" x1="${x}" y1="${top-10}" x2="${x}" y2="${top+boardHeight+10}"/>`).join('');
 const stringLines=strings.map((string,index)=>`<text class="string-label" x="${left-58}" y="${yFor(index)+5}">${string.label}</text><line class="string" style="stroke-width:${1.4+index*.45}" x1="${isBox?left-18:left}" y1="${yFor(index)}" x2="${isBox?width-right+18:width-right}" y2="${yFor(index)}"/>`).join('');
 const fretLabels=Array.from({length:fretCount},(_,i)=>minFret+i).filter(fret=>pattern==='natural'&&layer==='aa'||[3,4,5,7,9,12,15,17,19,21,24].includes(fret)).map(fret=>`<text class="fret-label${isBox&&fret===4?' reach-back-label':''}" x="${xFor(fret)}" y="18">${fret}${fret===1?'st':fret===2?'nd':fret===3?'rd':'th'} FRET${isBox&&fret===4?' · REACH BACK':''}</text>`).join('');
 const openLabel=!isBox?`<text class="fret-label open-label" x="${left-28}" y="27">OPEN</text>`:'';
 const pentatonicIds=new Set(boxPentatonic.map(note=>note.id)),rootClass=root==='A'?9:0,markers=positions.map(note=>{const isRoot=pattern==='box1'&&note.midi%12===rootClass,isActive=note.id===activeId,isAdded=pattern==='box1'&&layer==='diatonic'&&!pentatonicIds.has(note.id),finger=fingerFor(note),letter=note.note.replace(/\d/,'');return `<g><circle class="marker${pattern==='box1'?(isAdded?' added':' foundation'):''}${isRoot?' root':''}${isActive?' active':''}" cx="${xFor(note.fret)}" cy="${yFor(note.string)}" r="${isAdded?17:19}"/><text class="marker-text${isRoot?' root':''}" x="${xFor(note.fret)}" y="${yFor(note.string)+1}">${letter}</text>${finger?`<text class="finger-number" x="${xFor(note.fret)+(isAdded?28:30)}" y="${yFor(note.string)-(isAdded?13:15)}">${finger}</text>`:''}</g>`;}).join('');
 svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.innerHTML=`<title id="fretboard-title">${$('#scale-title').textContent} guitar fretboard</title><desc id="fretboard-description">Highlighted notes show the selected scale pattern. Orange notes show the selected root.</desc><rect class="wood" x="${left}" y="${top-16}" width="${boardWidth}" height="${boardHeight+32}" rx="5"/>${frets}${stringLines}${openLabel}${fretLabels}${markers}`;
}
function renderTab(){
 const {up,down}=tabDirections(),container=$('#tablature');
const system=(label,steps,offset)=>`<section class="tab-system"><strong>${label}</strong><div class="tab-staff">${strings.map((string,stringIndex)=>`<div class="tab-row"><span class="tab-label">${string.label}|</span><span class="tab-line" style="--step-count:${steps.length}">${steps.map((note,index)=>{const isNote=note.string===stringIndex,active=isNote&&offset+index===activeStep,first=isNote&&index===0;return `<span class="tab-segment${isNote?' note':''}${active?' active':''}${first?' first-note':''}">${isNote?`<b>${note.fret}</b>`:''}</span>`;}).join('')}<span class="tab-end">|</span></span></div>`).join('')}</div></section>`;
 container.innerHTML=system('ASCENDING',up,0)+system('DESCENDING',down,up.length);
}
function render(){renderControls();renderCopy();renderFretboard();renderTab();}

function showStep(note,index){activeId=note?.id||'';activeStep=Number.isInteger(index)?index:-1;renderFretboard();renderTab();if(note)$('#play-status').textContent=`Now playing ${note.note} on string ${note.string+1}, fret ${note.fret}.`;}
async function play(noteValue=$('#demo-note-value').value){
 if(playing){stopBacking();return;}if(backingPlaying)stopBacking();
 const token=++playToken,steps=tabSteps(),beat=60/Number($('#tempo').value),stepDuration=beat*(noteValue==='eighth'?.5:1),ids=backingPatterns[$('#backing-progression').value],bars=Number($('#backing-bars').value),repeats=bars/ids.length,progression=ids.flatMap(id=>Array(repeats).fill(backingChords[id])),timeline=progression.flatMap(chord=>Array(4).fill(chord)),mix=backingMix();let demoIndex=0;
 playing=true;backingPlaying=true;demoWithBacking=true;setBackingButton(true);setDemoButton(true);$('#play-status').textContent=`Starting the ${noteValue}-note scale demo with ${$('#backing-summary').textContent}.`;
 try{await Promise.all(steps.map(note=>chordPlayer.prepareScaleTone(note.midi)));if(token!==playToken)return;const started=await chordPlayer.playExercise(progression,$('#backing-strum').value,Number($('#tempo').value), (cue,audioAt)=>{if(!cue||!playing)return;if(noteValue==='quarter'&&cue.slotIndex%2!==0)return;if(demoIndex>=steps.length)demoIndex=0;const index=demoIndex++,note=steps[index];showStep(note,index);chordPlayer.playScaleTone(note.midi,stepDuration*.96,audioAt);},mix.drums.enabled?'rock':'click',0,'eighth',false,4,0,timeline,mix);if(!started)stopBacking();}
 catch{stopBacking();$('#play-status').textContent='The scale demo could not start. Tap Play Scale + Backing to try again.';}
}
function setDemoButton(active){$('#play').classList.toggle('playing',active);$('#play').setAttribute('aria-pressed',String(active));$('#play').setAttribute('aria-label',active?'Stop scale demo and backing':'Play scale demo with backing');$('#play span').textContent=active?'Stop Demo':'Play Scale + Backing';}
function setBackingButton(active){$('#backing-play').classList.toggle('playing',active);$('#backing-play').setAttribute('aria-pressed',String(active));$('#backing-play').setAttribute('aria-label',active?'Stop backing progression':'Start backing progression');$('#backing-play span').textContent=active?'Stop Backing':'Play Backing';}
function stop(){playToken++;playing=false;demoWithBacking=false;showStep(null,-1);$('#play-status').textContent='Playback stopped.';setDemoButton(false);}

$('.pattern-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-pattern]');if(!button)return;stop();stopBacking();pattern=button.dataset.pattern;layer=pattern==='natural'?'aa':'pentatonic';render();});
$('#layer-buttons').addEventListener('click',event=>{const button=event.target.closest('[data-layer]');if(!button)return;stop();stopBacking();layer=button.dataset.layer;render();});
$('#root-control').addEventListener('change',event=>{const input=event.target.closest('input[data-root]');if(!input)return;stop();stopBacking();root=input.dataset.root;render();});
function setTempo(value){if(backingPlaying)stopBacking();if(playing)stop();$('#tempo').value=String(Math.max(50,Math.min(160,Number(value)||90)));}
$$('[data-tempo-step]').forEach(button=>button.addEventListener('click',()=>setTempo(Number($('#tempo').value)+Number(button.dataset.tempoStep))));
$('#tempo').addEventListener('change',event=>setTempo(event.target.value));
$('#play').addEventListener('click',()=>play());render();

function backingMix(){chordPlayer.setBackingMasterVolume(Number($('#backing-volume').value)/100);return {drums:{enabled:$('#mix-drums').checked,style:'rock',volume:.62},bass:{enabled:$('#mix-bass').checked,style:'roots',volume:.42},piano:{enabled:$('#mix-piano').checked,style:'simple',volume:.28},strings:{enabled:$('#mix-strings').checked,style:'low',volume:.22}};}
async function startBacking(onCue=null){const ids=backingPatterns[$('#backing-progression').value],bars=Number($('#backing-bars').value),repeats=bars/ids.length,progression=ids.flatMap(id=>Array(repeats).fill(backingChords[id])),timeline=progression.flatMap(chord=>Array(4).fill(chord)),mix=backingMix();return chordPlayer.playExercise(progression,$('#backing-strum').value,Number($('#tempo').value),onCue,mix.drums.enabled?'rock':'click',0,'eighth',false,4,0,timeline,mix);}
function stopBacking(){if(!backingPlaying)return;if(playing||demoWithBacking||activeId)stop();chordPlayer.stop();backingPlaying=false;demoWithBacking=false;setBackingButton(false);$('#play-status').textContent='Backing progression stopped.';}
$('#backing-progression').addEventListener('change',()=>{stopBacking();updateBackingSummary();});
$('#backing-bars').addEventListener('change',()=>{stopBacking();updateBackingSummary();});
$('#backing-strum').addEventListener('change',()=>{if(backingPlaying)stopBacking();});
['drums','bass','piano','strings'].forEach(track=>$(`#mix-${track}`).addEventListener('change',event=>{if(backingPlaying)chordPlayer.setBackingEnabled(track,event.target.checked);}));
$('#backing-volume').addEventListener('input',event=>{const value=Number(event.target.value);$('#backing-volume-value').textContent=`${value}%`;chordPlayer.setBackingMasterVolume(value/100);});
$('#demo-note-value').addEventListener('change',()=>{if(playing)stopBacking();});
$('#backing-play').addEventListener('click',async()=>{
 if(backingPlaying){stopBacking();return;}
 stop();backingPlaying=true;setBackingButton(true);$('#play-status').textContent=`Playing backing progression ${$('#backing-summary').textContent} at ${$('#tempo').value} BPM.`;
 try{const started=await startBacking();if(!started)stopBacking();}
 catch{stopBacking();$('#play-status').textContent='Backing sound could not start. Tap Play Backing to try again.';}
});
