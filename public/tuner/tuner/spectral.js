// Windowed spectral corroboration for noisy or overtone-dominant input.
// No tuning targets are used: notes must be supported by the recorded sound.
function fft(re,im){
 const n=re.length;
 for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let len=2;len<=n;len<<=1){const angle=-2*Math.PI/len,wr=Math.cos(angle),wi=Math.sin(angle);
  for(let i=0;i<n;i+=len){let ur=1,ui=0;for(let j=0;j<len/2;j++){const a=i+j,b=a+len/2,tr=re[b]*ur-im[b]*ui,ti=re[b]*ui+im[b]*ur;
   re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const v=ur*wr-ui*wi;ui=ur*wi+ui*wr;ur=v;}}
 }
}

function analyze(samples,rate){
 const n=samples.length;if(n<512||(n&(n-1))!==0)return {rms:0,peaks:[]};
 const re=new Float64Array(n),im=new Float64Array(n);let energy=0,clipped=0,mean=0;
 for(const x of samples){mean+=x;energy+=x*x;if(Math.abs(x)>.98)clipped++;}mean/=n;
 const rms=Math.sqrt(energy/n);if(rms<.0007||clipped/n>.01)return {rms,peaks:[]};
 for(let i=0;i<n;i++)re[i]=(samples[i]-mean)*(.5-.5*Math.cos(2*Math.PI*i/(n-1)));
 fft(re,im);const amp=Float64Array.from(re,(r,i)=>Math.hypot(r,im[i])),peaks=[];
 for(let k=2;k<n/2-2&&k*rate/n<5000;k++){
  if(amp[k]<amp[k-1]||amp[k]<=amp[k+1])continue;
  const noise=[];for(let j=Math.max(1,k-12);j<=Math.min(n/2-1,k+12);j++)if(Math.abs(j-k)>2)noise.push(amp[j]);
  noise.sort((a,b)=>a-b);const floor=noise[Math.floor(noise.length/2)];
  const snr=amp[k]/Math.max(1e-10,floor);if(snr<3)continue;
  const a=Math.log(amp[k-1]),b=Math.log(amp[k]),c=Math.log(amp[k+1]),shift=.5*(a-c)/(a-2*b+c);
  const hz=(k+shift)*rate/n;
  peaks.push({hz,amp:amp[k],snr});
 }
 return {rms,peaks:peaks.sort((a,b)=>b.amp-a.amp)};
}
export function harmonicPitch(samples,rate,detail={},expectedHz=null){
 const {peaks,rms}=analyze(samples,rate);if(!peaks.length)return null;
 const useful=peaks.filter(p=>p.amp>peaks[0].amp*.025).slice(0,35),candidates=[];
 for(const p of useful.slice(0,15))for(let divisor=1;divisor<=8;divisor++){
  const f=p.hz/divisor;if(f<30||f>1000)continue;
  const hits=[];for(const q of useful){const h=Math.round(q.hz/f);if(h<1||h>20)continue;const err=Math.abs(q.hz-h*f);if(err<Math.max(rate/samples.length*.45,q.hz*.004))hits.push({...q,h});}
  if(hits.length<2&&!(hits[0]?.h===1&&hits[0].snr>8))continue;
  let score=0,weight=0,hz=0;
  for(const q of hits){const w=Math.sqrt(q.amp)/q.h**.15*Math.min(1,Math.max(0,(q.snr-3)/8));score+=w;weight+=w;hz+=q.hz/q.h*w;}
  // A false octave-down candidate fits only harmonics 2,4,6,...; a false
  // third-down candidate fits 3,6,9,... . Require independent harmonic evidence.
  const strong=hits.filter(q=>q.snr>=8);const gcd=(a,b)=>b?gcd(b,a%b):a;if(strong.length<2||strong.reduce((g,q)=>gcd(g,q.h),0)!==1)continue;
  // Recovery without a YIN estimate needs a richer pattern than corroboration.
  if(!hits.some(q=>q.h<=3)||(hits.length<4&&!(hits.length>=2&&expectedHz&&Math.abs(1200*Math.log2(f/expectedHz))<35)))continue;
  candidates.push({hz:hz/weight,score,hits});
 }
 candidates.sort((a,b)=>b.score-a.score);const best=candidates[0];
 detail.harmonicCandidates=[];
 for(const c of candidates){if(detail.harmonicCandidates.every(p=>Math.abs(1200*Math.log2(p.hz/c.hz))>60))detail.harmonicCandidates.push({hz:c.hz,score:c.score});if(detail.harmonicCandidates.length===4)break;}
 detail.harmonicCount=best?.hits.length??0;
 // Competing fundamentals (including overlapping strings) should leave a gap,
 // not send Auto mode and the confirmation tone to a different string.
 const runner=candidates.find(c=>Math.abs(1200*Math.log2(c.hz/best.hz))>60);
 if(best&&runner&&best.score<runner.score*1.35){detail.reason='ambiguous_harmonic_candidates';return null;}
 if(best&&(best.hz<30||best.hz>1000))return null;
 if(!best){detail.reason='insufficient_harmonic_support';return null;}
 // Local spectral peak/noise separation, not a probability or YIN periodicity.
 const confidence=best.hits.reduce((sum,q)=>{const w=Math.sqrt(q.amp)/q.h**.15*Math.min(1,Math.max(0,(q.snr-3)/8));return sum+w*(1-1/q.snr);},0)/best.score;
 return {hz:best.hz,confidence,rms};
}



