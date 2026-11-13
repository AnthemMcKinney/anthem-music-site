import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/tuner/tuner/chords.js',import.meta.url),'utf8');
const definitions=source.slice(source.indexOf('const chords='),source.indexOf('const customRootNames='));
const diagramFunction=source.slice(source.indexOf('function diagram('),source.indexOf('function variationLinks('));
const titles=source.slice(source.indexOf('function chordTitleParts('),source.indexOf('function chordCard('));
const {chords,diagram,chordTitleParts}=vm.runInNewContext(`${definitions};const guitarStrings=['E','A','D','G','B','e'];${diagramFunction};${titles};({chords,diagram,chordTitleParts})`);
for(const id of ['g','cadd9','f-full','b-major-barre','uke-c','bar-g'].filter(id=>chords.some(c=>c.id===id)))test(`${id}: trimmed diagram preserves every string, marker and fingering`,()=>{
 const chord=chords.find(c=>c.id===id),svg=diagram(chord),count=chord.strings?.length||6;
 assert.equal((svg.match(/class="string-name/g)||[]).length,count);
 assert.equal((svg.match(/class="open"/g)||[]).length,chord.frets.filter(f=>f===0).length);
 assert.equal((svg.match(/class="mute"/g)||[]).length,chord.frets.filter(f=>f==='x').length);
 assert.match(svg,/cx="214.5" cy="71.5" r="7" class="fret-position-marker"/);
 assert.equal((svg.match(/<line x1="58"[^>]+class="string-shadow/g)||[]).length,count);
 assert.ok(svg.indexOf('class="nut"')<svg.indexOf('class="string-shadow'),'nut is behind uninterrupted shadows');
 assert.doesNotMatch(svg, /<mask|clip-path|mask=/, 'no nut shadow mask');
 const [,x,y,w,h]=svg.match(/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/).map(Number);
 assert.equal(x,18);assert.equal(w,290);
 const firstY=count===6?24:31,lastY=count===6?119:112;
 assert.ok(firstY-8.5>=y&&lastY+8.5<=y+h,'finger circles remain inside trimmed view box');
});
test('Shape descriptions remain below the chord name, including the full F barre',()=>{
 const title=chordTitleParts(chords.find(c=>c.id==='f-full'));
 assert.equal(title.title,'F');assert.equal(title.subtitle,'full barre');
});
test('Chord preview uses shared Play icon and explicit Play action label',()=>{
 assert.match(source,/const speakerIcon=playIcon/);
 assert.match(source,/aria-label="Play \$\{c.name\} chord"/);
 assert.doesNotMatch(source,/aria-label="Hear \$\{c.name\} chord"/);
});
test('Requested Patterns includes the authorized email request destination',()=>{
 assert.match(source,/mailto:info@anthemmusic\.net\?subject=Practice%20pattern%20request/);
});
