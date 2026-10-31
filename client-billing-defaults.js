(function(root){
 'use strict';
 function defaults(client){
  const c=client||{}, p={...(c.billingProfile||{})}, countries={Austrija:'AT','Nemačka':'DE',Nemacka:'DE',Srbija:'RS',Hrvatska:'HR',Austria:'AT',Germany:'DE'};
  const fill=(key,value)=>{if(!String(p[key]||'').trim()&&value){p[key]=String(value).trim();p.confirmed=false;}};
  fill('legalName',c.name);fill('country',countries[c.country]||(/^[a-z]{2}$/i.test(c.country||'')?c.country.toUpperCase():''));fill('email',c.loginEmail);
  return p;
 }
 if(typeof module==='object'&&module.exports)module.exports=defaults;else root.clientBillingDefaults=defaults;
})(typeof window==='object'?window:this);
