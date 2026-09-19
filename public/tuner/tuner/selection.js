import {frequency,centsBetween} from './tunings.js';
// Absolute pitches distinguish low and high E and re-entrant ukulele/banjo strings.
export class StringSelector{
 reset(){this.pending=-1;this.count=0;}
 constructor(){this.reset();}
 update(hz,notes,current,confirmedChange=false,options={}){
  const margin=options.margin??35,dwell=options.dwell??2;
  const distances=notes.map(note=>Math.abs(centsBetween(hz,frequency(note))));
  const next=distances.indexOf(Math.min(...distances));
  if(next===current||distances[current]-distances[next]<margin){this.reset();return current;}
  // The display gate already confirmed a large pitch change: switch the target
  // atomically so its first visible sample is not drawn against the old string.
  if(confirmedChange){this.reset();return next;}
  if(this.pending===next)this.count++;else{this.pending=next;this.count=1;}
  if(this.count<dwell)return current;
  this.reset();return next;
 }
}
