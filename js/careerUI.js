'use strict';
/* Pannello della stagione: nessun aggiornamento o calcolo durante i frame di guida. */
let careerTab='standings';
const careerCircuit=id=>CIRCUIT_DATA.find(c=>c.id===id);
const careerTeamLabel=(team,data=career)=>data.teams.find(t=>t.id===team)?.name||'Scuderia';
const careerStat=(value,label)=>'<div><strong>'+esc(value)+'</strong><span>'+label+'</span></div>';

function setCareerTab(tab){
 if(!['standings','calendar','history','settings'].includes(tab))return false;
 careerTab=tab;
 for(const name of ['standings','calendar','history','settings']){
  $('careerView'+name).classList.toggle('hidden',name!==tab);
  $('careerTab'+name).setAttribute('aria-selected',String(name===tab));
 }
 return true;
}
function careerDriverTable(list){
 return '<table class="career-table"><thead><tr><th scope="col">POS</th><th scope="col">PILOTA / TEAM</th><th scope="col">PTS</th><th scope="col"><abbr title="Vittorie">V</abbr></th><th scope="col">PODI</th><th scope="col"><abbr title="Gare completate">GP</abbr></th></tr></thead><tbody>'+list.map(d=>
  '<tr data-career-driver="'+d.id+'" class="'+(d.id==='player'?'career-me':'')+'"><td>'+d.position+'</td><td><span class="career-driver-name" style="--team-color:'+safeColor(d.color,'#ffffff')+'">'+esc(d.name)+'</span><small>'+esc(careerTeamLabel(d.team))+'</small></td><td class="career-points">'+d.points+'</td><td>'+d.wins+'</td><td>'+d.podiums+'</td><td>'+d.completed+'</td></tr>').join('')+'</tbody></table>';
}
function careerConstructorTable(list){
 return '<table class="career-table"><thead><tr><th scope="col">POS</th><th scope="col">COSTRUTTORE</th><th scope="col">PTS</th><th scope="col"><abbr title="Vittorie">V</abbr></th><th scope="col">PODI</th></tr></thead><tbody>'+list.map(t=>
  '<tr data-career-team="'+t.id+'" class="'+(t.id===career.roster.find(d=>d.id==='player').team?'career-me':'')+'"><td>'+t.position+'</td><td><span class="career-driver-name" style="--team-color:'+safeColor(t.color,'#ffffff')+'">'+esc(t.name)+'</span></td><td class="career-points">'+t.points+'</td><td>'+t.wins+'</td><td>'+t.podiums+'</td></tr>').join('')+'</tbody></table>';
}
function careerResultTable(result){
 const labels={FINISHED:'Arrivato',CLASSIFIED:'Classificato',DNF:'Non classificato',DSQ:'Squalificato'};
 return '<div class="career-result-scroll"><table class="career-table"><thead><tr><th>POS</th><th>PILOTA / TEAM</th><th>TEMPO / ESITO</th><th>PTS</th></tr></thead><tbody>'+result.rows.map(row=>
  '<tr data-career-result-driver="'+row.id+'" class="'+(row.id==='player'?'career-me':'')+'"><td>'+(row.classified?row.position:row.status==='DSQ'?'DSQ':'NC')+'</td><td><b>'+esc(row.name)+'</b><small>'+esc(row.teamName)+'</small></td><td>'+esc(row.finished&&!row.disqualified?fmt(row.time):labels[row.status])+'<small>'+row.laps+'/'+result.laps+' giri</small></td><td class="career-points">'+row.points+'</td></tr>').join('')+'</tbody></table></div>';
}
function renderCareerCalendar(){
 $('careerCalendarCaption').textContent=career.calendar.length+' circuiti · Una gara per tracciato, nell’ordine del campionato.';
 $('careerCalendar').innerHTML=career.calendar.map((id,i)=>{
  const circuit=careerCircuit(id),result=career.results[i],pending=!result&&career.pendingRound===i;
  const winner=result?.rows.find(r=>r.id===result.winnerId),status=result?'Completato':pending?'In corso':'Da disputare';
  return '<li class="'+(result?'completed':pending?'in-progress':i===career.currentRound?'up-next':'')+'"><span class="career-round">'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(circuit.name)+'</b><small>'+esc(circuit.country)+' · '+circuitKm(circuit)+' km</small></div><span class="career-race-status">'+status+'</span><span class="career-winner">'+(result?'Vincitore: '+esc(winner?.name||'Nessun classificato'):i===career.currentRound?'PROSSIMO GP':'GP '+String(i+1).padStart(2,'0'))+'</span></li>';
 }).join('');
}
function renderCareerHistory(){
 $('careerHistory').innerHTML=career.results.length?career.results.slice().reverse().map(result=>{
  const circuit=careerCircuit(result.circuitId),winner=result.rows.find(r=>r.id===result.winnerId),player=result.rows.find(r=>r.id==='player');
  return '<details class="career-history-race"><summary><span class="career-round">'+String(result.round+1).padStart(2,'0')+'</span><span><b>'+esc(circuit.name)+'</b><small>Vincitore: '+esc(winner?.name||'Nessun classificato')+'</small></span><span class="career-history-score">'+(player.classified?'P'+player.position:player.status==='DSQ'?'DSQ':'NC')+'<small>+'+player.points+' punti</small></span></summary>'+careerResultTable(result)+'</details>';
 }).join(''):'<div class="career-empty"><span>01 → '+career.calendar.length+'</span><h3>Il mondiale comincia qui.</h3><p>Completa il primo Gran Premio per vedere risultati, punti e podi della tua stagione.</p></div>';
}
function careerChampionCard(list,constructors=false){
 const lead=list[0],tied=list.filter(entry=>compareCareerStats(entry,lead)===0),second=list[1];
 const title=constructors?'CAMPIONE COSTRUTTORI':'CAMPIONE PILOTI';
 const name=tied.map(entry=>entry.name).join(' / '),team=constructors?'MONDIALE COSTRUTTORI':[...new Set(tied.map(entry=>careerTeamLabel(entry.team)))].join(' / ');
 return '<article class="career-champion '+(constructors?'constructor-champion':'')+'"><span class="career-champion-kicker">'+(tied.length===1?title:'PARITÀ ASSOLUTA')+'</span><h3>'+esc(name)+'</h3><p>'+esc(team)+'</p><div class="career-champion-stats">'+careerStat(lead.points,'PUNTI')+careerStat(lead.wins,'VITTORIE')+careerStat(lead.podiums,'PODI')+'</div><small>'+(tied.length>1?'Punti, piazzamenti e qualifiche identici: nessun vincitore arbitrario.':lead.points===second.points?'Parità di punti risolta con il conteggio dei piazzamenti.':'+'+(lead.points-second.points)+' punti sul secondo classificato')+'</small></article>';
}
function renderCareer(){
 const season=ensureCareer(),total=season.calendar.length,standings=careerStandings(season),player=standings.drivers.find(d=>d.id==='player'),complete=season.status==='complete';
 $('careerSeasonTitle').textContent='Campionato F1 · Stagione '+String(season.number).padStart(2,'0');
 $('careerModeLabel').textContent='CARRIERA / '+CAREER_SLOTS[season.kind].label.toUpperCase();
 $('careerDriverCount').textContent=season.roster.length+' PILOTI';$('careerTeamCount').textContent=season.teams.length+' TEAM';
 $('careerProgressText').textContent=season.currentRound+'/'+total+' gare completate';
 $('careerProgress').setAttribute('aria-valuemax',String(total));
 $('careerProgress').setAttribute('aria-valuenow',String(season.currentRound));
 $('careerProgress').innerHTML=season.calendar.map((_,i)=>'<i class="'+(i<season.currentRound?'complete':i===season.currentRound?'next':'')+'" title="Gran Premio '+(i+1)+'"></i>').join('');
 $('careerSaveStatus').textContent=careerSaveError||(careerRecovered?'Progressi recuperati dalla copia di sicurezza.':'Salvataggio automatico · Progressi conservati in questo browser');
 $('careerSaveStatus').classList.toggle('save-error',!!careerSaveError);
 $('careerSummary').innerHTML=careerStat(season.currentRound+'/'+total,'GARE COMPLETATE')+careerStat(season.currentRound?'P'+player.position:'—','LA TUA POSIZIONE')+careerStat(player.points,'I TUOI PUNTI')+careerStat(player.podiums,'I TUOI PODI');
 $('careerNextGP').classList.toggle('hidden',complete);$('careerChampions').classList.toggle('hidden',!complete);$('careerSeasonActions').classList.toggle('hidden',!complete);
 if(complete){
  $('careerChampions').innerHTML='<div class="career-champions-heading"><p class="career-eyebrow">'+total+' GRAN PREMI · STAGIONE CONCLUSA</p><h2>CAMPIONI DEL MONDO</h2></div><div class="career-champion-grid">'+careerChampionCard(standings.drivers)+careerChampionCard(standings.teams,true)+'</div>';
 }else{
  const next=careerCircuit(season.calendar[season.currentRound]),pending=season.pendingRound===season.currentRound;
  $('careerNextGP').innerHTML='<div class="career-next-copy"><p class="career-eyebrow">'+(pending?'GRAN PREMIO IN CORSO':'PROSSIMA SFIDA')+' · GP '+String(season.currentRound+1).padStart(2,'0')+' / '+total+'</p><h2>'+esc(next.name)+'</h2><p class="career-next-location">'+esc(next.country)+' <span>·</span> '+circuitKm(next)+' km <span>·</span> '+next.turns+' curve</p><button type="button" id="careerStartBtn" data-act="careergp" class="main">'+(pending?'RIPRENDI GRAN PREMIO':'INIZIA GRAN PREMIO')+' <span aria-hidden="true">→</span></button><small>'+(pending?'Riprendi il weekend. I risultati dei GP conclusi sono già salvati.':(season.settings.qualiEnabled?'Qualifiche Q1 · Q2 · Q3, scelta gomme e gara':'Scelta gomme e gara')+' con tutte le '+season.roster.length+' monoposto.')+'</small></div><div class="career-next-map">'+circuitMap(next)+'<span>MAPPA DEL CIRCUITO · '+esc(next.direction.toUpperCase())+'</span></div>';
 }
 $('careerDriverStandings').innerHTML=careerDriverTable(standings.drivers);
 $('careerConstructorStandings').innerHTML=careerConstructorTable(standings.teams);
 $('careerStandingsCaption').textContent=(complete?'Classifiche finali · ':'Classifiche aggiornate · ')+season.currentRound+'/'+total+' Gran Premi';
 renderCareerCalendar();renderCareerHistory();renderCareerSettings();setCareerTab(careerTab);
}
