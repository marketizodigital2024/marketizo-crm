'use strict';
// Separate from work-log/state writes: policy notifications never mutate or reset portal forms.
(()=>{
 let token='',loading=false,rows=[],banner=null,dialog=null,nav=null,reminded=new Set();
 const node=(tag,text,attrs={})=>{const e=document.createElement(tag);if(text!==null)e.textContent=text;for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
 function session(){try{const s=JSON.parse(localStorage.getItem('marketizoEmployeeSession')||'null');return s?.token&&s.expiresAt>Date.now()?s:null;}catch{return null;}}
 async function api(params={},body,raw=false){const s=session();if(!s)throw Error('Prijavi se ponovo.');const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);try{const r=await fetch('/api/codeks?'+new URLSearchParams(params),{method:body?'POST':'GET',cache:'no-store',signal:abort.signal,headers:{Authorization:'Bearer '+s.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(session()?.token!==s.token)throw Error('Prijava je promenjena.');if(raw&&r.ok)return r.blob();const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'Kodeks trenutno nije dostupan.');return d;}finally{clearTimeout(timer);}}
 function reset(){banner?.remove();dialog?.remove();nav?.remove();banner=dialog=nav=null;rows=[];reminded=new Set();}
 function showList(){
  dialog?.remove();dialog=node('dialog',null,{class:'codeks-notify-dialog','aria-label':'Moji kodeksi'});dialog.append(node('h2','Moji kodeksi'));const list=node('div',null,{class:'codeks-doc-list'}),message=node('p','',{role:'status'});
  const statuses={pending:'Čeka vaš potpis',processing:'Potpis je sačuvan. PDF se priprema.',signed:'Potpisano',expired:'Poziv je istekao. Obratite se administratoru.',voided:'Poziv je poništen.'};
  for(const row of rows){const article=node('article',null);article.append(node('strong',row.title),node('small',statuses[row.status]||row.status));
   if(row.status==='pending'){const b=node('button','Pročitaj i potpiši',{class:'primary-button',type:'button'});b.addEventListener('click',async()=>{const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;b.disabled=true;try{const d=await api({},{action:'open',id:row.id});if(tab)tab.location.replace(d.url);else{const a=node('a','Otvori kodeks',{href:d.url,target:'_blank',rel:'noopener noreferrer'});message.replaceChildren(a);}}catch(e){tab?.close();message.textContent=e.message;}finally{b.disabled=false;}});article.append(b);}
   if(row.status==='signed'){const b=node('button','Preuzmi potpisani PDF',{class:'secondary-button',type:'button'});b.addEventListener('click',async()=>{b.disabled=true;try{const blob=await api({action:'receipt',id:row.id},null,true),url=URL.createObjectURL(blob),a=node('a',null,{href:url,download:'Marketizo-Kodeks-v'+row.version+'.pdf'});a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){message.textContent=e.message;}finally{b.disabled=false;}});article.append(b);}
   list.append(article);
  }
  if(!rows.length)list.append(node('p','Nemate dodeljenih kodeksa.'));const close=node('button','Zatvori',{type:'button',class:'secondary-button'});close.addEventListener('click',()=>dialog.close());dialog.append(list,message,close);document.body.append(dialog);dialog.showModal();
 }
 function render(){
  const app=document.getElementById('employeeApp'),main=app?.querySelector('main.main'),navigation=app?.querySelector('nav.nav');if(!main||!navigation)return;
  const pending=rows.filter(r=>r.status==='pending');
  if(!nav){nav=node('button','Kodeks',{type:'button',class:'nav-item'});nav.addEventListener('click',showList);navigation.append(nav);}nav.textContent='Kodeks'+(pending.length?' ('+pending.length+')':'');
  banner?.remove();banner=null;
  if(pending.length){banner=node('section',null,{class:'codeks-alert','aria-label':'Kodeks za potpis'});const text=node('div',null);text.append(node('strong','Novi kodeks čeka vaš potpis'),node('p',pending.length+' dokument(a) za čitanje i potpisivanje.'));const button=node('button','Otvori kodeks',{type:'button',class:'primary-button'});button.addEventListener('click',showList);banner.append(text,button);main.querySelector('header')?.after(banner);
   const unseen=pending.some(r=>!reminded.has(r.id));if(unseen&&!document.querySelector('dialog[open]')){pending.forEach(r=>reminded.add(r.id));showList();}
  }
 }
 async function refresh(){
  const s=session(),app=document.getElementById('employeeApp');
  if(!s||!app||app.hidden){if(token){token='';reset();}return;}
  if(s.token!==token){reset();token=s.token;}
  if(loading||document.hidden)return;loading=true;const expected=token;
  try{const next=[];let offset=0,more=true;while(more&&offset<10000){const d=await api({action:'list',mine:'true',offset});next.push(...d.items);more=d.hasMore;offset+=40;}if(token===expected&&session()?.token===expected){rows=next;render();}}
  catch{if(banner){const p=banner.querySelector('p');if(p)p.textContent='Provera novih potpisa trenutno nije dostupna. Pokušaćemo ponovo.';}}
  finally{loading=false;}
 }
 const app=document.getElementById('employeeApp');if(app)new MutationObserver(refresh).observe(app,{attributes:true,attributeFilter:['hidden']});
 window.addEventListener('storage',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);setInterval(refresh,20000);refresh();
})();
