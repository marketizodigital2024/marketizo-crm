const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {employeeRoles,employeeHasSmm}=require('../lib/employee-roles.js');
const {canManage}=require('../lib/questionnaire-model.js');
assert.deepEqual(employeeRoles('Social Media Manager / Scenarista'),['Social Media Manager','Scenario']);
assert.deepEqual(employeeRoles('SMM / Snimatelj / Interna koordinacija'),['Social Media Manager','Snimatelj','Interna koordinacija']);
assert.deepEqual(employeeRoles('Founder / Strategija'),['Founder']);
assert.deepEqual(employeeRoles('Co-founder / Operativa / SMM'),['Co Founder','Social Media Manager']);
assert.deepEqual(employeeRoles('Social Media Manager / smm / Editor'),['Social Media Manager','Editor']);
assert(employeeHasSmm('Scenarista / SMM'));assert(!employeeHasSmm('Assistant SMM'));assert(!employeeHasSmm('Editor'));
assert(canManage({id:'teodora',position:'Social Media Manager / Scenarista'}));assert(canManage({id:'teodora',position:'Scenarista'}));assert(!canManage({id:'teodora',position:'SMM / Scenarista',active:false}));
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.events={};this.style={};this.value='';this.defaultValue='';this.checked=false;this.required=false;}
 append(...children){this.children.push(...children)} replaceChildren(...children){this.children=[...children]}
 querySelectorAll(selector){return this.children.flatMap(c=>c instanceof Element?((c.tagName==='INPUT'?[c]:[]).concat(c.querySelectorAll(selector))):[])}
 querySelector(s){return this.querySelectorAll(s)[0]||null}setCustomValidity(text){this.validityMessage=text}
 addEventListener(type,fn){this.events[type]=fn}dispatchEvent(e){this.events[e.type]?.(e)}closest(){return this.label}insertAdjacentElement(where,e){this.adjacent=e}
}
const input=new Element('input');input.name='position';input.value='Social Media Manager / Scenarista / Posebna uloga';input.required=true;input.label=new Element('label');input.form=new Element('form');
const ctx={employeeRoles,employeeHasSmm,state:{employees:[{position:'Snimatelj / Scenarista'}]},WeakMap,Event:class{constructor(type){this.type=type}},setTimeout:fn=>fn(),document:{querySelectorAll:()=>[input],createElement:t=>new Element(t),createTextNode:t=>t}};
vm.createContext(ctx);const src=fs.readFileSync(__dirname+'/../app.js','utf8');const ui=src.slice(src.indexOf('// Multi-role UI keeps'));assert(src.includes('setEmployeePositions(form.elements.position, employee?.position || "");'));vm.runInContext(ui,ctx);
assert.equal(input.type,'hidden');assert.equal(input.value,'Social Media Manager / Scenarista / Posebna uloga');
let boxes=input.label.adjacent.children[1].querySelectorAll('input');assert.deepEqual(boxes.filter(c=>c.checked).map(c=>c.value),['Scenario','Social Media Manager','Posebna uloga']);
const editor=boxes.find(c=>c.value==='Editor');editor.checked=true;editor.events.change();assert(employeeRoles(input.value).includes('Editor'));assert(employeeRoles(input.value).includes('Posebna uloga'));
const smm=boxes.find(c=>c.value==='Social Media Manager');smm.checked=false;smm.events.change();assert(employeeHasSmm(input.value));assert(employeeRoles(input.value).includes('Scenario'));
ctx.setEmployeePositions(input,'Nepoznata pozicija / SMM');boxes=input.label.adjacent.children[1].querySelectorAll('input');assert(boxes.some(c=>c.value==='Nepoznata pozicija'&&c.checked));assert.equal(input.value,'Nepoznata pozicija / SMM');
ctx.setEmployeePositions(input,'');boxes=input.label.adjacent.children[1].querySelectorAll('input');assert(boxes.every(c=>!c.checked));assert(boxes[0].validityMessage.includes('bar jednu'));
const nav=fs.readFileSync(__dirname+'/../questionnaire-nav.js','utf8');assert(nav.includes('employeeHasSmm(employee.position || position)'));
console.log('PASS: combined SMM roles, aliases, owner titles, unknown roles, no eager rewriting, multi-select additions/removals, required-role validation, server and navigation permission parity.');

assert(employeeHasSmm('Social Media Manager Leader'));
assert(canManage({id:'leader-test',position:'Social Media Manager Leader'}));
assert(employeeHasSmm('Scenario Leader'));
assert(canManage({id:'scenario-leader',position:'Scenario Leader'}));
