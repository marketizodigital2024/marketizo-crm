'use strict';
(() => {
  const clauses = [
    ["1. Scenariji", "Scenarije šaljemo tri dana pre snimanja. U roku od 24 sata od prijema proverite informacije i pošaljite sve izmene odjednom. Na terenu snimamo dogovorenu verziju, bez izmena scenarija ako se okolnosti nisu promenile."],
    ["2. Snimanje i priprema", "Pre dolaska naše ekipe pripremite učesnike, prostor i proizvode; budite spremni na vreme, na svakoj lokaciji. Promene javite unapred. Ne snimamo vikendom, osim po prethodnom dogovoru uz doplatu prema naknadno dogovorenoj ceni."],
    ["3. Odobrenje klipova", "Bez vaše jasne potvrde u zajedničkoj grupi ne objavljujemo klip. Čekanje pomera objave i oglase."],
    ["4. Revizije", "Za svaki scenario, klip i dizajn uključena je najviše jedna revizija. Jedna odgovorna osoba šalje sve komentare odjednom u grupi. Dodatne revizije dogovaramo posebno."],
    ["5. Kvalitet upita", "Odgovorni smo za kvalitet rada i optimizaciju. Za kvalifikovanije upite treba nam redovan feedback: ko je kontaktiran, da li odgovara dogovorenim kriterijumima i kakav je ishod."],
    ["6. Obrada upita i prodaja", "Svaki novi lead pozovite u roku od 24 sata od ulaska u sistem. Vaša odgovorna osoba prati razgovore, ponude i prodaju. Marketizo Digital ne preuzima odgovornost za zatvaranje prodaje."],
    ["7. Kartica i oglasi", "Obezbedite ispravnu karticu i sredstva. Ako naplata zaustavi kampanje, plaćeni oglasi se ne prikazuju i ne donose upite do rešavanja problema i nastavka prikazivanja. Reagujte odmah."],
    ["8. Materijali i rokovi", "Materijale i pristupe dostavite na vreme; promene ponude, cena i kapaciteta javite unapred. Radimo u ugovorenom obimu. Kašnjenje pripreme, materijala i potvrda pomera rokove."]
  ];
  const block = (text, type = 'paragraph') => ({ type, level: 1, runs: [{ text, bold: false, italic: false, underline: false }] });
  function create() {
    return {
      title: 'Pravila saradnje — Marketizo Digital', category: 'clients', recipientCompletion: true,
      content: { version: 1, blocks: [
        block('Ova pravila zajedno prolazimo na onboarding sastanku i potpisujemo pre njegovog završetka.'),
        ...clauses.map(([title, text]) => ({ type: 'paragraph', level: 1, runs: [{ text: title + '. ', bold: true, italic: false, underline: false }, { text, bold: false, italic: false, underline: false }] })),
        block('Potvrđujem da sam pravila pročitao/la, razumeo/la i prihvatio/la, uz mogućnost da postavim pitanja.')
      ] },
      recipients: [], contractDetails: { language: 'sr', audience: 'client', place: '', startDate: '' },
      governingLaw: 'AT', signatureMethod: 'ses', legalReview: 'pending', note: 'marketizo-onboarding:v3', dossier: null, parentDocumentId: null
    };
  }
  const template = { create, isDocument: doc => /^marketizo-onboarding:v[123]$/.test(doc?.note || '') };
  if (typeof module !== 'undefined') module.exports = template;
  else window.MarketizoOnboarding = template;
})();
