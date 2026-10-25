'use strict';
/* Menu "Gestisci paddock": scuderie, piloti e statistiche delle squadre */
document.querySelectorAll('[data-ts]').forEach(el=>el.addEventListener('input',()=>{const team=clamp(+$('padTeam').value||0,0,TEAMS.length-2);S.teamStats[team][+el.dataset.ts]=+el.value;save();renderPaddock();}));
function renderPaddock(){
 const sel=$('padTeam');let team=clamp(+sel.value||0,0,TEAMS.length-2);
 sel.innerHTML=TEAMS.slice(0,-1).map((t,i)=>`<option value="${i}">${esc(teamName(i))}</option>`).join('');sel.value=team;
 const residents=S.roster.map((d,i)=>({d,i})).filter(x=>x.d[3]===team);
 $('padTeamName').value=teamName(team);
 const opts=S.roster.map((d,i)=>`<option value="${i}">${esc(d[1])} · ${esc(d[0])} #${d[2]} (${esc(teamName(d[3]))})</option>`).join('');
 ['padDriver1','padDriver2'].forEach((id,slot)=>{$(id).innerHTML=opts;$(id).value=residents[slot]?residents[slot].i:'';});
 const st=S.teamStats[team],toPct=v=>Math.round(v*100);
 document.querySelectorAll('[data-ts]').forEach(el=>{const k=+el.dataset.ts;el.value=st[k];document.querySelector('[data-tv="'+k+'"]').textContent=toPct(st[k])+'%';});
 $('padStats').innerHTML=`<span style="background:${TEAMS[team][0]}"></span><b>Auto ${esc(teamName(team))}</b><small>Velocità ${toPct(st[0])}% · Accelerazione ${toPct(st[1])}% · Frenata ${toPct(st[2])}% · Aderenza ${toPct(st[3])}%</small>`;
 $('paddockList').innerHTML=TEAMS.slice(0,-1).map((t,i)=>{const ds=S.roster.filter(d=>d[3]===i),x=S.teamStats[i];return `<div class="paddock-team ${i===team?'selected':''}"><span style="background:${t[0]}"></span><div><b>${esc(teamName(i))}</b><small>${ds.map(d=>`${esc(d[1])} #${d[2]}`).join(' · ')}</small></div><em>V ${toPct(x[0])} · A ${toPct(x[1])} · F ${toPct(x[2])} · G ${toPct(x[3])}</em></div>`;}).join('');
}
function swapPaddockDriver(slot,target){
 const team=clamp(+$('padTeam').value||0,0,TEAMS.length-2),residents=S.roster.map((d,i)=>({d,i})).filter(x=>x.d[3]===team),source=residents[slot];
 if(!source||target===source.i||!S.roster[target])return renderPaddock();
 const oldTeam=S.roster[target][3];S.roster[target][3]=team;S.roster[source.i][3]=oldTeam;save();renderPaddock();
}
$('padTeam').addEventListener('change',renderPaddock);
$('padTeamName').addEventListener('input',()=>{const team=clamp(+$('padTeam').value||0,0,TEAMS.length-2);S.teamNames[team]=$('padTeamName').value.slice(0,28)||TEAMS[team][2];save();renderPaddock();});
$('padDriver1').addEventListener('change',()=>swapPaddockDriver(0,+$('padDriver1').value));
$('padDriver2').addEventListener('change',()=>swapPaddockDriver(1,+$('padDriver2').value));
