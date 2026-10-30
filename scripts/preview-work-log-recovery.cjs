// Offline only: reads local audit exports and writes a local candidate file.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {recoverMetadata}=require('../lib/recover-work-log-metadata.js');
const [sourcePath,planPath,outputPath]=process.argv.slice(2);
if(!sourcePath||!planPath||!outputPath)throw Error('Usage: node scripts/preview-work-log-recovery.cjs source.json proposal-only.json preview.json');
const source=JSON.parse(fs.readFileSync(sourcePath,'utf8')),plan=JSON.parse(fs.readFileSync(planPath,'utf8'));
if(plan.mode!=='PROPOSAL_ONLY_NO_DATABASE_WRITES')throw Error('Expected an offline audit proposal');
const payload=source.employeeWorkLogs?source:{...source,employeeWorkLogs:source.logs};
const before=new Map(payload.employeeWorkLogs.map(l=>[l.id,l]));
assert.equal(before.size,payload.employeeWorkLogs.length,'Duplicate source IDs');
const totals=logs=>{const map={};for(const l of logs){const k=l.employeeId+'|'+l.date;map[k]=(map[k]||0)+Number(l.minutes);}return map;};
const result=recoverMetadata(payload,plan);
assert.deepEqual(totals(result.payload.employeeWorkLogs),totals(payload.employeeWorkLogs),'Daily minute totals changed');
assert.equal(result.payload.employeeWorkLogs.length,payload.employeeWorkLogs.length);
const allowed=new Set(['activityId','activityName','activityCategory','clientId','clientName']);
for(const row of result.payload.employeeWorkLogs){const prior=before.get(row.id);for(const key of new Set([...Object.keys(row),...Object.keys(prior)])){if(!allowed.has(key))assert.deepEqual(row[key],prior[key],'Non-metadata field changed: '+key);}}
const referenceDay=String(source.snapshotAt||'').slice(0,10);
assert.deepEqual(result.payload.employeeWorkLogs.filter(l=>l.date===referenceDay),payload.employeeWorkLogs.filter(l=>l.date===referenceDay),'Audit-day records changed');
fs.writeFileSync(outputPath,JSON.stringify({mode:'OFFLINE_PREVIEW_NOT_FOR_FULL_STATE_RESTORE',snapshotAt:source.snapshotAt,applied:result.applied,skipped:result.skipped,employeeWorkLogs:result.payload.employeeWorkLogs}));
console.log(JSON.stringify({mode:'OFFLINE_ONLY',records:payload.employeeWorkLogs.length,applied:result.applied,skipped:result.skipped.length,referenceDay,referenceDayEntries:payload.employeeWorkLogs.filter(l=>l.date===referenceDay).length,dailyMinuteTotalsUnchanged:true,otherFieldsUnchanged:true}));
