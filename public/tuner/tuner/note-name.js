// Shared display-only note spelling. Audio note IDs remain plain E2 / F#3.
export function formatNoteText(root){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];
 while(walker.nextNode())if(!walker.currentNode.parentElement.closest('.note-name,script,style,option,svg'))nodes.push(walker.currentNode);
 for(const node of nodes){const text=node.textContent,re=/\b([A-Ga-g][♯♭#b]?)(-?\d)\b/g;let match,last=0;const fragment=document.createDocumentFragment();
 while((match=re.exec(text))){fragment.append(text.slice(last,match.index));const span=document.createElement('span');span.className='note-name';span.append(match[1]);const sub=document.createElement('sub');sub.className='note-octave';sub.textContent=match[2];span.append(sub);fragment.append(span);last=re.lastIndex;}
 if(last){fragment.append(text.slice(last));node.replaceWith(fragment);}
 }
}
