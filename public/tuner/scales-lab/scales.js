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
 natural:{kicker:'NATURAL NOTES · FIRST THREE FRETS',layers:{
  aa:{label:'A–A',title:'Natural notes: A to A',copy:'Play A · B · C · D · E · F · G · A and hear the musical alphabet repeat.',positions:naturalAA},
  expanded:{label:'Expanded E–G',title:'Natural notes: E to G',copy:'See every natural note available on the first three frets.',positions:naturalExpanded}
 }},
 box1:{kicker:'CAGED · FRETS 4–8',layers:{
  pentatonic:{label:'Pentatonic',title:'Box 1 pentatonic',copy:'Five dependable notes for riffs, fills, and first solos.',positions:boxPentatonic},
  diatonic:{label:'Diatonic',title:'Box 1 diatonic',copy:'Add B and F to complete the relative C-major and A-minor scale.',positions:boxDiatonic}
 }}
};

let pattern='natural',layer='aa',root='C',playing=false,playToken=0,audioContext=null,activeId='',activeStep=-1;
const buffers=new Map(),$=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)],current=()=>patterns[pattern].layers[layer];

function scaleSequence(){
 const all=current().positions;if(pattern!=='box1')return all;
 const rootClass=root==='A'?9:0,rootIndexes=all.map((note,index)=>({note,index})).filter(item=>item.note.midi%12===rootClass).map(item=>item.index);
 return all.slice(rootIndexes[0],rootIndexes.at(-1)+1);
}
const tabDirections=()=>{const up=scaleSequence(),down=[...up].reverse().slice(1);return {up,down,all:[...up,...down]};};
const tabSteps=()=>tabDirections().all;

