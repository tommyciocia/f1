'use strict';
/* Input da tastiera */
const keys={};let ks=0;
const editingControls=e=>e.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName);
addEventListener('keydown',e=>{if(editingControls(e))return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 const held=!!keys[e.code];keys[e.code]=true;if(held||e.repeat)return;initAudio();
 if(e.code==='Escape')togglePause();if(e.code==='KeyT')repos();if(e.code==='KeyC')camMul=camMul===1?1.45:1;if(e.code==='KeyX')requestPitEntry();});
addEventListener('keyup',e=>keys[e.code]=false);
function releaseKeyboard(){for(const k in keys)keys[k]=false;ks=0;}
addEventListener('blur',()=>{releaseKeyboard();if(state==='racing'||state==='quali')togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseKeyboard();if(state==='racing'||state==='quali')togglePause();}});
