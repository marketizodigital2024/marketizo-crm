(function(){
  'use strict';
  const controls=document.querySelector('.bank-matches-controls');
  if(!controls||typeof getAdminSession!=='function'||getAdminSession()?.role!=='full-admin')return;
  const note=document.createElement('p');note.className='bank-auto-status';note.setAttribute('role','status');note.textContent='Automatsko povezivanje važi za račune od oktobra 2026. Provera je na 15 minuta. Rate i nejasne uplate proveravaš ručno.';
  controls.append(note);
  const button=document.createElement('button');button.type='button';button.className='secondary-button';button.textContent='Proveri i sačuvaj prepoznate uplate';controls.append(button);
  button.addEventListener('click',async()=>{
    button.disabled=true;note.textContent='Proveravam uplate i čuvam samo one koje su jasno povezane sa računom…';
    try{
      const response=await fetch('/api/bank-reconcile',{method:'POST',headers:{Authorization:'Bearer '+getAdminSession().token},cache:'no-store'});
      const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Upis nije potvrđen.');
      note.textContent=result.posted.length?'Sačuvano '+result.posted.length+' sigurnih uplata. Osveži stranicu da vidiš sačuvane statuse.':'Provera završena. Nema novih uplata koje mogu automatski da se povežu sa računom.';
      if(result.posted.length){const reload=document.createElement('button');reload.type='button';reload.className='secondary-button';reload.textContent='Prikaži sačuvane statuse';reload.addEventListener('click',()=>location.reload());controls.append(reload);}
    }catch(error){note.textContent=error.message||'Provera trenutno nije dostupna.';}finally{button.disabled=false;}
  });
})();
