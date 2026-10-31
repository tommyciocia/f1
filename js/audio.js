'use strict';
/* Audio WebAudio: motore, bip, urti e volume generale */
let AC=null,eng=null,engG=null,master=null,noiseBuf=null,lastHit=0,brakeG=null;
// Volume master: il valore del cursore viene applicato direttamente a tutti i suoni.
// Una curva lieve mantiene distinguibili anche i livelli bassi, senza far sparire
// completamente il motore appena si sposta il cursore.
const volGain=()=>{const v=Number(S.vol);return !S.muted&&Number.isFinite(v)?Math.pow(clamp(v,0,1),1.35):0;};
function renderAudioState(){
 const label=S.muted?'RIATTIVA AUDIO':'DISATTIVA AUDIO';
 for(const id of ['muteButton','menuMuteButton']){const b=$(id);if(!b)continue;b.textContent=S.muted?'AUDIO OFF':'AUDIO ON';b.setAttribute('aria-label',label);b.setAttribute('aria-pressed',String(!!S.muted));}
 document.querySelectorAll('[data-set="muted"]').forEach(el=>el.checked=!!S.muted);
}
function toggleMute(){S.muted=!S.muted;applyVol();save();renderAudioState();}
function silenceAudio(){
 if(!AC)return;
 if(engG)engG.gain.setTargetAtTime(0,AC.currentTime,.025);
 if(brakeG)brakeG.gain.setTargetAtTime(0,AC.currentTime,.025);
}
function applyVol(){
 if(!AC||!master)return;
 const now=AC.currentTime,level=volGain();
 master.gain.cancelScheduledValues(now);
 master.gain.setValueAtTime(master.gain.value,now);
 master.gain.linearRampToValueAtTime(level,now+.025);
}
function initAudio(){
 if(AC){if(AC.state==='suspended')AC.resume().catch(()=>{});return;}
 if(!(window.AudioContext||window.webkitAudioContext))return;
 try{AC=new(window.AudioContext||window.webkitAudioContext)();
  master=AC.createGain();master.gain.value=volGain();master.connect(AC.destination);
  eng=AC.createOscillator();eng.type='sawtooth';engG=AC.createGain();engG.gain.value=0;
  const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;eng.connect(lp);lp.connect(engG);engG.connect(master);eng.start();
  noiseBuf=AC.createBuffer(1,AC.sampleRate*.3,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  const braking=AC.createBufferSource(),filter=AC.createBiquadFilter(),buffer=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
  const samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  braking.buffer=buffer;braking.loop=true;filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=.6;
  brakeG=AC.createGain();brakeG.gain.value=0;braking.connect(filter);filter.connect(brakeG);brakeG.connect(master);braking.start();
  if(AC.state==='suspended')AC.resume().catch(()=>{});}catch(e){if(AC)AC.close().catch(()=>{});AC=null;master=null;brakeG=null;}}
function beep(f,d,type='square',g=.15,delay=0){if(!AC||!master)return;const o=AC.createOscillator(),G=AC.createGain(),at=AC.currentTime+delay;o.type=type;o.frequency.value=f;G.gain.setValueAtTime(g,at);G.gain.exponentialRampToValueAtTime(.001,at+d);o.connect(G);G.connect(master);o.onended=()=>{o.disconnect();G.disconnect();};o.start(at);o.stop(at+d);}
function finishSound(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>beep(f,.32,'triangle',.2,i*.14));}
function thud(g){if(!AC||!master||!noiseBuf)return;const s=AC.createBufferSource(),G=AC.createGain();s.buffer=noiseBuf;G.gain.value=g;s.connect(G);G.connect(master);s.onended=()=>{s.disconnect();G.disconnect();};s.start();}
function engineSound(c,on){if(!AC||!eng||!engG)return;const v=Math.hypot(c.vx,c.vy),r=clamp(v/c.top,0,1),thr=clamp(c.inp.thr||0,0,1);
 eng.frequency.setTargetAtTime(55+((r*7)%1)*130+r*60,AC.currentTime,.05);
 // Il motore cresce chiaramente in accelerazione e si attenua in rilascio.
 engG.gain.setTargetAtTime(on ? .025+r*.075+thr*.16 : 0,AC.currentTime,.08);
 if(brakeG)brakeG.gain.setTargetAtTime(on?clamp(c.inp.brk||0,0,1)*clamp(v/650,0,1)*.07:0,AC.currentTime,.045);}
