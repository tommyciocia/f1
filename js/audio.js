'use strict';
/* Audio WebAudio: motore, bip, urti e volume generale */
let AC=null,eng=null,engG=null,master=null,noiseBuf=null,lastHit=0;
// Volume master: il valore del cursore viene applicato direttamente a tutti i suoni.
// Una curva lieve mantiene distinguibili anche i livelli bassi, senza far sparire
// completamente il motore appena si sposta il cursore.
const volGain=()=>{const v=Number(S.vol);return Number.isFinite(v)?Math.pow(clamp(v,0,1),1.35):0;};
function applyVol(){
 if(!AC||!master)return;
 const now=AC.currentTime,level=volGain();
 master.gain.cancelScheduledValues(now);
 master.gain.setValueAtTime(master.gain.value,now);
 master.gain.linearRampToValueAtTime(level,now+.025);
}
function initAudio(){
 if(AC){if(AC.state==='suspended')AC.resume();return;}
 if(!(window.AudioContext||window.webkitAudioContext))return;
 try{AC=new(window.AudioContext||window.webkitAudioContext)();
  master=AC.createGain();master.gain.value=volGain();master.connect(AC.destination);
  eng=AC.createOscillator();eng.type='sawtooth';engG=AC.createGain();engG.gain.value=0;
  const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;eng.connect(lp);lp.connect(engG);engG.connect(master);eng.start();
  noiseBuf=AC.createBuffer(1,AC.sampleRate*.3,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  if(AC.state==='suspended')AC.resume();}catch(e){AC=null;master=null;}}
function beep(f,d,type='square',g=.15){if(!AC||!master)return;const o=AC.createOscillator(),G=AC.createGain();o.type=type;o.frequency.value=f;G.gain.setValueAtTime(g,AC.currentTime);G.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);o.connect(G);G.connect(master);o.start();o.stop(AC.currentTime+d);}
function thud(g){if(!AC||!master||!noiseBuf)return;const s=AC.createBufferSource(),G=AC.createGain();s.buffer=noiseBuf;G.gain.value=g;s.connect(G);G.connect(master);s.start();}
function engineSound(c,on){if(!AC||!eng||!engG)return;const v=Math.hypot(c.vx,c.vy),r=clamp(v/c.top,0,1),thr=clamp(c.inp.thr||0,0,1);
 eng.frequency.setTargetAtTime(55+((r*7)%1)*130+r*60,AC.currentTime,.05);
 // Il motore cresce chiaramente in accelerazione e si attenua in rilascio.
 engG.gain.setTargetAtTime(on ? .025+r*.075+thr*.16 : 0,AC.currentTime,.08);}
