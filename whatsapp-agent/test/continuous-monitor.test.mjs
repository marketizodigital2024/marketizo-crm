import assert from 'node:assert/strict';
import { createGroupMonitor } from '../src/group-monitor.js';
import { createOutbox } from '../src/outbox.js';
import { matchClickUpClient, taskToClient, fetchClickUpClients } from '../src/clickup.js';
import { validateReview, renderDailyReport } from '../src/report-builder.js';
const quiet = { log(){}, error(){} };
let clock = 1000000, saved, chats = [{id:'a',name:'A',isGroup:true},{id:'b',name:'B',isGroup:true}], failB=true;
let remembered=[], enqueued=[];
const mon = createGroupMonitor({getChats:async()=>chats, fetchMessages:async(chat)=>{if(chat.id==='b'&&failB)throw Error('temporary failure');return [{id:chat.id+'1',timestamp:clock/1000,body:'hello'}];},idOf:x=>x,isReady:()=>true,load:()=>null,save:s=>saved=structuredClone(s),remember:async(c,m)=>remembered.push(m.id),enqueue:m=>enqueued.push(m.id),onInventory:()=>{},now:()=>clock,logger:quiet});
await mon.reconcile();
assert.equal(mon.status().discoveredGroups,2);assert.equal(mon.status().readableGroups,1);assert.deepEqual(enqueued,[]);
failB=false;clock+=100000;chats.push({id:'c',name:'C',isGroup:true});
await mon.reconcile();assert.equal(mon.status().readableGroups,3);assert.deepEqual(enqueued,['a1']);
chats=[];await mon.reconcile();assert.equal(mon.status().discoveredGroups,3);assert.ok(mon.status().discoveryError);
const restored = createGroupMonitor({getChats:async()=>[{id:'a',name:'A renamed',isGroup:true}],fetchMessages:async()=>[],idOf:x=>x,isReady:()=>true,load:()=>saved,save(){},remember(){},enqueue(){},onInventory(){},now:()=>clock,logger:quiet});
await restored.reconcile();assert.equal(restored.chats()[0].name,'A renamed');assert.equal(restored.status().discoveredGroups,1);
let active=true,reads=0;
const scoped=createGroupMonitor({getChats:async()=>[{id:'scope',name:'Scoped',isGroup:true}],fetchMessages:async()=>{reads++;return [];},idOf:x=>x,isReady:()=>true,load:()=>null,save(){},remember(){},enqueue(){},onInventory(){},shouldRead:()=>active,now:()=>clock,logger:quiet});
await scoped.reconcile();assert.equal(reads,1);
active=false;await scoped.reconcile();assert.equal(reads,1);assert.equal(scoped.status().monitoredGroups,0);assert.equal(scoped.status().excludedGroups,1);
active=true;clock+=1000000;await scoped.reconcile();assert.equal(reads,2);assert.equal(scoped.status().monitoredGroups,1);

let outSaved, sends=0, shouldFail=true;
const box = createOutbox({load:()=>null,save:s=>outSaved=structuredClone(s),isReady:()=>true,now:()=>clock,logger:quiet,transmit:async()=>{sends++;if(shouldFail)throw Error('offline');return {id:{_serialized:'sent1'},ack:1};}});
await assert.rejects(()=>box.send('owner','one complete Posch message','posch'));
assert.equal(box.status().pending,1);
shouldFail=false;clock+=60000;await box.retry();assert.equal(box.status().pending,0);assert.equal(box.status().sentUnconfirmed,1);
await box.send('owner','one complete Posch message','posch');assert.equal(sends,2);
box.ack('sent1',2);assert.equal(box.status().delivered,1);
const restoredBox=createOutbox({load:()=>outSaved,save(){},transmit:()=>{throw Error('must not resend');},isReady:()=>true,now:()=>clock,logger:quiet});
await restoredBox.send('owner','one complete Posch message','posch');
await assert.rejects(()=>box.send('owner','x'.repeat(3501),'too long'));

const posch=taskToClient({id:'test-posch',name:'Posch Grabstein',custom_fields:[
{name:'Snimatelj',value:['camera-id'],type_config:{options:[{id:'camera-id',label:'Camera A'}]}},
{name:'Paid Ads',value:0,type_config:{options:[{orderindex:0,name:'Buyer A'}]}},
{name:'Editor (Tim)',value:[{name:'Editor A'}]}]});
assert.equal(posch.videographer,'Camera A');assert.equal(posch.paidAds,'Buyer A');assert.equal(posch.editor,'Editor A');
assert.equal(matchClickUpClient('Grabsteine POSCH | Marketizo Digital',[posch]).clickupTaskId,posch.clickupTaskId);
assert.equal(matchClickUpClient('',[posch]),null);assert.equal(matchClickUpClient(posch.name,[posch,{...posch,clickupTaskId:'duplicate'}]),null);
const bau={name:'Aleksandar Bau',clickupTaskId:'12445eqxrvy',clientStatus:'Aktivan'},dentist={name:'Aleksandar Simic - Zubar',clickupTaskId:'dentist',clientStatus:'Aktivan'};
assert.equal(matchClickUpClient('Aleksandar | Marketizo Digital',[bau,dentist]).clickupTaskId,bau.clickupTaskId);
assert.equal(matchClickUpClient('Aleksandar | Marketizo Digital',[dentist]),null);
let requests=0;
const clients=await fetchClickUpClients({token:'test',listId:'test',fetchImpl:async()=>({ok:true,json:async()=>({tasks:requests++===0?Array.from({length:100},(_,i)=>({id:String(i),name:'Client '+i})): [{id:'101',name:'last'}]})})});
assert.equal(clients.length,101);assert.equal(requests,2);
await assert.rejects(()=>fetchClickUpClients({token:'test',listId:'test',fetchImpl:async()=>({ok:false,status:429})}));
assert.throws(()=>validateReview(['Posch'],{reviewedGroups:[],alerts:[]}));
assert.throws(()=>validateReview(['Posch'],{reviewedGroups:['Posch'],alerts:[{group:'invented',severity:'YELLOW',summary:'x'}]}));
const alert={group:'Posch',severity:'YELLOW',summary:'One combined problem',nextAction:'Assigned editor',evidence:'Today'};
const parts=renderDailyReport({date:'2026-10-14',reviewedCount:1,groupCount:1,alerts:[alert],coverage:{matchedGroups:1,clientGroups:1,clickupFresh:true,unmatchedGroups:[],unreadableGroups:[],historyGapGroups:[]}});
assert.equal(parts.length,1);assert.ok(parts[0].includes('One combined problem'));
console.log('PASS: discovery/new/renamed groups, failed-group isolation, restart cursor restore, durable send retries/ACK/dedup, no truncation, structured role decoding, safe name matching, ClickUp pagination/API failure, review coverage, one complete client message.');
