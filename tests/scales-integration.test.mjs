import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const file=name=>readFileSync(new URL('../public/tuner/'+name,import.meta.url),'utf8');
const scaleSource=file('scales-lab/scales.js');
function element(){
 const attrs=new Map(),events=new Map(),children=new Map();
 return {attrs,events,dataset:{},value:'',textContent:'',innerHTML:'',hidden:false,checked:false,
  classList:{toggle(){},add(){},remove(){}},setAttribute(k,v){attrs.set(k,v);},getAttribute(k){return attrs.get(k);},
  addEventListener(k,fn){events.set(k,fn);},removeEventListener(k){events.delete(k);},
  querySelector(k){if(!children.has(k))children.set(k,element());return children.get(k);},closest(){return null;}};
}
function scalesHarness(){
 const elements=new Map(),events=new Map(),windowEvents=new Map(),calls=[];let resolveUnlock,allowed=true;
 const get=selector=>{if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);};
 get('#backing-progression').value='am-c';get('#backing-bars').value='2';get('#tempo').value='75';get('#backing-volume').value='70';get('#demo-note-value').value='quarter';
 const collapse=get('[data-collapse-target]');collapse.dataset.collapseTarget='tab-content';collapse.setAttribute('aria-expanded','true');
 const scope={querySelector:get,querySelectorAll(selector){return selector==='.pattern-play'?[get('.pattern-play')]:selector==='[data-collapse-target]'?[collapse]:[];}};
 const document={hidden:false,querySelector(){throw Error('Unscoped document query');},querySelectorAll(){throw Error('Unscoped document query');},getElementById(){throw Error('Unscoped document query');},addEventListener(k,fn){events.set(k,fn);},removeEventListener(k){events.delete(k);}};
 const window={addEventListener(k,fn){windowEvents.set(k,fn);},removeEventListener(k){windowEvents.delete(k);}};
 class Player{stop(){calls.push('stop');}unlock(){calls.push('unlock');return new Promise(resolve=>resolveUnlock=resolve);}async prepareScaleTone(){calls.push('prepare');}async playExercise(){calls.push('exercise');return true;}setBackingMasterVolume(){}async load(){calls.push('load');return {};}}
 const sandbox={document,window,ChordPlayer:Player,setInterval(){calls.push('interval');return 1;},clearInterval(){},setTimeout(){}};
 vm.createContext(sandbox);vm.runInContext(scaleSource.replace(/^import .*\r?\n/,'').replace('export function initScales','function initScales'),sandbox);
 const api=sandbox.initScales(scope,{canPlay:()=>allowed});
 return {api,get,calls,events,windowEvents,document,setAllowed(value){allowed=value;},release(){resolveUnlock({currentTime:0});}};
}
test('initScales renders and collapses entirely within its supplied root',()=>{
 const h=scalesHarness();assert.match(h.get('#scale-title').textContent,/Musical Notes/);
 h.get('[data-collapse-target]').events.get('click')();assert.equal(h.get('#tab-content').hidden,true);
 assert.equal(h.get('[data-collapse-target]').getAttribute('aria-expanded'),'false');h.api.destroy();
});
for(const mode of ['notes','demo'])for(const interrupt of ['stop','pagehide','visibility'])test(`${mode} pending start is invalidated by ${interrupt}`,async()=>{
 const h=scalesHarness();const pending=h.get(mode==='notes'?'.pattern-play':'#play').events.get('click')();
 assert.ok(h.calls.includes('unlock'));
 if(interrupt==='stop')h.api.stopPlayback();else if(interrupt==='pagehide')h.windowEvents.get('pagehide')();else{h.document.hidden=true;h.events.get('visibilitychange')();}
 h.release();await pending;await Promise.resolve();
 assert.equal(h.calls.includes('prepare'),false);assert.equal(h.calls.includes('exercise'),false);assert.equal(h.calls.includes('interval'),false);
 assert.equal(h.get(mode==='notes'?'.pattern-play':'#play').getAttribute('aria-pressed'),'false');h.api.destroy();
});
test('inactive lesson refuses all playback gestures and destroy removes lifecycle listeners',()=>{
 const h=scalesHarness();h.setAllowed(false);for(const selector of ['.pattern-play','#play','#backing-play'])h.get(selector).events.get('click')();
 assert.equal(h.calls.includes('unlock'),false);assert.equal(h.calls.includes('exercise'),false);h.api.destroy();assert.equal(h.events.size,0);assert.equal(h.windowEvents.size,0);
});
test('Scales navigation sets selection, cancels tuner references, and hash changes restore other views',()=>{
 const source=file('app.js'),events=new Map(),calls=[],nodes=new Map(),get=selector=>{if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);},edition=get('.edition'),sandbox={document:{body:{dataset:{}},documentElement:{dataset:{}},querySelector:get},window:{scrollTo(){},addEventListener(k,fn){events.set(k,fn);}},location:{hash:'#scales'},moreView:element(),scalesModule:{show(active){calls.push(['scales',active]);}},metronome:{stop(){},resumeVisual(){}},chordsModule:{section:get('.chords-view'),stopPlayback(){},syncSound(){}},engine:{stopReference(){calls.push('reference-stop');}},referenceRequest:0,referenceTimer:1,playUntil:100,resumeWanted:true,listening:false,starting:false,clearTimeout(){},stopListening(){},renderInstrument(){},$:id=>get('#'+id)};
 for(const name of ['tuner','metronome','chords','scales','more'])sandbox[name+'Nav']=element();
 vm.createContext(sandbox);vm.runInContext(source.slice(source.indexOf('function showView('),source.indexOf("if('serviceWorker'")),sandbox);
 assert.equal(sandbox.document.body.dataset.view,'scales');assert.equal(sandbox.scalesNav.getAttribute('aria-current'),'page');assert.equal(edition.textContent,'SCALES');assert.equal(sandbox.playUntil,0);assert.equal(sandbox.resumeWanted,false);assert.ok(calls.includes('reference-stop'));
 for(const selector of ['.intro','#tuner','.metronome-view','.chords-view'])assert.equal(get(selector).hidden,true,selector+' must be hidden on Scales');
 sandbox.location.hash='#chords';events.get('hashchange')();assert.equal(sandbox.document.body.dataset.view,'chords');assert.equal(sandbox.chordsNav.getAttribute('aria-current'),'page');assert.deepEqual(calls.filter(Array.isArray).at(-1),['scales',false]);
 sandbox.location.hash='#unknown';events.get('hashchange')();assert.equal(sandbox.document.body.dataset.view,'tuner');
 assert.equal(get('#tuner').hidden,false);assert.equal(get('.intro').hidden,false);assert.equal(get('.metronome-view').hidden,true);assert.equal(get('.chords-view').hidden,true);
 for(const view of ['metronome','chords','more']){sandbox.location.hash='#'+view;events.get('hashchange')();assert.equal(get('#tuner').hidden,true);assert.equal(get('.intro').hidden,true);assert.equal(get('.metronome-view').hidden,view!=='metronome');assert.equal(get('.chords-view').hidden,view!=='chords');}
 const css=file('scales-web.css');for(const selector of ['.intro','#tuner','.metronome-view','.chords-view'])assert.ok(css.includes('body[data-view=scales] '+selector));assert.match(css,/repeat\(5,minmax\(0,1fr\)\)/);
});
test('initial HTML has one safe view even before modules execute',()=>{
 const html=file('index.html');assert.match(html,/<html\b[^>]*\bdata-view=["']tuner["']/i);assert.match(html,/<body\b[^>]*\bdata-view=["']tuner["']/i);
 const metro=html.match(/<section\b[^>]*\bid=["']metronome-view["'][^>]*>/i)?.[0];assert.ok(metro);assert.match(metro,/\bhidden\b/);
 assert.match(html,/\bid=["']app-load-status["']/);assert.match(html,/<script\b[^>]*\bsrc=["']\.\/bootstrap\.js(?:\?[^"']*)?["']/);assert.doesNotMatch(html,/<script\b[^>]*\bsrc=["']\.\/app\.js/);
 const css=file('scales-web.css');for(const selector of ['#tuner','.intro','.metronome-view','.chords-view','.scales-view'])assert.ok(css.includes(selector+'[hidden]'),selector+' needs explicit hidden protection');
 assert.match(css,/\[hidden\][^{]*\{[^}]*display\s*:\s*none\s*!important/);
});
test('Scales imports cannot block the main app bootstrap',()=>{
 const app=file('app.js'),view=file('tuner/scales-view.js'),bootstrap=file('bootstrap.js');
 assert.doesNotMatch(app,/^\s*import\s+[^\n]*from\s*['"][^'"]*scales/m);assert.doesNotMatch(view,/^\s*import\s+[^\n]*from\s*['"][^'"]*scales/m);
 assert.match(app,/import\(['"]\.\/tuner\/scales-view\.js\?/);assert.match(view,/import\(['"]\.\.\/scales-lab\/scales\.js\?/);assert.match(bootstrap,/import\(['"]\.\/app\.js\?/);
});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function domElement(){const node=element();node.children=[];node.append=(...items)=>node.children.push(...items);node.prepend=(...items)=>node.children.unshift(...items);node.replaceChildren=(...items)=>{node.children=items;};return node;}
function lazyHostHarness(){
 const main=domElement(),requests=[],shows=[],hostModule={initScalesView(host){return {show(active){shows.push(active);host.hidden=!active;},stopPlayback(){}};}};
 const sandbox={document:{createElement:domElement,querySelector:()=>main},importModule:()=>new Promise((resolve,reject)=>requests.push({resolve,reject}))};vm.createContext(sandbox);
 const source=file('app.js');vm.runInContext(source.slice(source.indexOf("const scalesView=document.createElement"),source.indexOf('const bottomNav=')).replaceAll('import(','importModule(')+'\nglobalThis.api=scalesModule;globalThis.host=scalesView;',sandbox);
 return {...sandbox,requests,shows,hostModule};
}
test('pending Scales host import cannot reopen a view after navigation away',async()=>{
 const h=lazyHostHarness();assert.equal(h.requests.length,0);h.api.show(true);h.api.show(true);assert.equal(h.requests.length,1);h.api.show(false);h.requests[0].resolve(h.hostModule);await flush();assert.equal(h.host.hidden,true);assert.deepEqual(h.shows,[false]);h.api.show(true);assert.equal(h.requests.length,1);assert.equal(h.host.hidden,false);
});
test('failed optional Scales host import is caught and retryable without locking core navigation',async()=>{
 const h=lazyHostHarness();h.api.show(true);h.requests[0].reject(Error('offline'));await flush();assert.match(h.host.innerHTML,/other tools are still available/);h.api.show(false);assert.equal(h.host.hidden,true);h.api.show(true);assert.equal(h.requests.length,2);h.requests[1].resolve(h.hostModule);await flush();assert.deepEqual(h.shows,[true]);assert.equal(h.host.hidden,false);
});
function lessonViewHarness(){
 const host=domElement(),shadow=domElement(),links=[],inits=[],requests=[];host.hidden=true;host.attachShadow=()=>shadow;
 const main={childNodes:[{lesson:true}]},module={initScales(root,options){inits.push({root,options});return {stopPlayback(){}};}};
 const sandbox={URL,document:{hidden:false,createElement(tag){const node=domElement();if(tag==='link')links.push(node);return node;}},fetch:async()=>({ok:true,text:async()=>'<main></main>'}),DOMParser:class{parseFromString(){return {querySelector:()=>main};}},importModule:()=>new Promise((resolve,reject)=>requests.push({resolve,reject}))};
 vm.createContext(sandbox);vm.runInContext(file('tuner/scales-view.js').replace('export function','function').replaceAll('import(','importModule(').replaceAll('import.meta.url',JSON.stringify('https://example.com/tuner/tuner/scales-view.js')),sandbox);
 return {host,shadow,links,inits,requests,module,api:sandbox.initScalesView(host),document:sandbox.document};
}
test('lesson is not exposed or initialized until stylesheet loads, including after navigation away',async()=>{
 const h=lessonViewHarness();h.api.show(true);h.requests[0].resolve(h.module);await flush();assert.equal(h.links.length,1);assert.equal(h.inits.length,0);assert.equal(h.shadow.children.some(node=>node.className==='scales-content'),false);
 h.api.show(false);h.links[0].onload();await flush();assert.equal(h.host.hidden,true);assert.equal(h.inits.length,1);assert.equal(h.inits[0].options.canPlay(),false);assert.equal(h.shadow.children[1].className,'scales-content');
 h.api.show(true);assert.equal(h.inits[0].options.canPlay(),true);h.document.hidden=true;assert.equal(h.inits[0].options.canPlay(),false);
});
for(const failure of ['import','stylesheet'])test(`lesson ${failure} failure shows retry and can recover`,async()=>{
 const h=lessonViewHarness();h.api.show(true);if(failure==='import')h.requests[0].reject(Error('unavailable'));else{h.requests[0].resolve(h.module);await flush();h.links[0].onerror();}await flush();assert.equal(h.inits.length,0);assert.match(h.shadow.innerHTML,/Try again/);
 h.shadow.querySelector('button').events.get('click')();assert.equal(h.requests.length,2);h.requests[1].resolve(h.module);await flush();h.links.at(-1).onload();await flush();assert.equal(h.inits.length,1);
});
for(const succeeds of [true,false])test(`bootstrap ${succeeds?'success removes loading status':'failure exposes a working reload action'}`,async()=>{
 const status=domElement();let removed=false,reloaded=false;status.remove=()=>removed=true;const sandbox={document:{getElementById:()=>status},location:{reload(){reloaded=true;}},importModule:()=>succeeds?Promise.resolve():Promise.reject(Error('module failed'))};vm.createContext(sandbox);vm.runInContext(file('bootstrap.js').replaceAll('import(','importModule('),sandbox);await flush();
 if(succeeds)assert.equal(removed,true);else{assert.equal(removed,false);assert.equal(status.getAttribute('role'),'alert');assert.match(status.querySelector('p').textContent,/could not finish loading/);assert.equal(status.querySelector('button').hidden,false);status.querySelector('button').events.get('click')();assert.equal(reloaded,true);}
});
test('service worker precaches Scales dependencies and every real backing sample, with query-insensitive offline fallback',async()=>{
 const events=new Map(),matches=[],cached={ok:true},sandbox={URL,self:{location:{origin:'https://example.com'},addEventListener(k,fn){events.set(k,fn);}},fetch:async()=>{throw Error('offline');},caches:{match:async(request,options)=>{matches.push(options);return cached;}}};
 vm.createContext(sandbox);vm.runInContext(file('sw.js')+'\nglobalThis.files=FILES;',sandbox);
 for(const path of ['scales-web.css','lesson-controls.css','tuner/scales-view.js','scales-lab/index.html','scales-lab/scales.css','scales-lab/scales.js','scales-lab/standalone.js','images/scales-icon.svg'])assert.ok(sandbox.files.includes('./'+path),path);
 for(const note of ['C3','Ds3','Fs3','A3','C4','Ds4','Fs4','A4','C5'])for(const velocity of [6,12])assert.ok(sandbox.files.includes(`./samples/real/piano-${note}-v${velocity}.mp3`));
 for(const name of ['strings-low-A2.wav','strings-high-C4.wav','strings-high-B4.wav'])assert.ok(sandbox.files.includes('./samples/real/'+name));
 for(const path of sandbox.files)assert.ok(existsSync(new URL('../public/tuner/'+path,import.meta.url)),`Missing precache asset: ${path}`);
 let response;events.get('fetch')({request:{method:'GET',url:'https://example.com/tuner/scales-lab/scales.js?v=web-scales-1'},respondWith(promise){response=promise;}});assert.equal(await response,cached);assert.equal(matches[0].ignoreSearch,true);
});

for(const status of [206,200])test(`network audio HTTP ${status} is returned and ${status===206?'does not replace':'updates'} the cached full recording`,async()=>{
 const events=new Map(),pending=[],writes=[],original=new Response('full precached audio'),network=new Response(status===206?'partial audio':'full network audio',{status});let stored=original,clones=0;
 const clone=network.clone.bind(network);network.clone=()=>{clones++;return clone();};
 const request={method:'GET',url:'https://example.com/tuner/samples/guitar-acoustic-A2.wav'};
 const sandbox={URL,Response,self:{location:{origin:'https://example.com',href:'https://example.com/tuner/sw.js'},addEventListener(k,fn){events.set(k,fn);}},fetch:async()=>network,caches:{open:async()=>({put:async(key,value)=>{writes.push(key);stored=value;}})}};
 vm.createContext(sandbox);vm.runInContext(file('sw.js'),sandbox);
 let response;events.get('fetch')({request,respondWith(value){response=value;},waitUntil(value){pending.push(value);}});
 assert.equal(await response,network);await Promise.all(pending);
 if(status===206){assert.equal(writes.length,0);assert.equal(pending.length,0);assert.equal(clones,0);assert.equal(stored,original);assert.equal(await stored.text(),'full precached audio');}
 else{assert.equal(writes.length,1);assert.equal(writes[0],request);assert.equal(clones,1);assert.equal(await stored.text(),'full network audio');}
});

test('offline precached modules survive Vary Origin without loosening private responses',async()=>{
 const events=new Map(),matches=[],cached={ok:true},sandbox={URL,Response,self:{location:{origin:'https://example.com',href:'https://example.com/tuner/sw.js'},addEventListener(k,fn){events.set(k,fn);}},fetch:async()=>{throw Error('offline');},caches:{match:async()=>undefined,open:async()=>({match:async(request,options)=>{matches.push(options);return cached;}})}};
 vm.createContext(sandbox);vm.runInContext(file('sw.js'),sandbox);
 const request=url=>{let p;events.get('fetch')({request:{method:'GET',url},respondWith(value){p=value;}});return p;};
 assert.equal(await request('https://example.com/tuner/app.js?v=web-scales-1'),cached);assert.equal(matches[0].ignoreVary,true);
 const missing=await request('https://example.com/tuner/private-account');assert.equal(missing.type,'error');assert.equal(matches.length,1);
});
