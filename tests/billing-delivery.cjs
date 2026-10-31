'use strict';const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
function simulate(mode){
 const pdf=Buffer.from('%PDF-1.4 fixture invoice'),sha=crypto.createHash('sha256').update(pdf).digest('hex');let doc={id:'11111111-1111-4111-8111-111111111111',leaseToken:'lease',status:'queued',number:634,pdfBase64:pdf.toString('base64'),pdfSha256:sha,messageId:'<marketizo-invoice-11111111-1111-4111-8111-111111111111@marketizo.com>',snapshot:{issueDate:'2026-10-31',email:'client@example.test'}},sent=false,sends=0,files=0,claimed=false,failed=false,labels=['SENT'],draft;
 const blob=x=>({getBytes:()=>Array.from(Buffer.from(x)),getDataAsString:()=>Buffer.from(x).toString()});
 const utilities={newBlob:blob,getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,bytes)=>Array.from(crypto.createHash('sha256').update(Buffer.from(bytes)).digest()),base64Encode:x=>Buffer.from(x).toString('base64'),base64Decode:x=>Array.from(Buffer.from(x,'base64')),base64DecodeWebSafe:x=>Array.from(Buffer.from(x,'base64url')),base64EncodeWebSafe:x=>Buffer.from(x).toString('base64url')};
 function message(isDraft=false){return{id:'message',labelIds:isDraft?['DRAFT']:labels,payload:{headers:[{name:'From',value:'Marketizo Digital <buchhaltung@marketizo.com>'},{name:'To',value:doc.snapshot.email},{name:'Message-ID',value:doc.messageId},...(mode==='modified-draft'&&isDraft?[{name:'Bcc',value:'other@example.test'}]:[])],parts:[{filename:'Rechnung_000634.pdf',mimeType:'application/pdf',body:{data:pdf.toString('base64url')}}]}};}
 const fetcher=(url,options={})=>{
  const body=options.payload&&typeof options.payload==='string'?JSON.parse(options.payload):{};let result={};
  if(url.includes('/api/billing-delivery')){
   if(body.action==='claim'){result={invoice:claimed||doc.archiveStatus==='complete'?null:structuredClone(doc)};claimed=true;}
   else if(body.action==='prepared'){doc.status='prepared';doc.gmailDraftId=body.draftId;}
   else if(body.action==='sending'){assert.equal(doc.status,'prepared');doc.status='sending';}
   else if(body.action==='uncertain'){doc.status='uncertain';}
   else if(body.action==='sent'){assert(sent);assert.equal(body.pdfSha256,sha);doc.status='sent';doc.gmailMessageId=body.gmailMessageId;}
   else if(body.action==='archived'){doc.archiveStatus='complete';doc.driveFileId=body.driveFileId;}
   return{getResponseCode:()=>200,getContentText:()=>JSON.stringify({ok:true,data:result})};
  }
  if(url.endsWith('/profile'))result={emailAddress:'buchhaltung@marketizo.com'};
  else if(url.endsWith('/labels'))result={labels:[{id:'label',name:'Poslati računi'}]};
  else if(url.includes('/drive/v3/files?q=')){const q=decodeURIComponent(url.split('q=')[1].split('&')[0]);result={files:q.includes('marketizoInvoiceId')?(files?[{id:'file',parents:['folder']}]:[]):[{id:'folder',ownedByMe:true}]};}
  else if(url.includes('upload/drive/v3/files')){if(mode==='archive-failure'&&!failed){failed=true;throw Error('temporary archive failure');}files++;result={id:'file'};}
  else if(url.includes('drive/v3/files/file?alt=media'))return{getResponseCode:()=>200,getContent:()=>Array.from(pdf)};
  else if(url.includes('/messages?q='))result={messages:sent?[{id:'message'}]:[]};
  else if(url.endsWith('/drafts')){draft={id:'draft'};result=draft;}
  else if(url.includes('/drafts/draft?'))result={message:message(true)};
  else if(url.endsWith('/drafts/send')){sends++;assert.equal(sends,1,'No duplicate Gmail send');sent=true;if(mode==='lost-send-response'&&!failed){failed=true;throw Error('response lost');}result={id:'message'};}
  else if(url.endsWith('/modify')){labels.push('label');result={};}
  else if(url.includes('/messages/message?format=minimal'))result={labelIds:labels};
  else if(url.includes('/messages/message?format=full'))result=message();
  else throw Error('Unexpected fixture endpoint '+url);
  return{getResponseCode:()=>200,getContentText:()=>JSON.stringify(result)};
 };
 const ctx={UrlFetchApp:{fetch:fetcher},Utilities:utilities,ScriptApp:{getIdentityToken:()=> 'identity',getOAuthToken:()=> 'oauth'},LockService:{getUserLock:()=>({tryLock:()=>true,releaseLock(){}})},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../integrations/google-finance/Billing.gs','utf8'),ctx);
 ctx.syncMarketizoBilling();if(mode==='modified-draft'){assert.equal(sends,0);assert.equal(doc.status,'prepared');return;}
 if(mode!=='success'){assert.notEqual(doc.archiveStatus,'complete');claimed=false;ctx.syncMarketizoBilling();}
 assert.equal(doc.archiveStatus,'complete');assert.equal(sends,1);assert.equal(files,1);assert(labels.includes('label'));
}
for(const mode of ['success','lost-send-response','archive-failure','modified-draft'])simulate(mode);
console.log('PASS billing Gmail/Drive worker: exact attachment, stable draft, sent readback, lost response never resends, archive-only retry, Gmail label and changed/Bcc draft rejection');
