import {harmonicPitch} from './spectral.js';
export const DETECTOR_VERSION='harmonic-check-2-wind-range';

export function detectPitch(samples,sampleRate,diagnostic={}){
 const raw=detectYin(samples,sampleRate,diagnostic);
 diagnostic.yinHz=raw?.hz??diagnostic.candidateHz??null;
 diagnostic.yinConfidence=diagnostic.confidence;
 diagnostic.harmonicHz=null;
 diagnostic.method='yin';diagnostic.confidenceMetric='yin_periodicity';
 // Preserve precise, very periodic estimates (including bass and pure tones).
 if(raw?.confidence>=.97)return {...raw,method:'yin',confidenceMetric:'yin_periodicity'};
 if(diagnostic.reason==='below_rms_threshold'||diagnostic.reason==='clipping')return null;
 const support={},harmonic=harmonicPitch(samples,sampleRate,support,raw?.hz);
 Object.assign(diagnostic,support);
 diagnostic.harmonicHz=harmonic?.hz??null;
 if(!harmonic){diagnostic.reason=support.reason||'insufficient_harmonic_support';return null;}
 const agrees=raw&&Math.abs(1200*Math.log2(raw.hz/harmonic.hz))<35;
 const result=agrees?raw:{...harmonic,rms:diagnostic.rms};
 diagnostic.method=agrees?'yin_corroborated':'harmonic';
 diagnostic.confidenceMetric=agrees?'yin_periodicity':'spectral_peak_clarity';
 diagnostic.reason=null;diagnostic.candidateHz=result.hz;diagnostic.confidence=result.confidence;
 return {...result,method:diagnostic.method,confidenceMetric:diagnostic.confidenceMetric};
}

// YIN difference function with cumulative mean normalization and parabolic interpolation.
// No DOM, branding, target-note assumptions, or audio-device dependencies.
function detectYin(samples,sampleRate,diagnostic={}){
 let mean=0;for(const x of samples)mean+=x;mean/=samples.length;
 let energy=0,clipped=0;for(const x of samples){energy+=(x-mean)**2;if(Math.abs(x)>.98)clipped++;}
 const rms=Math.sqrt(energy/samples.length);
 Object.assign(diagnostic,{rms,clippedFraction:clipped/samples.length,confidence:null,reason:null});
 if(rms<.0007){diagnostic.reason='below_rms_threshold';return null;}
 if(clipped/samples.length>.01){diagnostic.reason='clipping';return null;}
 // Average before downsampling. ~12 kHz is ample for this instrument range.
 const stride=Math.max(1,Math.floor(sampleRate/12000)),rate=sampleRate/stride;
 const n=Math.floor(samples.length/stride),x=new Float32Array(n);
 for(let i=0;i<n;i++){for(let j=0;j<stride;j++)x[i]+=samples[i*stride+j]-mean;x[i]/=stride;}
 const maxLag=Math.min(Math.floor(rate/30),Math.floor(n/2)-1),minLag=Math.floor(rate/1000),window=n-maxLag;
 const d=new Float32Array(maxLag+1);d[0]=1;let sum=0;
 for(let lag=1;lag<=maxLag;lag++){let value=0;for(let i=0;i<window;i++)value+=(x[i]-x[i+lag])**2;sum+=value;d[lag]=sum?value*lag/sum:1;}
 // Prefer the earliest strong periodic minimum, not the first harmonic to cross
 // a loose threshold. A weak fundamental can coexist with a loud overtone.
 let lag=-1,best=1;
 for(let i=minLag+1;i<maxLag;i++)if(d[i]<=d[i-1]&&d[i]<d[i+1])best=Math.min(best,d[i]);
 const limit=Math.min(.25,best*1.35+.025);
 if(best<.25)for(let i=minLag+1;i<maxLag;i++)if(d[i]<=d[i-1]&&d[i]<d[i+1]&&d[i]<=limit){lag=i;break;}
 if(lag<0){diagnostic.confidence=1-best;diagnostic.reason='no_clear_periodicity';return null;}
 const a=d[lag-1],b=d[lag],c=d[lag+1],den=a-2*b+c;
 let period=lag+(den?(a-c)/(2*den):0),hz=rate/period;
 const halfScore=d[Math.max(minLag,Math.round(period/2))];
 diagnostic.halfPeriodScore=halfScore;
 // At the upper end of alto sax, a strong fundamental-plus-overtone pattern
 // can make YIN choose two waveform cycles as one period. The half-period is
 // only accepted when it is independently very periodic; recorded high-E
 // guitar and real sax samples remain well outside this narrow condition.
 if(hz>=300&&hz<500&&hz*2<=1000&&halfScore<.08){
  const halfLag=Math.round(period/2),ha=d[halfLag-1],hb=d[halfLag],hc=d[halfLag+1],hden=ha-2*hb+hc;
  period=halfLag+(hden?(ha-hc)/(2*hden):0);hz=rate/period;diagnostic.octaveCorrection='strong_half_period';
 }
 diagnostic.confidence=1-(diagnostic.octaveCorrection?halfScore:b);diagnostic.candidateHz=hz;
 if(!(hz>=30&&hz<=1000)){diagnostic.reason='outside_frequency_range';return null;}
 return {hz,confidence:diagnostic.confidence,rms};
}
export class PitchTracker{
 constructor(){this.reset();}
 reset(){this.values=[];this.last=0;this.hz=null;this.candidate=null;this.candidateCount=0;this.recent=[];}
 update(result,time,diagnostic={}){
  diagnostic.reason=null;
  if(!result){diagnostic.reason='no_detector_result';if(time-this.last>450)this.reset();return null;}
  if(time-this.last>450)this.reset();
  this.last=time;
  // Follow a moving peg; do not require a stationary five-frame window.
  // Confirm large jumps twice to avoid a one-frame harmonic/string switch.
  if(this.hz===null||Math.abs(1200*Math.log2(result.hz/this.hz))>150){
   if(!this.candidate||Math.abs(1200*Math.log2(result.hz/this.candidate))>55){this.candidate=result.hz;this.candidateCount=1;diagnostic.reason=this.hz===null?'confirming_initial_pitch':'confirming_large_jump';return null;}
   // Spectral recovery can briefly favor an overtone during an attack or peg
   // movement. Require a third frame for acquisition/jumps, not ongoing motion.
   const required=result.method==='harmonic'||result.confidence<.82?3:2;
   if(++this.candidateCount<required){diagnostic.reason=result.method==='harmonic'?'confirming_harmonic_pitch':'confirming_low_confidence_pitch';return null;}
   this.hz=result.hz;this.recent=[result.hz];this.candidate=null;
  }else{this.candidate=null;this.recent.push(result.hz);if(this.recent.length>3)this.recent.shift();
   const sorted=[...this.recent].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
   const delta=Math.abs(1200*Math.log2(median/this.hz)),alpha=delta>12?.65:.3;
   this.hz=2**(alpha*Math.log2(median)+(1-alpha)*Math.log2(this.hz));}
  this.values=[this.hz];return {...result,tracked:true,measuredHz:result.hz,hz:this.hz};
 }
}
