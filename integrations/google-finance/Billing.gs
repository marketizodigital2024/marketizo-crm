// Buchhaltung-only invoice delivery. Install only after approving the billing scopes.
const BILLING_ENDPOINT='https://app.marketizo.com/api/billing-delivery';
function billingCall_(action,data){
 const r=UrlFetchApp.fetch(BILLING_ENDPOINT,{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+ScriptApp.getIdentityToken()},payload:JSON.stringify(Object.assign({},data||{},{action})),muteHttpExceptions:true});const d=JSON.parse(r.getContentText());if(r.getResponseCode()!==200||!d.ok)throw Error(d.error||'CRM nije potvrdio radnju.');return d.data;
}
function billingGoogle_(path,body,method){
 const options={method:method||(body?'post':'get'),headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true};if(body){options.contentType='application/json';options.payload=JSON.stringify(body);}
 const r=UrlFetchApp.fetch(path,options);if(r.getResponseCode()<200||r.getResponseCode()>=300){let reason='';try{const error=JSON.parse(r.getContentText()).error;reason=(error.errors||[]).map(e=>e.reason).join(',')||error.status||'';}catch(ignored){}throw Error((path.includes('/drive/')?'Drive':'Gmail')+' nije potvrdio radnju ('+r.getResponseCode()+'; '+reason+').');}return JSON.parse(r.getContentText());
}
const BILLING_GMAIL='https://gmail.googleapis.com/gmail/v1/users/me/';
function billingLabel_(){const rows=billingGoogle_(BILLING_GMAIL+'labels').labels||[],found=rows.find(x=>x.name==='Poslati računi');return found?.id||billingGoogle_(BILLING_GMAIL+'labels',{name:'Poslati računi',labelListVisibility:'labelShow',messageListVisibility:'show'}).id;}
function billingFolders_(name,parent){
 const q="trashed = false and mimeType = 'application/vnd.google-apps.folder' and name = '"+name+"'"+(parent?" and '"+parent+"' in parents":" and 'root' in parents");
 const rows=billingGoogle_('https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id,name,parents,ownedByMe)').files||[];
 if(rows.length>1||rows.some(x=>x.ownedByMe!==true))throw Error('Proveri vlasništvo ili duplirane arhivske foldere.');return rows[0]?.id||billingGoogle_('https://www.googleapis.com/drive/v3/files?fields=id',{name,mimeType:'application/vnd.google-apps.folder',...(parent?{parents:[parent]}:{}),appProperties:{marketizoBilling:'1'}}).id;
}
function billingHash_(bytes){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(n=>('0'+(n&255).toString(16)).slice(-2)).join('');}
function billingVerifyMessage_(id,doc,isDraft,legacyTest){
 const response=billingGoogle_(BILLING_GMAIL+(isDraft?'drafts/':'messages/')+encodeURIComponent(id)+'?format=full'),m=isDraft?response.message:response,headers=m.payload.headers||[],get=k=>(headers.find(h=>h.name.toLowerCase()===k.toLowerCase())||{}).value||'';
 const address=v=>(v.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig)||[]).map(x=>x.toLowerCase());
 if((!isDraft&&(!m.labelIds?.includes('SENT')||m.labelIds.includes('DRAFT')))||(isDraft&&!m.labelIds?.includes('DRAFT'))||(get('X-Marketizo-Invoice-ID')!==doc.id&&!(legacyTest&&doc.test&&isDraft&&!get('X-Marketizo-Invoice-ID')))||address(get('From')).join()!=='buchhaltung@marketizo.com'||address(get('To')).join()!==doc.snapshot.email||get('Cc')||get('Bcc'))throw Error('Poslata poruka ne odgovara potvrđenom računu.');
 const attachments=[];function walk(p){if(p.filename&&p.mimeType==='application/pdf')attachments.push(p);(p.parts||[]).forEach(walk);}walk(m.payload);
 if(attachments.length!==1)throw Error('PDF prilog nije jedinstven.');const p=attachments[0],data=p.body.data||billingGoogle_(BILLING_GMAIL+'messages/'+m.id+'/attachments/'+p.body.attachmentId).data,bytes=Utilities.base64DecodeWebSafe(data);
 if(billingHash_(bytes)!==doc.pdfSha256)throw Error('Poslati PDF se razlikuje od potvrđenog.');return bytes;
}
function billingFindSent_(doc){
 const refs=[doc.gmailSentRfcMessageId,doc.gmailDraftRfcMessageId,doc.messageId].filter(Boolean),found=new Set();
 for(const ref of refs){const r=billingGoogle_(BILLING_GMAIL+'messages?q='+encodeURIComponent('in:sent rfc822msgid:'+ref)+'&maxResults=10');for(const m of r.messages||[])found.add(m.id);}
 if(!found.size){
  const subject=doc.test?'TEST, kein gültiger Beleg':'Rechnung '+String(doc.number).padStart(6,'0');
  const r=billingGoogle_(BILLING_GMAIL+'messages?q='+encodeURIComponent('in:sent to:'+doc.snapshot.email+' subject:"'+subject+'"')+'&maxResults=100');if(r.nextPageToken)throw Error('Previše kandidata za proveru slanja; ne šaljemo ponovo.');
  for(const item of r.messages||[]){const m=billingGoogle_(BILLING_GMAIL+'messages/'+item.id+'?format=metadata&metadataHeaders=X-Marketizo-Invoice-ID');if((m.payload?.headers||[]).some(h=>h.name.toLowerCase()==='x-marketizo-invoice-id'&&h.value===doc.id))found.add(item.id);}
 }
 if(found.size>1)throw Error('Postoji više poruka za ovaj račun; potrebna provera.');return [...found][0]||'';
}
function billingDraftReference_(id){const m=billingGoogle_(BILLING_GMAIL+'drafts/'+encodeURIComponent(id)+'?format=full').message;return(m.payload.headers||[]).find(h=>h.name.toLowerCase()==='message-id')?.value||'';}

