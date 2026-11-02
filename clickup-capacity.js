'use strict';
const session=getAdminSession(),statusEl=document.getElementById('status'),results=document.getElementById('results');
if(!session)location.href=adminLoginPath();
function text(tag,value,parent){const el=document.createElement(tag);el.textContent=value;parent.appendChild(el);return el;}
async function refresh(apply=false){
 document.querySelectorAll('button').forEach(b=>b.disabled=true);statusEl.textContent='Proveravam ClickUp…';
 try{const r=await fetch('/api/clickup-capacity',{method:apply?'POST':'GET',headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},...(apply?{body:JSON.stringify({apply:true})}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Obračun nije dostupan.');
  statusEl.textContent=`${d.automatic?'Automatski obračun uključen.':'Automatski obračun još nije uključen.'} Provereno: ${new Date(d.checkedAt).toLocaleString('sr-RS')}. ${d.changed} izmena sačuvano, ${d.pending} čeka osvežavanje.`;results.replaceChildren();
  const table=document.createElement('table');const head=document.createElement('tr');['Zaposleni','Sati nedeljno','Kapacitet mesečno','Planirani sati','Zauzeće'].forEach(v=>text('th',v,head));table.appendChild(head);
  for(const row of d.rows){const tr=document.createElement('tr');[row.name,row.weekly,row.capacity.toFixed(2),row.hours,row.percent+'%'].forEach(v=>text('td',v,tr));table.appendChild(tr);}results.appendChild(table);
  for(const row of d.rows.filter(r=>r.roles.length>1)){text('h2',row.name,results);for(const role of row.roles)text('p',`${role.name}: ${role.hours} h; ${role.capacity==null?'kapacitet nije podeljen':role.capacity.toFixed(2)+' h kapaciteta; '+role.percent+'%'}`,results);}
  if(d.warnings.length){text('h2','Proveri podatke',results);for(const warning of d.warnings)text('p',warning,results);}
 }catch(e){statusEl.textContent=e.message;}finally{document.querySelectorAll('button').forEach(b=>b.disabled=false);}
}
document.getElementById('refresh').addEventListener('click',()=>refresh());document.getElementById('apply').addEventListener('click',()=>refresh(true));if(session)refresh();
