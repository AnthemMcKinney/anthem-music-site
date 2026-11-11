// Independent local tempos, responsive input, and exclusive playback, on real WebKit.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4340';
const dir=process.env.ARTIFACT_DIR||'/tmp/anthem-scales-tempo-controls';await mkdir(dir,{recursive:true});
const browser=await webkit.launch();
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext(width<720?{...devices['iPhone 13'],viewport:{width,height:844}}:{viewport:{width,height:900}});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/tuner/#scales');await page.locator('#fretboard-tempo').waitFor();
  await page.evaluate(async()=>{
   const source=await (await fetch('/tuner/scales-lab/scales.js')).text(),path=source.match(/from '([^']+)'/)[1];const {ChordPlayer}=await import(new URL(path,location.origin+'/tuner/scales-lab/scales.js').href);
   window.__tempoChanges=[];window.__exerciseStarts=[];
   for(const [method,record] of [['setExerciseTempo','__tempoChanges'],['playExercise','__exerciseStarts']]){const original=ChordPlayer.prototype[method];ChordPlayer.prototype[method]=function(...args){window[record].push(method==='playExercise'?args[2]:args[0]);return original.apply(this,args);};}
  });
  const input=mode=>page.locator('#'+mode+'-tempo'),step=(mode,value)=>page.locator(`[data-tempo-mode="${mode}"] [data-tempo-step="${value}"]`).first();
  for(const mode of ['fretboard','notes','backing','demo'])assert.equal(await input(mode).inputValue(),'75');
  // Rapid real pointer taps respond on down, with no follow-up duplicate click.
  const plus=step('notes',5);await plus.scrollIntoViewIfNeeded();const box=await plus.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  const before=Date.now();for(let i=0;i<10;i++){await page.mouse.down();assert.equal(await input('notes').inputValue(),String(80+i*5));await page.mouse.up();}
  assert.ok(Date.now()-before<3000,'ten taps do not wait for an audio cycle');assert.equal(await input('notes').inputValue(),'125');assert.equal(await input('fretboard').inputValue(),'125');
  await page.mouse.down();await page.waitForTimeout(630);await page.mouse.up();assert.ok(Number(await input('notes').inputValue())>=145,'holding repeats');
  const held=await input('notes').inputValue();await page.waitForTimeout(180);assert.equal(await input('notes').inputValue(),held,'release stops repeat');
  await input('notes').fill('90');assert.equal(await input('fretboard').inputValue(),'90');await input('backing').fill('65');await input('demo').fill('105');
  const pressed=async(mode)=>{for(const [name,selector] of [['notes','#fretboard-play'],['notes','#tab-play'],['backing','#backing-play'],['demo','#play']]){const active=name===mode;assert.equal(await page.locator(selector).getAttribute('aria-pressed'),String(active));assert.match(await page.locator(selector).innerText(),active?/^Stop/:/^Play/);}};
  await page.locator('#play').click();await pressed('demo');await page.waitForFunction(()=>window.__exerciseStarts.length===1);assert.deepEqual(await page.evaluate(()=>__exerciseStarts),[105]);
  await input('notes').fill('110');await input('backing').fill('70');assert.deepEqual(await page.evaluate(()=>__tempoChanges),[],'inactive mode changes do not touch the playing clock');
  await input('demo').fill('120');assert.deepEqual(await page.evaluate(()=>__tempoChanges),[120],'live input changes the active tempo before blur');
  await page.locator('#backing-play').click();await pressed('backing');assert.deepEqual(await page.evaluate(()=>__exerciseStarts),[105,70]);
  await input('backing').fill('80');await page.locator('#fretboard-play').click();await pressed('notes');await page.waitForTimeout(300);
  await input('notes').fill('100');await pressed('notes');await page.locator('#tab-play').click();await pressed('');
  // Cancel a hold when the app loses focus, then during navigation.
  await plus.scrollIntoViewIfNeeded();const again=await plus.boundingBox();await page.mouse.move(again.x+again.width/2,again.y+again.height/2);await page.mouse.down();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const blurred=await input('notes').inputValue();await page.waitForTimeout(500);assert.equal(await input('notes').inputValue(),blurred);await page.mouse.up();
  await page.mouse.down();await page.evaluate(()=>location.hash='metronome');await page.mouse.up();await page.waitForTimeout(500);await page.evaluate(()=>location.hash='scales');await page.locator('#notes-tempo').waitFor();const retained=await input('notes').inputValue();await page.waitForTimeout(450);assert.equal(await input('notes').inputValue(),retained);assert.equal(await input('backing').inputValue(),'80');assert.equal(await input('demo').inputValue(),'120');
  // Layout: controls stay inside their card and tempo/Play pairs share one row.
  const layout=await page.locator('.tab-playback-controls').evaluateAll(rows=>rows.map(row=>{const card=row.closest('.scale-card,.tab-card,.backing-panel').getBoundingClientRect(),r=row.getBoundingClientRect(),children=[...row.children].map(n=>n.getBoundingClientRect());return {card:{left:card.left,right:card.right},row:{left:r.left,right:r.right},children:children.map(c=>({left:c.left,right:c.right,top:c.top,bottom:c.bottom}))};}));
  for(const row of layout){for(const child of row.children){assert.ok(child.left>=row.card.left-1&&child.right<=row.card.right+1,JSON.stringify({width,row}));}assert.ok(Math.abs(row.children[0].top-row.children[1].top)<=3,'tempo beside Play');}
  for(const layer of await page.locator('#layer-buttons button').all())assert.equal(await layer.evaluate(node=>node.scrollWidth<=node.clientWidth+1),true,'pattern labels must not collide with local transport');
  await page.locator('#fretboard-play').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/scales-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}px: local defaults, rapid press/hold, live input, mirrored notes, three exclusive modes, blur/navigation cancel, layout`);
 }
}finally{await browser.close();}
