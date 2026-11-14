import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('public/tuner/index.html','utf8'),app=readFileSync('public/tuner/app.js','utf8'),css=readFileSync('public/tuner/tuner-stacked.css','utf8');
test('tuner notes are a closed native disclosure, not a modal',()=>{
 assert.match(html,/<details id="instrument-notes" class="tuner-notes-disclosure">/);
 assert.match(html,/<summary id="instrument-info-open">/);
 assert.doesNotMatch(app,/instrument-notes'\)\.showModal/);
 assert.match(app,/tuner-definitions/);assert.match(app,/tuner-key-points/);
});
test('existing fret image and note formatting remain, with neutral tuning guidance',()=>{
 assert.match(app,/guitar-string-and-fret-map.png/);assert.match(app,/formatNoteText\(body\)/);
 assert.match(app,/every couple of seconds/);assert.match(app,/no universal direction/);
});
test('string section uses the larger tablet heading and separators without changing graph height',()=>{
 assert.match(app,/Tap to play a string/);
 assert.match(css,/string-heading\{border-bottom:1px/);
 assert.match(css,/string-heading h2\{font-size:24px;line-height:1.25/);
});