function billingMime_(doc){
 const s=doc.snapshot,number=doc.test?'TEST':String(doc.number).padStart(6,'0'),boundary='marketizo_'+doc.id.replace(/-/g,''),subject=Utilities.base64Encode(Utilities.newBlob((doc.test?'Marketizo Digital – TEST, kein gültiger Beleg':'Marketizo Digital – Rechnung '+number)).getBytes()),text=doc.test?'TEST – KEIN GÜLTIGER BELEG. Keine Zahlung erforderlich. Diese Nachricht prüft nur den Versand und die Archivierung.':'Guten Tag,\n\nim Anhang finden Sie unsere Rechnung Nr. '+number+'.\nBitte verwenden Sie die Rechnungsnummer als Zahlungsreferenz.\n\nMit freundlichen Grüßen\nMarketizo Digital e.U.\nbuchhaltung@marketizo.com';
 return ['From: Marketizo Digital <buchhaltung@marketizo.com>','To: '+s.email,'Message-ID: '+doc.messageId,'X-Marketizo-Invoice-ID: '+doc.id,'Subject: =?UTF-8?B?'+subject+'?=','MIME-Version: 1.0','Content-Type: multipart/mixed; boundary="'+boundary+'"','','--'+boundary,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',Utilities.base64Encode(Utilities.newBlob(text).getBytes()),'--'+boundary,'Content-Type: application/pdf; name="Rechnung_'+number+'.pdf"','Content-Disposition: attachment; filename="Rechnung_'+number+'.pdf"','Content-Transfer-Encoding: base64','',doc.pdfBase64.match(/.{1,76}/g).join('\r\n'),'--'+boundary+'--',''].join('\r\n');
}
function billingArchive_(doc,bytes,root){
 const date=doc.snapshot.issueDate,months=['Januar','Februar','Mart','April','Maj','Jun','Jul','Avgust','Septembar','Oktobar','Novembar','Decembar'],year=billingFolders_(date.slice(0,4),root),month=billingFolders_(date.slice(5,7)+' - '+months[Number(date.slice(5,7))-1],year),folder=billingFolders_('Poslati',month);
 const q="trashed = false and '"+folder+"' in parents and appProperties has { key='marketizoInvoiceId' and value='"+doc.id+"' }";
 const rows=billingGoogle_('https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id,parents)').files||[];if(rows.length>1)throw Error('Duplirana arhivska kopija.');let id=rows[0]?.id;
 if(!id){const boundary='marketizo_'+Utilities.getUuid().replace(/-/g,''),meta={name:'Rechnung_'+String(doc.number).padStart(6,'0')+'.pdf',parents:[folder],appProperties:{marketizoInvoiceId:doc.id,marketizoSha256:doc.pdfSha256}},body=Utilities.newBlob('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+boundary+'\r\nContent-Type: application/pdf\r\n\r\n').getBytes().concat(bytes,Utilities.newBlob('\r\n--'+boundary+'--').getBytes());const r=UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'post',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},contentType:'multipart/related; boundary='+boundary,payload:body,muteHttpExceptions:true});if(r.getResponseCode()!==200)throw Error('Drive kopija nije potvrđena.');id=JSON.parse(r.getContentText()).id;}
 const r=UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/'+id+'?alt=media',{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});if(r.getResponseCode()!==200||billingHash_(r.getContent())!==doc.pdfSha256)throw Error('Drive PDF nije potvrđen ponovnim čitanjem.');return{driveFileId:id,driveFolderId:folder};
}
function syncMarketizoBilling(){
 const lock=LockService.getUserLock();if(!lock.tryLock(1000))return;
 try{
  if(billingGoogle_(BILLING_GMAIL+'profile').emailAddress!=='buchhaltung@marketizo.com')throw Error('Koristi buchhaltung nalog.');const label=billingLabel_(),root=billingFolders_('Marketizo računi');billingCall_('heartbeat',{ready:true,labelId:label,archiveRootId:root});
  const started=Date.now();for(let i=0;i<3&&Date.now()-started<220000;i++){
   let doc=billingCall_('claim').invoice;if(!doc)break;const proof={id:doc.id,leaseToken:doc.leaseToken};let sending=false;
   try{
    if(billingHash_(Utilities.base64Decode(doc.pdfBase64))!==doc.pdfSha256)throw Error('PDF nije potvrđen.');let sent=doc.gmailMessageId||billingFindSent_(doc);
    if(!sent){
     if(['sending','uncertain','sent'].includes(doc.status))throw Error('Ishod prethodnog slanja nije potvrđen; ne šaljemo ponovo.');
     if(!doc.gmailDraftId){const draft=billingGoogle_(BILLING_GMAIL+'drafts',{message:{raw:Utilities.base64EncodeWebSafe(Utilities.newBlob(billingMime_(doc)).getBytes()).replace(/=+$/,'')}});doc.gmailDraftRfcMessageId=billingDraftReference_(draft.id);billingCall_('prepared',Object.assign({},proof,{draftId:draft.id,rfcMessageId:doc.gmailDraftRfcMessageId}));doc.gmailDraftId=draft.id;}
     // Revalidate current client profile in the server immediately before sending.
     billingVerifyMessage_(doc.gmailDraftId,doc,true);billingCall_('sending',proof);sending=true;const message=billingGoogle_(BILLING_GMAIL+'drafts/send',{id:doc.gmailDraftId});sent=message.id;
    }
    const bytes=billingVerifyMessage_(sent,doc);billingCall_('sent',Object.assign({},proof,{gmailMessageId:sent,to:doc.snapshot.email,pdfSha256:doc.pdfSha256,labelApplied:false}));sending=false;
    billingGoogle_(BILLING_GMAIL+'messages/'+sent+'/modify',{addLabelIds:[label]});const checked=billingGoogle_(BILLING_GMAIL+'messages/'+sent+'?format=minimal');if(!checked.labelIds.includes(label))throw Error('Gmail oznaka nije potvrđena.');const archived=billingArchive_(doc,bytes,root);billingCall_('archived',Object.assign({},proof,archived,{pdfSha256:doc.pdfSha256}));
   }catch(e){billingCall_(sending?'uncertain':'defer',Object.assign({},proof,{error:String(e.message).slice(0,300)}));}
  }
 }catch(e){try{billingCall_('heartbeat',{ready:false,error:String(e.message).slice(0,300)});}catch(ignored){}throw e;}finally{lock.releaseLock();}
}
function installMarketizoBilling(){
 if(billingGoogle_(BILLING_GMAIL+'profile').emailAddress!=='buchhaltung@marketizo.com')throw Error('Koristi buchhaltung nalog.');
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='syncMarketizoBilling'))ScriptApp.newTrigger('syncMarketizoBilling').timeBased().everyMinutes(5).create();syncMarketizoBilling();
}
// Run once only after explicit approval for a self-addressed, non-accounting test.
function testMarketizoBilling(){
 const lock=LockService.getUserLock();if(!lock.tryLock(1000))throw Error('Druga provera je u toku.');
 try{
  if(billingGoogle_(BILLING_GMAIL+'profile').emailAddress!=='buchhaltung@marketizo.com')throw Error('Koristi buchhaltung nalog.');const properties=PropertiesService.getScriptProperties();
  let id=properties.getProperty('marketizoBillingSelfTestId');if(!id){id=Utilities.getUuid();properties.setProperty('marketizoBillingSelfTestId',id);}
  const previous=JSON.parse(properties.getProperty('marketizoBillingSelfTestMeta')||'null'),pdf=previous||billingCall_('test-pdf'),doc={id,test:true,number:'TEST',messageId:'<marketizo-billing-test-'+id+'@marketizo.com>',pdfBase64:pdf.base64,pdfSha256:pdf.sha256,snapshot:{email:'buchhaltung@marketizo.com',issueDate:pdf.issueDate}};
  doc.gmailDraftRfcMessageId=properties.getProperty('marketizoBillingSelfTestRfc')||'';let sent=billingFindSent_(doc),draft=properties.getProperty('marketizoBillingSelfTestDraft');
  if(!sent){
   if(properties.getProperty('marketizoBillingSelfTestSending'))throw Error('Prethodni ishod testa nije potvrđen. Proveri Sent; ne šalji ponovo.');
   if(!draft){if(!doc.pdfBase64)throw Error('Prethodni test zahteva ručnu proveru.');const raw=billingMime_(doc);draft=billingGoogle_(BILLING_GMAIL+'drafts',{message:{raw:Utilities.base64EncodeWebSafe(Utilities.newBlob(raw).getBytes()).replace(/=+$/,'')}}).id;properties.setProperty('marketizoBillingSelfTestDraft',draft);properties.setProperty('marketizoBillingSelfTestMeta',JSON.stringify({sha256:doc.pdfSha256,issueDate:doc.snapshot.issueDate}));}
   const current=billingGoogle_(BILLING_GMAIL+'drafts/'+encodeURIComponent(draft)+'?format=full').message;
   if(!(current.payload.headers||[]).some(h=>h.name.toLowerCase()==='x-marketizo-invoice-id'&&h.value===doc.id)){
    const bytes=billingVerifyMessage_(draft,doc,true,true);doc.pdfBase64=Utilities.base64Encode(bytes);billingGoogle_(BILLING_GMAIL+'drafts/'+encodeURIComponent(draft),{id:draft,message:{raw:Utilities.base64EncodeWebSafe(Utilities.newBlob(billingMime_(doc)).getBytes()).replace(/=+$/,'')}},'put');
   }
   doc.gmailDraftRfcMessageId=billingDraftReference_(draft);properties.setProperty('marketizoBillingSelfTestRfc',doc.gmailDraftRfcMessageId);
   billingVerifyMessage_(draft,doc,true);properties.setProperty('marketizoBillingSelfTestSending','true');sent=billingGoogle_(BILLING_GMAIL+'drafts/send',{id:draft}).id;
  }
  // Use the PDF from the actual sent message, never a newly generated replacement.
  const bytes=billingVerifyMessage_(sent,doc),label=billingLabel_();billingGoogle_(BILLING_GMAIL+'messages/'+sent+'/modify',{addLabelIds:[label]});
  const root=billingFolders_('Marketizo računi'),tests=billingFolders_('Testovi',root),archived=billingArchive_(doc,bytes,tests);properties.setProperty('marketizoBillingSelfTestComplete',JSON.stringify({messageId:sent,driveFileId:archived.driveFileId,sha256:doc.pdfSha256}));
  console.log(JSON.stringify({test:true,recipient:'buchhaltung@marketizo.com',sentVerified:true,driveVerified:true,numberAllocated:false,messageId:sent,driveFileId:archived.driveFileId}));
 }finally{lock.releaseLock();}
}

// Read-only end-to-end PDF check; no Gmail/Drive write and no invoice numbering.
function checkMarketizoBillingPdf(){
 const pdf=billingCall_('test-pdf'),bytes=Utilities.base64Decode(pdf.base64);
 if(Utilities.newBlob(bytes).getDataAsString().slice(0,5)!=='%PDF-'||billingHash_(bytes)!==pdf.sha256)throw Error('Test PDF nije potvrđen.');
 console.log(JSON.stringify({test:true,pdfVerified:true,bytes:bytes.length,sha256:pdf.sha256,numberAllocated:false,emailSent:false}));
}
// Test-only header diagnostic. Never logs tokens, attachments or message bodies.
function checkMarketizoBillingDraft(){
 const id=PropertiesService.getScriptProperties().getProperty('marketizoBillingSelfTestDraft');if(!id)throw Error('Nema probnog nacrta.');
 const d=billingGoogle_(BILLING_GMAIL+'drafts/'+encodeURIComponent(id)+'?format=full').message;
 console.log(JSON.stringify({labels:d.labelIds,headers:(d.payload.headers||[]).filter(h=>['from','to','cc','bcc','message-id'].includes(h.name.toLowerCase()))}));
}
