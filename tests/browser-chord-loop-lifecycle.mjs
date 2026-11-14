// Real Web Audio/sample lifecycle: no mocked playback; render-only controls are covered separately.
import assert from 'node:assert/strict';
const {webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await webkit.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:900},serviceWorkers:'block'});
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:4334')+'/tuner/#chords');
 await page.locator('.objective-tabs').waitFor();
 await page.evaluate(async()=>{
  const url=performance.getEntriesByType('resource').map(e=>e.name).find(u=>u.includes('/tuner/chord-audio.js'));
  const {ChordPlayer}=await import(url);const play=ChordPlayer.prototype.play,exercise=ChordPlayer.prototype.playExercise,stroke=ChordPlayer.prototype.stroke;
  window.audit={strokes:[],requests:0};
  ChordPlayer.prototype.play=function(...args){window.audit.player=this;return play.apply(this,args);};
  ChordPlayer.prototype.playExercise=function(...args){window.audit.player=this;window.audit.requests++;return exercise.apply(this,args);};
  ChordPlayer.prototype.stroke=function(chord,kit,at,...rest){window.audit.strokes.push({id:chord.id,at,token:this.loopToken});return stroke.call(this,chord,kit,at,...rest);};
 });
 const playChord=()=>page.locator('.objective-panel:visible .chord-card:visible [data-play-chord]').first().click();
 const idle=()=>page.waitForFunction(()=>window.audit.player?.voices.length===0&&!document.querySelector('#chords .playing'));
 await playChord();await page.waitForFunction(()=>window.audit.player?.voices.length>0);await page.waitForFunction(()=>!document.querySelector('.play-chord.playing'));await idle();
 console.log('Real single chord sources and control finish automatically');
 for(const course of ['guitar','bar-general','bar-young','uke-general','uke-young']){
  await page.evaluate(course=>{document.querySelector(`[data-course-tab="${course.startsWith('bar')?'bar-general':course.startsWith('uke')?'uke-general':'guitar'}"]`).click();if(course.endsWith('young'))document.querySelector('.objective-panel:not([hidden]) [data-path-switch="young"]').click();document.querySelector('[data-objective-tab="strumming"]').click();const card=document.querySelector('.objective-panel:not([hidden]) [data-audio-progression]');card.dataset.audioBpm='200';card.querySelector('.exercise-tempo-value').value='200';for(let p=card;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;window.audit.strokes=[];card.querySelector('.play-exercise').click();},course);
  await page.waitForFunction(()=>window.audit.strokes.length>0);
  await page.waitForTimeout(5600);
  const state=await page.evaluate(()=>({strokes:window.audit.strokes,playing:!!document.querySelector('.play-exercise.playing'),timer:!!window.audit.player.loopTimer,voices:window.audit.player.voices.length}));
  assert.ok(state.playing&&state.timer&&state.voices>0,course+' stays live beyond two cycles');assert.ok(state.strokes.at(-1).at-state.strokes[0].at>4.5);assert.equal(new Set(state.strokes.map(s=>s.token)).size,1);
  await page.evaluate(()=>document.querySelector('.play-exercise.playing').click());await idle();
  const stopped=await page.evaluate(()=>({count:window.audit.strokes.length,timer:window.audit.player.loopTimer}));assert.equal(stopped.timer,0);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.audit.strokes.length),stopped.count);
  console.log(course+': actual strumming sources loop beyond two cycles; explicit Stop cancels sources/timer');
 }
 await page.evaluate(()=>{document.querySelector('[data-course-tab="guitar"]').click();document.querySelector('[data-objective-tab="practice"]').click();const card=document.querySelector('.objective-panel:not([hidden]) [data-audio-progression]');card.dataset.audioBpm='200';for(let p=card;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;window.audit.strokes=[];card.querySelector('.play-exercise').click();});await page.waitForFunction(()=>window.audit.strokes.length>0);await page.waitForTimeout(10200);
 assert.ok(await page.evaluate(()=>!!document.querySelector('.play-exercise.playing')&&window.audit.player.loopTimer&&window.audit.strokes.at(-1).at-window.audit.strokes[0].at>9.5));await page.evaluate(()=>document.querySelector('.play-exercise.playing').click());await idle();console.log('Actual four-chord progression loops beyond two cycles and stops explicitly');
 // Every navigation away from a playing card must cancel sources, cues, pending loading and UI.
 for(const target of ['objective','course','path','module','pagehide']){
  await page.evaluate(()=>{document.querySelector('[data-course-tab="bar-general"]').click();document.querySelector('[data-objective-tab="strumming"]').click();const b=document.querySelector('.objective-panel:not([hidden]) .play-exercise');for(let p=b;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;b.click();});await page.waitForFunction(()=>window.audit.player.voices.length>0);
  await page.evaluate(target=>{if(target==='objective')document.querySelector('[data-objective-tab="one"]').click();if(target==='course')document.querySelector('[data-course-tab="guitar"]').click();if(target==='path')document.querySelector('.objective-panel:not([hidden]) [data-path-switch]').click();if(target==='module')location.hash='#tuner';if(target==='pagehide')window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));},target);
  await idle();assert.equal(await page.evaluate(()=>window.audit.player.loopTimer),0);await page.evaluate(()=>location.hash='#chords');await page.waitForTimeout(150);
  console.log(target+': real playback cancelled');
 }
 await page.evaluate(()=>{document.querySelector('[data-course-tab="guitar"]').click();document.querySelector('[data-objective-tab="one"]').click();});
 for(const action of ['tab','variation']){await page.evaluate(()=>document.querySelector('.objective-panel:not([hidden]) .chord-selector button').click());await playChord();await page.waitForFunction(()=>window.audit.player.voices.length>0);await page.evaluate(action=>{if(action==='tab')document.querySelector('.objective-panel:not([hidden]) .chord-selector button:nth-child(2)').click();else document.querySelector('.objective-panel:not([hidden]) .chord-card.active-chord [data-variant-target]').click();},action);await idle();console.log(action+': short chord cancelled before hiding Stop');}
 await page.evaluate(()=>{document.querySelector('[data-objective-tab="two"]').click();const b=document.querySelector('.objective-panel:not([hidden]) .play-exercise');for(let p=b;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;b.click();});await page.waitForFunction(()=>window.audit.player.voices.length>0);
 await page.evaluate(()=>document.querySelector('.objective-panel:not([hidden]) [data-return-objective-one]').click());await idle();console.log('Return to Objective 1 cancels real loop');
 await page.evaluate(()=>{document.querySelector('.objective-panel:not([hidden]) [data-preview-chord]').click();document.querySelector('.chord-preview [data-play-chord]').click();});await page.waitForFunction(()=>window.audit.player.voices.length>0);
 await page.keyboard.press('Escape');await idle();console.log('Popup dismissal cancels its real short chord');
 await page.evaluate(()=>{document.querySelector('.objective-panel:not([hidden]) [data-preview-chord]').click();document.querySelector('.chord-preview [data-play-chord]').click();});await page.waitForFunction(()=>window.audit.player.voices.length>0);
 await page.evaluate(()=>document.querySelectorAll('.objective-panel:not([hidden]) [data-preview-chord]')[1].click());await idle();console.log('Replacing active popup cancels sources before replacing Stop control');
}finally{await browser.close();}
