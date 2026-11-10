// A scoped lesson keeps the prototype's generic selectors away from the tuner and chords.
import {initScales} from '../scales-lab/scales.js?v=web-scales-1';
export function initScalesView(){
 const view=document.createElement('section');view.id='scales-view';view.className='scales-view';view.hidden=true;view.setAttribute('aria-label','Guitar scales');
 document.querySelector('main').append(view);
 const shadow=view.attachShadow({mode:'open'});let lesson=null,loading=null;
 function stopPlayback(){lesson?.stopPlayback();}
 async function load(){
  if(lesson)return;if(loading)return loading;
  shadow.innerHTML='<p role="status">Loading Scales…</p>';
  loading=(async()=>{
   const response=await fetch(new URL('../scales-lab/index.html',import.meta.url));if(!response.ok)throw Error('Scales could not load.');
   const source=new DOMParser().parseFromString(await response.text(),'text/html'),main=source.querySelector('main');if(!main)throw Error('Scales could not load.');
   const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('../scales-lab/scales.css?v=web-scales-1',import.meta.url).href;
   const content=document.createElement('div');content.className='scales-content';content.append(...main.childNodes);shadow.replaceChildren(style,content);
   lesson=initScales(shadow,{canPlay:()=>!view.hidden&&!document.hidden});
  })().catch(()=>{
   shadow.innerHTML='<p role="alert">Scales could not load. Check your connection and try again.</p><button type="button">Try again</button>';
   shadow.querySelector('button').addEventListener('click',load);
  }).finally(()=>{loading=null;});return loading;
 }
 return {show(active){view.hidden=!active;if(active)void load();else stopPlayback();},stopPlayback};
}
