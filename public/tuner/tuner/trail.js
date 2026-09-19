export class PitchHistory{
 constructor(duration=3500){this.duration=duration;this.points=[];}
 clear(){this.points=[];}
 add(cents,time,meta={}){this.points.push({cents,time,...meta});this.prune(time);}
 clock(time){return this.points.length?Math.min(time,this.points[this.points.length-1].time+180):time;}
 prune(time){this.points=this.points.filter(p=>time-p.time<=this.duration);return this.points;}
}
const mix=t=>{const a=[232,93,26],b=[18,109,80];return 'rgb('+a.map((n,i)=>Math.round(n+(b[i]-n)*t)).join(',')+')';};
export class PitchTrail{
 constructor(canvas){this.canvas=canvas;this.history=new PitchHistory(3500);this.gauge=null;this.last=null;this.peak=.001;this.frame=0;this.draw=this.draw.bind(this);this.draw();}
 clear(){this.history.clear();this.last=null;this.gauge=null;this.peak=.001;}
 add(cents,time,meta={}){
  this.peak=Math.max(meta.rms||.001,this.peak*.995);
  this.history.add(cents,time,{strength:Math.min(1,Math.sqrt((meta.rms||this.peak)/this.peak)),green:meta.green||0});
  this.last={cents:meta.average??cents,time};this.gauge=meta;
 }
 draw(){
  const now=performance.now(),canvas=this.canvas,rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
  if(rect.width&&rect.height){
   const width=Math.round(rect.width*ratio),height=Math.round(rect.height*ratio);
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
   const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.globalAlpha=1;
   const w=rect.width,h=rect.height,head=76,range=h-head,x=c=>w*(.5+Math.max(-100,Math.min(100,c))*.0043);
   ctx.clearRect(0,0,w,h);const live=this.last&&now-this.last.time<220;const completed=this.gauge?.zero&&this.last&&now-this.last.time<1200;
   // Time scrolls downward; pitch displacement is horizontal. No artificial waveform.
   ctx.save();ctx.beginPath();ctx.rect(0,head,w,range);ctx.clip();ctx.strokeStyle='#e1e4e3';ctx.lineWidth=.7;
   for(let c=-100;c<=100;c+=10){ctx.beginPath();ctx.moveTo(x(c),head);ctx.lineTo(x(c),h);ctx.stroke();}
   const offset=(now/this.history.duration*range)%24;for(let y=head+offset;y<h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
   if(this.gauge){const fill=(live||completed)?this.gauge.fill:Math.min(.94,this.gauge.fill),top=h-fill*range;
    ctx.globalAlpha=.16;ctx.fillStyle=(live||completed)?mix(this.gauge.green):'#888f94';ctx.fillRect(w/2-9,top,18,h-top);ctx.globalAlpha=1;
   }
   ctx.strokeStyle='#737b81';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w/2,head);ctx.lineTo(w/2,h);ctx.stroke();
   const traceTime=this.history.clock(now),points=this.history.points;ctx.lineWidth=1;ctx.lineCap='round';
   for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(b.time-a.time>250)continue;
    ctx.globalAlpha=Math.max(.32,Math.max(0,1-(traceTime-b.time)/this.history.duration)**1.5*(.25+.75*b.strength));
    ctx.strokeStyle=live?mix(b.green):'#737b81';ctx.beginPath();ctx.moveTo(x(a.cents),head+(traceTime-a.time)/this.history.duration*range);ctx.lineTo(x(b.cents),head+(traceTime-b.time)/this.history.duration*range);ctx.stroke();
   }
   // Keep even a single accepted sample visible until a connected trace forms.
   if(points.length){const p=points[points.length-1];ctx.globalAlpha=live?1:.5;ctx.fillStyle=live?mix(p.green):'#737b81';ctx.beginPath();ctx.arc(x(p.cents),head+(traceTime-p.time)/this.history.duration*range,1.5,0,Math.PI*2);ctx.fill();}
   ctx.restore();ctx.globalAlpha=1;
   if(this.last){const px=x(this.last.cents),cy=43,r=25;
    ctx.fillStyle=(live||completed)?mix(this.gauge?.green||0):'#737b81';ctx.beginPath();ctx.arc(px,cy,r,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(px-7,cy+r-2);ctx.lineTo(px,head);ctx.lineTo(px+7,cy+r-2);ctx.closePath();ctx.fill();
    ctx.fillStyle='white';ctx.font='600 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';const c=this.last.cents;ctx.fillText((c>0?'+':'')+c.toFixed(1),px,cy-3);ctx.font='9px Arial';ctx.fillText('CENTS',px,cy+11);
    if(!live){ctx.fillStyle='#5c6470';ctx.font='10px Arial';ctx.fillText('LAST',px,9);}
   }
  }
  this.frame=requestAnimationFrame(this.draw);
 }
 destroy(){cancelAnimationFrame(this.frame);}
}
