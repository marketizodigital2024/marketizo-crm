const { accessSession, verifyAccessToken, readStoredState, supabaseConfig } = require('./state.js').helpers;
function fail(res,status,error) { res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({ok:false,error})); }
async function handler(req,res) {
  if(req.method!=='GET')return fail(res,405,'Metod nije podržan.');
  const config=supabaseConfig();if(!config.configured)return fail(res,503,'Online baza nije povezana.');
  const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');
  const session=verifyAccessToken(token,config.key);
  if(!session)return fail(res,401,'Prijava je obavezna.');
  if(!['full-admin','operational-admin'].includes(session.role))return fail(res,403,'Ugovor je dostupan samo administratoru.');
  const id=String(req.query?.id||'');if(!id||id.length>200)return fail(res,400,'Izaberi klijenta.');
  try {
    const current=await readStoredState(config),access=accessSession(req,current.payload,config.key);
    if(!access||!['full-admin','operational-admin'].includes(access.role))return fail(res,401,'Nalog nema aktivan admin pristup.');
    const client=(current.payload.clients||[]).find(c=>c.id===id);
    const file=String(client?.contractFileData||'');
    if(!file)return fail(res,404,'Ugovor nije sačuvan.');
    const match=/^data:([a-zA-Z0-9.+/-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(file);
    if(!match)return fail(res,422,'Sačuvani fajl ugovora nije ispravan.');
    const bytes=Buffer.from(match[2],'base64');
    const filename=String(client.contractFileName||'ugovor').replace(/[\r\n\u0000-\u001f]/g,'').split(/[\\/]/).pop()||'ugovor';
    res.statusCode=200;res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type',match[1]);res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(filename));
    res.end(bytes);
  } catch(error) { return fail(res,500,error?.message||'Preuzimanje ugovora nije uspelo.'); }
}
module.exports=(req,res)=>require('../lib/database-request.js').withRequestBudget(()=>handler(req,res));
