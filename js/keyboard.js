'use strict';
/* Input da tastiera */
const keys={};let ks=0;
addEventListener('keydown',e=>{if(e.repeat&&e.code!=='Space')return;keys[e.code]=true;initAudio();
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 if(e.code==='Escape')togglePause();if(e.code==='KeyR')repos();if(e.code==='KeyC')camMul=camMul===1?1.45:1;});
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;if(state==='racing'||state==='quali')togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(state==='racing'||state==='quali'))togglePause();});
