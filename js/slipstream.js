'use strict';
/* Scia: vantaggio per chi segue un'auto da vicino */
function updateSlipstream(){
  for(const c of cars){let tw=0;const cs=Math.cos(c.a),sn=Math.sin(c.a); // scia: auto davanti entro ~320 px nella mia corsia
   for(const o of cars){if(o===c||hid(o))continue;const dx=o.x-c.x,dy=o.y-c.y,f=dx*cs+dy*sn;if(f>25&&f<320&&Math.abs(-dx*sn+dy*cs)<46)tw=Math.max(tw,1-f/320);}c.tow=tw;}
}
