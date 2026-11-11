// Run with Playwright/WebKit and BASE_URL pointing at a local or review build.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4331';
const artifactDir=process.env.ARTIFACT_DIR;
if(artifactDir)await mkdir(artifactDir,{recursive:true});
const browser=await webkit.launch({headless:true}),report=[];
try{
 for(const width of [320,390,740,768,960,1024,1280]){
  const context=await browser.newContext({...devices['iPhone 13'],viewport:{width,height:900},isMobile:width<=740});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/tuner/#chords`);await page.locator('.objective-tabs').waitFor();
  let checked=0;
  const inspect=async()=>{
   const bounds=await page.locator('.objective-panel:visible .chord-card:visible').evaluateAll(cards=>cards.map(card=>{
    const diagram=card.querySelector('.chord-diagram'),r=diagram.getBoundingClientRect(),c=card.getBoundingClientRect(),g=card.parentElement.getBoundingClientRect();
    return{id:card.dataset.chordCard,diagramBottom:r.bottom,cardBottom:c.bottom,gridBottom:g.bottom,diagramLeft:r.left,diagramRight:r.right,cardLeft:c.left,cardRight:c.right};
   }));
   for(const b of bounds){assert.ok(b.diagramBottom<=b.cardBottom+1,`${width}px ${b.id}: diagram fits card ${JSON.stringify(b)}`);assert.ok(b.diagramBottom<=b.gridBottom+1,`${width}px ${b.id}: diagram fits clipped grid`);assert.ok(b.diagramLeft>=b.cardLeft-1&&b.diagramRight<=b.cardRight+1,`${width}px ${b.id}: diagram fits width`);checked++;}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal page overflow');
  };
  for(const objective of [1,2,3,4]){
   await page.getByRole('button',{name:`Objective ${objective}`,exact:true}).click();
   const tabs=page.locator('.objective-panel:visible .chord-selector button:visible');
   if(await tabs.count())for(let i=0;i<await tabs.count();i++){await tabs.nth(i).click();await inspect();}
   else await inspect();
   if(objective===2){
    // Exercise the E/E7 arrow repeatedly, then return to the primary shape.
    if(await tabs.count())await tabs.first().click();
    for(let i=0;i<4;i++){await page.locator('.objective-panel:visible [aria-label="Show another shape or variation for E"]:visible').click();await inspect();}
    if(artifactDir&&(width===390||width===1280))await page.screenshot({path:`${artifactDir}/objective-2-${width}.png`,fullPage:true});
   }
  }
  await page.getByRole('button',{name:'Metronome',exact:true}).click();
  await page.getByRole('button',{name:'Chords',exact:true}).click();await inspect();
  assert.deepEqual(errors,[]);report.push({width,checked,pageErrors:errors});await context.close();
 }
 console.log(JSON.stringify({base,engine:await browser.version(),report},null,2));
}finally{await browser.close();}
