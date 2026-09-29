const token = new URLSearchParams(location.search).get('token') || '';
const intro = document.getElementById('intro');
const form = document.getElementById('feedbackForm');
const fields = document.getElementById('fields');
const message = document.getElementById('feedbackMessage');
const success = document.getElementById('feedbackSuccess');
let survey;
const roleInfo = {
  Scenarista: { label:'Scenarista', help:'piše ideje i scenarije za sadržaj', question:'Da li su ideje i scenariji jasni, zanimljivi i u skladu sa vašim brendom?' },
  'Voice Over': { label:'Voice over', help:'snima glas za vaše video-klipove', question:'Kako ocenjujete kvalitet i ton glasa u video-klipovima?' },
  Editor: { label:'Editor', help:'montira i završava vaše video-klipove', question:'Kako ocenjujete montažu i završni kvalitet video-klipova?' },
  Checking: { label:'Kontrola kvaliteta', help:'proverava sadržaj pre nego što vam ga pošaljemo', question:'Da li je sadržaj pažljivo proveren pre isporuke?' },
  'Social Media Manager': { label:'Social Media Manager', help:'vodi komunikaciju, dizajn i organizaciju sadržaja', question:'Kako ocenjujete komunikaciju, dizajn i organizaciju sadržaja?' },
  Snimatelj: { label:'Snimatelj', help:'snima sadržaj i vodi vas tokom snimanja', question:'Kako ocenjujete pripremu, komunikaciju i profesionalnost tokom snimanja?' },
  'Paid Ads': { label:'Paid Ads', help:'vodi vaše plaćene reklame i prati njihove rezultate', question:'Kako ocenjujete vođenje plaćenih reklama i rezultate kampanja?' },
};
function el(tag,text,attributes={}) { const node=document.createElement(tag); if(text!=null) node.textContent=text; for(const [key,value] of Object.entries(attributes)) node.setAttribute(key,value); return node; }
async function load() {
  try {
    const response=await fetch(`/api/kpi?action=form&token=${encodeURIComponent(token)}`,{cache:'no-store'});
    const data=await response.json(); if(!response.ok) throw new Error(data.error||'Upitnik nije dostupan.');
    survey=data;
    document.title=`Ocena saradnje · ${data.clientName} · Marketizo Digital`;
    intro.textContent=`${data.clientName} · ${data.month}. Ocenite ljude i tim koji su radili sa vama u ovom periodu.`;
    data.questions.forEach((q,index)=>{
      const box=el('fieldset',null,{class:'feedback-question'});
      const heading=el('div',null,{class:'question-heading'});
      const role=roleInfo[q.target];
      const questionText=role?`${role.question}${q.targetName?` (${q.targetName})`:''}`:q.text;
      heading.append(el('span',String(index+1).padStart(2,'0'),{class:'question-number'}),el('legend',questionText));
      if(q.required) heading.append(el('span','Obavezno',{class:'required-pill'}));
      box.append(heading);
      if(role) box.append(el('p',`${role.label} · ${role.help}`,{class:'role-explainer'}));
      if(q.type==='rating') { const group=el('div',null,{class:'ratings'}); for(let n=1;n<=5;n++) { const label=el('label'); const input=el('input',null,{type:'radio',name:q.id,value:String(n)}); if(q.required&&n===1) input.required=true; label.append(input,el('span',String(n))); group.append(label); } box.append(group); }
      else if(q.type==='choice') { const select=el('select',null,{name:q.id,'aria-label':q.text}); select.append(el('option','Izaberite odgovor',{value:''})); for(const option of q.options||[]) select.append(el('option',option,{value:option})); select.required=Boolean(q.required); box.append(select); }
      else { const input=el('textarea',null,{name:q.id,placeholder:'Napišite svoj odgovor…','aria-label':q.text}); input.required=Boolean(q.required); box.append(input); }
      fields.append(box);
    });
    form.hidden=false;
  } catch(error) { intro.textContent=error.message; }
}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const submit=form.querySelector('button[type="submit"]');
  submit.disabled=true; submit.textContent='Šaljemo odgovore…'; message.textContent='';
  const values=new FormData(form), answers=Object.fromEntries(survey.questions.map(q=>[q.id,values.get(q.id)||'']));
  try { const response=await fetch('/api/kpi?action=submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,answers})}); const data=await response.json(); if(!response.ok) throw new Error(data.error||'Slanje nije uspelo.'); form.hidden=true; document.querySelector('.feedback-hero').hidden=true; success.hidden=false; message.textContent=''; }
  catch(error){message.textContent=error.message; submit.disabled=false; submit.innerHTML='Pošalji odgovore <span aria-hidden="true">→</span>';}
});
load();
