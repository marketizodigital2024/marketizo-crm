(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MarketizoMonthlyCore=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const criteria=[{key:'quality',label:'Kvalitet rada',weight:25,help:'Tačna i kompletna isporuka prema dogovoru.'},{key:'deadlines',label:'Poštovanje rokova',weight:20,help:'Dogovoreni rokovi i pravovremena najava problema.'},{key:'communication',label:'Komunikacija i saradnja',weight:15,help:'Jasna komunikacija i saradnja sa timom.'},{key:'independence',label:'Samostalnost i proces',weight:10,help:'Dogovoreni koraci, odgovornost i rad bez stalnog podsećanja.'}];
 const statuses={pending:'Čeka potvrdu',approved:'Potvrđeno',returned:'Vraćeno na doradu'};
 function calculate(values,client){if(!criteria.every(c=>Number.isInteger(Number(values?.[c.key]))&&Number(values[c.key])>=1&&Number(values[c.key])<=5))return null;const internalContribution=criteria.reduce((sum,c)=>sum+Number(values[c.key])*c.weight,0)/100;const score=client?.score!=null?Number(client.score):null,valid=score!=null&&Number.isFinite(score)&&score>=1&&score<=5;return {internalContribution,internalScore:internalContribution/.7,clientContribution:valid?Number((score*30/100).toFixed(12)):null,total:valid?Number(Math.round(Number(((internalContribution*100+score*30)/100).toFixed(12)+'e2'))+'e-2'):null};}
 const fingerprint=client=>client?.fingerprint||'none';
 const changed=(review,client)=>review?.status==='approved'&&review.approval?.clientFingerprint!==fingerprint(client);
 return {criteria,statuses,calculate,fingerprint,changed};
});
