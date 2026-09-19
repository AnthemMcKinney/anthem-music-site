// Full green accepts a stable acoustic-instrument average within five cents.
export class GaugeState{
 constructor(){this.reset();}
 reset(){this.samples=[];this.last=-Infinity;this.outSince=null;this.latched=false;this.value=null;}
 update(cents,time){
  if(time-this.last>600)this.samples=[];
  this.last=time;this.samples.push({cents,time});this.samples=this.samples.filter(p=>time-p.time<=1200);
  const average=this.samples.reduce((sum,p)=>sum+p.cents,0)/this.samples.length;
  const variance=this.samples.reduce((sum,p)=>sum+(p.cents-average)**2,0)/this.samples.length;
  const duration=time-this.samples[0].time;
  const zero=Math.abs(average)<=5&&Math.abs(cents)<=7&&Math.sqrt(variance)<=4&&duration>=130&&this.samples.length>=3;
  if(Math.abs(average)>7){this.outSince??=time;if(time-this.outSince>=700)this.latched=false;}else this.outSince=null;
  const ding=zero&&!this.latched;if(ding)this.latched=true;
  const green=zero?1:Math.min(.85,Math.max(0,(10-Math.abs(average))/10)*.85);
  const fill=zero?1:Math.min(.94,Math.max(0,1-Math.abs(average)/30));
  this.value={average,zero,green,fill,ding};return this.value;
 }
}