function renderControls(){
 $$('.pattern-tabs button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pattern===pattern)));
 $('#layer-buttons').innerHTML=Object.entries(patterns[pattern].layers).map(([key,item])=>`<button type="button" data-layer="${key}" aria-pressed="${key===layer}">${item.label}</button>`).join('');
 const box=pattern==='box1',diatonic=box&&layer==='diatonic';$('#root-control').hidden=!box;$('#root-legend').hidden=!box;$('#natural-theory').hidden=box;$('#natural-legend').hidden=box;$('#foundation-legend').hidden=!box;$('#added-legend').hidden=!diatonic;
 $$('[data-root]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.root===root)));
}
function renderCopy(){
 const item=current(),rootLabel=root==='A'?'A minor':'C major';
 $('#scale-kicker').textContent=patterns[pattern].kicker;$('#scale-title').textContent=pattern==='box1'?`${item.title} · ${rootLabel}`:item.title;
 $('#scale-copy').textContent=pattern==='box1'?`${item.copy} The tab begins and resolves on ${root}.`:item.copy;
 $('#tab-copy').textContent=pattern==='box1'?`Follow the ${rootLabel} path up and back down.`:'Read from left to right. Play one note at a time.';
 $('#objective-kicker').textContent=pattern==='box1'?'CAGED · BOX 1':'OBJECTIVE 1 · NATURAL NOTES';
 $('#objective-title').textContent=pattern==='box1'?'Pentatonic and diatonic shapes':'The musical alphabet';
 $('#objective-copy').textContent=pattern==='box1'?'See how the five-note pentatonic pattern grows into the full diatonic scale across frets 4–8.':'Learn how natural notes, sharps, and flats fit together, then play the natural notes across the first three frets.';
 $('#notes-title').textContent=pattern==='box1'?'BOX 1 NOTES':'OBJECTIVE 1 NOTES';
 $('#finger-guide').innerHTML=pattern==='box1'?'<strong>Four-fret position:</strong> Box 1 uses frets 5–8. Assign one finger to each fret: finger 1 plays fret 5, finger 2 plays fret 6, finger 3 plays fret 7, and finger 4 plays fret 8. In the diatonic layer, reach back to the fourth-fret B on the G string with finger 1, then return to the box.':'<strong>Fingering:</strong> Use fingers 1 and 2 for the A-to-A scale. In the expanded pattern, use fingers 1 and 3 for notes on the low E, B, and high e strings. <strong>Root and octave:</strong> The first A is the root; the final A is the same note name one octave higher.';
}
function fingerFor(note){
 if(pattern==='box1')return note.fret===4?'1':String(note.fret-4);
 if(note.fret===0)return '';
 const outer=note.string===0||note.string===1||note.string===5;
 if(outer)return note.fret===1?'1':note.fret===3?'3':'';
 return note.fret===2?'1':note.fret===3?'2':'';
}
function renderFretboard(){
 const svg=$('#fretboard'),positions=current().positions,isBox=pattern==='box1',minFret=isBox?4:1,maxFret=isBox?8:3,width=860,height=310,left=82,right=22,top=55,boardWidth=width-left-right,boardHeight=220,row=boardHeight/5,fretCount=maxFret-minFret+1,fretWidth=boardWidth/fretCount,xFor=fret=>!isBox&&fret===0?left-28:left+(fret-minFret+.5)*fretWidth,yFor=string=>top+string*row;
 const frets=Array.from({length:fretCount+1},(_,i)=>({x:left+i*fretWidth,i})).filter(item=>!isBox||item.i>0).map(({x,i})=>`<line class="${!isBox&&i===0?'nut':'fret'}" x1="${x}" y1="${top-10}" x2="${x}" y2="${top+boardHeight+10}"/>`).join('');
 const stringLines=strings.map((string,index)=>`<text class="string-label" x="${left-58}" y="${yFor(index)+5}">${string.label}</text><line class="string" style="stroke-width:${1.4+index*.45}" x1="${isBox?left-18:left}" y1="${yFor(index)}" x2="${isBox?width-right+18:width-right}" y2="${yFor(index)}"/>`).join('');
 const fretLabels=Array.from({length:fretCount},(_,i)=>minFret+i).filter(fret=>pattern==='natural'&&layer==='aa'||[3,4,5,7,9,12,15,17,19,21,24].includes(fret)).map(fret=>`<text class="fret-label${isBox&&fret===4?' reach-back-label':''}" x="${xFor(fret)}" y="27">${fret}${fret===1?'st':fret===2?'nd':fret===3?'rd':'th'} FRET${isBox&&fret===4?' · REACH BACK':''}</text>`).join('');
 const openLabel=!isBox?`<text class="fret-label open-label" x="${left-28}" y="27">OPEN</text>`:'';
 const pentatonicIds=new Set(boxPentatonic.map(note=>note.id)),rootClass=root==='A'?9:0,markers=positions.map(note=>{const isRoot=pattern==='box1'&&note.midi%12===rootClass,isActive=note.id===activeId,isAdded=pattern==='box1'&&layer==='diatonic'&&!pentatonicIds.has(note.id),finger=fingerFor(note),letter=note.note.replace(/\d/,'');return `<g><circle class="marker${pattern==='box1'?(isAdded?' added':' foundation'):''}${isRoot?' root':''}${isActive?' active':''}" cx="${xFor(note.fret)}" cy="${yFor(note.string)}" r="${isAdded?17:19}"/><text class="marker-text${isRoot?' root':''}" x="${xFor(note.fret)}" y="${yFor(note.string)+1}">${letter}</text>${finger?`<text class="finger-number" x="${xFor(note.fret)+(isAdded?19:21)}" y="${yFor(note.string)-(isAdded?13:15)}">${finger}</text>`:''}</g>`;}).join('');
 svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.innerHTML=`<title id="fretboard-title">${$('#scale-title').textContent} guitar fretboard</title><desc id="fretboard-description">Highlighted notes show the selected scale pattern. Orange notes show the selected root.</desc><rect class="wood" x="${left}" y="${top-16}" width="${boardWidth}" height="${boardHeight+32}" rx="5"/>${frets}${stringLines}${openLabel}${fretLabels}${markers}`;
}
function renderTab(){
 const {up,down}=tabDirections(),container=$('#tablature');
 const system=(label,steps,offset)=>`<section class="tab-system"><strong>${label}</strong><div class="tab-staff">${strings.map((string,stringIndex)=>`<div class="tab-row"><span class="tab-label">${string.label}|</span><span class="tab-line">${steps.map((note,index)=>`<span class="tab-segment${note.string===stringIndex?' note':''}${note.string===stringIndex&&offset+index===activeStep?' active':''}"><i>--</i><b>${note.string===stringIndex?note.fret:'-'}</b></span>`).join('')}<span class="tab-end">-|</span></span></div>`).join('')}</div></section>`;
 container.innerHTML=system('ASCENDING',up,0)+system('DESCENDING',down,up.length);
}
function render(){renderControls();renderCopy();renderFretboard();renderTab();}

const samples=[['../samples/guitar-acoustic-E2.wav',82.4069],['../samples/guitar-acoustic-A2.wav',110],['../samples/guitar-acoustic-D3.wav',146.832],['../samples/guitar-acoustic-G3.wav',195.998],['../samples/guitar-acoustic-B3.wav',246.942],['../samples/guitar-acoustic-E4.wav',329.628]];
async function context(){audioContext??=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')await audioContext.resume();return audioContext;}
async function loadSample(url){if(!buffers.has(url))buffers.set(url,fetch(url).then(response=>{if(!response.ok)throw Error('Sample unavailable');return response.arrayBuffer();}).then(async bytes=>(await context()).decodeAudioData(bytes)));return buffers.get(url);}
async function playNote(note,duration){
 const ctx=await context(),hz=440*2**((note.midi-69)/12),[url,sourceHz]=samples.reduce((best,item)=>Math.abs(Math.log2(hz/item[1]))<Math.abs(Math.log2(hz/best[1]))?item:best,samples[0]),buffer=await loadSample(url),source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),start=ctx.currentTime+.015;
 source.buffer=buffer;source.playbackRate.value=hz/sourceHz;filter.type='lowpass';filter.frequency.value=5200;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.62,start+.012);gain.gain.exponentialRampToValueAtTime(.48,start+Math.min(.24,duration*.3));gain.gain.setValueAtTime(.44,Math.max(start+.25,start+duration-.12));gain.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(filter).connect(gain).connect(ctx.destination);source.start(start);source.stop(start+duration+.03);
}
function showStep(note,index){activeId=note?.id||'';activeStep=Number.isInteger(index)?index:-1;renderFretboard();renderTab();if(note)$('#tab-status').textContent=`Now playing ${note.note} · string ${note.string+1}, fret ${note.fret}`;}
async function play(){
 if(playing)return;playing=true;const token=++playToken,steps=tabSteps(),beat=60/Number($('#tempo').value);$('#play').classList.add('playing');$('#play').setAttribute('aria-pressed','true');$('#play').setAttribute('aria-label','Stop scale');$('#play span').textContent='Stop';
 try{await context();for(let index=0;index<steps.length&&token===playToken;index++){const note=steps[index];showStep(note,index);await playNote(note,Math.min(1.5,beat*1.16));await new Promise(resolve=>setTimeout(resolve,beat*1000));}}
 catch{$('#tab-status').textContent='Sound could not start. Tap Play again.';}
 finally{if(token===playToken){playing=false;showStep(null,-1);$('#tab-status').textContent='Complete. Play it again or try the other layer.';resetPlayControl();}}
}
function resetPlayControl(){$('#play').classList.remove('playing');$('#play').setAttribute('aria-pressed','false');$('#play').setAttribute('aria-label','Follow scale');$('#play span').textContent='Follow Along';}
function stop(){playToken++;playing=false;showStep(null,-1);$('#tab-status').textContent='Stopped.';resetPlayControl();}

$('.pattern-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-pattern]');if(!button)return;stop();pattern=button.dataset.pattern;layer=pattern==='natural'?'aa':'pentatonic';render();});
$('#layer-buttons').addEventListener('click',event=>{const button=event.target.closest('[data-layer]');if(!button)return;stop();layer=button.dataset.layer;render();});
$('#root-control').addEventListener('click',event=>{const button=event.target.closest('[data-root]');if(!button)return;stop();root=button.dataset.root;render();});
function setTempo(value){$('#tempo').value=String(Math.max(50,Math.min(160,Number(value)||90)));}
$$('[data-tempo-step]').forEach(button=>button.addEventListener('click',()=>setTempo(Number($('#tempo').value)+Number(button.dataset.tempoStep))));
$('#tempo').addEventListener('change',event=>setTempo(event.target.value));
$('#play').addEventListener('click',()=>playing?stop():play());render();
