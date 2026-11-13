import test from 'node:test';
import assert from 'node:assert/strict';
import {PitchTrail} from '../public/tuner/tuner/trail.js';
test('pitch grid retains full-width mapping and refreshes its backing resolution on resize',()=>{
 const previous={getComputedStyle:globalThis.getComputedStyle,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,devicePixelRatio:globalThis.devicePixelRatio};
 const moves=[],gradient={addColorStop(){}};
 const ctx=new Proxy({moveTo(x,y){moves.push([x,y]);},createLinearGradient(){return gradient;}},{get(target,key){return target[key]??(()=>{});},set(target,key,value){target[key]=value;return true;}});
 let rect={width:356,height:180};const canvas={getBoundingClientRect:()=>rect,getContext:()=>ctx};
 globalThis.getComputedStyle=()=>({getPropertyValue:()=> '#0d1f3c'});globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};globalThis.devicePixelRatio=2;globalThis.document={documentElement:{}};
 try{const trail=new PitchTrail(canvas);for(const size of [{width:356,height:180},{width:1170,height:250},{width:356,height:180}]){rect=size;moves.length=0;trail.draw();assert.equal(canvas.width,size.width*2);assert.equal(canvas.height,size.height*2);const grid=moves.slice(0,21);assert.ok(Math.abs(grid[0][0]-size.width*.07)<.01);assert.ok(Math.abs(grid[20][0]-size.width*.93)<.01);assert.equal(grid[10][0],size.width/2);for(let i=1;i<grid.length;i++)assert.ok(Math.abs(grid[i][0]-grid[i-1][0]-size.width*.043)<.01);}trail.destroy();}
 finally{Object.assign(globalThis,previous);delete globalThis.document;}
});
