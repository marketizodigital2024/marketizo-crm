// Install independently under office@marketizo.com and buchhaltung@marketizo.com.
// Google scopes are read-only; this script never sends or deletes email/files.
const FINANCE_ENDPOINT='https://app.marketizo.com/api/finance-source-sync';
const FINANCE_FOLDER='1wkk-iEAkLnqtYMDAgc3RXCkqCH1fnVd_';
function connectMarketizo(){
 const token=ScriptApp.getIdentityToken();
 if(!token)throw new Error('Potrebna je Google potvrda identiteta.');
 const claims=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(token.split('.')[1])).getDataAsString());
 console.log('Google nalog: '+claims.email);console.log('OAuth client ID za serversku dozvolu: '+claims.aud);
 console.log('Posle potvrde serverske dozvole pokreni installMarketizoSync.');
}
function installMarketizoSync(){
 const account=googleGet_('https://gmail.googleapis.com/gmail/v1/users/me/profile').emailAddress;
 if(!['office@marketizo.com','buchhaltung@marketizo.com'].includes(account))throw new Error('Koristi office ili buchhaltung nalog.');
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='syncMarketizoFinance'))ScriptApp.newTrigger('syncMarketizoFinance').timeBased().everyMinutes(15).create();
 syncMarketizoFinance();
}
function googleGet_(url){
 const r=UrlFetchApp.fetch(url,{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});
 if(r.getResponseCode()!==200)throw new Error('Google čitanje nije uspelo ('+r.getResponseCode()+').');
 return JSON.parse(r.getContentText());
}
function financeCall_(body){
 const options={headers:{Authorization:'Bearer '+ScriptApp.getIdentityToken()},muteHttpExceptions:true};
 if(body){options.method='post';options.contentType='application/json';options.payload=JSON.stringify(body);}
 const r=UrlFetchApp.fetch(FINANCE_ENDPOINT,options),d=JSON.parse(r.getContentText());
 if(r.getResponseCode()!==200||!d.ok)throw new Error(d.error||'Marketizo server nije potvrdio prijem.');
 return d;
}
function syncMarketizoFinance(){
 const lock=LockService.getUserLock();if(!lock.tryLock(1000))return;
 try{
 const started=Date.now(),deadline=started+260000,account=googleGet_('https://gmail.googleapis.com/gmail/v1/users/me/profile').emailAddress;
 if(!['office@marketizo.com','buchhaltung@marketizo.com'].includes(account))throw new Error('Nalog nije odobren.');
 const known=financeCall_();let filesRead=0,messagesRead=0,pending=false;
 if(account==='office@marketizo.com'){
  let files=[],page='';
  do{
   const q="'"+FINANCE_FOLDER+"' in parents and trashed = false";
   const d=googleGet_('https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&pageSize=1000&fields='+encodeURIComponent('nextPageToken,files(id,name,mimeType,modifiedTime,sha256Checksum,size)')+(page?'&pageToken='+encodeURIComponent(page):''));
   files=files.concat(d.files||[]);page=d.nextPageToken||'';
   if(Date.now()>deadline)throw new Error('Lista foldera nije kompletna. Provera će se ponoviti.');
  }while(page);
  files=files.filter(f=>/^Rechnung[_ ]*\d{3,9}[_ ].+\.(pdf|docx)$/i.test(f.name)&&['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.mimeType));
  financeCall_({kind:'manifest',folderId:FINANCE_FOLDER,complete:true,files:files});
  const changed=files.filter(f=>f.modifiedTime>='2026-09-01'&&known.files[f.id]!==f.modifiedTime).sort((a,b)=>b.modifiedTime.localeCompare(a.modifiedTime));
  for(const f of changed){
   if(Date.now()>deadline||filesRead>=40){pending=true;break;}
   if(Number(f.size)>1500000)continue;
   const r=UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(f.id)+'?alt=media',{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});
   if(r.getResponseCode()!==200)throw new Error('Original nije preuzet iz Drive-a.');
   financeCall_({kind:'file',folderId:FINANCE_FOLDER,file:Object.assign({},f,{data:Utilities.base64Encode(r.getContent())})});filesRead++;
  }
 }
 const processed=new Set(known.messages||[]);let next='';
 do{
  if(Date.now()>deadline){pending=true;break;}
  const q='in:sent after:2026/09/01 has:attachment {filename:pdf filename:docx}';
  const d=googleGet_('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q='+encodeURIComponent(q)+(next?'&pageToken='+encodeURIComponent(next):''));
  for(const item of d.messages||[]){
   if(processed.has(item.id))continue;
   if(Date.now()>deadline||messagesRead>=40){pending=true;break;}
   const m=googleGet_('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+item.id+'?format=full');
   if(!(m.labelIds||[]).includes('SENT')||(m.labelIds||[]).includes('DRAFT'))continue;
   const headers=m.payload.headers||[],get=name=>(headers.find(h=>h.name.toLowerCase()===name.toLowerCase())||{}).value||'';
   const from=(get('From').match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig)||[]).map(x=>x.toLowerCase());
   if(!from.includes(account))continue;
   const to=(get('To').match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig)||[]).map(x=>x.toLowerCase());
   if(!to.length)continue;
   const parts=[];function walk(p){if(/^Rechnung[_ ]*\d{3,9}[_ ].+\.(pdf|docx)$/i.test(p.filename||''))parts.push(p);(p.parts||[]).forEach(walk);}walk(m.payload);
   const attachments=[];
   for(const p of parts){
    if(p.body.size>1500000)continue;
    let b=p.body.data;if(!b&&p.body.attachmentId)b=googleGet_('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+m.id+'/attachments/'+p.body.attachmentId).data;
    if(b)attachments.push({filename:p.filename,data:Utilities.base64Encode(Utilities.base64DecodeWebSafe(b))});
   }
   if(!attachments.length)continue;
   financeCall_({kind:'message',message:{id:m.id,account,from:account,to,sent:true,labels:m.labelIds,sentAt:new Date(Number(m.internalDate)).toISOString(),attachments}});messagesRead++;
  }
  if(pending)break;next=d.nextPageToken||'';
 }while(next);
 financeCall_({kind:'heartbeat'});
 console.log(JSON.stringify({account,filesRead,messagesRead,pending,seconds:Math.round((Date.now()-started)/1000)}));
 }finally{lock.releaseLock();}
}
