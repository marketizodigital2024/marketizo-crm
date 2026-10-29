'use strict';
(() => {
  const clauses = [
    ['1. Scenariji', 'Pročitajte scenarije i pošaljite izmene najmanje tri dana pre snimanja. Proverite cene, stručne informacije i potrebna interna odobrenja. Snimamo potvrđenu verziju.'],
    ['2. Priprema za snimanje', 'Pre dolaska naše ekipe pripremite sebe, učesnike, prostor, proizvode i garderobu. Budite spremni u zakazano vreme, i na drugoj lokaciji. Promenu termina ili adrese javite što ranije.'],
    ['3. Odobrenje klipova', 'Bez vaše jasne potvrde u zajedničkoj grupi ne objavljujemo klip. Čekanje odobrenja pomera objave i može odložiti oglase.'],
    ['4. Komunikacija i korekcije', 'Jedna odgovorna osoba šalje objedinjene, konkretne izmene u grupi. Korekcije su u okviru paketa; dodatne zahteve i promene odobrenog sadržaja dogovaramo posebno.'],
    ['5. Kvalitet upita', 'Odgovorni smo za kvalitet rada i optimizaciju prema dogovorenim kriterijumima. Za kvalifikovanije upite potreban nam je redovan feedback: koga ste kontaktirali, da li odgovara kriterijumima i kakav je ishod.'],
    ['6. Obrada upita i prodaja', 'Vaš tim pravovremeno kontaktira upite, prati razgovore, šalje ponude i zatvara prodaju. Na onboardingu određujemo odgovornu osobu. Marketizo Digital ne preuzima odgovornost za zatvaranje prodaje.'],
    ['7. Kartica i oglasi', 'Obezbedite ispravnu karticu i sredstva. Ako naplata zaustavi kampanje, plaćeni oglasi se ne prikazuju i ne donose nove upite dok se problem ne reši i prikazivanje ne nastavi. Reagujte što pre.'],
    ['8. Materijali i rokovi', 'Materijale i pristupe dostavite na vreme, a promene cena, ponude i kapaciteta javite unapred. Radimo u okviru ugovorenog paketa. Kašnjenje pripreme, materijala i potvrda pomera povezane rokove.']
  ];
  const block = (text, type = 'paragraph') => ({ type, level: 1, runs: [{ text, bold: false, italic: false, underline: false }] });
  function create() {
    return {
      title: 'Pravila saradnje — Marketizo Digital', category: 'clients', recipientCompletion: true,
      content: { version: 1, blocks: [
        block('Ova pravila zajedno prolazimo na onboarding sastanku i potpisujemo pre njegovog završetka.'),
        ...clauses.map(([title, text]) => ({ type: 'paragraph', level: 1, runs: [{ text: title + '. ', bold: true, italic: false, underline: false }, { text, bold: false, italic: false, underline: false }] })),
        block('Potvrđujem da sam pročitao/la pravila, da su mi objašnjena i da sam imao/la priliku da postavim pitanja. Razumem i prihvatam navedene obaveze.')
      ] },
      recipients: [], contractDetails: { language: 'sr', audience: 'client', place: '', startDate: '' },
      governingLaw: 'AT', signatureMethod: 'ses', legalReview: 'pending', note: 'marketizo-onboarding:v3', dossier: null, parentDocumentId: null
    };
  }
  const template = { create, isDocument: doc => /^marketizo-onboarding:v[123]$/.test(doc?.note || '') };
  if (typeof module !== 'undefined') module.exports = template;
  else window.MarketizoOnboarding = template;
})();
