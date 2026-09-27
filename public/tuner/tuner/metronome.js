const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const tempoName=bpm=>bpm<60?'Largo':bpm<76?'Adagio':bpm<108?'Andante':bpm<120?'Moderato':bpm<156?'Allegro':bpm<176?'Vivace':'Presto';

class MetronomeClock{
 constructor(onBeat){this.onBeat=onBeat;this.bpm=100;this.beats=4;this.beat=0;this.running=false;this.nextAt=0;this.timer=0;this.visualTimers=new Set();}
 context(){
  if(this.ctx)return this.ctx;
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  this.ctx=new AudioContext({latencyHint:'interactive'});
  this.master=this.ctx.createGain();this.master.gain.value=.92;
  this.compressor=this.ctx.createDynamicsCompressor();
  this.compressor.threshold.value=-12;this.compressor.knee.value=8;this.compressor.ratio.value=8;this.compressor.attack.value=.001;this.compressor.release.value=.08;
  this.master.connect(this.compressor).connect(this.ctx.destination);return this.ctx;
 }
 click(at,accent){
  const ctx=this.context(),gain=ctx.createGain(),osc=ctx.createOscillator(),snap=ctx.createOscillator();
  osc.type='square';osc.frequency.setValueAtTime(accent?1760:1180,at);
  snap.type='sine';snap.frequency.setValueAtTime(accent?880:590,at);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(accent?.9:.62,at+.002);gain.gain.exponentialRampToValueAtTime(.0001,at+(accent?.075:.055));
  osc.connect(gain);snap.connect(gain);gain.connect(this.master);osc.start(at);snap.start(at);osc.stop(at+.085);snap.stop(at+.085);
 }
 schedule(){
  if(!this.running)return;const ctx=this.context(),lookAhead=.12;
  while(this.nextAt<ctx.currentTime+lookAhead){
   const beat=this.beat,accent=beat===0,delay=Math.max(0,(this.nextAt-ctx.currentTime)*1000);
   this.click(this.nextAt,accent);
   const timer=setTimeout(()=>{this.visualTimers.delete(timer);if(this.running)this.onBeat(beat,accent);},delay);this.visualTimers.add(timer);
   this.nextAt+=60/this.bpm;this.beat=(this.beat+1)%this.beats;
  }
  this.timer=setTimeout(()=>this.schedule(),25);
 }
 async start(){const ctx=this.context();if(ctx.state!=='running')await ctx.resume();this.stop(false);this.running=true;this.beat=0;this.nextAt=ctx.currentTime+.06;this.schedule();}
 stop(reset=true){this.running=false;clearTimeout(this.timer);for(const timer of this.visualTimers)clearTimeout(timer);this.visualTimers.clear();if(reset){this.beat=0;this.onBeat(-1,false);}}
 setTempo(bpm){this.bpm=clamp(Math.round(bpm),40,240);if(this.running){this.nextAt=this.context().currentTime+.04;this.beat=0;}}
 setMeter(beats){this.beats=beats;this.beat=0;if(this.running)this.nextAt=this.context().currentTime+.04;}
}

export function initMetronome(){
 const $=id=>document.getElementById(id),tempo=$('tempo-value'),name=$('tempo-name'),slider=$('tempo-slider'),dots=$('beat-dots'),start=$('metronome-start'),status=$('metronome-status');
 let bpm=100,beats=4,taps=[];
 const clock=new MetronomeClock((beat,accent)=>{
  [...dots.children].forEach((dot,index)=>dot.classList.toggle('current',index===beat));
  if(beat>=0){status.textContent=accent?'Beat 1':`Beat ${beat+1}`;dots.setAttribute('aria-label',`Beat ${beat+1} of ${beats}`);}else{status.textContent='Ready';dots.setAttribute('aria-label',`${beats} beats per measure`);}
 });
 function renderTempo(){tempo.textContent=bpm;name.textContent=tempoName(bpm);slider.value=bpm;clock.setTempo(bpm);}
 function renderDots(){dots.replaceChildren(...Array.from({length:beats},(_,index)=>{const dot=document.createElement('span');dot.className='beat-dot';if(beats===6&&index===3)dot.classList.add('group-start');return dot;}));clock.setMeter(beats);clock.onBeat(-1,false);}
 function adjust(amount){bpm=clamp(bpm+amount,40,240);renderTempo();}
 function hold(button,amount){let timeout,repeat;const stopHold=()=>{clearTimeout(timeout);clearInterval(repeat);};button.addEventListener('pointerdown',()=>{adjust(amount);timeout=setTimeout(()=>{repeat=setInterval(()=>adjust(amount),85);},420);});for(const event of ['pointerup','pointercancel','pointerleave'])button.addEventListener(event,stopHold);}
 hold($('tempo-down'),-1);hold($('tempo-up'),1);
 slider.addEventListener('input',()=>{bpm=Number(slider.value);renderTempo();});
 $('tap-tempo').addEventListener('click',()=>{const now=performance.now();if(taps.length&&now-taps.at(-1)>2000)taps=[];taps.push(now);taps=taps.slice(-5);if(taps.length>=2){const intervals=taps.slice(1).map((value,index)=>value-taps[index]);const average=intervals.reduce((sum,value)=>sum+value,0)/intervals.length;bpm=clamp(Math.round(60000/average),40,240);renderTempo();}status.textContent=taps.length<2?'Tap again':`${bpm} BPM`;});
 document.querySelectorAll('[data-meter]').forEach(button=>button.addEventListener('click',()=>{beats=Number(button.dataset.meter);document.querySelectorAll('[data-meter]').forEach(item=>item.setAttribute('aria-pressed',item===button));renderDots();}));
 start.addEventListener('click',async()=>{if(clock.running){clock.stop();start.textContent='Start';start.classList.remove('running');return;}await clock.start();start.textContent='Stop';start.classList.add('running');});
 renderTempo();renderDots();
 return {stop(){if(clock.running){clock.stop();start.textContent='Start';start.classList.remove('running');}},get running(){return clock.running;}};
}
