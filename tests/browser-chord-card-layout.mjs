// WebKit geometry, interaction and resize checks for the shared chord-card layout.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4335';
const dir=process.env.ARTIFACT_DIR;
if(dir)await mkdir(dir,{recursive:true});
const browser=await webkit.launch({headless:true});
let cardChecks=0;
const report=[];
async function inspect(page,label){
 const measurements=await page.locator('.objective-panel:visible .chord-card:visible').evaluateAll(cards=>cards.map(card=>{
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const heading=card.querySelector('.chord-card-heading'),title=heading.querySelector('h2'),audio=heading.querySelector('.play-chord'),arrow=heading.querySelector('.chord-variant-nav button'),svg=card.querySelector('.chord-diagram'),scale=svg.getScreenCTM().a;
  return {id:card.dataset.chordCard,card:rect(card),diagram:rect(svg),heading:rect(heading),title:rect(title),audio:rect(audio),arrow:arrow&&rect(arrow),titleSize:parseFloat(getComputedStyle(title).fontSize),labels:[...svg.querySelectorAll('.string-name,.finger-number')].map(e=>parseFloat(getComputedStyle(e).fontSize)*scale),sub:heading.querySelector('.chord-title-subheader')&&parseFloat(getComputedStyle(heading.querySelector('.chord-title-subheader')).fontSize),subWeight:heading.querySelector('.chord-title-subheader')&&parseFloat(getComputedStyle(heading.querySelector('.chord-title-subheader')).fontWeight),keyGroups:[...card.querySelectorAll('.finger-list,.chord-mark-key')].map(rect),legendFrame:card.querySelector('.chord-guide-notes')&&rect(card.querySelector('.chord-guide-notes')),legend:[...card.querySelectorAll('.finger-list>span,.chord-mark-key>span')].map(rect),borderTop:parseFloat(getComputedStyle(card).borderTopWidth),borderLeft:parseFloat(getComputedStyle(card).borderLeftWidth),slot:+card.dataset.chordSlot};
 }));
 assert.ok(measurements.length,`${label}: visible card`);
 for(const m of measurements){
  const tag=`${label} ${m.id}`;
  assert.ok(m.diagram.x>=m.card.x&&m.diagram.right<=m.card.right+1&&m.diagram.bottom<=m.card.bottom+1,`${tag}: diagram fits`);
  assert.ok(m.diagram.width>=Math.min(m.card.width-90,360),`${tag}: diagram uses available card width`);
  assert.ok(m.audio.width>=44&&m.audio.height>=44,`${tag}: speaker touch target`);
  assert.ok(m.titleSize>=29,`${tag}: readable title`);
  assert.ok(m.sub===null||(m.sub>=12&&m.subWeight>=700),`${tag}: readable subtitle`);
  assert.ok(Math.min(...m.labels)>=9.5,`${tag}: readable diagram labels ${Math.min(...m.labels)}`);
  assert.ok(m.title.right<=m.audio.x,`${tag}: title/audio separation`);
  if(m.arrow){assert.ok(m.arrow.width>=44&&m.arrow.height>=44,`${tag}: variation touch target`);assert.ok(m.arrow.x-m.title.right>=11,`${tag}: title/arrow gap`);assert.ok(Math.abs((m.arrow.y+m.arrow.height/2)-(m.audio.y+m.audio.height/2))<1,`${tag}: aligned controls`);}
  if(m.keyGroups.length===2){
   const [marks,fingers]=m.keyGroups;
   assert.ok(marks.bottom<=m.diagram.y+1,`${tag}: open/mute key above diagram`);
   assert.ok(fingers.y>=m.diagram.bottom-1,`${tag}: finger key below diagram`);
   assert.ok(Math.abs(fingers.x-marks.x)<1,`${tag}: keys share a left anchor`);
   const fingerRows=new Set(m.legend.slice(-4).map(l=>Math.round(l.y)));
   assert.equal(fingerRows.size,1,`${tag}: all four finger labels stay together`);
  }
  for(const l of m.legend)assert.ok(l.x>=m.card.x&&l.right<=m.card.right+1&&l.bottom<=m.card.bottom+1,`${tag}: legend fits`);
  if(await page.evaluate(()=>innerWidth>960||(innerWidth>=741&&innerWidth>innerHeight))){assert.equal(m.borderTop,m.slot>=2?1:0,`${tag}: row divider`);assert.equal(m.borderLeft,m.slot%2?1:0,`${tag}: column divider`);}
  cardChecks++;
 }
 const keyRows=measurements.filter(m=>m.keyGroups.length===2).map(m=>Math.abs(m.keyGroups[0].y-m.keyGroups[1].y)<1?1:2);assert.ok(new Set(keyRows).size<=1,`${label}: every visible card uses the same legend row count`);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label}: page fits`);
 const shadows=await page.locator('.objective-panel:visible .chord-card:visible .chord-diagram').evaluateAll(diagrams=>diagrams.map(svg=>{
  const strings=[...svg.querySelectorAll('.string-line')],nut=svg.querySelector('.nut');
  return [...svg.querySelectorAll('.string-shadow')].every((shadow,index)=>{
   const line=strings[index],style=getComputedStyle(shadow);
   return shadow.getAttribute('x1')===line.getAttribute('x1')&&shadow.getAttribute('x2')===line.getAttribute('x2')&&
    +shadow.getAttribute('y1')===+line.getAttribute('y1')+1&&style.clipPath==='none'&&style.maskImage==='none'&&
    (nut.compareDocumentPosition(shadow)&Node.DOCUMENT_POSITION_FOLLOWING)>0;
  });
 }));
 assert.ok(shadows.every(Boolean),`${label}: continuous unmasked string shadows across nut`);
 const eyebrows=await page.locator('.objective-panel:visible .chord-orientation:visible').evaluateAll(labels=>labels.map(label=>{
  const s=getComputedStyle(label),reference=getComputedStyle(label.closest('.objective-panel').querySelector('.objective-heading-area .chords-kicker'));
  const keys=['fontFamily','fontWeight','color'];
  return {text:label.textContent,uppercase:s.textTransform,actual:keys.map(k=>s[k]),reference:keys.map(k=>reference[k])};
 }));
 for(const eyebrow of eyebrows){assert.deepEqual(eyebrow.actual,eyebrow.reference,`${label}: shared app eyebrow style`);assert.equal(eyebrow.uppercase,'uppercase');assert.equal(eyebrow.text,eyebrow.text.toUpperCase());}
 return measurements;
}
try{
 for(const [width,height,touch] of [[320,800,true],[390,844,true],[844,390,true],[768,1024,true],[1024,768,true],[1280,900,false],[1440,1000,false]]){
  const context=await browser.newContext({...touch?devices['iPhone 13']:{},viewport:{width,height},isMobile:touch,hasTouch:touch,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/tuner/#chords');await page.locator('.objective-tabs').waitFor();
  for(const objective of [1,2,3,4]){
   await page.getByRole('button',{name:`Objective ${objective}`,exact:true}).click();
   const tabs=page.locator('.objective-panel:visible .chord-selector button:visible');
   if(await tabs.count())for(let i=0;i<await tabs.count();i++){await tabs.nth(i).click();await inspect(page,`${width}/${objective}/${i}`);}
   else await inspect(page,`${width}/${objective}`);
   const families=await page.locator('.objective-panel:visible .chord-card:visible .chord-variant-nav button').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));
   for(const family of families)for(let i=0;i<4;i++){await page.locator('.objective-panel:visible .chord-variant-nav button:visible').filter({has:page.locator('svg')}).evaluateAll((es,label)=>es.find(e=>e.getAttribute('aria-label')===label)?.click(),family);await inspect(page,`${width}/${objective}/variation-${i}`);}
  }
  for(const course of ['bar-general','uke-general']){
   await page.getByLabel('Select instrument',{exact:true}).click();await page.locator(`[data-course-tab="${course}"]`).click();
   for(const objective of [1,2,3]){await page.getByRole('button',{name:`Objective ${objective}`,exact:true}).click();await inspect(page,`${width}/${course}/${objective}`);}
  }
  await page.getByLabel('Select instrument',{exact:true}).click();await page.locator('[data-course-tab="guitar"]').click();
  await page.getByRole('button',{name:'Objective 1',exact:true}).click();
  if(dir){await page.locator('.objective-chords-card:visible').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/screen-${width}x${height}.png`,fullPage:true});}
  await page.getByRole('button',{name:'Metronome',exact:true}).click();await page.getByRole('button',{name:'Chords',exact:true}).click();await inspect(page,`${width}/return`);
  assert.deepEqual(errors,[]);report.push({width,height,touch,pageErrors:errors});await context.close();
 }
 const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});await page.goto(base+'/tuner/#chords');await page.locator('.objective-tabs').waitFor();
 const variant=()=>page.locator('.objective-panel:visible [aria-label="Show another shape or variation for G"]:visible');
 await variant().click();assert.equal(await page.locator('[data-chord-card="g7"]:visible').count(),1);
 for(const width of [390,844,1024,768,1440,320,1280]){await page.setViewportSize({width,height:900});await inspect(page,`resize ${width}`);assert.equal(await page.locator('[data-chord-card="g7"]:visible').count(),1,'selected variation survives resize');}
 await page.setViewportSize({width:844,height:390});await inspect(page,'phone rotation to two columns');assert.equal(await page.locator('[data-chord-card="g7"]:visible').count(),1);
 await page.setViewportSize({width:390,height:844});await inspect(page,'phone rotation to portrait');assert.equal(await page.locator('[data-chord-card="g7"]:visible').count(),1);
 await variant().focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-chord-card="g"]:visible').count(),1);
 await page.setViewportSize({width:390,height:844});await page.getByRole('tab',{name:'Cadd9',exact:true}).click();await inspect(page,'open and muted phone legend');
 await page.evaluate(()=>document.documentElement.dataset.theme='dark');await inspect(page,'dark theme');
 for(let width=320;width<=1440;width+=16){await page.setViewportSize({width,height:900});await inspect(page,`continuous resize ${width}`);}
 await page.setViewportSize({width:320,height:900});await page.getByRole('tab',{name:'G',exact:true}).click();await variant().click();
 // Classic desktop scrollbars consume 15px of BODY width in Chromium. Preserve
 // readable SVG labels even when that gutter leaves a narrower card than touch mode.
 await page.evaluate(()=>document.body.style.width='calc(100% - 15px)');await inspect(page,'320px desktop body gutter');
 await page.close();
 console.log(JSON.stringify({engine:await browser.version(),cardChecks,report,resizes:'passed',keyboard:'passed',darkTheme:'passed'},null,2));
}finally{await browser.close();}
