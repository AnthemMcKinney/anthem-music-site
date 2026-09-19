import {centsBetween,nearestNote} from './tunings.js';
// Presentation timing only: never changes the detector's estimate.
export class DisplayPitch{
 constructor(){this.reset();}
 reset(){this.hz=null;this.last=-Infinity;this.pending=null;this.note=null;this.pendingNote=null;}
 update(result,time){
  if(!result){if(this.pending&&time-this.pending.seen>250)this.pending=null;if(this.pendingNote&&time-this.last>250)this.pendingNote=null;return null;}
  const jump=this.hz!==null&&Math.abs(centsBetween(result.hz,this.hz))>70;
  if(jump&&!result.tracked){
   if(!this.pending||time-this.pending.seen>250||Math.abs(centsBetween(result.hz,this.pending.hz))>35){this.pending={hz:result.hz,since:time,seen:time,count:1};return null;}
   this.pending.seen=time;this.pending.count++;
   if(this.pending.count<(result.confidence>=.85?2:3))return null;
  }
  this.pending=null;this.hz=result.hz;this.last=time;
  const next=nearestNote(result.hz);
  if(result.tracked||this.note===null||jump){this.note=next;this.pendingNote=null;}
  else if(next===this.note)this.pendingNote=null;
  else if(!this.pendingNote||this.pendingNote.note!==next)this.pendingNote={note:next,since:time};
  else if(time-this.pendingNote.since>=350){this.note=next;this.pendingNote=null;}
  return {...result,displayNote:this.note,confirmedChange:jump};
 }
}
