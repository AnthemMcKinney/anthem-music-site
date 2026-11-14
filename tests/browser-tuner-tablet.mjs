import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const engines=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=process.env.ARTIFACT_DIR||'/tmp';await mkdir(output,{recursive:true});
const report=[];
for(const name of (process.env.BROWSER_ENGINES||'chromium,webkit').split(',')){
 const engine=engines[name];
 const browser=await engine.launch({headless:true,...(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
 const page=await browser.newPage({hasTouch:true,serviceWorkers:process.env.ALLOW_SW?'allow':'block'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:4359')+'/tuner/');
 await page.waitForFunction(()=>!document.querySelector('#app-load-status'));
 const inspect=()=>page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect();const target=rect('.tuner-selected-note'),note=rect('.note-display'),prompt=rect('.tuner-guidance-slot'),graph=rect('#pitch-trail');return{overflow:document.documentElement.scrollWidth>innerWidth,targetFont:parseFloat(getComputedStyle(document.querySelector('.target-frequency')).fontSize),readFont:parseFloat(getComputedStyle(document.querySelector('#cents')).fontSize),axis:Math.abs(note.x+note.width/2-graph.x-graph.width/2),targetClear:target.right<=note.left,promptClear:note.right<=prompt.left,graphHeight:graph.height,stringsHeight:rect('#strings').height,readOverflow:[...document.querySelectorAll('.readings>span')].some(e=>e.scrollWidth>e.clientWidth),targetOverflow:document.querySelector('.tuner-selected-note').scrollWidth>target.width+1}});
 const check=(r,width)=>{assert.equal(r.overflow,false);assert.ok(r.axis<1);assert.ok(r.targetClear&&r.promptClear);assert.equal(r.targetFont,r.readFont);assert.equal(r.graphHeight,width<=740?180:250);assert.equal(r.readOverflow,false);assert.equal(r.targetOverflow,false);if(width>=741)assert.ok(r.targetFont>=13);else assert.equal(r.targetFont,9);};
 for(const [width,height]of [[320,700],[390,844],[740,1024],[741,1024],[800,1280],[820,1280],[1024,768],[1280,800],[1440,900]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>{document.querySelector('#cents').textContent='−100.0';document.querySelector('#frequency').textContent='4186.01';document.querySelector('#heard').textContent='C8';});
  const r=await inspect();check(r,width);
  if([390,820,1280].includes(width))await page.screenshot({path:`${output}/tablet-${name}-${width}.png`,fullPage:true});
  report.push({engine:name,width,height,...r});
 }
 const options=await page.locator('#instrument-choice option').evaluateAll(es=>es.map(e=>({value:e.value,name:e.textContent})));
 for(const width of [741,820,1280]){await page.setViewportSize({width,height:1024});for(const option of options){await page.selectOption('#instrument-choice',option.value);await page.evaluate(()=>{document.querySelector('#cents').textContent='−100.0';document.querySelector('#frequency').textContent='4186.01';document.querySelector('#heard').textContent='C8';});const r=await inspect();check(r,width);report.push({engine:name,width,instrument:option.name,...r});}}
 assert.deepEqual(errors,[]);console.log(`${name}: 9 viewport checks and ${options.length*3} alternate-instrument checks passed`);
 }finally{await browser.close();}
}
await writeFile(`${output}/tablet-report.json`,JSON.stringify(report,null,2));

