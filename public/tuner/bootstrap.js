// A failed optional lesson must never leave all tools stacked on screen.
const status=document.getElementById('app-load-status');
import('./app.js?v=chord-layout-review-2').then(()=>status?.remove()).catch(()=>{
 if(!status)return;
 status.setAttribute('role','alert');
 status.querySelector('p').textContent='The app could not finish loading. Check your connection and reload to try again.';
 const retry=status.querySelector('button');retry.hidden=false;retry.addEventListener('click',()=>location.reload());
});
