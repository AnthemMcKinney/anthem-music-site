const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const tempoName=bpm=>bpm<60?'Largo':bpm<76?'Adagio':bpm<108?'Andante':bpm<120?'Moderato':bpm<156?'Allegro':bpm<176?'Vivace':'Presto';

class Clock{
 constructor(onPulse){Object.assign(this,{onPulse,bpm:100,beats:4,subdivision:1,sound:'click',accent:true,step:0,running:false,visualTimers:new Set(),nativeSounds:new Map()});}
 nativeSound(){let audio=this.nativeSounds.get(this.sound);if(!audio){audio=new Audio(new URL(`../samples/metronome-${this.sound}.wav`,import.meta.url));audio.preload='auto';audio.playsInline=true;this.nativeSounds.set(this.sound,audio);}return audio;}
 context(){if(this.ctx)return this.ctx;const AudioContext=window.AudioContext||window.webkitAudioContext;this.ctx=new AudioContext({latencyHint:'interactive'});this.master=this.ctx.createGain();this.master.gain.value=.96;this.compressor=this.ctx.createDynamicsCompressor();this.compressor.threshold.value=-16;this.compressor.ratio.value=10;this.compressor.attack.value=.001;this.compressor.release.value=.09;this.master.connect(this.compressor).connect(this.ctx.destination);return this.ctx;}
 prepareDrums(){if(this.drumBuffers)return Promise.resolve(this.drumBuffers);if(!this.drumPromise){const ctx=this.context(),files={kick:'kick.wav',snare:'snare.wav',hat:'closed-hat.wav'};this.drumPromise=Promise.all(Object.entries(files).map(async([name,file])=>{const response=await fetch(new URL(`../samples/drums/${file}`,import.meta.url));if(!response.ok)throw Error('Drum sample unavailable');return[name,await ctx.decodeAudioData(await response.arrayBuffer())];})).then(entries=>this.drumBuffers=Object.fromEntries(entries)).catch(error=>{this.drumPromise=null;throw error;});}return this.drumPromise;}
 unlock(){
  const ctx=this.context();
  if(ctx.state==='running')return Promise.resolve(ctx);
  if(this.unlocking)return this.unlocking;
  // iOS requires resume() and a real source start to happen synchronously
  // inside the original touch. Keep this path entirely in Web Audio so a
  // native sample cannot steal the output route or make an audible transient.
  const resume=ctx.resume();
  const oscillator=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
  oscillator.frequency.value=880;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.00001,now+.025);oscillator.connect(gain).connect(ctx.destination);oscillator.start(now);oscillator.stop(now+.03);
  this.unlocking=Promise.resolve(resume).then(()=>{if(ctx.state!=='running')throw Error('Audio remains paused');return ctx;}).finally(()=>{this.unlocking=null;});
  return this.unlocking;
 }
 click(at,accent,sub){
  if(this.sound==='drums'){this.drum(at,sub,this.scheduledBeat||0);return;}
  const ctx=this.context(),gain=ctx.createGain(),osc=ctx.createOscillator(),snap=ctx.createOscillator(),level=sub?.35:accent?.92:.68;
  if(this.sound==='wood'){osc.type='triangle';osc.frequency.value=accent?1280:920;snap.frequency.value=accent?390:310;}else if(this.sound==='beep'){osc.type='sine';osc.frequency.value=accent?1320:880;snap.frequency.value=accent?660:440;}else{osc.type='square';osc.frequency.value=accent?1760:1180;snap.frequency.value=accent?880:590;}
  const duration=this.sound==='beep'?.095:this.sound==='wood'?.045:.055;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(level,at+.002);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain);snap.connect(gain);gain.connect(this.master);osc.start(at);snap.start(at);osc.stop(at+duration+.02);snap.stop(at+duration+.02);
 }
 sampleDrum(at,buffer,level,duration){const ctx=this.context(),source=ctx.createBufferSource(),gain=ctx.createGain(),end=at+Math.min(duration,buffer.duration);source.buffer=buffer;gain.gain.setValueAtTime(level,at);gain.gain.setValueAtTime(level,Math.max(at,end-.035));gain.gain.linearRampToValueAtTime(0,end);source.connect(gain).connect(this.master);source.start(at);source.stop(end+.005);}
 drum(at,sub,beat){
  if(this.drumBuffers){this.sampleDrum(at,this.drumBuffers.hat,sub?.22:.34,sub?.07:.095);if(!sub){if(beat===0)this.sampleDrum(at,this.drumBuffers.kick,this.accent?.95:.82,.34);else if(this.beats===4&&beat===2)this.sampleDrum(at,this.drumBuffers.kick,.74,.32);else this.sampleDrum(at,this.drumBuffers.snare,.78,.28);}return;}
  const ctx=this.context(),hatGain=ctx.createGain(),hat=ctx.createOscillator();hat.type='square';hat.frequency.value=sub?7200:6100;hatGain.gain.setValueAtTime(sub?.08:.16,at);hatGain.gain.exponentialRampToValueAtTime(.0001,at+(sub?.025:.045));hat.connect(hatGain).connect(this.master);hat.start(at);hat.stop(at+.055);
  if(sub)return;
  if(beat===0||(this.beats===4&&beat===2)){const kick=ctx.createOscillator(),gain=ctx.createGain();kick.type='sine';kick.frequency.setValueAtTime(155,at);kick.frequency.exponentialRampToValueAtTime(48,at+.14);gain.gain.setValueAtTime(beat===0?(this.accent?.95:.82):.74,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.18);kick.connect(gain).connect(this.master);kick.start(at);kick.stop(at+.2);}
  else{const noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.12),ctx.sampleRate),data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noise;filter.type='bandpass';filter.frequency.value=1850;filter.Q.value=.75;gain.gain.setValueAtTime(.55,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.11);source.connect(filter).connect(gain).connect(this.master);source.start(at);source.stop(at+.12);}
 }
 schedule(){if(!this.running)return;const ctx=this.context(),total=this.beats*this.subdivision;while(this.nextAt<ctx.currentTime+.12){const step=this.step,beat=Math.floor(step/this.subdivision),sub=step%this.subdivision,isBeat=sub===0,isAccent=isBeat&&this.accent&&(this.subdivision>1||beat===0),delay=Math.max(0,(this.nextAt-ctx.currentTime)*1000);this.scheduledBeat=beat;this.click(this.nextAt,isAccent,!isBeat);const timer=setTimeout(()=>{this.visualTimers.delete(timer);if(this.running)this.onPulse(beat,sub);},delay);this.visualTimers.add(timer);this.nextAt+=60/this.bpm/this.subdivision;this.step=(this.step+1)%total;}this.timer=setTimeout(()=>this.schedule(),25);}
 async start(){await this.unlock();if(this.sound==='drums')await this.prepareDrums();this.stop(false);this.running=true;this.step=0;this.nextAt=this.context().currentTime+.045;this.startedAt=performance.now()+45;this.schedule();}
 stop(reset=true){this.running=false;clearTimeout(this.timer);for(const timer of this.visualTimers)clearTimeout(timer);this.visualTimers.clear();if(reset){this.step=0;this.onPulse(-1,0);}}
 release(){const ctx=this.ctx;this.ctx=null;this.master=null;this.compressor=null;this.unlocking=null;if(ctx&&ctx.state!=='closed')void ctx.close().catch(()=>{});for(const audio of this.nativeSounds.values())audio.pause();}
 resetSchedule(){this.step=0;if(this.running){this.nextAt=this.context().currentTime+.04;this.startedAt=performance.now()+40;}}
 setTempo(value){this.bpm=clamp(Math.round(value),40,240);this.resetSchedule();}setMeter(value){this.beats=value;this.resetSchedule();}setSubdivision(value){this.subdivision=value;this.resetSchedule();}
 phase(){if(!this.running||!this.startedAt)return 0;return((performance.now()-this.startedAt)/(60000/this.bpm)%1+1)%1;}
}

