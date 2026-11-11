// Render the actual Scales mix through WebKit's OfflineAudioContext, including
// guitar, melody, drum, piano, bass, and optional strings. No system audio capture.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const {webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4359',out=process.env.ARTIFACT_DIR;
if(out)await mkdir(out,{recursive:true});
const browser=await webkit.launch({headless:true});
try{
 const page=await browser.newPage();await page.goto(base+'/tuner/samples/');
 const reports=[];
 const cases=[{bpm:75,master:.8,pattern:'d.d.d.d.',strings:false,demo:true},{bpm:75,master:.8,pattern:'d.d.d.d.',strings:false,demo:false},...[50,75,160].flatMap(bpm=>[false,true].map(strings=>({bpm,master:1,pattern:'d.d.dudu',strings,demo:true}))),...[50,75,160].map(bpm=>({bpm,master:1,pattern:'d.d.dudu',strings:true,demo:true,eighths:true,fourChords:true}))];
 for(const [caseId,config] of cases.entries()){const solo=false;
  const data=await page.evaluate(async({solo,config})=>{
   const {ChordPlayer}=await import('/tuner/tuner/chord-audio.js');
   const rate=44100,duration=60/config.bpm*16+2,offline=new OfflineAudioContext(2,Math.ceil(rate*duration),rate);let now=0,serial=0;
   const context=new Proxy(offline,{get(target,key){if(key==='currentTime')return now;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
   const original={audio:window.AudioContext,timeout:window.setTimeout,clear:window.clearTimeout,frame:window.requestAnimationFrame,cancel:window.cancelAnimationFrame};const timers=new Map();
   window.AudioContext=function(){return context;};window.setTimeout=(fn,ms)=>{const id=++serial;timers.set(id,{fn,at:now+ms/1000});return id;};window.clearTimeout=id=>timers.delete(id);window.requestAnimationFrame=()=>++serial;window.cancelAnimationFrame=()=>{};
   try{
    const scalesSource=await (await fetch('/tuner/scales-lab/scales.js')).text(),html=await (await fetch('/tuner/scales-lab/index.html')).text(),root=new DOMParser().parseFromString(html,'text/html');
    const playerExpression=scalesSource.match(/const chordPlayer=(new ChordPlayer\([^\n]+\));/)[1];
    const p=Function('ChordPlayer','return '+playerExpression)(ChordPlayer);p.context();p.unlock=async()=>context;
    root.querySelector('#backing-volume').value=String(config.master*100);root.querySelector('#mix-strings').checked=config.strings;
    const mix=Function('chordPlayer','$',scalesSource.match(/function backingMix\(\)\{[^\n]+/)[0]+';return backingMix();')(p,selector=>root.querySelector(selector));
    if(solo){p.stroke=()=>{};p.click=()=>{};p.drum=()=>{};}
    const am={id:'am',name:'Am',frets:['x',0,2,2,1,0]},f={id:'f',name:'F',frets:['x','x',3,2,1,1]},c={id:'c',name:'C',frets:['x',3,2,0,1,0]},g={id:'g',name:'G',frets:[3,2,0,0,3,3]},progression=config.fourChords?[c,f,am,g]:[am,am,f,f],timeline=progression.flatMap(c=>Array(4).fill(c));
    const notes=[45,47,48,50,52,53,55,57,57,55,53,52,50,48,47,45];await Promise.all(notes.map(midi=>p.prepareScaleTone(midi)));

    const tones=[];const sampled=p.sampledTone;p.sampledTone=function(...args){if(args[0].startsWith('piano-'))tones.push({midi:Math.round(69+12*Math.log2(args[1]/440)),at:args[4],level:args[6]});return sampled.apply(this,args);};
    await p.playExercise(progression,config.pattern,config.bpm,null,'rock',0,'eighth',false,4,0,timeline,mix,{onSchedule(cue,at,duration){const divisor=config.eighths?1:2;if(config.demo&&!solo&&cue.slotIndex%divisor===0)p.playScaleTone(notes[Math.floor(cue.playbackSlotIndex/divisor)%notes.length],duration*divisor*.96,at);}});
    while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>60/config.bpm*16-.03)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await Promise.resolve();}
    const buffer=await offline.startRendering(),pcm=new Float32Array(buffer.length*2);let peak=0,sum=0,clips=0;
    for(let i=0;i<buffer.length;i++)for(let c=0;c<2;c++){const x=buffer.getChannelData(c)[i];pcm[2*i+c]=x;peak=Math.max(peak,Math.abs(x));sum+=x*x;if(Math.abs(x)>=1)clips++;}
    return {style:mix.piano.style,outputLevel:p.outputLevel,peak,rms:Math.sqrt(sum/pcm.length),clips,rate,tones};
   }finally{window.AudioContext=original.audio;window.setTimeout=original.timeout;window.clearTimeout=original.clear;window.requestAnimationFrame=original.frame;window.cancelAnimationFrame=original.cancel;}
  },{solo,config});
  assert.equal(data.style,'thirds');assert.equal(data.outputLevel,.65);assert.equal(data.clips,0,'no samples reach full scale');assert.ok(data.rms>.05,'non-silent rendered mix');assert.ok(data.peak<.96,'tested peak retains headroom');
  reports.push({...data,config});console.log(JSON.stringify({caseId,config,peak:data.peak,rms:data.rms,clips:data.clips}));
 }
 if(out)await writeFile(out+'/scales-mix-render-report.json',JSON.stringify(reports,null,2));
}finally{await browser.close();}
