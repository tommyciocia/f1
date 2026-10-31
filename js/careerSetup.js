'use strict';
function renderCareerHub(){
 const recovered=careerRecovered;
 $('careerSlots').innerHTML=Object.entries(CAREER_SLOTS).map(([kind,slot],i)=>{
  const data=loadCareer(kind),player=data?.roster.find(d=>d.id==='player');
  return '<article class="career-slot '+(kind==='driver'?'career-driver-slot':'')+'"><span class="career-eyebrow">PERCORSO 0'+(i+1)+'</span><h3>'+slot.label+'</h3><p>'+(kind==='team'?'Porta in pista la tua scuderia: scegli nome, pilota, colori e monoposto.':'Entra in una squadra esistente al posto del pilota che scegli. Stessa auto, stessi colori, un nuovo protagonista.')+'</p><div class="career-slot-save">'+(data?'<b>'+esc(player.name)+' · '+esc(data.teams[player.team].name)+'</b><span>Stagione '+data.number+' · '+data.currentRound+'/'+data.calendar.length+' GP completati'+(data.pendingRound!==null?' · Weekend da riprendere':'')+'</span>':'<b>Nuovo salvataggio</b><span>Scegli il campionato da 10 o 24 Gran Premi</span>')+'</div><button type="button" data-career-slot="'+kind+'" class="main">'+(data?'CONTINUA CARRIERA':'INIZIA QUESTA CARRIERA')+' →</button></article>';
 }).join('');careerRecovered=recovered;
}
function renderCareerSeat(){
 const index=boundedNumber($('careerReplaceDriver').value,0,DR.length-1,0,true),driver=S.roster[index],team=driver[3],mate=S.roster.find((d,i)=>i!==index&&d[3]===team);
 $('careerSeatPreview').innerHTML='<span style="background:'+safeColor(TEAMS[team][0],'#ffffff')+'"></span><div><b>'+esc(teamName(team))+'</b><p>Al posto di '+esc(driver[1])+' · Compagno: '+esc(mate?.[1]||'—')+'</p><small>Monoposto e livrea della scuderia · 22 piloti · 11 team</small></div>';
}
function renderCareerSetup(){
 const kind=careerSetupKind,team=kind==='team';
 $('careerSetupTitle').textContent=CAREER_SLOTS[kind].label;
 $('careerSetupDescription').textContent=team?'Fonda la tua scuderia e sfida la griglia. Questa carriera ha impostazioni e progressi propri.':'Scegli il pilota da sostituire e crea la tua identità. Il suo posto sarà tuo, con la monoposto della squadra.';
 $('careerReplacementFields').classList.toggle('hidden',team);$('careerTeamFields').classList.toggle('hidden',!team);$('careerTeamNameField').classList.toggle('hidden',!team);
 $('careerTeamName').required=team;
 $('careerReplaceDriver').innerHTML=S.roster.map((d,i)=>'<option value="'+i+'">'+esc(d[1])+' · '+esc(teamName(d[3]))+'</option>').join('');$('careerReplaceDriver').value='0';
 for(const [id,key] of [['careerTeamName','name'],['careerDriverName','driver'],['careerDriverCode','code'],['careerDriverNumber','num'],['careerPrimaryColor','c1'],['careerAccentColor','c2']])$(id).value=S.my[key];
 document.querySelectorAll('[data-career-stat]').forEach(el=>el.value=S.myStats[+el.dataset.careerStat]);
 $('careerSetupError').textContent='';$('careerSeasonLength').value='10';renderCareerSeat();
}
function createCareerFromForm(){
 const input={calendarLength:$('careerSeasonLength').value,name:$('careerTeamName').value,driver:$('careerDriverName').value,code:$('careerDriverCode').value,num:$('careerDriverNumber').value,
  c1:$('careerPrimaryColor').value,c2:$('careerAccentColor').value,replaceDriver:$('careerReplaceDriver').value,
  myStats:Array.from(document.querySelectorAll('[data-career-stat]'),el=>+el.value)};
 const created=createCareerProfile(careerSetupKind,input);
 if(!created)$('careerSetupError').textContent='Inserisci nome, sigla, numero pilota e il nome della tua squadra.';
 return created;
}
function renderCareerSettings(){
 if(!career)return;
 const player=career.roster.find(d=>d.id==='player');
 $('careerProfileSummary').textContent=player.name+' #'+player.number+' · '+career.teams[player.team].name;
 document.querySelectorAll('[data-career-set]').forEach(el=>{const value=career.settings[el.dataset.careerSet];if(el.type==='checkbox')el.checked=value;else el.value=value;});
 document.querySelectorAll('[data-career-qminutes]').forEach(el=>el.value=career.settings.qualiMinutes[+el.dataset.careerQminutes]);
}
document.addEventListener('submit',e=>{if(e.target.id==='careerCreateForm'){e.preventDefault();createCareerFromForm();}});
document.addEventListener('change',e=>{
 const el=e.target;if(el.id==='careerReplaceDriver')renderCareerSeat();
 if(el.dataset?.careerSet){const key=el.dataset.careerSet,value=el.type==='checkbox'?el.checked:['range','number'].includes(el.type)||key==='diff'?+el.value:el.value;setCareerSetting(key,value);renderCareerSettings();renderCareer();}
 if(el.dataset?.careerQminutes!==undefined){setCareerQualiMinutes(+el.dataset.careerQminutes,+el.value);renderCareerSettings();}
});
