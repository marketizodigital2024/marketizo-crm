'use strict';
const {SignError}=require('./sign-content.js');
const FEE='[MESEČNA NAKNADA U EUR]', BONUS='[BONUS I USLOVI]';
// Applied only to contractor documents, on the server. Identity completion never
// accepts compensation fields. Templates and locked source remain unchanged.
function applyCompensation(doc) {
 if(doc.contractDetails?.audience!=='contractor')return doc;
 const terms=doc.contractDetails.compensation;
 const texts=doc.content.blocks.map(b=>b.runs.map(r=>r.text).join(''));
 const hasFee=texts.some(t=>t.includes(FEE));
 if(!terms){if(hasFee)throw new SignError(400,'Popuni mesečnu naknadu i uslove bonusa za saradnika.');return doc;}
 let feeFound=false,bonusFound=false;
 for(const block of doc.content.blocks){
  const original=block.runs.map(r=>r.text).join('');let value=original;
  if(value.includes(FEE)){feeFound=true;value=value.split(FEE).join(terms.monthlyFee.replace('.',',')+' EUR');}
  if(value.includes(BONUS)){bonusFound=true;value=value.split(BONUS).join(terms.bonus);}
  // Compatibility with the existing collaborator templates, before they are
  // revised to explicit bonus markers. Do not touch any other paragraph.
  else if(/^Bonus:\s*Pored fiksne naknade,/u.test(value)){bonusFound=true;value='Bonus: '+terms.bonus;}
  if(value!==original)block.runs=[{...(block.runs[0]||{}),text:value}];
 }
 if(!feeFound||!bonusFound)throw new SignError(400,'Šablon saradnika mora sadržati polja [MESEČNA NAKNADA U EUR] i [BONUS I USLOVI]. Uredi šablon pre pregleda.');
 return doc;
}
module.exports={applyCompensation};
