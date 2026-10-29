'use strict';
(() => {
  const clauses = [
    ['1. Scenariji i izmene', 'Pročitajte scenarije i pošaljite eventualne izmene najmanje tri dana pre snimanja, kako bismo imali vremena da reagujemo. Proverite stručne informacije, cene i ponudu, kao i potrebna interna odobrenja. Osobe koje učestvuju u snimanju takođe treba unapred da pročitaju scenarije. Na snimanju radimo prema potvrđenoj verziji.'],
    ['2. Priprema za snimanje', 'Pre dolaska naše ekipe pripremite sebe, prostor, proizvode, garderobu i sve ostalo što smo dogovorili. Svi učesnici treba da budu spremni za početak u zakazano vreme. Isto važi kada snimamo na drugoj adresi. Promenu termina ili lokacije javite čim saznate da je potrebna.'],
    ['3. Odobrenje pre objave', 'Klip objavljujemo tek nakon vaše jasne potvrde u zajedničkoj grupi. Bez odobrenja ne možemo da ga objavimo. Čekanje potvrde pomera plan objava i može odložiti pokretanje oglasa.'],
    ['4. Komunikacija i korekcije', 'Komentare i izmene šaljite objedinjeno i konkretno u zajedničku grupu. Odredite jednu osobu koja daje konačno odobrenje. Korekcije radimo u okviru dogovorenog paketa, a promene već odobrenog sadržaja mogu zahtevati dodatno vreme i poseban dogovor.'],
    ['5. Kvalitet upita i povratne informacije', 'Mi smo odgovorni za kvalitet svog rada i unapređivanje kampanja ka dogovorenoj ciljnoj grupi i kriterijumima kvalifikacije. Da bismo dovodili kvalifikovanije potencijalne klijente, potrebne su nam vaše redovne povratne informacije: ko je kontaktiran, da li odgovara dogovorenim kriterijumima i kakav je ishod razgovora.'],
    ['6. Obrada upita i prodaja', 'Vaš tim je odgovoran za pravovremeno kontaktiranje zainteresovanih osoba, praćenje razgovora, slanje ponuda i zatvaranje prodaje. Na onboardingu dogovaramo ko obrađuje upite. Marketizo Digital vodi marketing i radi na kvalitetu upita, ali ne preuzima odgovornost za zatvaranje prodaje.'],
    ['7. Kartica i budžet za oglašavanje', 'Obezbedite ispravnu karticu i dovoljno sredstava za oglase. Ako problem sa naplatom zaustavi kampanje, plaćeni oglasi se ne prikazuju i ne donose nove upite dok se problem ne reši i prikazivanje ne nastavi. Zato je važno da na obaveštenje o problemu sa plaćanjem reagujete što pre.'],
    ['8. Materijali, pristupi i promene ponude', 'Dogovorene materijale i pristupe dostavite na vreme. Promene cena, ponude, dostupnosti ili kapaciteta javite unapred kako bismo u sadržaju i oglasima koristili tačne informacije.'],
    ['9. Obim rada i rokovi', 'Radimo aktivnosti i kanale obuhvaćene vašim paketom, a dodatne zahteve dogovaramo posebno. Kašnjenje materijala, pripreme, izmena ili odobrenja može pomeriti povezane rokove snimanja, objava i kampanja.']
  ];
  const block = (text, type = 'paragraph') => ({ type, level: 1, runs: [{ text, bold: false, italic: false, underline: false }] });
  function create() {
    return {
      title: 'Pravila saradnje — Marketizo Digital', category: 'clients', recipientCompletion: false,
      content: { version: 1, blocks: [
        block('Za dobru saradnju i kvalitetne rezultate važni su jasni dogovori, dobra priprema i pravovremena komunikacija. Ova pravila zajedno prolazimo na onboarding sastanku i potpisujemo pre njegovog završetka.'),
        ...clauses.flatMap(([title, text]) => [block(title, 'heading'), block(text)]),
        block('Potvrda sa onboarding sastanka', 'heading'),
        block('Potvrđujem da sam tokom onboarding sastanka pročitao/la pravila saradnje sa Marketizo Digital, da su mi objašnjena i da sam imao/la priliku da postavim pitanja. Razumem i prihvatam navedene obaveze.')
      ] },
      recipients: [], contractDetails: { language: 'sr', audience: 'client', place: '', startDate: '' },
      governingLaw: 'AT', signatureMethod: 'ses', legalReview: 'pending', note: 'marketizo-onboarding:v1', dossier: null, parentDocumentId: null
    };
  }
  const template = { create, isDocument: doc => doc?.note === 'marketizo-onboarding:v1' };
  if (typeof module !== 'undefined') module.exports = template;
  else window.MarketizoOnboarding = template;
})();
