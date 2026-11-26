'use strict';
const {employeeRoles}=require('./employee-roles.js');
const {norm}=require('./clickup-capacity.js');
const OWNERS=new Set(['emp-miljan','emp-ivana']);
function scope(access,payload){
 if(!access||access.role==='client')return null;
 const actor=(payload.employees||[]).find(e=>e.id===access.employee?.id&&e.status!=='Neaktivan'&&e.active!==false);
 if(!actor)return null;
 if(OWNERS.has(actor.id))return {owner:true,actor,ids:new Set((payload.employees||[]).map(e=>e.id))};
 if(actor.isLeader!==true)return null;
 return {owner:false,actor,ids:new Set((payload.employees||[]).filter(e=>e.leaderId===actor.id&&e.id!==actor.id&&!OWNERS.has(e.id)&&e.isLeader!==true).map(e=>e.id))};
}
function project(snapshot,view){
 const p=snapshot.payload||{},employees=(p.employees||[]).filter(e=>view.ids.has(e.id));
 const logs=(p.employeeWorkLogs||[]).filter(l=>view.ids.has(l.employeeId));
 const clientsUsed=new Set(logs.map(l=>l.clientId)),logIds=new Set(logs.map(l=>l.id));
 return {ok:true,preview:true,scope:view.owner?'all':'team',viewer:{name:view.actor.name,id:view.actor.id},updatedAt:snapshot.updated_at,
  employees:employees.map(e=>({id:e.id,name:e.name,positions:employeeRoles(e.positions?.length?e.positions:e.position),status:e.status,active:e.active!==false&&e.status!=='Neaktivan',isLeader:!!e.isLeader,startDate:e.startDate||'',leaderId:view.owner?e.leaderId||'':undefined})),
  clients:(p.clients||[]).filter(c=>view.owner||clientsUsed.has(c.id)).map(c=>({id:c.id,name:c.name,clickupName:c.clickupName||'',status:c.status,startDate:c.startDate||''})),
  activities:(p.employeeActivities||[]).map(a=>({id:a.id,name:a.name,category:a.category,active:a.active})),
  logs:logs.map(l=>({id:l.id,employeeId:l.employeeId,date:l.date,minutes:Number(l.minutes??Number(l.hours||0)*60),activityId:l.activityId,activityName:l.activityName,activityCategory:l.activityCategory,clientId:l.clientId,clientName:l.clientName,aggregate:/migracija|prenos stvarnog|usklađen mesečni zbir/i.test(`${l.activityName||''} ${l.note||''}`)})),
  rules:(snapshot.production?.rules||[]).map(r=>({activity_id:r.activity_id,unit:r.unit})),
  outputs:(snapshot.production?.outputs||[]).filter(o=>view.ids.has(o.employee_id)&&logIds.has(o.log_id)).map(o=>({log_id:o.log_id,employee_id:o.employee_id,activity_id:o.activity_id,client_id:o.client_id,batch_id:o.batch_id,unit:o.unit,completed:o.completed,quantity:o.quantity})),
 };
}
function assignments(source,payload,view){
 const es=(payload.employees||[]).filter(e=>view.ids.has(e.id)),byName=new Map();
 for(const e of es){const key=norm(e.name);byName.set(key,[...(byName.get(key)||[]),e.id]);}
 const keys=['Scenarista','Snimatelj','Editor','Checking','Social Media Manager','Paid Ads'];
 const rows=[];
 for(const r of source.rows||[]){
  if(r.archived||r.clientStatus!=='Aktivan')continue;
  const roles={};for(const key of keys){roles[key]=String(r[key]||'').split(/\s*;\s*/).flatMap(n=>byName.get(norm(n))?.length===1?byName.get(norm(n)):[]);}
  if(!view.owner&&!Object.values(roles).some(ids=>ids.length))continue;
  const candidates=(payload.clients||[]).filter(c=>norm(c.clickupName||c.name)===norm(r.Klijent));
  rows.push({id:r.taskId,name:r.Klijent,clientId:candidates.length===1?candidates[0].id:'',roles,status:r.clientStatus});
 }
 return {ok:true,live:!!source.live,syncedAt:source.syncedAt||null,error:source.live?null:'Raspodela klijenata trenutno nije dostupna. Prikazana evidencija rada ostaje dostupna.',rows};
}
module.exports={scope,project,assignments};
