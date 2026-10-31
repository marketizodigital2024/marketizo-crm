(function(){
 'use strict';
 const unitNames={scenario:'scenarija',scenario_revision:'ispravljenih scenarija',clip:'klipova',clip_revision:'ispravljenih klipova',story:'storija',post:'postova',task:'zadataka',call:'poziva',shoot:'snimanja',clip_check:'proverenih klipova'};
 const attached=new WeakMap();
 function headers(){try{const employee=JSON.parse(localStorage.getItem('marketizoEmployeeSession')||'null'),admin=JSON.parse(localStorage.getItem('marketizoAdminSession')||'null');const s=location.pathname.includes('employee-login')?employee:admin;return s?.token?{Authorization:`Bearer ${s.token}`}:{}}catch{return {}}}
 function attach(form,context){
  if(!form||attached.has(form))return;
  const fieldset=document.createElement('fieldset');fieldset.className='production-fields span-2';fieldset.hidden=true;
  fieldset.style.cssText='grid-column:1/-1;border:1px solid #c8ddd3;border-radius:14px;padding:18px;background:#f3f8f5;min-width:0';
  fieldset.innerHTML='<legend style="font-weight:750">Količina rada</legend><p data-production-hint style="margin:0 0 12px;color:#486253"></p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px"><label>Posao / serija<select name="productionBatch"><option value="">Novi posao / serija</option></select></label><label>Naziv posla<input name="productionLabel" maxlength="160" placeholder="npr. Oktobarski prodajni klipovi" /></label><label>Status<select name="productionStatus"><option value="done">Posao je završen</option><option value="progress">Rad je još u toku</option></select></label><label data-production-quantity-label>Broj završenih komada<input name="productionQuantity" type="number" min="1" max="10000" step="1" /></label></div><p style="margin:12px 0 0;font-size:12px;color:#486253">Ako radiš isti posao više puta, nastavi postojeću seriju. Broj komada upiši samo pri završetku. Svi minuti te serije ulaze u prosek.</p>';
  const anchor=form.querySelector('[name="minutes"]')?.closest('label');if(!anchor)return;anchor.after(fieldset);
  const state={rules:[],batches:[],ready:false,error:'',key:'',unit:'',context,fieldset};attached.set(form,state);
  const fields=form.elements;
  function render(){
   const c=context(), key=[c.employeeId,c.activityId,c.clientId].join('|');
   if(key!==state.key){state.key=key;fields.productionBatch.value='';fields.productionLabel.value='';fields.productionQuantity.value='';fields.productionStatus.value='done';delete form.dataset.productionNewBatch;}
   const batches=state.batches.filter(b=>b.employeeId===c.employeeId&&b.activityId===c.activityId&&b.clientId===(c.clientId||''));
   const selected=fields.productionBatch.value;
   fields.productionBatch.replaceChildren(new Option('Novi posao / serija',''),...batches.map(b=>new Option(b.label,b.batchId)));fields.productionBatch.value=batches.some(b=>b.batchId===selected)?selected:'';
   const batch=batches.find(b=>b.batchId===fields.productionBatch.value);
   state.unit=batch?.unit||state.rules.find(r=>r.activity_id===c.activityId)?.unit||'';
   const visible=!!unitNames[state.unit];fieldset.hidden=!visible;
   fieldset.querySelector('[data-production-hint]').textContent=visible?`Pratimo broj ${unitNames[state.unit]} i ukupno vreme za isti posao.`:state.error;
   fields.productionLabel.required=visible;fields.productionLabel.readOnly=!!batch;if(batch)fields.productionLabel.value=batch.label;
   fields.productionQuantity.required=visible&&fields.productionStatus.value==='done';fields.productionQuantity.disabled=!visible||fields.productionStatus.value!=='done';fields.productionLabel.disabled=!visible;
   fieldset.querySelector('[data-production-quantity-label]').firstChild.textContent=`Broj završenih ${unitNames[state.unit]||'komada'}`;
  }
  state.render=render;
  state.refresh=async()=>{if(state.loading)return;state.loading=true;try{const r=await fetch('/api/work-analytics?view=input',{cache:'no-store',headers:headers(),signal:AbortSignal.timeout(15000)}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Količine nisu dostupne');state.rules=d.rules;state.batches=d.batches;state.ready=true;state.error='';render();}catch(e){state.error=e.message;state.ready=false;}finally{state.loading=false;}};
  form.addEventListener('focusin',()=>{if(!state.ready)state.refresh();});
  form.addEventListener('change',render);fields.productionBatch.addEventListener('change',()=>{delete form.dataset.productionNewBatch;render();});
  form.addEventListener('reset',()=>{delete form.dataset.productionNewBatch;setTimeout(()=>{state.key='';state.refresh();},0);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)state.refresh();});state.refresh();
 }
 function read(form){const s=attached.get(form);if(!s)return null;s.render();if(!s.ready)throw Error('Podešavanja količine nisu učitana. Sačekaj pa pokušaj ponovo; tvoj unos ostaje u formi.');if(!unitNames[s.unit])return null;
  const f=form.elements,done=f.productionStatus.value==='done',quantity=done?Number(f.productionQuantity.value):0,label=f.productionLabel.value.trim();
  if(!label||label.length>160||!Number.isInteger(quantity)||quantity<0||quantity>10000||(done&&quantity<1))throw Error('Unesi naziv posla i broj završenih komada. Ako posao nije završen, izaberi Rad je još u toku.');
  if(!f.productionBatch.value&&!form.dataset.productionNewBatch)form.dataset.productionNewBatch=crypto.randomUUID();
  return {batchId:f.productionBatch.value||form.dataset.productionNewBatch,label,unit:s.unit,completed:done,quantity};
 }
 function restore(form,output){const s=attached.get(form);if(!s||!output)return;s.render();form.elements.productionBatch.value=s.batches.some(b=>b.batchId===output.batchId)?output.batchId:'';if(!form.elements.productionBatch.value)form.dataset.productionNewBatch=output.batchId;form.elements.productionLabel.value=output.label;form.elements.productionStatus.value=output.completed?'done':'progress';form.elements.productionQuantity.value=output.completed?String(output.quantity):'';s.render();}
 function saved(form){const s=attached.get(form);if(!s)return;delete form.dataset.productionNewBatch;for(const n of ['productionLabel','productionQuantity'])form.elements[n].value='';form.elements.productionBatch.value='';s.refresh();}
 window.MarketizoProduction={attach,read,restore,saved};
})();
