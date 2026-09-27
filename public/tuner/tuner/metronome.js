const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const tempoName=bpm=>bpm<60?'Largo':bpm<76?'Adagio':bpm<108?'Andante':bpm<120?'Moderato':bpm<156?'Allegro':bpm<176?'Vivace':'Presto';

class Clock{
 constructor(onPulse){Object.assign(this,{onPulse,bpm:100,beats:4,subdivision:1,sound:'click',accent:true,step:0,running:false,visualTimers:new Set()});}
 context(){if(this.ctx)return this.ctx;const AudioContext=window.AudioContext||window.webkitAudioContext;this.ctx=new AudioContext({latencyHint:'interactive'});this.master=this.ctx.createGain();this.master.gain.value=.96;this.compressor=this.ctx.createDynamicsCompressor();this.compressor.threshold.value=-16;this.compressor.ratio.value=10;this.compressor.attack.value=.001;this.compressor.release.value=.09;this.master.connect(this.compressor).connect(this.ctx.destination);return this.ctx;}
 unlock(){
  const ctx=this.context();
  if(ctx.state==='running')return Promise.resolve(ctx);
  if(this.unlocking)return this.unlocking;
  // iOS requires every audio-start call to happen synchronously inside the
  // original touch. Do not await native media before resuming Web Audio.
  const resume=ctx.resume();
  let media=Promise.resolve();
  if(typeof Audio!=='undefined'){
   this.primer??=Object.assign(new Audio(new URL('../samples/guitar-acoustic-E4.wav',import.meta.url)),{playsInline:true,preload:'auto',volume:.01});
   this.primer.currentTime=0;
   media=this.primer.play().then(()=>new Promise(resolve=>setTimeout(()=>{this.primer.pause();this.primer.currentTime=0;resolve();},35))).catch(()=>{});
  }
  const oscillator=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
  oscillator.frequency.value=880;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.00001,now+.025);oscillator.connect(gain).connect(ctx.destination);oscillator.start(now);oscillator.stop(now+.03);
  this.unlocking=Promise.allSettled([resume,media]).then(()=>{if(ctx.state!=='running')throw Error('Audio remains paused');return ctx;}).finally(()=>{this.unlocking=null;});
  return this.unlocking;
 }
 click(at,accent,sub){
  const ctx=this.context(),gain=ctx.createGain(),osc=ctx.createOscillator(),snap=ctx.createOscillator(),level=sub?.35:accent?.92:.68;
  if(this.sound==='wood'){osc.type='triangle';osc.frequency.value=accent?1280:920;snap.frequency.value=accent?390:310;}else if(this.sound==='beep'){osc.type='sine';osc.frequency.value=accent?1320:880;snap.frequency.value=accent?660:440;}else{osc.type='square';osc.frequency.value=accent?1760:1180;snap.frequency.value=accent?880:590;}
  const duration=this.sound==='beep'?.095:this.sound==='wood'?.045:.055;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(level,at+.002);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain);snap.connect(gain);gain.connect(this.master);osc.start(at);snap.start(at);osc.stop(at+duration+.02);snap.stop(at+duration+.02);
 }
 schedule(){if(!this.running)return;const ctx=this.context(),total=this.beats*this.subdivision;while(this.nextAt<ctx.currentTime+.12){const step=this.step,beat=Math.floor(step/this.subdivision),sub=step%this.subdivision,isBeat=sub===0,isAccent=isBeat&&this.accent&&(this.subdivision>1||beat===0),delay=Math.max(0,(this.nextAt-ctx.currentTime)*1000);this.click(this.nextAt,isAccent,!isBeat);const timer=setTimeout(()=>{this.visualTimers.delete(timer);if(this.running)this.onPulse(beat,sub);},delay);this.visualTimers.add(timer);this.nextAt+=60/this.bpm/this.subdivision;this.step=(this.step+1)%total;}this.timer=setTimeout(()=>this.schedule(),25);}
 async start(){await this.unlock();this.stop(false);this.running=true;this.step=0;this.nextAt=this.context().currentTime+.045;this.startedAt=performance.now()+45;this.schedule();}
 stop(reset=true){this.running=false;clearTimeout(this.timer);for(const timer of this.visualTimers)clearTimeout(timer);this.visualTimers.clear();if(reset){this.step=0;this.onPulse(-1,0);}}
 release(){const ctx=this.ctx;this.ctx=null;this.master=null;this.compressor=null;this.unlocking=null;if(this.primer){this.primer.pause();this.primer.currentTime=0;}if(ctx&&ctx.state!=='closed')void ctx.close().catch(()=>{});}
 resetSchedule(){this.step=0;if(this.running){this.nextAt=this.context().currentTime+.04;this.startedAt=performance.now()+40;}}
 setTempo(value){this.bpm=clamp(Math.round(value),40,240);this.resetSchedule();}setMeter(value){this.beats=value;this.resetSchedule();}setSubdivision(value){this.subdivision=value;this.resetSchedule();}
 phase(){if(!this.running||!this.startedAt)return 0;return((performance.now()-this.startedAt)/(60000/this.bpm)%1+1)%1;}
}

