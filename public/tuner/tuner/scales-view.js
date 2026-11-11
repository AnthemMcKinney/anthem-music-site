// The lesson stays isolated from the host app and loads only after selection.
export function initScalesView(view){
 let shadow=null,lesson=null,loading=null;
 function stopPlayback(){lesson?.stopPlayback();}
 function showError(){
  const root=shadow||view;
  root.innerHTML='<p role="alert">Scales could not load. Check your connection and try again.</p><button type="button">Try again</button>';
  root.querySelector('button').addEventListener('click',load);
 }
 async function load(){
  if(lesson)return;if(loading)return loading;
  loading=(async()=>{
   if(!shadow){view.replaceChildren();shadow=view.attachShadow({mode:'open'});}
   shadow.innerHTML='<p role="status">Loading Scales.</p>';
   const [module,response]=await Promise.all([import('../scales-lab/scales.js?v=scales-mix-review-1'),fetch(new URL('../scales-lab/index.html',import.meta.url))]);
   if(!response.ok)throw Error('Scales could not load.');
   const source=new DOMParser().parseFromString(await response.text(),'text/html'),main=source.querySelector('main');if(!main)throw Error('Scales could not load.');
   const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('../scales-lab/scales.css?v=web-playback-158',import.meta.url).href;
   const styled=new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=()=>reject(Error('Scales styles could not load.'));});
   shadow.prepend(style);await styled;
   const content=document.createElement('div');content.className='scales-content';content.append(...main.childNodes);shadow.replaceChildren(style,content);
   lesson=module.initScales(shadow,{canPlay:()=>!view.hidden&&!document.hidden});
  })().catch(showError).finally(()=>{loading=null;});return loading;
 }
 return {show(active){view.hidden=!active;if(active)void load();else stopPlayback();},stopPlayback};
}
