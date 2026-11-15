import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const engines=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),dir=process.env.ARTIFACT_DIR||'/tmp/wide';await mkdir(dir,{recursive:true});const report=[];
for(const name of ['chromium','webkit']){
 const browser=await engines[name].launch({headless:true,...(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{const page=await browser.newPage({serviceWorkers:'block',hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.BASE_URL||'http://127.0.0.1:4360')+'/tuner/#tuner');await page.waitForFunction(()=>!document.querySelector('#app-load-status'));
 assert.equal(await page.locator('.scales-nav-icon .scales-frets').getAttribute('d'),'M3 3v18M9 3v18M15 3v18M21 3v18');assert.equal(await page.locator('.scales-nav-icon .scales-nut').count(),0);
 await page.evaluate(()=>{const p=document.querySelector('#portal');p.hidden=false;p.textContent='Student Portal ↗';});
 for(const width of [320,390,740,741,825,907,1099,1100,1101,1280,1435,1439,1440,1441,1640,2560,3440]){
  await page.setViewportSize({width,height:900});const headers=[];
  for(const view of ['Metronome','Tuner','Chords','Scales']){
   await page.evaluate(()=>scrollTo(0,400));await page.locator('.nav-item').filter({hasText:view}).click();await page.waitForTimeout(80);
   const state=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON(),h=rect('.app-shell>header'),brand=rect('.brand'),portal=rect('#portal');return{header:h,brand,portal,y:scrollY,overflow:document.documentElement.scrollWidth>innerWidth};});
   assert.equal(state.y,0,`${view} ${width} top`);assert.equal(state.overflow,false,`${view} ${width} overflow`);assert.ok(state.brand.right<state.portal.left);assert.ok(state.portal.right<=state.header.right&&state.brand.left>=state.header.left);assert.equal(state.header.height,width<741?64:72);headers.push(state.header);
  }
  for(const h of headers)assert.deepEqual([h.x,h.y,h.width,h.height],[headers[0].x,headers[0].y,headers[0].width,headers[0].height],`shared header ${width}`);
  await page.locator('.nav-item').filter({hasText:'Tuner'}).click();
  const g=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return{prompt:r('#tuner-prompt'),graph:r('#pitch-trail'),strings:r('#strings'),note:r('.note-display'),notes:r('#instrument-notes'),summary:r('#instrument-info-open'),workspace:r('.workspace'),heading:r('.string-heading')};});
  assert.ok(Math.abs(g.note.x+g.note.width/2-g.graph.x-g.graph.width/2)<1);
  if(width>=1100){assert.ok(Math.abs(g.prompt.x+g.prompt.width/2-(g.graph.left+g.strings.right)/2)<1);assert.ok(g.graph.height>=250);assert.ok(Math.abs(g.strings.height-g.graph.height)<1);assert.ok(g.strings.width/g.strings.height<=2.01);assert.ok(Math.abs(g.graph.top-g.strings.top)<1);assert.ok(g.strings.left>g.graph.right);assert.ok(g.graph.width<720);assert.ok(Math.abs(g.summary.left-g.graph.left)<=1.01);assert.ok(g.notes.width>g.graph.width+g.strings.width);assert.ok(g.notes.top>g.graph.bottom);}
  else {assert.ok(g.strings.top>=g.graph.bottom);assert.ok(Math.abs(g.graph.width-g.strings.width)<1);assert.ok(Math.abs(g.graph.left-g.strings.left)<1);assert.ok(Math.abs(g.graph.height-Math.max(width<=740?180:250,g.strings.height))<1);assert.ok(g.strings.width<=(width>=741?600:480));assert.ok(g.strings.width/g.strings.height<=2.01);}
  await page.locator('#instrument-info-open').click();assert.equal(await page.locator('#instrument-notes').evaluate(e=>e.open),true);if(width>=1100){const b=await page.locator('.tuner-notes-content').boundingBox();assert.ok(b.width>g.graph.width+g.strings.width-30);}
  if(width===1435)await page.screenshot({path:dir+'/notes-expanded-'+name+'.png',fullPage:true});
  await page.locator('.tuner-note-image').click();assert.ok(await page.locator('#tuner-note-dialog').evaluate(e=>e.open));await page.locator('.tuner-note-dialog-close').click();await page.locator('#instrument-info-open').click();
  if([390,740,825,907,1099,1100,1101,1435,1640,3440].includes(width)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${dir}/tuner-${name}-${width}.png`,fullPage:true});}
  report.push({name,width,header:headers[0],...g});
 }
 await page.setViewportSize({width:1440,height:450});await page.locator('#instrument-info-open').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>scrollY>0));await page.locator('#instrument-info-open').click();await page.locator('.tuner-note-image').scrollIntoViewIfNeeded();assert.ok(await page.locator('.tuner-note-image').isVisible());await page.locator('#instrument-info-open').click();
 // Native browser history and external hash links also enter at the true top.
 await page.setViewportSize({width:825,height:500});await page.locator('.nav-item').filter({hasText:'Metronome'}).click();await page.evaluate(()=>scrollTo(0,300));await page.locator('.nav-item').filter({hasText:'Tuner'}).click();await page.goBack();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>scrollY),0);assert.equal(await page.locator('body').getAttribute('data-view'),'metronome');await page.goForward();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>scrollY),0);await page.evaluate(()=>{scrollTo(0,300);location.hash='metronome';});await page.waitForTimeout(100);await page.evaluate(()=>{scrollTo(0,300);location.hash='tuner';});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>scrollY),0);
 assert.deepEqual(errors,[]);console.log(`${name}: shared header bounds, route/history top, wide working surfaces, notes and image passed at 17 widths`);
 }finally{await browser.close();}
}
await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2));
