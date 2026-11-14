import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const engines=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const dir=process.env.ARTIFACT_DIR||'/tmp';await mkdir(dir,{recursive:true});const report=[];
for(const name of (process.env.BROWSER_ENGINES||'chromium,webkit').split(',')){
 const browser=await engines[name].launch({headless:true,...(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{const page=await browser.newPage({hasTouch:true,serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Test-only access to the callback; the deployed microphone/detector code is unchanged.
 await page.route('**/tuner/audio.js*',async route=>{const response=await route.fetch();let body=await response.text();assert.ok(body.includes('this.onPitch=onPitch;'));body=body.replace('this.onPitch=onPitch;','this.onPitch=onPitch;window.__feedbackEngine=this;');await route.fulfill({response,body});});
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:4359')+'/tuner/');await page.waitForFunction(()=>!document.querySelector('#app-load-status'));
 const frame=(hz,time)=>page.evaluate(({hz,time})=>{const now=performance.now;Object.defineProperty(performance,'now',{configurable:true,value:()=>time});try{window.__feedbackEngine.onPitch(hz===null?null:{hz,tracked:true,rms:.03,confidence:1},{});}finally{Object.defineProperty(performance,'now',{configurable:true,value:now});}return{prompt:document.querySelector('#tuner-prompt').textContent,guidance:document.querySelector('#guidance').textContent,status:document.querySelector('.tuning-panel').dataset.status};},{hz,time});
 const hz=82.4068892282175;
 for(const t of [1000,1070,1140,1210]){const r=await frame(hz,t);assert.equal(r.prompt,'Play a string');assert.ok(!r.guidance.includes('Close enough'));}
 let r=await frame(hz,1280);assert.equal(r.guidance,'✓ Close enough');report.push({engine:name,state:'third stable green reading',...r});
 for(const t of [2000,10000,30000]){r=await frame(null,t);assert.equal(r.guidance,'✓ Close enough');assert.equal(r.prompt,'Play a string');}report.push({engine:name,state:'held through 30 seconds silence',...r});
 r=await frame(hz*2**(12/1200),30100);assert.equal(r.guidance,'Pitch is high');assert.notEqual(r.status,'tuned');report.push({engine:name,state:'outside green clears',...r});
 for(const t of [32000,32070,32140,32210,32280])r=await frame(hz,t);assert.equal(r.guidance,'✓ Close enough');r=await frame(hz*2**(-12/1200),34000);assert.equal(r.guidance,'Pitch is low');
 for(const [width,height]of [[320,700],[390,844],[844,390],[741,1024],[820,1280],[1280,820]]){
  await page.setViewportSize({width,height});
  for(const [state,pitch]of [['low',hz*2**(-12/1200)],['high',hz*2**(12/1200)],['close',hz]]){
   const start=40000+report.length*2000;for(const dt of [0,70,140,210,280])await frame(pitch,start+dt);
   const g=await page.evaluate(()=>{const box=s=>document.querySelector(s).getBoundingClientRect(),p=box('#tuner-prompt'),g=box('#guidance'),n=box('.note-display'),graph=box('#pitch-trail'),slot=box('.tuner-guidance-slot');return{below:g.top>=p.bottom,rightAligned:Math.abs(g.right-p.right)<1,clear:n.right<=slot.left,axis:Math.abs(n.x+n.width/2-graph.x-graph.width/2),overflow:document.documentElement.scrollWidth>innerWidth,feedbackOverflow:document.querySelector('#guidance').scrollWidth>g.width+1,graphHeight:graph.height,prompt:document.querySelector('#tuner-prompt').textContent,guidance:document.querySelector('#guidance').textContent};});
   assert.ok(g.below&&g.rightAligned&&g.clear);assert.ok(g.axis<1);assert.equal(g.overflow,false);assert.equal(g.feedbackOverflow,false);assert.equal(g.prompt,'Play a string');assert.equal(g.graphHeight,width<=740?180:250);report.push({engine:name,width,height,state,...g});
   if(state==='close')await page.screenshot({path:`${dir}/feedback-${name}-${width}.png`,fullPage:true});
  }
 }
 await page.selectOption('#tuning',{index:1});assert.ok(!(await page.locator('#guidance').textContent()).includes('Close enough'));report.push({engine:name,state:'target change resets'});
 const chromatic=await page.locator('#instrument-choice option').evaluateAll(es=>es.find(e=>/chromatic/i.test(e.textContent)).value);await page.selectOption('#instrument-choice',chromatic);assert.equal(await page.locator('#tuner-prompt').textContent(),'Play a note');
 assert.deepEqual(errors,[]);console.log(`${name}: green/silence/outside/reset transitions and six responsive feedback layouts passed`);
 }finally{await browser.close();}
}
await writeFile(`${dir}/feedback-report.json`,JSON.stringify(report,null,2));
