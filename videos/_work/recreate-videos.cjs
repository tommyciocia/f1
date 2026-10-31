'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const work=__dirname,output=path.resolve(work,'..'),root=path.resolve(output,'..');
const seconds=20;
const formats=[
 {id:'ritratto-2x3',width:800,height:1200,bitrate:3000000},
 {id:'paesaggio',width:1920,height:1080,bitrate:5000000},
];
const reports=[];

async function capture(browser,spec){
 const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1,recordVideo:{dir:work,size:{width:spec.width,height:spec.height}}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  localStorage.setItem('f1sim.set',JSON.stringify({vol:.45,muted:false,qual:'high',diff:2,dv:2,laps:3,qualiEnabled:false,circuitId:'monaco'}));
  window.__videoRAF=requestAnimationFrame.bind(window);requestAnimationFrame=()=>0;
 });
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);
 await page.evaluate(async()=>{
  selectCircuit('monaco');startRace();updateCountdown(6);pl.ai=true;
  for(let i=0;i<480;i++)update(1/60);
  clearTimeout(banner.t);$('banner').textContent='';
  camX=pl.x+pl.vx*.38;camY=pl.y+pl.vy*.38;
  for(let i=0;i<30;i++)render(1/60);
  if(runtimeFault)throw runtimeFault;
  initAudio();if(!AC||!master)throw new Error('Audio non disponibile');await AC.resume();
 });
 await page.screenshot({path:path.join(work,spec.id+'-inizio.png')});
 console.log('Registrazione '+spec.id+' '+spec.width+'x'+spec.height+' — '+seconds+' secondi');
 await page.evaluate(()=>{
  const destination=AC.createMediaStreamDestination();master.connect(destination);
  window.__audioParts=[];
  window.__audioRecorder=new MediaRecorder(destination.stream,{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:128000});
  __audioRecorder.ondataavailable=event=>{if(event.data.size)__audioParts.push(event.data);};
  window.__audioStopped=new Promise(resolve=>__audioRecorder.onstop=resolve);
  __audioRecorder.start();requestAnimationFrame=window.__videoRAF;
  last=null;frameAccumulator=0;requestAnimationFrame(frame);
 });
 await page.waitForTimeout(seconds*1000);
 const data=await page.evaluate(async()=>{
  requestAnimationFrame=()=>0;__audioRecorder.stop();await __audioStopped;
  if(runtimeFault)throw runtimeFault;
  const bytes=new Uint8Array(await new Blob(__audioParts,{type:'audio/webm'}).arrayBuffer());
  let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return{audio:btoa(binary),circuit:activeCircuit.name,state,raceTime};
 });
 if(data.state!=='racing'||errors.length)throw new Error(JSON.stringify({state:data.state,errors}));
 fs.writeFileSync(path.join(work,spec.id+'-audio.webm'),Buffer.from(data.audio,'base64'));
 await page.screenshot({path:path.join(work,spec.id+'-fine.png')});
 const video=page.video();await context.close();
 await video.saveAs(path.join(work,spec.id+'-originale.webm'));
 console.log('Registrazione completata: '+data.circuit+'; errori: '+errors.length);
}

