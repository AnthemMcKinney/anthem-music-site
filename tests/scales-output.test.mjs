import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/tuner/tuner/chord-audio.js',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace(/export /g,'').replaceAll('import.meta.url','"http://test.invalid/"');
function player(options){
 const destination={},nodes=[];
 const node=()=>{const n={connections:[],gain:{},threshold:{},knee:{},ratio:{},attack:{},release:{},connect(target){this.connections.push(target);return target;}};nodes.push(n);return n;};
 const context={state:'running',destination,createGain:node,createDynamicsCompressor:node};
 const sandbox={window:{AudioContext:function(){return context;}}};vm.createContext(sandbox);vm.runInContext(source+';globalThis.Player=ChordPlayer;',sandbox);
 const p=new sandbox.Player(options);p.context();return {p,context,nodes};
}
test('Scales final output trim covers instruments and the separate rhythm bus together',()=>{
 const {p,context}=player({outputLevel:.65});assert.equal(p.output.gain.value,.65);assert.equal(p.output.connections[0],context.destination);assert.equal(p.compressor.connections[0],p.output);assert.equal(p.rhythmLimiter.connections[0],p.output);
 const scales=readFileSync(new URL('../public/tuner/scales-lab/scales.js',import.meta.url),'utf8');assert.match(scales,/new ChordPlayer\(\{outputLevel:\.65\}\)/);
});
test('First Chords retains unity output and invalid output values cannot boost gain',()=>{
 assert.equal(player().p.output.gain.value,1);assert.equal(player({outputLevel:2}).p.output.gain.value,1);assert.equal(player({outputLevel:-1}).p.output.gain.value,0);assert.equal(player({outputLevel:NaN}).p.output.gain.value,1);
});