export function initMetronome({enableSound}={}){
 const $=id=>document.getElementById(id),tempo=$('tempo-value'),name=$('tempo-name'),slider=$('tempo-slider'),dots=$('beat-dots'),start=$('metronome-start'),soundCheck=$('metronome-sound-check'),status=$('metronome-status'),canvas=$('pulse-canvas'),options=$('metronome-options'),settings=$('metronome-settings');let bpm=100,beats=4,unit=4,subdivision=1,taps=[],animation=0,currentBeat=0;
 const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)||new URLSearchParams(location.search).has('iosAudioTest');let iosPrimed=!isiOS;
 const clock=new Clock((beat,sub)=>{if(beat>=0)currentBeat=beat;[...dots.children].forEach((dot,index)=>dot.classList.toggle('current',index===beat));if(beat>=0){const syllables=subdivision===2?['and']:subdivision===3?['trip','let']:['e','and','a'];status.textContent=sub?`Beat ${beat+1} · ${syllables[sub-1]}`:`Beat ${beat+1}`;dots.setAttribute('aria-label',`Beat ${beat+1} of ${beats}`);}else{currentBeat=0;status.textContent='Ready';dots.setAttribute('aria-label',`${beats}/${unit} · ${subdivision} note${subdivision>1?'s':''} per beat`);}});
 function renderTempo(){tempo.textContent=bpm;name.textContent=tempoName(bpm);slider.value=bpm;clock.setTempo(bpm);document.querySelectorAll('[data-tempo]').forEach(button=>button.setAttribute('aria-pressed',Number(button.dataset.tempo)===bpm));}function groupStart(i){if(unit!==8)return false;if([6,9,12].includes(beats))return i>0&&i%3===0;if(beats===7)return i===2||i===4;return false;}
 function renderDots(){dots.replaceChildren(...Array.from({length:beats},(_,i)=>{const dot=document.createElement('span');dot.className='beat-dot';dot.textContent=i+1;if(groupStart(i))dot.classList.add('group-start');return dot;}));clock.setMeter(beats);clock.onPulse(-1,0);}function adjust(n){bpm=clamp(bpm+n,40,240);renderTempo();}
 function hold(button,n){let timeout,repeat;const stop=()=>{clearTimeout(timeout);clearInterval(repeat);};button.addEventListener('pointerdown',()=>{if(!isiOS)void clock.unlock();adjust(n);timeout=setTimeout(()=>repeat=setInterval(()=>adjust(n),85),420);});for(const event of ['pointerup','pointercancel','pointerleave'])button.addEventListener(event,stop);}function toggleOptions(open){options.hidden=!open;settings.setAttribute('aria-expanded',open);settings.classList.toggle('open',open);if(open)options.scrollIntoView({block:'nearest'});}
 hold($('tempo-down'),-1);hold($('tempo-up'),1);slider.addEventListener('pointerdown',()=>{if(!isiOS)void clock.unlock();});slider.addEventListener('input',()=>{bpm=Number(slider.value);renderTempo();});
 $('tap-tempo').addEventListener('pointerdown',()=>{if(!isiOS)void clock.unlock();});$('tap-tempo').addEventListener('click',()=>{const now=performance.now();if(taps.length&&now-taps.at(-1)>2000)taps=[];taps.push(now);taps=taps.slice(-5);if(taps.length>=2){const intervals=taps.slice(1).map((v,i)=>v-taps[i]);bpm=clamp(Math.round(60000/(intervals.reduce((sum,v)=>sum+v,0)/intervals.length)),40,240);renderTempo();}status.textContent=taps.length<2?'Tap again':`${bpm} BPM`;});document.querySelectorAll('[data-tempo]').forEach(button=>button.addEventListener('click',()=>{bpm=Number(button.dataset.tempo);renderTempo();status.textContent=`${button.querySelector('strong').textContent} · ${bpm} BPM`;}));
 function renderAccentCopy(){const divided=subdivision>1;$('accent-title').textContent=divided?'Accent each beat':'Accent beat one';$('accent-help').textContent=divided?'Emphasize every numbered beat over the notes between.':'Make the start of every measure unmistakable.';}
 document.querySelectorAll('[data-meter]').forEach(button=>button.addEventListener('click',()=>{beats=Number(button.dataset.meter);unit=Number(button.dataset.unit);document.querySelectorAll('[data-meter]').forEach(item=>item.setAttribute('aria-pressed',item===button));renderDots();}));document.querySelectorAll('[data-subdivision]').forEach(button=>button.addEventListener('click',()=>{subdivision=Number(button.dataset.subdivision);clock.setSubdivision(subdivision);document.querySelectorAll('[data-subdivision]').forEach(item=>item.setAttribute('aria-pressed',item===button));renderAccentCopy();clock.onPulse(-1,0);}));
 document.querySelectorAll('[data-sound]').forEach(button=>button.addEventListener('click',async()=>{clock.sound=button.dataset.sound;document.querySelectorAll('[data-sound]').forEach(item=>item.setAttribute('aria-pressed',item===button));try{if(clock.sound==='drums'){await clock.prepareDrums();if(isiOS){status.textContent=iosPrimed?'Drums selected. Tap Start.':'Drums selected. Tap Sound Check first.';return;}await clock.unlock();clock.click(clock.context().currentTime+.01,true,false);return;}if(isiOS){const audio=clock.nativeSound();audio.pause();audio.currentTime=0;await audio.play();}else{await clock.unlock();clock.click(clock.context().currentTime+.01,true,false);}}catch{status.textContent=clock.sound==='drums'?'Drum samples could not load.':'Tap the sound choice again to preview it.';}}));$('accent-one').addEventListener('change',event=>clock.accent=event.target.checked);settings.addEventListener('click',()=>toggleOptions(options.hidden));$('metronome-options-close').addEventListener('click',()=>toggleOptions(false));
 soundCheck.addEventListener('click',async()=>{try{if(!enableSound)throw Error('Sound check unavailable');await enableSound();iosPrimed=true;soundCheck.classList.add('ready');status.textContent='Sound ready. Tap Start.';}catch{iosPrimed=false;soundCheck.classList.remove('ready');status.textContent='Sound was blocked. Tap Sound Check again.';}});
 start.addEventListener('pointerdown',()=>{if(!isiOS&&!clock.running)void clock.unlock();});start.addEventListener('click',async()=>{if(clock.running){clock.stop();start.textContent='Start';start.classList.remove('running');return;}if(isiOS&&!iosPrimed){status.textContent='Tap Sound Check first.';return;}try{await clock.start();start.textContent='Stop';start.classList.add('running');}catch{clock.release();if(isiOS){iosPrimed=false;soundCheck.classList.remove('ready');status.textContent='Tap Sound Check, then tap Start.';}else status.textContent='Tap Start again to allow sound.';}});
 function draw(){
  const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2),width=Math.max(1,rect.width),height=Math.max(1,rect.height);
  if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
  const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
  const palette=getComputedStyle(document.documentElement),accent=palette.getPropertyValue('--theme-accent').trim()||'#e85d1a',muted=palette.getPropertyValue('--theme-muted').trim()||'#8198ab',border=palette.getPropertyValue('--theme-border').trim()||'#8fa9bd',surface=palette.getPropertyValue('--theme-surface').trim()||'#f4eee2';
  ctx.strokeStyle=border;ctx.lineWidth=1;ctx.globalAlpha=.65;
  for(let row=1;row<4;row++){const y=height*row/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  ctx.globalAlpha=1;
  const phase=clock.phase(),beatWidth=Math.max(70,width/Math.min(beats,4)),playX=width*.22;
  for(let i=-2;i<Math.ceil((width-playX)/beatWidth)+2;i++){
   const x=playX+(i-phase)*beatWidth,beatFade=x>=playX?1:clamp((x-(playX-beatWidth*.24))/(beatWidth*.24),0,1),beatApproach=x>=playX?1-clamp((x-playX)/(beatWidth*.3),0,1):beatFade;
   ctx.strokeStyle=muted;ctx.lineWidth=2+2.05*beatApproach;ctx.setLineDash([]);ctx.globalAlpha=x>=playX?.74+.26*beatApproach:beatFade;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();
   const andX=x+beatWidth/2,andFade=andX>=playX?1:clamp((andX-(playX-beatWidth*.45))/(beatWidth*.45),0,1);ctx.save();ctx.strokeStyle=border;ctx.lineWidth=1;ctx.globalAlpha=.76*andFade;ctx.setLineDash([1.5,2]);ctx.beginPath();ctx.moveTo(andX,0);ctx.lineTo(andX,height);ctx.stroke();ctx.restore();
   for(let sub=1;sub<subdivision;sub++){
    if(subdivision%2===0&&sub===subdivision/2)continue;
    const sx=x+beatWidth*sub/subdivision;ctx.strokeStyle=muted;ctx.lineWidth=1;ctx.globalAlpha=.28;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(sx,0);ctx.lineTo(sx,height);ctx.stroke();
   }
  }
  ctx.globalAlpha=1;ctx.setLineDash([]);
  const bottom=height-18,top=22,y=bottom-Math.sin(Math.PI*phase)*(bottom-top);
  ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(playX,0);ctx.lineTo(playX,height);ctx.stroke();ctx.fillStyle=accent;ctx.beginPath();ctx.arc(playX,y,10,0,Math.PI*2);ctx.fill();
   const beatAlpha=phase<.32?1:phase<.44?1-(phase-.32)/.12:0;
   const visualSubdivision=subdivision===1?2:subdivision,subdivisionWords=subdivision===3?['and','a']:subdivision===4?['e','and','a']:['and'];
   let subdivisionWord='',subdivisionAlpha=0;
   for(let sub=1;sub<visualSubdivision;sub++){
    const start=sub/visualSubdivision,age=phase-start;
    if(age>=0&&age<.24){subdivisionWord=subdivisionWords[sub-1]||'and';subdivisionAlpha=age<.14?1:1-(age-.14)/.1;break;}
   }
   ctx.fillStyle=surface;ctx.textAlign='left';
   if(clock.running&&subdivisionAlpha>0){ctx.globalAlpha=subdivisionAlpha;ctx.font='italic 650 13px Inter, sans-serif';ctx.fillText(subdivisionWord,playX+17,top+5);}
   if(clock.running&&beatAlpha>0){const firstBeat=clock.accent&&currentBeat===0,textX=playX+17,textY=bottom+5;ctx.globalAlpha=beatAlpha;ctx.fillStyle=firstBeat?accent:surface;ctx.font=clock.accent?`900 ${firstBeat?46:40}px Inter, sans-serif`:'900 22px Inter, sans-serif';if(firstBeat){const glow=ctx.createRadialGradient(textX+13,textY-16,1,textX+13,textY-16,32);glow.addColorStop(0,accent+'70');glow.addColorStop(1,accent+'00');ctx.save();ctx.globalAlpha=beatAlpha*.9;ctx.fillStyle=glow;ctx.fillRect(textX-20,textY-50,68,68);ctx.restore();ctx.shadowColor=accent;ctx.shadowBlur=15;}ctx.fillText(clock.accent?String(currentBeat+1):'Beat',textX,textY);ctx.shadowBlur=0;}
  ctx.globalAlpha=1;
  animation=requestAnimationFrame(draw);
 }
 function resetAfterSuspend(){clock.stop();clock.release();start.textContent='Start';start.classList.remove('running');if(isiOS){iosPrimed=false;soundCheck.classList.remove('ready');status.textContent='Audio paused while the app was away. Tap Sound Check.';}else status.textContent='Paused while the app was away. Tap Start to reconnect sound.';}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)resetAfterSuspend();});
 renderTempo();renderDots();renderAccentCopy();soundCheck.hidden=!isiOS;soundCheck.parentElement.classList.toggle('has-sound-check',isiOS);if(isiOS)status.textContent='Tap Sound Check once, then tap Start.';draw();return{stop(){resetAfterSuspend();},destroy(){cancelAnimationFrame(animation);clock.release();},get running(){return clock.running;}};
}