export function initMetronome(){
 const $=id=>document.getElementById(id),tempo=$('tempo-value'),name=$('tempo-name'),slider=$('tempo-slider'),dots=$('beat-dots'),start=$('metronome-start'),status=$('metronome-status'),canvas=$('pulse-canvas'),options=$('metronome-options'),settings=$('metronome-settings');let bpm=100,beats=4,unit=4,subdivision=1,taps=[],animation=0,currentBeat=0;
 const clock=new Clock((beat,sub)=>{if(beat>=0)currentBeat=beat;[...dots.children].forEach((dot,index)=>dot.classList.toggle('current',index===beat));if(beat>=0){const syllables=subdivision===2?['and']:subdivision===3?['trip','let']:['e','and','a'];status.textContent=sub?`Beat ${beat+1} · ${syllables[sub-1]}`:`Beat ${beat+1}`;dots.setAttribute('aria-label',`Beat ${beat+1} of ${beats}`);}else{currentBeat=0;status.textContent='Ready';dots.setAttribute('aria-label',`${beats}/${unit} · ${subdivision} note${subdivision>1?'s':''} per beat`);}});
 function renderTempo(){tempo.textContent=bpm;name.textContent=tempoName(bpm);slider.value=bpm;clock.setTempo(bpm);document.querySelectorAll('[data-tempo]').forEach(button=>button.setAttribute('aria-pressed',Number(button.dataset.tempo)===bpm));}function groupStart(i){if(unit!==8)return false;if([6,9,12].includes(beats))return i>0&&i%3===0;if(beats===7)return i===2||i===4;return false;}
 function renderDots(){dots.replaceChildren(...Array.from({length:beats},(_,i)=>{const dot=document.createElement('span');dot.className='beat-dot';dot.textContent=i+1;if(groupStart(i))dot.classList.add('group-start');return dot;}));clock.setMeter(beats);clock.onPulse(-1,0);}function adjust(n){bpm=clamp(bpm+n,40,240);renderTempo();}
 function hold(button,n){let timeout,repeat;const stop=()=>{clearTimeout(timeout);clearInterval(repeat);};button.addEventListener('pointerdown',()=>{void clock.unlock();adjust(n);timeout=setTimeout(()=>repeat=setInterval(()=>adjust(n),85),420);});for(const event of ['pointerup','pointercancel','pointerleave'])button.addEventListener(event,stop);}function toggleOptions(open){options.hidden=!open;settings.setAttribute('aria-expanded',open);settings.classList.toggle('open',open);if(open)options.scrollIntoView({block:'nearest'});}
 hold($('tempo-down'),-1);hold($('tempo-up'),1);slider.addEventListener('pointerdown',()=>void clock.unlock());slider.addEventListener('input',()=>{bpm=Number(slider.value);renderTempo();});
 $('tap-tempo').addEventListener('pointerdown',()=>void clock.unlock());$('tap-tempo').addEventListener('click',()=>{const now=performance.now();if(taps.length&&now-taps.at(-1)>2000)taps=[];taps.push(now);taps=taps.slice(-5);if(taps.length>=2){const intervals=taps.slice(1).map((v,i)=>v-taps[i]);bpm=clamp(Math.round(60000/(intervals.reduce((sum,v)=>sum+v,0)/intervals.length)),40,240);renderTempo();}status.textContent=taps.length<2?'Tap again':`${bpm} BPM`;});document.querySelectorAll('[data-tempo]').forEach(button=>button.addEventListener('click',()=>{bpm=Number(button.dataset.tempo);renderTempo();status.textContent=`${button.querySelector('strong').textContent} · ${bpm} BPM`;}));
 function renderAccentCopy(){const divided=subdivision>1;$('accent-title').textContent=divided?'Accent each beat':'Accent beat one';$('accent-help').textContent=divided?'Emphasize every numbered beat over the notes between.':'Make the start of every measure unmistakable.';}
 document.querySelectorAll('[data-meter]').forEach(button=>button.addEventListener('click',()=>{beats=Number(button.dataset.meter);unit=Number(button.dataset.unit);document.querySelectorAll('[data-meter]').forEach(item=>item.setAttribute('aria-pressed',item===button));renderDots();}));document.querySelectorAll('[data-subdivision]').forEach(button=>button.addEventListener('click',()=>{subdivision=Number(button.dataset.subdivision);clock.setSubdivision(subdivision);document.querySelectorAll('[data-subdivision]').forEach(item=>item.setAttribute('aria-pressed',item===button));renderAccentCopy();clock.onPulse(-1,0);}));
 document.querySelectorAll('[data-sound]').forEach(button=>button.addEventListener('click',()=>{clock.sound=button.dataset.sound;document.querySelectorAll('[data-sound]').forEach(item=>item.setAttribute('aria-pressed',item===button));void clock.unlock().then(()=>clock.click(clock.context().currentTime+.01,true,false));}));$('accent-one').addEventListener('change',event=>clock.accent=event.target.checked);settings.addEventListener('click',()=>toggleOptions(options.hidden));$('metronome-options-close').addEventListener('click',()=>toggleOptions(false));
 start.addEventListener('pointerdown',()=>void clock.unlock());start.addEventListener('click',async()=>{if(clock.running){clock.stop();clock.release();start.textContent='Start';start.classList.remove('running');return;}try{await clock.start();start.textContent='Stop';start.classList.add('running');}catch{clock.release();status.textContent='Tap Start again to allow sound.';}});
 function draw(){
  const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2),width=Math.max(1,rect.width),height=Math.max(1,rect.height);
  if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
  const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
  ctx.strokeStyle='#30445c';ctx.lineWidth=1;ctx.globalAlpha=.65;
  for(let row=1;row<4;row++){const y=height*row/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  ctx.globalAlpha=1;
  const phase=clock.phase(),beatWidth=Math.max(70,width/Math.min(beats,4)),playX=width*.22;
  for(let i=-2;i<Math.ceil((width-playX)/beatWidth)+2;i++){
   const x=playX+(i-phase)*beatWidth,beatFade=x>=playX?1:clamp((x-(playX-beatWidth*.24))/(beatWidth*.24),0,1),beatApproach=x>=playX?1-clamp((x-playX)/(beatWidth*.3),0,1):beatFade;
   ctx.strokeStyle='#8198ab';ctx.lineWidth=2+2.05*beatApproach;ctx.setLineDash([]);ctx.globalAlpha=x>=playX?.74+.26*beatApproach:beatFade;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();
   const andX=x+beatWidth/2,andFade=andX>=playX?1:clamp((andX-(playX-beatWidth*.45))/(beatWidth*.45),0,1);ctx.save();ctx.strokeStyle='#8fa9bd';ctx.lineWidth=1;ctx.globalAlpha=.76*andFade;ctx.setLineDash([1.5,2]);ctx.beginPath();ctx.moveTo(andX,0);ctx.lineTo(andX,height);ctx.stroke();ctx.restore();
   for(let sub=1;sub<subdivision;sub++){
    if(subdivision%2===0&&sub===subdivision/2)continue;
    const sx=x+beatWidth*sub/subdivision;ctx.strokeStyle='#65758a';ctx.lineWidth=1;ctx.globalAlpha=.28;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(sx,0);ctx.lineTo(sx,height);ctx.stroke();
   }
  }
  ctx.globalAlpha=1;ctx.setLineDash([]);
  const bottom=height-18,top=22,y=bottom-Math.sin(Math.PI*phase)*(bottom-top);
  ctx.strokeStyle='#e85d1a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(playX,0);ctx.lineTo(playX,height);ctx.stroke();ctx.fillStyle='#e85d1a';ctx.beginPath();ctx.arc(playX,y,10,0,Math.PI*2);ctx.fill();
   const beatAlpha=phase<.32?1:phase<.44?1-(phase-.32)/.12:0;
   const visualSubdivision=subdivision===1?2:subdivision,subdivisionWords=subdivision===3?['and','a']:subdivision===4?['e','and','a']:['and'];
   let subdivisionWord='',subdivisionAlpha=0;
   for(let sub=1;sub<visualSubdivision;sub++){
    const start=sub/visualSubdivision,age=phase-start;
    if(age>=0&&age<.24){subdivisionWord=subdivisionWords[sub-1]||'and';subdivisionAlpha=age<.14?1:1-(age-.14)/.1;break;}
   }
   ctx.fillStyle='#f4eee2';ctx.textAlign='left';
   if(clock.running&&subdivisionAlpha>0){ctx.globalAlpha=subdivisionAlpha;ctx.font='italic 650 13px Inter, sans-serif';ctx.fillText(subdivisionWord,playX+17,top+5);}
   if(clock.running&&beatAlpha>0){ctx.globalAlpha=beatAlpha;ctx.font=clock.accent?'900 32px Inter, sans-serif':'900 18px Inter, sans-serif';ctx.fillText(clock.accent?String(currentBeat+1):'Beat',playX+17,bottom+5);}
  ctx.globalAlpha=1;
  animation=requestAnimationFrame(draw);
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)return;clock.stop();clock.release();start.textContent='Start';start.classList.remove('running');status.textContent='Paused while the app was away. Tap Start to reconnect sound.';});
 renderTempo();renderDots();renderAccentCopy();draw();return{stop(){clock.stop();clock.release();start.textContent='Start';start.classList.remove('running');},destroy(){cancelAnimationFrame(animation);clock.release();},get running(){return clock.running;}};
}
