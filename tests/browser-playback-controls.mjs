// Run against public/ with Playwright/WebKit; checks real controls at phone and desktop widths.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {webkit,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4334';
const dir=process.env.ARTIFACT_DIR||'/tmp/anthem-playback-controls';await mkdir(dir,{recursive:true});
const browser=await webkit.launch();
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({...devices['iPhone 13'],viewport:{width,height:900},isMobile:width<740});
  const page=await context.newPage(),errors=[],samples=[];page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().includes('/samples/'))samples.push(request.url());});
  await page.goto(`${base}/tuner/#chords`);await page.locator('.objective-tabs').waitFor();await page.waitForTimeout(500);assert.ok(samples.length>0,'opening Chords warms recordings');
  const chord=page.locator('.objective-panel:visible .play-chord').first();await chord.click();await page.waitForFunction(()=>document.querySelector('.play-chord.playing .lesson-stop-icon'));
  assert.match(await chord.getAttribute('aria-label'),/^Stop /);await page.waitForTimeout(600);assert.ok(await chord.locator('.lesson-stop-icon').count(),'square remains beyond old 420ms timeout');
  await page.screenshot({path:`${dir}/chord-active-${width}.png`});await chord.click();assert.match(await chord.getAttribute('aria-label'),/^Hear /);assert.equal(await chord.locator('.lesson-stop-icon').count(),0);
  await chord.click();await page.waitForFunction(()=>!document.querySelector('.play-chord.playing'));assert.match(await chord.getAttribute('aria-label'),/^Hear /);
  const exercise=page.locator('.objective-panel:visible .play-exercise').first();await exercise.evaluate(button=>{for(let parent=button.parentElement;parent;parent=parent.parentElement){if(parent.tagName==='DETAILS')parent.open=true;parent.hidden=false;}});await exercise.click();assert.equal(await exercise.getAttribute('aria-label'),'Stop progression');assert.equal(await exercise.locator('.lesson-stop-icon').count(),1);await page.screenshot({path:`${dir}/exercise-active-${width}.png`});await exercise.click();assert.equal(await exercise.locator('.lesson-stop-icon').count(),0);
  const previewLink=page.locator('.objective-panel:visible [data-preview-chord]').first();await previewLink.click();const popup=page.locator('.chord-preview .play-chord');await popup.click();assert.match(await popup.getAttribute('aria-label'),/^Stop /);assert.equal(await popup.locator('.lesson-stop-icon').count(),1);await popup.click();assert.match(await popup.getAttribute('aria-label'),/^Hear /);
  await page.goto(`${base}/tuner/#metronome`);const start=page.locator('#metronome-start');await start.click();assert.equal(await start.getAttribute('aria-label'),'Stop metronome');assert.equal(await start.locator('.lesson-stop-icon').count(),1);if(!await page.locator('[data-meter="3"]').isVisible())await page.locator('#metronome-settings').click();await page.locator('[data-meter="3"]').click();assert.equal(await start.getAttribute('aria-label'),'Stop metronome','meter changes preserve active Stop');if(await page.locator('#metronome-options-close').isVisible())await page.locator('#metronome-options-close').click();await page.screenshot({path:`${dir}/metronome-active-${width}.png`});await start.click();assert.equal(await start.textContent(),'Start');assert.equal(await start.getAttribute('aria-pressed'),'false');
  assert.deepEqual(errors,[]);await context.close();console.log(`${width}px: warm-up, chord toggle/completion, exercise, popup and metronome controls passed`);
 }
}finally{await browser.close();}
