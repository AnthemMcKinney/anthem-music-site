// CSS-only shell regression: desktop lessons scroll, and height does not
// change the metronome composition or clip its transport controls.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4341';
const artifacts=process.env.ARTIFACT_DIR;
if(artifacts)await mkdir(artifacts,{recursive:true});
const browser=await webkit.launch({headless:true});
const report=[];
try{
 const context=await browser.newContext({viewport:{width:1264,height:613},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/tuner/#metronome');await page.locator('#metronome-start').waitFor();
 for(const [width,height] of [[1264,613],[1264,619],[1264,620],[1264,621],[1264,744],[1100,620],[1440,390],[1920,1080],[1099,744],[768,1024],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
  const layout=await page.evaluate(()=>{
   const card=document.querySelector('.metronome-card'),options=document.querySelector('.metronome-options'),start=document.querySelector('#metronome-start'),stage=document.querySelector('.pulse-stage');
   return {width:innerWidth,height:innerHeight,display:getComputedStyle(card).display,optionsVisible:getComputedStyle(options).display!=='none',cardClipped:card.scrollHeight>card.clientHeight+1&&getComputedStyle(card).overflow==='hidden',stageHeight:stage.getBoundingClientRect().height,startY:start.getBoundingClientRect().y,pageWidth:document.documentElement.scrollWidth};
  });
  assert.equal(layout.display,width>=1100?'grid':'block','only width changes composition');assert.equal(layout.optionsVisible,width>=1100,'desktop options remain exposed');assert.equal(layout.cardClipped,false,'card never clips contents');assert.ok(layout.pageWidth<=width+1,'no horizontal page overflow');
  if(width>=1100&&height>=613)assert.ok(layout.startY+44<=height-58,'Start initially above navigation');
  await page.locator('#metronome-start').evaluate(e=>e.scrollIntoView({block:'center'}));
  const reachable=await page.locator('#metronome-start').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;});assert.ok(reachable,`${width}x${height}: Start reachable after scroll`);
  if(artifacts&&[1264,390].includes(width)&&[613,844].includes(height)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${artifacts}/metronome-${width}x${height}.png`});}
  report.push(layout);
 }
 // Options retain selection across closing, resizing and repeated opening.
 await page.setViewportSize({width:390,height:844});await page.locator('#metronome-settings').click();await page.locator('[data-meter="3"]').click();await page.locator('[data-sound="wood"]').click();await page.locator('#metronome-options-close').click();
 await page.locator('#metronome-settings').click();assert.equal(await page.locator('[data-meter="3"]').getAttribute('aria-pressed'),'true');await page.locator('#metronome-options-close').click();
 await page.setViewportSize({width:1264,height:613});assert.equal(await page.locator('[data-sound="wood"]').getAttribute('aria-pressed'),'true');
 await page.locator('#metronome-start').click();await page.waitForFunction(()=>document.querySelector('#metronome-status').textContent.startsWith('Beat '));
 for(const height of [619,620,744,613]){await page.setViewportSize({width:1264,height});assert.equal(await page.locator('#metronome-start').getAttribute('aria-label'),'Stop metronome','height resize preserves playback');}
 await page.locator('#tempo-up').click();await page.locator('#metronome-start').click();assert.equal(await page.locator('#metronome-start').getAttribute('aria-pressed'),'false');
 // Scales previously lost its scrollbar at 1100 x 620 and taller.
 for(const [width,height] of [[1118,744],[1264,619],[1264,620],[1436,775],[390,844]]){
  await page.setViewportSize({width,height});await page.goto(base+'/tuner/#scales');await page.locator('.scales-view .pattern-play').first().waitFor();await page.mouse.move(width-100,height-100);await page.mouse.wheel(0,800);await page.waitForTimeout(350);assert.ok(await page.evaluate(()=>scrollY>=Math.min(500,document.documentElement.scrollHeight-innerHeight)-2),'Scales responds to wheel scrolling up to its available page height');
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));const bottom=await page.locator('.scales-view').evaluate(e=>e.getBoundingClientRect().bottom);assert.ok(bottom<=height,'last Scales content can be reached');
 }
 await page.setViewportSize({width:1264,height:619});await page.evaluate(()=>scrollTo(0,500));
 for(const [width,height] of [[1264,620],[1264,744],[1099,744],[1100,744]]){
  await page.setViewportSize({width,height});const before=await page.evaluate(()=>scrollY);await page.mouse.move(width-100,height-100);await page.mouse.wheel(0,200);await page.waitForTimeout(350);assert.ok(await page.evaluate(before=>scrollY>=Math.min(before+100,document.documentElement.scrollHeight-innerHeight)-2,before),'resizing while reading preserves usable Scales scrolling up to page end');
 }
 // Repeated navigation keeps normal scrolling for the compact tuner and lessons.
 await page.setViewportSize({width:1280,height:900});
 for(const view of ['tuner','chords','more','scales','metronome','tuner','scales']){
  await page.getByRole('button',{name:view[0].toUpperCase()+view.slice(1),exact:true}).click();await page.waitForFunction(v=>document.body.dataset.view===v,view);
  const overflow=await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY);assert.equal(overflow==='hidden',false,`${view}: correct root scrolling`);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({engine:await browser.version(),layouts:report,scrolling:'passed',options:'passed',playbackResize:'passed',navigation:'passed',errors},null,2));await context.close();
}finally{await browser.close();}
