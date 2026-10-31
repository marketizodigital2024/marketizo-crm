// Copy-only monthly collector. Existing October trigger names remain compatible.
// Install only after approval of the extra Drive write permission.
let MONTHLY_ROOT='',MONTHLY_MONTH='';
const MONTHLY_YEAR_ROOT='1vL62ar7aimBXdqu1--q2EU4URLeuALxy';
const MONTHLY_NAMES=['Januar','Februar','Mart','April','Maj','Jun','Jul','Avgust','Septembar','Oktobar','Novembar','Decembar'];
function monthlyContext_(month,office){
 if(!/^20[0-9]{2}-(0[1-9]|1[0-2])$/.test(month))throw Error('Neispravan mesec.');
 MONTHLY_MONTH=month;
 if(!office){MONTHLY_ROOT=monthlyCall_().folderId||'';return;}
 const year=month.slice(0,4),years=monthlyList_("'"+MONTHLY_YEAR_ROOT+"' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '"+year+"'");
 if(years.length>1)throw Error('Dupliran godišnji folder.');
 const yearId=years[0]?.id||monthlyDrive_('files?fields=id',{method:'post',contentType:'application/json',payload:JSON.stringify({name:year,mimeType:'application/vnd.google-apps.folder',parents:[MONTHLY_YEAR_ROOT]})}).id;
 const name='Racuni '+MONTHLY_NAMES[Number(month.slice(5))-1],folders=monthlyList_("'"+yearId+"' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '"+name+"'");
 if(folders.length>1)throw Error('Dupliran mesečni folder.');
 MONTHLY_ROOT=folders[0]?.id||monthlyDrive_('files?fields=id',{method:'post',contentType:'application/json',payload:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:[yearId]})}).id;
 monthlyCall_({kind:'folder',year,folderId:MONTHLY_ROOT});
}
const MONTHLY_ISSUED='1wkk-iEAkLnqtYMDAgc3RXCkqCH1fnVd_';
function monthlyCall_(body,original){
 const o={headers:{Authorization:'Bearer '+ScriptApp.getIdentityToken()},muteHttpExceptions:true};
 if(body){o.method='post';o.contentType='application/json';o.payload=JSON.stringify(body);}
 const r=UrlFetchApp.fetch('https://app.marketizo.com/api/finance-monthly-documents'+'?month='+encodeURIComponent(MONTHLY_MONTH)+(original?'&original='+encodeURIComponent(original):''),o),d=JSON.parse(r.getContentText());
 if(r.getResponseCode()!==200||!d.ok)throw Error(d.error||'Evidencija nije potvrđena.');return d;
}
function monthlyDrive_(path,options){
 const o=options||{};o.headers={Authorization:'Bearer '+ScriptApp.getOAuthToken()};o.muteHttpExceptions=true;
 const r=UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/'+path,o);
 if(r.getResponseCode()<200||r.getResponseCode()>=300)throw Error('Drive operacija nije potvrđena ('+r.getResponseCode()+').');return JSON.parse(r.getContentText());
}
function monthlyList_(query){
 let files=[],next='';do{const d=monthlyDrive_('files?q='+encodeURIComponent(query+' and trashed = false')+'&pageSize=1000&fields='+encodeURIComponent('nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,sha256Checksum,properties)')+(next?'&pageToken='+encodeURIComponent(next):''));files=files.concat(d.files||[]);next=d.nextPageToken||'';}while(next);return files;
}
function monthlyFolder_(name){
 const found=monthlyList_("'"+MONTHLY_ROOT+"' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '"+name+"'");
 if(found.length>1)throw Error('Dupliran odredišni podfolder.');
 return found[0]?.id||monthlyDrive_('files?fields=id',{method:'post',contentType:'application/json',payload:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:[MONTHLY_ROOT]})}).id;
}
function monthlyHash_(bytes){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(n=>('0'+(n&255).toString(16)).slice(-2)).join('');}
function monthlyMedia_(id){const r=UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media',{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});if(r.getResponseCode()!==200)throw Error('Sadržaj nije pročitan.');return r.getContent();}
function monthlyCopy_(file,bytes){
 const checked=monthlyCall_({kind:'document',file:Object.assign({},file,{data:Utilities.base64Encode(bytes)})});
 if(checked.skip)return true;
 const d=checked.document;if(d.copy?.verified)return true;
 if(file.source==='gmail'&&googleGet_('https://gmail.googleapis.com/gmail/v1/users/me/profile').emailAddress==='buchhaltung@marketizo.com')return true;
 const reserved=monthlyCall_({kind:'reserve',sha256:d.sha256});if(!reserved.allowed)return false;
 const parent=monthlyFolder_(d.bucket),existing=monthlyList_("'"+parent+"' in parents and properties has { key='marketizoSha256' and value='"+d.sha256+"' }");
 if(existing.length>1)throw Error('Postoji više kopija istog dokumenta.');
 let target=existing[0];
 if(!target){
  // Always create a byte-for-byte new file; never edit, move or trash originals.
  const boundary='marketizo_'+Utilities.getUuid().replace(/-/g,''),metadata={name:file.name,parents:[parent],properties:{marketizoSha256:d.sha256,marketizoMonth:MONTHLY_MONTH}};
  const a=Utilities.newBlob('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+boundary+'\r\nContent-Type: '+file.mimeType+'\r\n\r\n').getBytes().concat(bytes,Utilities.newBlob('\r\n--'+boundary+'--').getBytes());
  const r=UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,parents,sha256Checksum',{method:'post',contentType:'multipart/related; boundary='+boundary,headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},payload:a,muteHttpExceptions:true});
  if(r.getResponseCode()!==200)throw Error('Kreiranje kopije nije potvrđeno.');target=JSON.parse(r.getContentText());
 }
 const meta=monthlyDrive_('files/'+encodeURIComponent(target.id)+'?fields=id,parents,trashed');
 if(meta.trashed||!meta.parents.includes(parent))throw Error('Kopija nije u očekivanom podfolderu.');
 const actualSha256=monthlyHash_(monthlyMedia_(target.id));if(actualSha256!==d.sha256)throw Error('Kopija nema isti sadržaj kao original.');
 const ack=monthlyCall_({kind:'copied',sha256:d.sha256,actualSha256,fileId:target.id,folderId:MONTHLY_ROOT});if(!ack.verifiedReadback)throw Error('Ponovno čitanje nije potvrdilo kopiju.');return true;
}
function installMonthlyCollector(){
 const account=googleGet_('https://gmail.googleapis.com/gmail/v1/users/me/profile').emailAddress;
 if(!['office@marketizo.com','buchhaltung@marketizo.com'].includes(account))throw Error('Nalog nije odobren.');
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='collectOctoberInvoices'))ScriptApp.newTrigger('collectOctoberInvoices').timeBased().everyMinutes(15).create();
 collectMonthlyInvoices();
}
function installOctoberCollector(){return installMonthlyCollector();}
function collectOctoberInvoices(){return collectMonthlyInvoices();}
function collectMonthlyInvoices(){
 const month=Utilities.formatDate(new Date(),'Europe/Vienna','yyyy-MM');
 collectMonthInvoices_(month);
 const previous=new Date(month+'-01T12:00:00Z');previous.setUTCMonth(previous.getUTCMonth()-1);
 collectMonthInvoices_(Utilities.formatDate(previous,'Europe/Vienna','yyyy-MM'));
}
function collectOctoberBackfill(){return collectMonthInvoices_('2026-10');}
function collectMonthInvoices_(month){
 const lock=LockService.getUserLock();if(!lock.tryLock(1000))return;
 let pending=false;try{
 const prefix=month==='2026-10'?'octoberSources':'monthlySources'+month;
 const until=Date.now()+110000,properties=PropertiesService.getUserProperties();let saved='';for(let i=0;i<Number(properties.getProperty(prefix+'Chunks')||0);i++)saved+=properties.getProperty(prefix+'Chunk'+i)||'';
 let done=JSON.parse(saved||properties.getProperty(prefix+'V1')||'{}');const account=googleGet_('https://gmail.googleapis.com/gmail/v1/users/me/profile').emailAddress;
 if(!['office@marketizo.com','buchhaltung@marketizo.com'].includes(account))throw Error('Nalog nije odobren.');
 monthlyContext_(month,account==='office@marketizo.com');
 const known=monthlyCall_();let count=0;
 if(account==='office@marketizo.com'){
 const folders=monthlyList_("'"+MONTHLY_ROOT+"' in parents and mimeType = 'application/vnd.google-apps.folder'");let copies=[];
 for(const folder of folders)copies=copies.concat(monthlyList_("'"+folder.id+"' in parents"));
 for(const d of known.documents.filter(d=>d.copy?.verified))if(!copies.some(f=>f.id===d.copy.fileId&&f.sha256Checksum===d.sha256)){monthlyCall_({kind:'copy-missing',sha256:d.sha256,fileId:d.copy.fileId});done={};}
 for(const d of known.documents.filter(d=>d.source==='gmail'&&!d.copy?.verified)){if(count>=25||Date.now()>until){pending=true;break;}const queued=monthlyCall_(null,d.sha256);if(!queued.file)throw Error('Original u redu za kopiranje nije dostupan.');if(!monthlyCopy_(queued.file,Utilities.base64Decode(queued.file.data)))pending=true;count++;}
 }
 if(account==='office@marketizo.com')for(const f of monthlyList_("'"+MONTHLY_ISSUED+"' in parents")){
  if(!/^Rechnung[_ ]*\d+[_ ].+\.(pdf|docx)$/i.test(f.name)||Number(f.size)>1500000)continue;
  const key='d:'+f.id+':'+f.modifiedTime;if(done[key])continue;if(Date.now()>until||count>=25){pending=true;break;}
  if(monthlyCopy_({name:f.name,mimeType:f.mimeType,source:'drive',sourceId:f.id,sourceFolder:MONTHLY_ISSUED},monthlyMedia_(f.id)))done[key]=true;else pending=true;count++;
 }
 let next='';do{
  if(Date.now()>until||count>=25){pending=true;break;}
  // Epoch boundaries avoid Gmail's default Pacific timezone; filter exact Vienna month below.
  const start=new Date(month+'-01T00:00:00Z'),end=new Date(start);end.setUTCMonth(end.getUTCMonth()+1);
  const query='after:'+Math.floor((start.getTime()-86400000)/1000)+' before:'+Math.ceil((end.getTime()+86400000)/1000)+' -in:sent -in:drafts has:attachment {filename:pdf filename:docx}';
  const page=googleGet_('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q='+encodeURIComponent(query)+(next?'&pageToken='+encodeURIComponent(next):''));
  for(const item of page.messages||[]){
   if(done['m:'+item.id])continue;if(Date.now()>until||count>=25){pending=true;break;}
   const m=googleGet_('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+item.id+'?format=full'),receivedAt=new Date(Number(m.internalDate)).toISOString();
   if(Utilities.formatDate(new Date(receivedAt),'Europe/Vienna','yyyy-MM')!==month||(m.labelIds||[]).some(l=>['SENT','DRAFT','TRASH','SPAM'].includes(l)))continue;
   const headers=m.payload.headers||[],header=n=>(headers.find(h=>h.name.toLowerCase()===n)||{}).value||'',parts=[];
   function walk(p){if(/\.(pdf|docx)$/i.test(p.filename||''))parts.push(p);(p.parts||[]).forEach(walk);}walk(m.payload);let complete=true;
   for(const p of parts){if(p.body.size>1500000){complete=false;pending=true;continue;}let b=p.body.data;if(!b&&p.body.attachmentId)b=googleGet_('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+m.id+'/attachments/'+p.body.attachmentId).data;if(!b){complete=false;continue;}
    if(!monthlyCopy_({source:'gmail',sourceId:m.id+'_'+p.partId.replace(/\./g,'_'),name:p.filename,mimeType:/\.pdf$/i.test(p.filename)?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',receivedAt,from:header('from'),subject:header('subject'),sent:false},Utilities.base64DecodeWebSafe(b)))complete=false;
   }
   if(complete)done['m:'+item.id]=true;else pending=true;count++;
  }
  if(pending)break;next=page.nextPageToken||'';
 }while(next);
 const encoded=JSON.stringify(done),chunks=Math.ceil(encoded.length/7500);for(let i=0;i<chunks;i++)properties.setProperty(prefix+'Chunk'+i,encoded.slice(i*7500,(i+1)*7500));properties.setProperty(prefix+'Chunks',String(chunks));
 monthlyCall_({kind:'heartbeat',complete:!pending,pending});console.log(JSON.stringify({account,checked:count,pending}));
 }catch(e){try{monthlyCall_({kind:'heartbeat',complete:false,error:e.message});}catch(_){}throw e;}finally{lock.releaseLock();}
}
