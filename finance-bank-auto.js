(function(){
  'use strict';
  const controls=document.querySelector('.bank-matches-controls');
  if(!controls||typeof getAdminSession!=='function'||getAdminSession()?.role!=='full-admin')return;
  const note=document.createElement('p');note.className='bank-auto-status';note.setAttribute('role','status');note.textContent='Automatski upis sigurnih uplata je uključen od oktobra: server proverava na 15 minuta. Rate i nejasne veze ostaju za proveru.';
  controls.append(note);
  const button=document.createElement('button');button.type='button';button.className='secondary-button';button.textContent='Proveri i evidentiraj sigurne uplate';controls.append(button);
  button.addEventListener('click',async()=>{
    button.disabled=true;note.textContent='Proveravam i čuvam samo nedvosmislene bankarske uplate…';
    try{
      const response=await fetch('/api/bank-reconcile',{method:'POST',headers:{Authorization:'Bearer '+getAdminSession().token},cache:'no-store'});
      const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Upis nije potvrđen.');
      note.textContent=result.posted.length?'Sačuvano '+result.posted.length+' sigurnih uplata. Osveži stranicu da vidiš sačuvane statuse.':'Provera završena. Nema novih nedvosmislenih uplata za automatski upis.';
      if(result.posted.length){const reload=document.createElement('button');reload.type='button';reload.className='secondary-button';reload.textContent='Prikaži sačuvane statuse';reload.addEventListener('click',()=>location.reload());controls.append(reload);}
    }catch(error){note.textContent=error.message||'Provera trenutno nije dostupna.';}finally{button.disabled=false;}
  });
})();
