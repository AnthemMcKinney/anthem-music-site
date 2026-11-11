import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {ChordPlayer} from '../public/tuner/tuner/chord-audio.js';

// Read the actual shared lesson definitions rather than maintaining a second
// G7 fixture that could disagree with the diagrams and playback controls.
const source=readFileSync(new URL('../public/tuner/tuner/chords.js',import.meta.url),'utf8');
const definition=source.match(/const chords=(\[[\s\S]*?\n\]);/);
assert.ok(definition,'lesson chord definitions are present');
const chords=JSON.parse(JSON.stringify(runInNewContext(definition[1])));
const byId=Object.fromEntries(chords.map(chord=>[chord.id,chord]));

test('guitar G7 teaches 320001 with ring, middle, and pointer fingers',()=>{
 assert.deepEqual(byId.g7.frets,[3,2,0,0,0,1]);
 assert.deepEqual(byId.g7.fingers,[3,2,0,0,0,1]);
 assert.deepEqual(byId.g7.anchors,[]);
});

test('guitar G7 playback matches G2 B2 D3 G3 B3 F4',()=>{
 const midi=new ChordPlayer().pitches(byId.g7).map(hz=>Math.round(69+12*Math.log2(hz/440)));
 assert.deepEqual(midi,[43,47,50,55,59,65]);
});

test('G7 correction leaves the primary G and other instrument fingerings intact',()=>{
 assert.deepEqual(byId.g.frets,[3,2,0,0,3,3]);
 assert.deepEqual(byId.g.fingers,[2,1,0,0,3,4]);
 assert.deepEqual(byId['bar-g7'].frets,[0,0,0,1]);
 assert.deepEqual(byId['bar-g7'].fingers,[0,0,0,1]);
 assert.deepEqual(byId['uke-g7'].frets,[0,2,1,2]);
 assert.deepEqual(byId['uke-g7'].fingers,[0,2,1,3]);
});
