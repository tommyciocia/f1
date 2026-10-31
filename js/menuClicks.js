'use strict';
/* Gestione dei click sui pulsanti dei pannelli */
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;initAudio();
 if(b.dataset.act==='mute'){toggleMute();return;}
 beep(520,.045,'sine',.06);
 if(b.dataset.tyre){choosePitCompound(b.dataset.tyre);return;}
 if(b.dataset.circuit){previewCircuit(b.dataset.circuit);$('circuitPreview').scrollIntoView({block:'start'});return;}
 if(b.dataset.selectCircuit){selectCircuit(b.dataset.selectCircuit);return;}
 const g=b.dataset.go,a=b.dataset.act;
 if(a==='career'){openCareerHub();return;}
 if(a==='careerresume'){openCareer();return;}
 if(b.dataset.careerSlot){selectCareerSlot(b.dataset.careerSlot);return;}
 if(a==='careersave'){saveCareer();renderCareer();toast(careerSaveError||'Carriera salvata');return;}
 if(a==='careergp'){beginCareerGP();return;}
 if(a==='careernew'){newCareerSeason();return;}
 if(a==='careerretire'){retireCareerGP();return;}
 if(b.dataset.careerTab){setCareerTab(b.dataset.careerTab);return;}
 if(g){show(g);if(g==='circuits')renderCircuits();if(g==='cars')renderCars();if(g==='paddock')renderPaddock();if(g==='records')renderRecords();if(g==='controls')renderControlSettings();}
 if(a==='play')begin();else if(a==='pause')togglePause();else if(a==='restart'){if(mode==='quali')restartQualiSession();else showRaceSetup();}else if(a==='grid'){if(quali&&quali.finished)showRaceSetup();}else if(a==='startrace')confirmRaceStart();else if(a==='nextq')nextQualiSession();else if(a==='retryq')startQuali();else if(a==='endq')endQuali();else if(a==='resume')resume();else if(a==='menu')toMenu();else if(a==='confirmtyres')confirmPitTyres();
 else if(a==='selectcircuit')selectCircuit(previewCircuitId);
 else if(a==='resetmy'){S.myStats=[1,1,1,1];save();renderMyStats();}
 else if(a==='resetteam'){const t=clamp(+$('padTeam').value||0,0,TEAMS.length-2);S.teamStats[t]=TSTAT[t].slice();save();renderPaddock();}});
document.addEventListener('change',e=>{if(e.target.dataset?.startCompound)chooseRaceCompound(e.target.dataset.startCompound);});
