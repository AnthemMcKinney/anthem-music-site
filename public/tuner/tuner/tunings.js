export const instruments=[
 {id:'guitar',name:'Guitar',tunings:[['Standard','E2 A2 D3 G3 B3 E4'],['Drop D','D2 A2 D3 G3 B3 E4'],['Half-step down','Eb2 Ab2 Db3 Gb3 Bb3 Eb4'],['Whole-step down','D2 G2 C3 F3 A3 D4'],['Open G','D2 G2 D3 G3 B3 D4'],['Open D','D2 A2 D3 F#3 A3 D4'],['DADGAD','D2 A2 D3 G3 A3 D4']]},
 {id:'ukulele',name:'Ukulele',tunings:[['High G standard','G4 C4 E4 A4'],['Low G standard','G3 C4 E4 A4'],['Baritone','D3 G3 B3 E4']]},
 {id:'bass',name:'Bass',tunings:[['4-string standard','E1 A1 D2 G2']]},
 {id:'violin',name:'Violin',tunings:[['Standard','G3 D4 A4 E5']]},
 {id:'banjo',name:'Banjo',tunings:[['Open G','G4 D3 G3 B3 D4'],['Double C','G4 C3 G3 C4 D4'],['G modal / Sawmill','G4 D3 G3 C4 D4']]},
 {id:'alto-sax',name:'Alto Sax',mode:'chromatic',transpose:9,tunings:[['E♭ alto · written notes','Db3 D3 Eb3 E3 F3 Gb3 G3 Ab3 A3 Bb3 B3 C4 Db4 D4 Eb4 E4 F4 Gb4 G4 Ab4 A4 Bb4 B4 C5 Db5 D5 Eb5 E5 F5 Gb5 G5 Ab5 A5']]}];
const semitones={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
export function frequency(note){const [,name,oct]=note.match(/^([A-G][#b]?)(\d)$/);return 440*2**(((Number(oct)+1)*12+semitones[name]-69)/12);}
export const centsBetween=(a,b)=>1200*Math.log2(a/b);
export function nearestNote(hz){const midi=Math.round(69+12*Math.log2(hz/440));return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][((midi%12)+12)%12]+(Math.floor(midi/12)-1);}
export function transposeNote(note,amount){
 const [,name,oct]=note.replace('♭','b').replace('♯','#').match(/^([A-G][#b]?)(\d)$/);
 const midi=(Number(oct)+1)*12+semitones[name]+amount;
 if(amount===9){
  const alto={C:'A','C#':'Bb',Db:'Bb',D:'B','D#':'C',Eb:'C',E:'C#',F:'D','F#':'Eb',Gb:'Eb',G:'E','G#':'F',Ab:'F',A:'F#','A#':'G',Bb:'G',B:'G#'};
  return alto[name]+(Math.floor(midi/12)-1);
 }
 return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][((midi%12)+12)%12]+(Math.floor(midi/12)-1);
}
