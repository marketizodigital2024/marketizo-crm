const token = new URLSearchParams(location.search).get('token') || '';
const intro = document.getElementById('intro');
const form = document.getElementById('feedbackForm');
const fields = document.getElementById('fields');
const message = document.getElementById('feedbackMessage');
let survey;
function el(tag,text,attributes={}) { const node=document.createElement(tag); if(text!=null) node.textContent=text; for(const [key,value] of Object.entries(attributes)) node.setAttribute(key,value); return node; }
async function load() {
  try {
    const response=await fetch(`/api/kpi?action=form&token=${encodeURIComponent(token)}`,{cache:'no-store'});
    const data=await response.json(); if(!response.ok) throw new Error(data.error||'Upitnik nije dostupan.');
    survey=data; intro.textContent=`${data.clientName} · ${data.month}. Ocenite saradnju od 1 do 5. Vaši odgovori biće povezani sa timom koji je radio za vas u ovom periodu.`;
    for(const q of data.questions) {
      const box=el('fieldset'); box.style.border='0'; box.style.borderTop='1px solid #e5eae5'; box.style.padding='15px 0';
      box.append(el('legend',q.text));
      if(q.type==='rating') { const group=el('div',null,{class:'ratings'}); for(let n=1;n<=5;n++) { const label=el('label'); const input=el('input',null,{type:'radio',name:q.id,value:String(n)}); if(q.required&&n===1) input.required=true; label.append(input,el('span',String(n))); group.append(label); } box.append(group); }
      else if(q.type==='choice') { const select=el('select',null,{name:q.id}); select.append(el('option','Izaberite odgovor',{value:''})); for(const option of q.options||[]) select.append(el('option',option,{value:option})); select.required=Boolean(q.required); box.append(select); }
      else { const input=el('textarea',null,{name:q.id}); input.required=Boolean(q.required); box.append(input); }
      fields.append(box);
    }
    form.hidden=false;
  } catch(error) { intro.textContent=error.message; }
}
form.addEventListener('submit',async event=>{
  event.preventDefault(); message.textContent='Šaljemo odgovore…';
  const values=new FormData(form), answers=Object.fromEntries(survey.questions.map(q=>[q.id,values.get(q.id)||'']));
  try { const response=await fetch('/api/kpi?action=submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,answers})}); const data=await response.json(); if(!response.ok) throw new Error(data.error||'Slanje nije uspelo.'); form.hidden=true; intro.textContent='Hvala! Vaši odgovori su sačuvani.'; message.textContent=''; }
  catch(error){message.textContent=error.message;}
});
load();
