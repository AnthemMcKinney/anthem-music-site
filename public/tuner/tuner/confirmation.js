// Counts accepted pitch readings, not raw microphone frames or separate plucks.
// Green is the graph's five-cent lane; `zero` also requires a stable reading.
export class GreenReadingConfirmation {
 constructor(onChange){this.onChange=onChange;this.reset();}
 reset(){this.count=0;this.ready=false;this.onChange?.(0);}
 accept(reading){
  // Missing/unreliable input is not evidence that the pitch moved.
  if(!reading||!Number.isFinite(reading.average))return this.ready;
  if(Math.abs(reading.average)>5){this.reset();return false;}
  if(this.ready)return true;
  if(reading.zero){this.count=Math.min(3,this.count+1);this.ready=this.count===3;this.onChange?.(this.count);}
  else {this.count=0;this.onChange?.(0);}
  return this.ready;
 }
}
