"use strict";
const { isDeepStrictEqual } = require('node:util');
const fields = ['activityId','activityName','activityCategory','clientId','clientName'];

// Offline proposal evaluator only. It has no database client or network access.
function recoverMetadata(latest, plan) {
  const changes = new Map();
  for (const proposal of plan.proposals || []) {
    if (changes.has(proposal.id)) throw Error('Dupliran ID predloga.');
    if (!proposal.before || proposal.before.id !== proposal.id || !proposal.patch || Object.keys(proposal.patch).length !== fields.length || fields.some(field => typeof proposal.patch[field] !== 'string') || Object.keys(proposal.patch).some(field => !fields.includes(field))) throw Error('Neispravna polja predloga.');
    changes.set(proposal.id,proposal);
  }
  const skipped=[],found=new Set();let applied=0;
  const employeeWorkLogs=(latest.employeeWorkLogs || []).map(log=>{
    const proposal=changes.get(log.id);if(!proposal)return log;
    if(found.has(log.id))throw Error('Dupliran ID postojećeg zapisa.');found.add(log.id);
    if(!isDeepStrictEqual(log,proposal.before)){skipped.push({id:log.id,reason:'Zapis je promenjen nakon provere'});return log;}
    applied++;return {...log,...proposal.patch};
  });
  for(const id of changes.keys())if(!found.has(id))skipped.push({id,reason:'Zapis više ne postoji'});
  return {payload:{...latest,employeeWorkLogs},applied,skipped};
}
module.exports={recoverMetadata};
