'use strict';
const status=document.querySelector('#status'),result=document.querySelector('#result');
let latest='';
function headers(){let s;try{s=JSON.parse(localStorage.getItem('marketizoAdminSession')||'null')}catch{}return {'Content-Type':'application/json',Authorization:'Bearer '+(s?.token||'')}}
async function request(url,options={}){const r=await fetch(url,{...options,headers:headers()});const data=await r.json();if(!r.ok)throw new Error(data.error||'Provera nije uspela.');return data}
function details(data){result.textContent=JSON.stringify(data,null,2)}
async function inventory(){const r=await request('/api/backup?inspect=1');latest=r.independent.backups[0]?.pathname||'';status.textContent=latest?'Poslednja kopija: '+latest:'Još nema nezavisne kopije.';document.querySelector('#verify').disabled=!latest;}
async function action(task){document.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Provera je u toku…';try{await task()}catch(e){status.textContent=e.message}finally{document.querySelectorAll('button').forEach(b=>b.disabled=false)}}
document.querySelector('#run').onclick=()=>action(async()=>{const r=await request('/api/backup',{method:'POST',body:'{}'});latest=r.independent.pathname;details({backup:latest,procitanaKopijaPotvrdjena:r.independent.verified,upitnici:r.questionnaires,upozorenje:r.databaseWarning||null});status.textContent='Backup je sačuvan i ponovo pročitan. Podaci nisu menjani.'});
document.querySelector('#verify').onclick=()=>action(async()=>{const checked=await request('/api/backup?inspect=1&verify=1&pathname='+encodeURIComponent(latest));const r=await request('/api/restore-backup',{method:'POST',body:JSON.stringify({pathname:latest})});details({kopija:latest,integritet:checked.verified,proveraBezUpisa:r.dryRun,upitnici:r.questionnaires});status.textContent='Kopija je čitljiva i prošla je proveru za vraćanje. Live podaci nisu menjani.'});
inventory().catch(e=>status.textContent=e.message);
