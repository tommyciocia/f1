'use strict';
/* Funzioni di utilità generiche (DOM, matematica, testo sicuro) */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angDiff=(a,b)=>((a-b+Math.PI*3)%(Math.PI*2))-Math.PI;
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
