const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../work-production.js','utf8'),start=source.indexOf(' function read(form)'),end=source.indexOf('\n function restore',start),attached=new WeakMap();let ids=0;
const ctx={attached,unitNames:{clip:'klipova',scenario:'scenarija',post:'postova'},crypto:{randomUUID:()=>`batch-${++ids}`}};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
const form={dataset:{},elements:{productionQuantity:{value:'4'}}},state={render(){},ready:true,unit:'clip'};attached.set(form,state);
let r=ctx.read(form);assert.equal(r.quantity,4);assert.equal(r.completed,true);assert.equal(r.label,'4 klipova');assert.equal(r.batchId,'batch-1');assert.equal(ctx.read(form).batchId,r.batchId,'Retry keeps one batch identity');
for(const value of ['','0','-1','1.5','10001','text']){form.elements.productionQuantity.value=value;assert.throws(()=>ctx.read(form),/količinu/);}
state.unit='';assert.equal(ctx.read(form),null,'Non-production activities still record minutes alone');state.unit='scenario';state.ready=false;form.elements.productionQuantity.value='3';assert.throws(()=>ctx.read(form),/nisu učitana/);assert.equal(form.elements.productionQuantity.value,'3','Loading failure never clears work draft');
state.ready=true;state.pendingOutput=null;delete form.dataset.productionNewBatch;r=ctx.read(form);assert.equal(r.quantity,3);assert.equal(r.unit,'scenario');assert.equal(r.label,'3 scenarija');assert.equal(r.batchId,'batch-2');
assert.doesNotMatch(source,/name="production(?:Batch|Label|Status)"/,'Quantity is the only additional form control');
console.log('PASS simple production form: quantity alone, positive whole counts, unchanged non-production entries, stable retry identity and retained drafts');
