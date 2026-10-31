(function(){
 'use strict';
 const unitNames={scenario:'scenarija',scenario_revision:'ispravljenih scenarija',clip:'klipova',clip_revision:'ispravljenih klipova',story:'storija',post:'postova',task:'zadataka',call:'poziva',shoot:'snimljenih reelova',clip_check:'proverenih klipova',voiceover:'voiceovera'};
 const attached=new WeakMap();
 function headers(){try{const employee=JSON.parse(localStorage.getItem('marketizoEmployeeSession')||'null'),admin=JSON.parse(localStorage.getItem('marketizoAdminSession')||'null');const s=location.pathname.includes('employee-login')?employee:admin;return s?.token?{Authorization:`Bearer ${s.token}`}:{}}catch{return {}}}
 function attach(form,context){
  if(!form||attached.has(form))return;
  const fieldset=document.createElement('label');fieldset.className='production-fields';fieldset.hidden=true;
  fieldset.innerHTML='<span data-production-quantity-label>Količina</span><input name="productionQuantity" type="number" inputmode="numeric" min="1" max="10000" step="1" placeholder="npr. 3" />';
  const anchor=form.querySelector('[name="minutes"]')?.closest('label');if(!anchor)return;anchor.after(fieldset);
  const state={rules:[],ready:false,error:'',key:'',unit:'',context,fieldset};attached.set(form,state);
  const fields=form.elements;
  function render(){
   const c=context(), key=[c.employeeId,c.activityId,c.clientId].join('|');
   if(key!==state.key){state.key=key;fields.productionQuantity.value='';delete form.dataset.productionNewBatch;state.pendingOutput=null;}
   // Preserve the unit and identity while an uncertain save is retried.
   state.unit=state.pendingOutput?.unit||state.rules.find(r=>r.activity_id===c.activityId)?.unit||'';
   const visible=!!unitNames[state.unit];fieldset.hidden=!visible;
   fields.productionQuantity.required=visible;fields.productionQuantity.disabled=!visible;
   fieldset.querySelector('[data-production-quantity-label]').textContent=`Broj ${unitNames[state.unit]||'komada'}`;
  }
  state.render=render;
  state.refresh=async()=>{if(state.loading)return;state.loading=true;try{const r=await fetch('/api/work-analytics?view=input',{cache:'no-store',headers:headers(),signal:AbortSignal.timeout(15000)}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Količine nisu dostupne');state.rules=d.rules;state.ready=true;state.error='';render();}catch(e){state.error=e.message;state.ready=false;}finally{state.loading=false;}};
  form.addEventListener('focusin',()=>{if(!state.ready)state.refresh();});
  form.addEventListener('change',render);
  form.addEventListener('reset',()=>{state.pendingOutput=null;delete form.dataset.productionNewBatch;setTimeout(()=>{state.key='';state.refresh();},0);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)state.refresh();});state.refresh();
 }
 function read(form){const s=attached.get(form);if(!s)return null;s.render();if(!s.ready)throw Error('Podešavanja količine nisu učitana. Sačekaj pa pokušaj ponovo; tvoj unos ostaje u formi.');if(!unitNames[s.unit])return null;
  const quantity=Number(form.elements.productionQuantity.value);
  if(!Number.isInteger(quantity)||quantity<1||quantity>10000)throw Error('Unesi količinu: ceo broj od 1 do 10000.');
  if(!form.dataset.productionNewBatch)form.dataset.productionNewBatch=crypto.randomUUID();
  // One entry is one completed quantity. Keep the existing atomic storage format,
  // historical series and backups compatible without asking employees for a series.
  const output={batchId:form.dataset.productionNewBatch,label:s.pendingOutput?.label||`${quantity} ${unitNames[s.unit]}`,unit:s.unit,completed:true,quantity};s.pendingOutput=output;return output;
 }
 function restore(form,output){const s=attached.get(form);if(!s||!output)return;s.render();s.pendingOutput=output;form.dataset.productionNewBatch=output.batchId;form.elements.productionQuantity.value=output.completed?String(output.quantity):'';s.render();}
 function saved(form){const s=attached.get(form);if(!s)return;s.pendingOutput=null;delete form.dataset.productionNewBatch;form.elements.productionQuantity.value='';s.refresh();}
 window.MarketizoProduction={attach,read,restore,saved};
})();
