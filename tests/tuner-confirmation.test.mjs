import test from 'node:test';
import assert from 'node:assert/strict';
import {GreenReadingConfirmation} from '../public/tuner/tuner/confirmation.js';
import {DisplayPitch} from '../public/tuner/tuner/display.js';
const green=(average=0)=>({average,zero:true});
test('requires three consecutive stable green readings, not separate plucks',()=>{
 const c=new GreenReadingConfirmation(); assert.equal(c.accept(green()),false);
 assert.equal(c.accept(green()),false); assert.equal(c.accept(green()),true);
});
test('outside green and unsettled readings restart preconfirmation count',()=>{
 const c=new GreenReadingConfirmation(); c.accept(green()); c.accept(green());
 c.accept({average:2,zero:false}); assert.equal(c.count,0);
 c.accept(green()); c.accept({average:5.01,zero:false}); assert.equal(c.count,0);
});
test('latches through silence, invalid frames and unsettled in-green frames',()=>{
 const c=new GreenReadingConfirmation(); for(let i=0;i<3;i++)c.accept(green());
 for(const frame of [null,undefined,{average:NaN}, {average:4,zero:false}]) assert.equal(c.accept(frame),true);
 const display=new DisplayPitch(); display.update({hz:82.41,tracked:true},0);
 for(const time of [500,2000,30000]){assert.equal(display.update(null,time),null);assert.equal(display.note,'E2');}
 assert.equal(c.ready,true);
});
test('next accepted outside-green reading clears success on either side',()=>{
 for(const outside of [-5.01,5.01]){
  const c=new GreenReadingConfirmation();for(let i=0;i<3;i++)c.accept(green());
  assert.equal(c.accept({average:outside,zero:false}),false);assert.equal(c.count,0);
  assert.equal(c.accept(green()),false);
 }
});
test('inclusive green boundaries and target reset',()=>{
 const counts=[]; const c=new GreenReadingConfirmation(n=>counts.push(n));
 c.accept(green(-5));c.accept(green(5));c.accept(green());assert.equal(c.ready,true);
 c.reset();assert.equal(c.ready,false);assert.equal(c.count,0);assert.equal(counts.at(-1),0);
 assert.equal(c.accept(green()),false);
});
