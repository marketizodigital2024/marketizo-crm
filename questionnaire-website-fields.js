(function(root){
'use strict';
const fields={
  "Naziv firme za sajt": {
    "example": "Studio Aurora",
    "type": "text",
    "links": false
  },
  "Ime i prezime": {
    "example": "Ana Petrović",
    "type": "text",
    "links": false
  },
  "Mejl za komunikaciju": {
    "example": "office@primer.at",
    "type": "text",
    "links": false
  },
  "Telefon / WhatsApp": {
    "example": "+43 660 123 4567",
    "type": "text",
    "links": false
  },
  "Adresa firme (ulica i broj, mesto, poštanski broj, država)": {
    "example": "Primerstraße 12, 1100 Wien, Austrija",
    "type": "text",
    "links": false
  },
  "Postojeći sajt ili Instagram/Facebook profili sa linkovima": {
    "example": "https://example.com; https://instagram.com/primer",
    "type": "text",
    "links": true
  },
  "Opišite čime se bavite, kao da objašnjavate komšiji": {
    "example": "Čistimo stanove i poslovne prostore u Beču. Radimo jednokratno i redovno održavanje.",
    "type": "text",
    "links": false
  },
  "Usluge po važnosti (nabrojte od najvažnije ka najmanje važnoj, jedna usluga u jednom redu)": {
    "example": "1. Čišćenje kancelarija\n2. Čišćenje stanova\n3. Pranje prozora",
    "type": "text",
    "links": false
  },
  "Najprofitabilnija usluga za fokus": {
    "example": "Redovno čišćenje kancelarija",
    "type": "text",
    "links": false
  },
  "Da li cene treba da budu vidljive na sajtu? (Da, sve cene / Da, samo „od“ cene / Ne, bez cena / Nisam siguran, savetujte me)": {
    "example": "Želim da budu vidljive samo početne cene.",
    "type": "single",
    "options": [
      "Da, sve cene",
      "Da, samo „od“ cene",
      "Ne, bez cena",
      "Nisam siguran, savetujte me"
    ],
    "links": false
  },
  "Unesite cene ili pošaljite cenovnik (možete navesti link)": {
    "example": "Čišćenje stanova od 25 €/sat; cenovnik: https://example.com/cene",
    "type": "text",
    "links": true
  },
  "Pol vašeg tipičnog klijenta (Uglavnom žene / Uglavnom muškarci / Podjednako)": {
    "example": "Naše usluge podjednako koriste žene i muškarci.",
    "type": "single",
    "options": [
      "Uglavnom žene",
      "Uglavnom muškarci",
      "Podjednako"
    ],
    "links": false
  },
  "Godine vašeg tipičnog klijenta": {
    "example": "Najčešće 30–55 godina",
    "type": "text",
    "links": false
  },
  "Gde vaši klijenti žive": {
    "example": "Beč i okolina, uglavnom do 30 km od grada",
    "type": "text",
    "links": false
  },
  "Čime se vaši klijenti bave": {
    "example": "Zaposleni ljudi i vlasnici manjih firmi",
    "type": "text",
    "links": false
  },
  "Glavni problem klijenata": {
    "example": "Nemaju vremena da sami redovno održavaju prostor.",
    "type": "text",
    "links": false
  },
  "Šta ih koči (Cena / Strah / Nepoverenje / Nešto drugo)": {
    "example": "Najviše ih brinu cena i poverenje.",
    "type": "multi",
    "options": [
      "Cena",
      "Strah",
      "Nepoverenje",
      "Nešto drugo",
      "Ne znam"
    ],
    "links": false
  },
  "Jezici klijenata (Srpski/hrvatski/bosanski / Nemački / Engleski / Turski / Drugi)": {
    "example": "Naši klijenti govore nemački i srpski.",
    "type": "multi",
    "options": [
      "Srpski/hrvatski/bosanski",
      "Nemački",
      "Engleski",
      "Turski",
      "Drugi"
    ],
    "links": false
  },
  "Područje iz kog dolaze": {
    "example": "Beč, Baden i Mödling",
    "type": "text",
    "links": false
  },
  "Tri razloga zbog kojih bi klijenti trebalo da izaberu vas umesto konkurencije": {
    "example": "1. Dolazimo u dogovoreno vreme\n2. Stalni tim\n3. Jasne cene bez doplate",
    "type": "text",
    "links": false
  },
  "Iskustvo, sertifikati, licence, nagrade ili članstva": {
    "example": "Poslujemo 8 godina; sertifikat navodimo samo ako ga imamo.",
    "type": "text",
    "links": false
  },
  "Garancija, besplatna procena ili prvi pregled gratis": {
    "example": "Besplatna procena pre ponude; ako nemate pogodnost, napišite „Nemamo“.",
    "type": "text",
    "links": false
  },
  "Recenzije klijenata ili link ka Google recenzijama": {
    "example": "Link do Google profila sa recenzijama ili kratka izjava klijenta uz dozvolu za objavljivanje.",
    "type": "text",
    "links": true
  },
  "Konkurenti sa linkovima": {
    "example": "Firma Primer — https://example.com/konkurent",
    "type": "text",
    "links": true
  },
  "Šta posetilac treba da uradi (Pozove telefonom / Pošalje poruku preko forme / Piše na WhatsApp / Zakaže termin online / Dođe u radnju / Traži ponudu)": {
    "example": "Želim da posetilac pošalje upit i piše na WhatsApp.",
    "type": "multi",
    "options": [
      "Pozove telefonom",
      "Pošalje poruku preko forme",
      "Piše na WhatsApp",
      "Zakaže termin online",
      "Dođe u radnju",
      "Traži ponudu"
    ],
    "links": false
  },
  "Tekst glavnog dugmeta": {
    "example": "Zatražite besplatnu ponudu",
    "type": "text",
    "links": false
  },
  "Mejl za upite sa stranice": {
    "example": "upiti@primer.at",
    "type": "text",
    "links": false
  },
  "Pitanja za kontakt formu": {
    "example": "Ime, telefon, email, vrsta usluge i grad",
    "type": "text",
    "links": false
  },
  "Radno vreme": {
    "example": "Ponedeljak–petak 08:00–18:00; subota po dogovoru",
    "type": "text",
    "links": false
  },
  "Da li imate logo? (Da, poslaću ga na office@marketizo.com / Ne, treba mi novi / Imam, ali je loš kvalitet)": {
    "example": "Imamo logo i poslaćemo ga mejlom.",
    "type": "single",
    "options": [
      "Da, poslaću ga na office@marketizo.com",
      "Ne, treba mi novi",
      "Imam, ali je loš kvalitet"
    ],
    "links": false
  },
  "Boje firme ili HEX kodovi": {
    "example": "Tamnoplava #16324F i bela #FFFFFF",
    "type": "text",
    "links": false
  },
  "Utisak koji stranica treba da ostavlja (Ozbiljno i profesionalno / Toplo i porodično / Moderno i minimalistički / Luksuzno i skupo / Energično i mlado / Tradicionalno i pouzdano)": {
    "example": "Želimo ozbiljan i profesionalan utisak.",
    "type": "single",
    "options": [
      "Ozbiljno i profesionalno",
      "Toplo i porodično",
      "Moderno i minimalistički",
      "Luksuzno i skupo",
      "Energično i mlado",
      "Tradicionalno i pouzdano"
    ],
    "links": false
  },
  "Linkovi dizajna koji vam se dopadaju i šta tačno": {
    "example": "https://example.com — dopadaju nam se pregledan raspored i velike fotografije.",
    "type": "text",
    "links": true
  },
  "Šta ne želite na stranici": {
    "example": "Ne želimo animacije, jarke boje i automatsko puštanje videa.",
    "type": "text",
    "links": false
  },
  "Da li imate svoje fotografije? (Da, poslaću na office@marketizo.com / Nemam, koristite fotografije iz baze / Imam, ali malo, dopunite fotografijama iz baze)": {
    "example": "Imamo nekoliko svojih fotografija, a ostalo dopunite fotografijama iz baze.",
    "type": "single",
    "options": [
      "Da, poslaću na office@marketizo.com",
      "Nemam, koristite fotografije iz baze",
      "Imam, ali malo, dopunite fotografijama iz baze"
    ],
    "links": false
  },
  "Da li već imate domen? (Da, imam i znam podatke za pristup / Da, imam ali ne znam podatke za pristup / Ne, treba mi novi domen; ne unosite lozinke)": {
    "example": "Imamo domen i možemo obezbediti pristup; lozinku ne pišemo ovde.",
    "type": "single",
    "options": [
      "Da, imam i znam podatke za pristup",
      "Da, imam ali ne znam podatke za pristup",
      "Ne, treba mi novi domen"
    ],
    "links": false
  },
  "Ako imate domen, navedite domen i registrar": {
    "example": "primer.at — registrar: firma kod koje ste kupili domen; ako ne znate, napišite „Ne znam“.",
    "type": "text",
    "links": true
  },
  "Ako vam treba novi domen, navedite 2–3 željena imena domena": {
    "example": "primer-servis.at\nprimer-wien.at\nprimer-service.at",
    "type": "text",
    "links": true
  },
  "Puni pravni naziv firme": {
    "example": "Aurora Reinigung e.U. — prepišite tačan naziv iz registracije firme.",
    "type": "text",
    "links": false
  },
  "Pravna forma (Einzelunternehmen / GmbH / OG / KG)": {
    "example": "Einzelunternehmen — ako niste sigurni, prepišite oblik iz registracije.",
    "type": "single",
    "options": [
      "Einzelunternehmen",
      "GmbH",
      "OG",
      "KG",
      "Drugo",
      "Ne znam"
    ],
    "links": false
  },
  "Puna adresa sedišta firme (ulica i broj, mesto, poštanski broj, država)": {
    "example": "Primerstraße 12/3, 1100 Wien, Austrija",
    "type": "text",
    "links": false
  },
  "Ime vlasnika ili Geschäftsführera": {
    "example": "Ana Petrović",
    "type": "text",
    "links": false
  },
  "UID/ATU broj": {
    "example": "Prepišite svoj ATU broj; ako ga nemate, napišite „Nemamo“.",
    "type": "text",
    "links": false
  },
  "Firmenbuchnummer": {
    "example": "Prepišite Firmenbuchnummer iz registra; ako ne postoji, napišite „Nije primenljivo“.",
    "type": "text",
    "links": false
  },
  "Firmenbuchgericht": {
    "example": "Prepišite nadležni sud iz registra; ako nije primenljivo, tako i napišite.",
    "type": "text",
    "links": false
  },
  "Predmet delatnosti i Gewerbe kako je upisano": {
    "example": "Prepišite tačan naziv delatnosti iz Gewerbeschein-a.",
    "type": "text",
    "links": false
  },
  "Nadležna Behörde": {
    "example": "Nadležni Magistrat ili Bezirkshauptmannschaft — prepišite sa dokumenta ili napišite „Ne znam“.",
    "type": "text",
    "links": false
  },
  "Članstvo u Wirtschaftskammer (Da, WKO Wien / Da, druga savezna pokrajina / Ne)": {
    "example": "Članovi smo WKO Wien.",
    "type": "single",
    "options": [
      "Da, WKO Wien",
      "Da, druga savezna pokrajina",
      "Ne",
      "Ne znam"
    ],
    "links": false
  },
  "Zvanični mejl firme za Impressum": {
    "example": "office@primer.at",
    "type": "text",
    "links": false
  },
  "Zvanični telefon firme za Impressum": {
    "example": "+43 660 123 4567",
    "type": "text",
    "links": false
  },
  "Odgovorno lice za zaštitu podataka": {
    "example": "Ana Petrović, office@primer.at",
    "type": "text",
    "links": false
  },
  "Da li planirate slanje newslettera ili mejlova klijentima preko ove stranice? (Da / Ne / Možda kasnije)": {
    "example": "Newsletter možda planiramo kasnije.",
    "type": "single",
    "options": [
      "Da",
      "Ne",
      "Možda kasnije"
    ],
    "links": false
  },
  "Alati za merenje (Google Analytics / Meta Pixel / Google Ads praćenje / Nijedan / Ne znam – savetujte me)": {
    "example": "Želimo Google Analytics i Meta Pixel; ako niste sigurni, izaberite pomoć tima.",
    "type": "multi",
    "options": [
      "Google Analytics",
      "Meta Pixel",
      "Google Ads praćenje",
      "Nijedan",
      "Ne znam – savetujte me"
    ],
    "links": false
  },
  "Da li već imate Meta Pixel ili Google Analytics nalog? (Da / Ne / Ne znam)": {
    "example": "Ne znamo da li već postoji nalog.",
    "type": "single",
    "options": [
      "Da",
      "Ne",
      "Ne znam"
    ],
    "links": false
  },
  "Datum do kada stranica treba da bude gotova": {
    "example": "15.12.2026. ili „Rok nije fiksan“.",
    "type": "text",
    "links": false
  },
  "Dodatne napomene": {
    "example": "Imamo novu uslugu od januara koju želimo posebno da istaknemo.",
    "type": "text",
    "links": false
  },
  "Potvrda: Potvrđujem da su unete informacije namenjene pripremi i izradi mog web sajta i da ću slike, logo i druge materijale poslati na office@marketizo.com ili dostaviti link do njih. (Napišite „Potvrđujem“ ili navedite šta treba razjasniti.)": {
    "example": "Potvrđujem; ako nešto nije jasno, navedite šta želite da proverimo.",
    "type": "text",
    "links": false
  }
};
function decode(value,options){const lines=String(value||'').split('\n');return {selected:options.filter(o=>lines.includes(o)),detail:lines.filter(l=>!options.includes(l)).join('\n')};}
function encode(selected,detail){return [...selected,String(detail||'').trim()].filter(Boolean).join('\n');}
const api={fields,decode,encode};
if(typeof module==='object'&&module.exports)module.exports=api;else root.MarketizoWebsiteFields=api;
})(typeof window!=='undefined'?window:globalThis);