async function encode(browser,spec){
 const page=await browser.newPage();
 await page.goto(pathToFileURL(path.join(work,'media-export.html')).href);
 console.log('Esportazione MP4 '+spec.id);
 const result=await page.evaluate(async spec=>{
  const video=document.getElementById('source'),audio=document.getElementById('sound'),canvas=document.getElementById('output');
  function ready(element){return new Promise((resolve,reject)=>{element.onloadeddata=resolve;element.onerror=()=>reject(new Error('Lettura fallita: '+element.src));});}
  const readyVideo=ready(video),readyAudio=ready(audio);
  video.src=spec.id+'-originale.webm';audio.src=spec.id+'-audio.webm';await Promise.all([readyVideo,readyAudio]);
  async function durationOf(element){if(!Number.isFinite(element.duration)){const done=new Promise(resolve=>element.addEventListener('seeked',resolve,{once:true}));element.currentTime=1e7;await done;}return element.duration;}
  const videoDuration=await durationOf(video),audioDuration=await durationOf(audio);
  async function seek(element,time){if(Math.abs(element.currentTime-time)<.01)return;const done=new Promise(resolve=>element.addEventListener('seeked',resolve,{once:true}));element.currentTime=time;await done;}
  const duration=spec.seconds;
  await Promise.all([seek(video,Math.max(0,videoDuration-duration)),seek(audio,Math.max(0,audioDuration-duration))]);
  canvas.width=spec.width;canvas.height=spec.height;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(video,0,0,canvas.width,canvas.height);
  const ac=new AudioContext();await ac.resume();
  const sound=ac.createMediaElementSource(audio),destination=ac.createMediaStreamDestination();sound.connect(destination);
  const stream=canvas.captureStream(30);stream.addTrack(destination.stream.getAudioTracks()[0]);
  const types=['video/mp4;codecs=avc1.420028,mp4a.40.2','video/mp4;codecs=avc1.42001E,mp4a.40.2','video/mp4'];
  const mimeType=types.find(type=>MediaRecorder.isTypeSupported(type));if(!mimeType)throw new Error('MP4 non supportato');
  const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:spec.bitrate,audioBitsPerSecond:128000}),chunks=[];
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=event=>reject(event.error);});
  let drawing=true;
  function draw(){if(!drawing)return;ctx.drawImage(video,0,0,canvas.width,canvas.height);video.requestVideoFrameCallback(draw);}
  video.requestVideoFrameCallback(draw);
  const ended=new Promise(resolve=>video.addEventListener('ended',resolve,{once:true}));
  recorder.start(1000);await Promise.all([video.play(),audio.play()]);
  await Promise.race([ended,new Promise(resolve=>setTimeout(resolve,duration*1000+150))]);
  drawing=false;video.pause();audio.pause();recorder.stop();await stopped;await ac.close();
  const bytes=new Uint8Array(await new Blob(chunks,{type:'video/mp4'}).arrayBuffer());
  let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return{data:btoa(binary),mimeType};
 },{...spec,seconds});
 const filename='gameplay-'+spec.id+'-'+spec.width+'x'+spec.height+'.mp4';
 fs.writeFileSync(path.join(output,filename),Buffer.from(result.data,'base64'));
 await page.close();
 return filename;
}

async function verify(browser,spec,filename){
 const page=await browser.newPage();await page.goto(pathToFileURL(path.join(work,'media-export.html')).href);
 const result=await page.evaluate(async filename=>{
  const video=document.getElementById('source');
  const ready=new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(new Error(video.error?.message||'MP4 non leggibile'));});
  video.src='../'+filename;await ready;
  const duration=video.duration;
  const seeked=new Promise(resolve=>video.addEventListener('seeked',resolve,{once:true}));video.currentTime=10;await seeked;
  await video.play();await new Promise(resolve=>setTimeout(resolve,450));video.pause();
  const canvas=document.getElementById('output');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0);
  return{width:video.videoWidth,height:video.videoHeight,duration,playbackTime:video.currentTime,decodedVideo:video.webkitDecodedFrameCount,decodedAudio:video.webkitAudioDecodedByteCount,frame:canvas.toDataURL('image/png').split(',')[1]};
 },filename);
 fs.writeFileSync(path.join(work,spec.id+'-mp4-verificato.png'),Buffer.from(result.frame,'base64'));delete result.frame;
 if(result.width!==spec.width||result.height!==spec.height||!(result.duration>18&&result.duration<=30)||result.decodedVideo<1||result.decodedAudio<1||result.playbackTime<=10)throw new Error('Verifica fallita: '+JSON.stringify(result));
 const report={file:filename,...result,bytes:fs.statSync(path.join(output,filename)).size};
 reports.push(report);console.log('VERIFICATO '+JSON.stringify(report));await page.close();
}

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required','--allow-file-access-from-files']});
 try{for(const spec of formats){await capture(browser,spec);const filename=await encode(browser,spec);await verify(browser,spec,filename);}}
 finally{await browser.close();}
 fs.writeFileSync(path.join(output,'verifica-video.json'),JSON.stringify(reports,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
