// Run against the local build or isolated branch preview with Playwright/WebKit.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4343';
const artifactDir=process.env.ARTIFACT_DIR;
if(artifactDir)await mkdir(artifactDir,{recursive:true});
const browser=await webkit.launch({headless:true}),report=[];
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({...devices['iPhone 13'],viewport:{width,height:900},isMobile:width<740});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await page.goto(`${base}/tuner/#chords`);await page.locator('.objective-tabs').waitFor();
  await page.getByRole('button',{name:'Objective 1',exact:true}).click();
  const card=page.locator('.objective-panel:visible :is([data-chord-card="g"],[data-chord-card="g7"]):visible');
  const arrow=card.getByRole('button',{name:'Show another shape or variation for G',exact:true});
  const inspect=async()=>{
   const svg=card.locator('.chord-diagram');
   assert.match(await svg.getAttribute('aria-label'),/^G7 chord diagram/);
   const rows=await svg.evaluate(el=>[...el.querySelectorAll('.string-name')].map(label=>{
    const y=Number(label.getAttribute('y'))-5;
    const number=[...el.querySelectorAll('.finger-number')].find(n=>Number(n.getAttribute('y'))===y+4);
    const open=[...el.querySelectorAll('circle.open')].some(n=>Number(n.getAttribute('cy'))===y);
    return {string:label.textContent,finger:number?Number(number.textContent):0,x:number?Number(number.getAttribute('x')):null,open};
   }));
   assert.deepEqual(rows,[{string:'e',finger:1,x:99,open:false},{string:'B',finger:0,x:null,open:true},{string:'G',finger:0,x:null,open:true},{string:'D',finger:0,x:null,open:true},{string:'A',finger:2,x:157,open:false},{string:'E',finger:3,x:215,open:false}]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
   const bounds=await svg.evaluate(el=>{const r=el.getBoundingClientRect(),c=el.closest('.chord-card').getBoundingClientRect();return{diagram:[r.left,r.right,r.bottom],card:[c.left,c.right,c.bottom]};});
   assert.ok(bounds.diagram[0]>=bounds.card[0]-1&&bounds.diagram[1]<=bounds.card[1]+1&&bounds.diagram[2]<=bounds.card[2]+1,'diagram fits existing card');
   return rows;
  };
  await arrow.click();const rows=await inspect();
  // Repeated selection must not reinstate the old G7 labels or alter primary G.
  for(let i=0;i<2;i++){await arrow.click();assert.match(await card.locator('.chord-diagram').getAttribute('aria-label'),/^G chord diagram/);await arrow.click();await inspect();}
  await page.evaluate(async()=>{
   const url=performance.getEntriesByType('resource').map(entry=>entry.name).find(url=>url.includes('/tuner/chord-audio.js'));
   const {ChordPlayer}=await import(url),play=ChordPlayer.prototype.play;
   ChordPlayer.prototype.play=function(chord){window.g7Playback={id:chord.id,frets:chord.frets,fingers:chord.fingers,midi:this.pitches(chord).map(hz=>Math.round(69+12*Math.log2(hz/440)))};return play.call(this,chord);};
  });
  const play=card.getByRole('button',{name:'Hear G7 chord',exact:true});
  await play.click();await page.waitForFunction(()=>window.g7Playback?.id==='g7');
  assert.deepEqual(await page.evaluate(()=>window.g7Playback),{id:'g7',frets:[3,2,0,0,0,1],fingers:[3,2,0,0,0,1],midi:[43,47,50,55,59,65]});
  await page.waitForFunction(()=>document.querySelector('[data-play-chord="g7"].playing .lesson-stop-icon'));
  await card.getByRole('button',{name:'Stop G7 chord',exact:true}).click();
  assert.equal(await card.getByRole('button',{name:'Hear G7 chord',exact:true}).count(),1);
  if(artifactDir)await page.screenshot({path:`${artifactDir}/g7-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Metronome',exact:true}).click();await page.getByRole('button',{name:'Chords',exact:true}).click();await inspect();
  assert.deepEqual(errors,[]);report.push({width,rows,midi:[43,47,50,55,59,65],errors});await context.close();
 }
 console.log(JSON.stringify({base,browser:await browser.version(),report},null,2));
}finally{await browser.close();}
