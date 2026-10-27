'use strict';
/* Utilità interfaccia: messaggi toast e visibilità dei pannelli */
function toast(t){const e=$('toast');e.textContent=t;e.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.opacity=0,2500);}
function show(id){document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('hidden',p.id!==id));$('menuBackdrop').classList.toggle('hidden',state!=='menu'&&state!=='prerace');}
function hideAll(){show('');}
