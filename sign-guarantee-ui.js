'use strict';
(()=>{
 const marker='[IZBOR GARANCIJE / GARANTIEZIEL]';
 const relevant=doc=>doc?.contractDetails?.audience==='client'&&doc.content?.blocks?.some(b=>b.runs.map(r=>r.text).join('').includes(marker));
 function create(parent,id){
  const f=document.createElement('fieldset');f.id=id;f.hidden=true;
  f.innerHTML='<legend>Cilj garancije</legend><p class="sign-hint">Prvi mesec saradnje je pripremni i testni, bez garancije rezultata. Garancija važi od drugog meseca saradnje. Izaberi cilj koji će biti upisan u ugovor.</p><label><input type="radio" name="'+id+'Goal" value="leads"> Najmanje 30 kvalifikovanih leadova</label><label><input type="radio" name="'+id+'Goal" value="reach"> 10× veći doseg</label><p data-reach class="sign-hint" hidden>Platforma, početni doseg i konkretan cilj pisano se potvrđuju sa klijentom pre početka garantovanog perioda. Sada nije potreban unos tih podataka.</p>';
  parent.append(f);f.addEventListener('change',()=>sync(f));return f;
 }
 function sync(f){const active=!f.hidden;f.querySelector('[data-reach]').hidden=!(active&&f.querySelector('input[value="reach"]').checked);f.querySelectorAll('input[type="radio"]').forEach(e=>e.required=active);}
 function load(f,doc,enabled=true){f.hidden=!enabled||!relevant(doc);const g=doc?.contractDetails?.guarantee||{};f.querySelectorAll('input[type="radio"]').forEach(e=>e.checked=e.value===g.goal);sync(f);}
 function read(f){if(f.hidden)return undefined;const goal=f.querySelector('input[type="radio"]:checked')?.value||'';return{goal,...(goal==='reach'?{deferred:true}:{})};}
 window.MarketizoGuarantee={create,load,read,relevant};
})();
