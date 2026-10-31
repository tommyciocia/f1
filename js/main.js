'use strict';
/* Simulazione a 60 Hz: input e pausa restano attivi anche con la fisica ferma. */
const FRAME_STEP=1/60;
let last=null,frameAccumulator=0,runtimeFault=null;
function failGame(error){
 if(runtimeFault)return;
 runtimeFault=error instanceof Error?error:new Error(String(error));
 console.error(runtimeFault);state='error';frameAccumulator=0;
 silenceAudio();releaseKeyboard();$('hud').classList.add('hidden');show('runtimeError');
}
function frame(t){
 requestAnimationFrame(frame);
 const elapsed=last===null?0:clamp((t-last)/1000,0,.25);last=t;
 if(state==='error')return;
 try{
  pollPad();
  if(state==='paused'){frameAccumulator=0;render(0);return;}
  frameAccumulator=Math.min(frameAccumulator+elapsed,FRAME_STEP*8);
  while(frameAccumulator+1e-9>=FRAME_STEP){
   update(FRAME_STEP,false,true);frameAccumulator-=FRAME_STEP;
   if(state==='paused'){frameAccumulator=0;break;}
  }
  render(elapsed);
 }catch(error){failGame(error);}
}
addEventListener('error',event=>{if(event.error)failGame(event.error);});
addEventListener('unhandledrejection',event=>failGame(event.reason));
mkCars();show('menu');renderAudioState();requestAnimationFrame(frame);
