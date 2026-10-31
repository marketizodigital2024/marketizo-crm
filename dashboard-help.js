(function (root) {
  'use strict';
  // Read-only explanations. No CRM save, network call or business-record mutation.
  const definitions = {
    "adminTotalClients": {
      "title": "Klijenti sa računom",
      "text": "Broj klijenata koji imaju sačuvan mesečni obračun. Jedan klijent se broji jednom, čak i ako račun još nije poslat.",
      "flow": [
        "Sačuvan obračun",
        "Izabrani mesec",
        "Broj klijenata"
      ],
      "scope": "Važe pretraga, država i početak saradnje. Arhivirani klijenti su isključeni, kao i u Finansijama."
    },
    "adminMrr": {
      "title": "Fakturisano",
      "text": "Zbir vrednosti mesečnih računa u CRM-u, uključujući pripremljene račune koji još nisu poslati. Ovo nije dobit.",
      "flow": [
        "Vrednost svakog računa",
        "Sabiranje",
        "Ukupan iznos"
      ],
      "scope": "Ako iznos nije posebno sačuvan, koristi se mesečna cena klijenta, pa cena paketa. Sačuvana nula ostaje nula. Važe filteri klijenata; arhivirani su isključeni."
    },
    "adminPaidTotal": {
      "title": "Naplaćeno za račune meseca",
      "text": "Uplate povezane sa računima izabranog meseca. Uplata za septembarski račun ostaje u septembru i kada novac legne u oktobru.",
      "flow": [
        "Računi izabranog meseca",
        "Povezane uplate",
        "Naplaćen iznos"
      ],
      "scope": "Ovo nije promet banke po datumu uplate. Koriste se sačuvane uplate; kod starijih računa bez stavki uplate koristi se plaćeni iznos ili oznaka „Plaćeno“. Višak uplate se čuva. Važe filteri klijenata."
    },
    "adminUnpaidTotal": {
      "title": "Otvorena naplata",
      "text": "Koliko još ostaje za naplatu za izabrani mesec. Svaki račun se računa posebno: višak uplate jednog klijenta ne briše dug drugog.",
      "flow": [
        "Račun − njegove uplate",
        "Najmanje nula",
        "Zbir ostataka"
      ],
      "scope": "Primer: račun 100 €, uplaćeno 40 € → otvoreno 60 €. Broj klijenata se računa po preostalom iznosu, a ne samo po ručnoj oznaci statusa. Važe filteri klijenata."
    },
    "adminCollectionRate": {
      "title": "Stopa naplate",
      "text": "Koliki deo računa je plaćen. Primer: od 1.000 € računa plaćeno je 600 € → naplaćeno je 60%.",
      "flow": [
        "Plaćeni deo računa",
        "÷ vrednost računa × 100",
        "Procenat naplate"
      ],
      "scope": "Višak uplate ne zatvara dug drugog klijenta i ne povećava ovaj procenat. Ako nema vrednosti računa, prikazuje se 0%. Važe izabrani filteri klijenata."
    },
    "actionSummary": {
      "title": "Šta treba rešiti",
      "text": "Ovde vidiš neposlate račune, dugovanja starija od 30 dana, odstupanja radnih sati i ugovore koji uskoro ističu.",
      "flow": [
        "Provera podataka",
        "Stavke koje traže pažnju",
        "Klik za detalje"
      ],
      "scope": "Računi prate izabrane filtere. Sati prate izabrani mesec. Ugovori se proveravaju prema današnjem datumu."
    },
    "action-0": {
      "title": "Računi koji nisu poslati",
      "text": "Broj sačuvanih mesečnih obračuna čiji status nije „Poslat“. Račun može biti pripremljen, a još neposlat.",
      "flow": [
        "Izabrani mesec",
        "Status nije „Poslat“",
        "Broj računa"
      ],
      "scope": "Važe filteri klijenata i pravilo Finansija koje isključuje arhivirane. Klik na karticu otvara Finansije."
    },
    "action-1": {
      "title": "Otvoreno preko 30 dana",
      "text": "Zbir preostalih iznosa na računima starijim od 30 dana. Starost je od datuma slanja; kada on nedostaje, od prvog dana meseca računa.",
      "flow": [
        "Otvoreni računi",
        "Starost preko 30 dana",
        "Zbir ostataka"
      ],
      "scope": "Poslednjih 12 meseci do izabranog meseca, starost prema današnjem datumu. Ovo nije obračun ugovorenog roka plaćanja. Važe filteri klijenata."
    },
    "action-2": {
      "title": "Odstupanja radnih sati",
      "text": "Broj zaposlenih koji su upisali manje od 80% ili više od 110% planiranih sati. Na primer, 32 od planiranih 40 sati je 80%.",
      "flow": [
        "Upisani sati",
        "÷ planirani sati × 100",
        "Procenat plana"
      ],
      "scope": "Poredimo samo završene dane. Današnji nepotpuni dan se ne računa. Odobrena odsustva i neradni dani smanjuju plan. Ovo nije ocena kvaliteta rada."
    },
    "action-3": {
      "title": "Ugovori koji ističu",
      "text": "Broj ugovora čiji izračunati datum isteka pada od danas do narednih 30 dana, uključujući oba kraja.",
      "flow": [
        "Početak + trajanje ugovora",
        "Danas do +30 dana",
        "Broj ugovora"
      ],
      "scope": "Cela baza, nezavisno od meseca i filtera klijenata. Prethodno uklonjeni podsetnici se ne prikazuju."
    },
    "filters": {
      "title": "Kako rade filteri",
      "text": "Mesec bira račune i sate. Država i pretraga sužavaju klijente. Datumi „Početak saradnje od/do“ biraju klijente prema datumu početka saradnje.",
      "flow": [
        "Izaberi klijente",
        "Izaberi mesec",
        "Uporedi pokazatelje"
      ],
      "scope": "Kod raspona početka saradnje klijenti bez tog datuma se izostavljaju. Sati tima koriste samo mesec; obaveštenja i isticanje ugovora koriste trenutno stanje cele baze."
    },
    "adminRevenueTrend": {
      "title": "Računi i uplate kroz mesece",
      "text": "Za svaki mesec vidiš vrednost računa i koliko je za njih uplaćeno. Prikaz obuhvata šest meseci do izabranog meseca.",
      "flow": [
        "Računi za mesec",
        "Njihova vrednost i uplate",
        "Poređenje meseci"
      ],
      "scope": "Uplata pripada mesecu računa, čak i ako novac stigne kasnije. Procenat poredi poslednji i prethodni mesec. Ako je prethodni iznos bio nula, procenat promene ne može da se izračuna."
    },
    "adminPaymentDonut": {
      "title": "Koliko je plaćeno, a koliko ostaje",
      "text": "Isti iznosi kao na karticama iznad: uplate i ostatak za naplatu. Krug pokazuje procenat plaćene vrednosti računa.",
      "flow": [
        "Plaćeni deo računa",
        "÷ ukupna vrednost",
        "Procenat naplate"
      ],
      "scope": "Prikazuje izabrani mesec i klijente. Višak uplate preko vrednosti jednog računa prikazuje se odvojeno i ne umanjuje tuđi dug."
    },
    "adminInvoiceAging": {
      "title": "Starost otvorenih računa",
      "text": "Preostali iznosi su podeljeni prema starosti: 0–7, 8–14, 15–30 i preko 30 dana. Duža traka znači veći iznos, ne veći broj računa.",
      "flow": [
        "Preostali iznos",
        "Starost računa",
        "Zbir u grupi"
      ],
      "scope": "Poslednjih 12 meseci do izabranog meseca, uz filtere klijenata. Starost prema danas: od slanja, ili od prvog dana meseca ako datum slanja nedostaje. Nije datum dospelosti."
    },
    "adminTopDebtors": {
      "title": "Najveća otvorena dugovanja",
      "text": "Do pet klijenata sa najvećim zbirom preostalih računa. „Najstarije“ pokazuje starost njihovog najstarijeg otvorenog računa.",
      "flow": [
        "Ostaci po klijentu",
        "Najveći zbir prvo",
        "Prvih 5"
      ],
      "scope": "Poslednjih 12 meseci do izabranog meseca, uz filtere klijenata; arhivirani su isključeni. Klik otvara Finansije."
    },
    "adminTeamUtilization": {
      "title": "Upisani sati i plan",
      "text": "Pokazuje koliko je sati zaposleni upisao u odnosu na plan. Primer: 32 od 40 planiranih sati → 80%.",
      "flow": [
        "Upisani sati",
        "÷ planirani sati × 100",
        "Koliko plana je upisano"
      ],
      "scope": "Za tekući mesec računamo dane do juče; za prošli mesec sve dane. Odobrena odsustva i neradni dani smanjuju plan. Uključene su sve aktivnosti. Kazne i oduzimanje prekovremenih nisu radno vreme i ne menjaju ovaj procenat."
    },
    "breakdown": {
      "title": "Paketi i države",
      "text": "Ista vrednost računa kao na kartici „Fakturisano“, raspoređena prema paketu ili državi klijenta.",
      "flow": [
        "Vrednost računa",
        "Grupisanje klijenata",
        "Zbir po grupi"
      ],
      "scope": "Izabrani mesec i filteri klijenata. Ako ima više od šest grupa, manje grupe su sabrane kao „Preostale grupe“, pa se zbir ne gubi. Paket i država su trenutni podaci klijenta."
    },
    "adminPackageChart": {
      "title": "Paketi",
      "text": "Zbir vrednosti računa za svaki paket. Paket preuzet iz trenutne kartice klijenta.",
      "flow": [
        "Računi meseca",
        "Paket klijenta",
        "Zbir po paketu"
      ],
      "scope": "Važe filteri klijenata. Kod više od šest grupa ostale su sabrane zajedno."
    },
    "adminCountryChart": {
      "title": "Države",
      "text": "Zbir vrednosti računa prema državi klijenta. Različiti zapisi iste države, na primer Austria i Austrija, sabiraju se zajedno.",
      "flow": [
        "Računi meseca",
        "Država klijenta",
        "Zbir po državi"
      ],
      "scope": "Izabrani mesec i filteri klijenata. Država je trenutni podatak sa kartice klijenta."
    },
    "adminClientGrowth": {
      "title": "Novi klijenti",
      "text": "Broj klijenata prema mesecu početka saradnje. Ovo nisu novi leadovi, novi računi niti broj potpisa.",
      "flow": [
        "Datum početka saradnje",
        "Mesec",
        "Broj novih klijenata"
      ],
      "scope": "Poslednjih šest meseci do izabranog meseca. Važe pretraga, država i raspon početka saradnje. Uključuje i sada arhivirane klijente koji su tada počeli; bez datuma se ne broje. Interni profili se ne broje."
    },
    "contractExpiryList": {
      "title": "Ističu uskoro",
      "text": "Ugovori čiji datum isteka pada u narednih 30 dana. Isti spisak određuje broj na kartici u fokusu.",
      "flow": [
        "Početak saradnje",
        "+ broj meseci ugovora",
        "Datum isteka"
      ],
      "scope": "Gleda današnji datum i celu bazu, nezavisno od izabranih filtera. „Ukloni“ sklanja podsetnik za taj ugovor; ne briše ugovor."
    },
    "adminNotificationList": {
      "title": "Sva aktivna obaveštenja",
      "text": "Sva trenutno vidljiva administratorska obaveštenja. Broj u naslovu odgovara celoj listi, a ne samo prvih nekoliko stavki.",
      "flow": [
        "Trenutna obaveštenja",
        "Bez sakrivenih",
        "Ceo aktivni spisak"
      ],
      "scope": "Ne zavisi od izabranog meseca ili klijenta. Zahtevi za odsustvo ostaju do odluke. Privremeno sakrivena obaveštenja su u posebnom delu liste."
    },
    "adminEmployeeRiskList": {
      "title": "Sati i kašnjenja zaposlenih",
      "text": "Za svakog zaposlenog vidiš sate, plan, višak ili manjak sati i broj kašnjenja. „Vidi aktivnosti“ otvara originalne minute koje je zaposleni upisao.",
      "flow": [
        "Preneti višak ili manjak",
        "+ rezultat ovog meseca",
        "Ukupno stanje sati"
      ],
      "scope": "Stanje sati uključuje prenete sate, kazne i korišćenje prekovremenih. Današnji rad još ne ulazi u stanje tekućeg meseca, dok je plan u redu za ceo mesec. Za proveru se izdvajaju manjak sati, sati preko mesečnog plana ili najmanje 3 kašnjenja."
    },
    "pending": {
      "title": "Zahtevi koji čekaju odluku",
      "text": "Zahtevi zaposlenih koje administrator treba da odobri ili odbije. Ostaju vidljivi sve dok odluka nije uspešno sačuvana.",
      "flow": [
        "Zaposleni podnese zahtev",
        "Odluka administratora",
        "Potvrđeno čuvanje"
      ],
      "scope": "Trenutno stanje cele baze, bez obzira na filtere. Otvaranje objašnjenja ne odobrava niti odbija zahtev."
    },
    "waFilters": {
      "title": "Kako biraš podatke",
      "text": "Izaberi period, zaposlenog, aktivnost ili klijenta. „Šta brojimo“ bira da li porediš scenarije, klipove, storije ili drugi broj komada.",
      "flow": [
        "Izaberi period",
        "Izaberi čiji i koji rad",
        "Pogledaj sate i proseke"
      ],
      "scope": "„Šta brojimo“ menja prosek po komadu. Ako želiš i sate samo za tu vrstu rada, izaberi Aktivnost. Stari zbirni unosi predstavljaju zbir sati za mesec, a ne pojedinačne aktivnosti; uključuješ ih posebnim poljem. Pozicije su iz sadašnjeg profila zaposlenog."
    },
    "waTotal": {
      "title": "Ukupno vreme u periodu",
      "text": "Svi minuti sačuvanih upisa koji odgovaraju filterima, podeljeni sa 60. Primer: 150 minuta → 2,5 sata.",
      "flow": [
        "Minuti izabranih upisa",
        "÷ 60",
        "Sati"
      ],
      "scope": "Računa datum rada, uključujući današnje upise. Nije saldo prekovremenih: kazne i skidanje salda za Zeitausgleich nisu radni minuti. Rad bez količine ulazi u sate."
    },
    "waAverageEntry": {
      "title": "Prosečno vreme po unosu",
      "text": "Svi minuti podeljeni brojem unosa rada. Primer: 120 minuta kroz 3 unosa → 40 minuta po unosu.",
      "flow": [
        "Ukupni minuti",
        "÷ broj unosa",
        "Minuta po unosu"
      ],
      "scope": "U jednom unosu može biti više klipova ili scenarija. Zato ovo nije prosek izrade jednog komada. Važe izabrani period, zaposleni, aktivnost i klijent."
    },
    "waAverageUnit": {
      "title": "Prosečno vreme po komadu",
      "text": "Vreme za završen posao podeljeno brojem urađenih komada. Primer: 120 minuta za 4 klipa → 30 minuta po klipu.",
      "flow": [
        "Vreme završenog posla",
        "÷ broj urađenih komada",
        "Minuta po komadu"
      ],
      "scope": "Izaberi šta brojimo, na primer klipove. Ako je isti posao rađen više dana i ti unosi su povezani, sabira se celo vreme; period bira dan završetka. Bez upisane količine i za nezavršen posao nema ovog proseka. Crtica znači da podataka nema, a ne da je vreme nula."
    },
    "waCoverage": {
      "title": "Unosi sa količinom",
      "text": "Koliko unosa ima popunjene podatke o broju komada. Primer: popunjeno je 8 od 10 unosa → 80%.",
      "flow": [
        "Unosi sa podacima o količini",
        "÷ unosi koji traže količinu",
        "Procenat popunjenosti"
      ],
      "scope": "Brojimo samo aktivnosti za koje se traži količina ili je ona već zabeležena. Kod starijih unosa i oznaka da posao još traje računa se kao popunjen podatak. Ovo nije procenat završenog rada."
    },
    "waQuantitySummary": {
      "title": "Koliko je urađeno",
      "text": "Broj urađenih scenarija, klipova, storija i drugih komada. Svaka vrsta se prikazuje odvojeno, uz prosečno vreme po komadu.",
      "flow": [
        "Završeni poslovi",
        "Sabiranje iste vrste komada",
        "Broj komada i prosek"
      ],
      "scope": "Računa se datum završetka posla. Za posao rađen više dana sabira se povezano vreme. Ako količina nije upisana, ne nagađamo je. „Još je malo podataka“ znači da je završeno manje od pet poslova."
    },
    "waTrend": {
      "title": "Vreme kroz period",
      "text": "Svaka kolona prikazuje zbir sati upisanih tog dana. Viša kolona znači više upisanog vremena.",
      "flow": [
        "Upisi jednog datuma",
        "Zbir minuta ÷ 60",
        "Sati tog dana"
      ],
      "scope": "Važe svi filteri rada i datuma. Dani bez upisa se ne crtaju. Ne pokazuje završene komade niti planirani kapacitet."
    },
    "waCategories": {
      "title": "Aktivnosti po kategoriji",
      "text": "Sati iz izabranog perioda sabrani po kategoriji aktivnosti. Prikazuje do sedam kategorija sa najviše vremena.",
      "flow": [
        "Upisani minuti",
        "Kategorija aktivnosti",
        "Sati po kategoriji"
      ],
      "scope": "Koristi sadašnji katalog aktivnosti, a sačuvanu kategoriju ako aktivnost više nije u katalogu. „Druge aktivnosti“ je prikaz kategorije Ostalo. Lista je top 7, pa ne mora obuhvatati sve sate."
    },
    "waComparison": {
      "title": "Poređenje vremena rada",
      "text": "Poredi sate, broj unosa, urađene komade i prosečno vreme. Dugmad iznad tabele biraju poređenje po zaposlenom, aktivnosti, klijentu ili poziciji.",
      "flow": [
        "Izabrani podaci",
        "Poređaj po zaposlenom ili klijentu",
        "Uporedi vreme i količinu"
      ],
      "scope": "Za smisleno poređenje biraj istu aktivnost i istu vrstu komada. Sati prate datum rada, a prosek po komadu datum završetka i celo povezano vreme. Različita složenost posla i kvalitet nisu zasebno izmereni."
    },
    "waClients": {
      "title": "Gde odlazi najviše vremena",
      "text": "Do sedam klijenata sa najvećim zbirom upisanih sati u izabranom periodu.",
      "flow": [
        "Minuti po klijentu",
        "Najviše sati prvo",
        "Prvih 7"
      ],
      "scope": "Važe filteri rada i datuma. „Bez klijenta“ znači da stari upis nema zabeleženog klijenta. Lista nije prikaz svih klijenata, niti procenat profitabilnosti."
    },
    "waMethod": {
      "title": "Kako se računa prosek",
      "text": "Prosek po unosu govori koliko traje jedan unos rada. Prosek po komadu govori koliko vremena odlazi na jedan urađen scenario, klip ili drugi komad.",
      "flow": [
        "Izaberi istu aktivnost",
        "Proveri broj završenih poslova",
        "Uporedi proseke"
      ],
      "scope": "Bez upisane količine nema proseka po komadu. Ako je završeno manje od pet poslova, još je malo podataka za poređenje. Uzmi u obzir i složenost i kvalitet rada."
    },
    "waDetails": {
      "title": "Unosi rada u izabranom periodu",
      "text": "Ovde vidiš pojedinačne unose iz kojih se računaju sati: datum, zaposlenog, aktivnost, klijenta, minute i broj komada.",
      "flow": [
        "Sačuvani unosi rada",
        "Izabrani period i filteri",
        "Redovi u tabeli"
      ],
      "scope": "Prikazuje se po 30 unosa na strani. Broj u naslovu obuhvata sve izabrane unose. „Preuzmi tabelu“ preuzima sve njih, ne samo otvorenu stranu. Prosek po komadu može uključiti i raniji povezani rad na istom poslu."
    },
    "waSettings": {
      "title": "Za koje aktivnosti tražimo količinu",
      "text": "Izaberi postojeću aktivnost i šta brojimo: scenarije, klipove, snimljene reelove, zadatke ili druge komade.",
      "flow": [
        "Izaberi aktivnost",
        "Izaberi šta brojimo",
        "Važi za nove poslove"
      ],
      "scope": "Nazivi aktivnosti se ne menjaju. Starim unosima ne dodajemo količine. Ranije započeti povezani poslovi zadržavaju vrstu komada koja je tada izabrana."
    },
    "waNameColumn": {
      "title": "Koga ili šta poredimo",
      "text": "Naziv zaposlenog, aktivnosti, klijenta ili pozicije, prema izabranom dugmetu iznad tabele.",
      "flow": [
        "Izaberi poređenje",
        "Isti zaposleni, aktivnost ili klijent",
        "Jedan red tabele"
      ],
      "scope": "Pozicije su iz sadašnjih profila. Zaposleni sa više pozicija pojavljuje se jednom pod njihovom kombinacijom, pa se njegovi sati ne dupliraju."
    },
    "waMinutesColumn": {
      "title": "Vreme grupe",
      "text": "Zbir minuta svih filtriranih upisa u ovom redu, prikazan u satima.",
      "flow": [
        "Minuti upisa u grupi",
        "÷ 60",
        "Sati grupe"
      ],
      "scope": "Računa datum rada u izabranom periodu. Uključuje i upise bez zabeležene količine."
    },
    "waEntriesColumn": {
      "title": "Broj unosa rada",
      "text": "Koliko je puta sačuvano vreme rada. Jedan unos može sadržati jedan ili više završenih komada.",
      "flow": [
        "Sačuvani unosi",
        "Izabrani period i posao",
        "Broj unosa"
      ],
      "scope": "Broje se unosi sa ispravno upisanim vremenom većim od nule."
    },
    "waQuantityColumn": {
      "title": "Urađeni komadi",
      "text": "Zbir upisanih završenih scenarija, klipova ili drugih komada. Različite vrste se ne sabiraju zajedno.",
      "flow": [
        "Upisane količine",
        "Ista vrsta komada",
        "Ukupan broj"
      ],
      "scope": "Period bira dan završetka. Ako količina nije zabeležena, prikazuje se crtica. Broj unosa nije broj urađenih komada."
    },
    "waMedianColumn": {
      "title": "Tipično vreme po komadu",
      "text": "Poređamo prosečna vremena po komadu od najkraćeg do najdužeg i uzmemo vrednost iz sredine. Primer: 10, 20 i 90 minuta → tipično vreme je 20 minuta.",
      "flow": [
        "Prosek po komadu za svaki posao",
        "Poređaj od kraćeg do dužeg",
        "Uzmi vrednost iz sredine"
      ],
      "scope": "Ako su dve vrednosti u sredini, uzmemo njihov prosek. Svaki posao ima istu težinu bez obzira na broj komada. Za običan prosek svih minuta i komada koristi kolonu „Min / komad“. Izaberi šta brojimo."
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = definitions;
  if (typeof document === 'undefined') return;
  let panel, trigger, pinned = false, timer, restoringFocus = false;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function close(restoreFocus = false) {
    clearTimeout(timer);
    if (!panel || panel.hidden) return;
    const previous = trigger;
    panel.hidden = true;
    previous?.setAttribute('aria-expanded', 'false');
    trigger = null; pinned = false;
    if (restoreFocus && previous?.isConnected) { restoringFocus = true; previous.focus(); restoringFocus = false; }
  }
  function position() {
    if (!trigger?.isConnected || !trigger.closest('.active') && !trigger.closest('#adminPendingApprovals') && !trigger.closest('.work-analytics-page')) { close(); return; }
    const rect = trigger.getBoundingClientRect(), gap = 10;
    const width = Math.min(380, window.innerWidth - 24);
    panel.style.width = `${width}px`;
    panel.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
    panel.style.top = '12px';
    const height = panel.getBoundingClientRect().height;
    panel.style.top = `${Math.max(12, rect.bottom + gap + height <= window.innerHeight - 12 ? rect.bottom + gap : rect.top - height - gap)}px`;
  }
  function open(button, pin = false) {
    clearTimeout(timer);
    const info = definitions[button.dataset.dashboardHelp];
    if (!info) return;
    if (trigger !== button) close();
    if (!panel) {
      panel = document.createElement('aside'); panel.id = 'dashboardHelpPanel'; panel.className = 'dashboard-help-panel';
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'dashboardHelpTitle');
      panel.addEventListener('pointerenter', () => clearTimeout(timer));
      panel.addEventListener('pointerleave', () => { if (!pinned) timer = setTimeout(close, 180); });
      document.body.append(panel);
    }
    trigger = button; pinned = pinned || pin;
    panel.innerHTML = `<div class="dashboard-help-head"><strong id="dashboardHelpTitle">${esc(info.title)}</strong><button type="button" class="dashboard-help-close" aria-label="Zatvori objašnjenje">×</button></div><p>${esc(info.text)}</p><div class="dashboard-help-flow" aria-label="Kako se računa">${info.flow.map((step, i) => `${i ? '<span class="help-arrow" aria-hidden="true">→</span>' : ''}<span class="help-step">${esc(step)}</span>`).join('')}</div><p class="dashboard-help-scope">${esc(info.scope)}</p>`;
    panel.querySelector('.dashboard-help-close').addEventListener('click', () => close(true));
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    position();
  }
  function attach(host, key) {
    if (!host || host.querySelector(`[data-dashboard-help="${key}"]`)) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'dashboard-help-trigger';
    button.dataset.dashboardHelp = key; button.textContent = '?';
    button.setAttribute('aria-label', `Objašnjenje: ${definitions[key].title}`);
    button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'dashboardHelpPanel');
    host.append(button);
  }
  function refresh() {
    if (trigger && !trigger.isConnected) close();
    ['adminTotalClients','adminMrr','adminPaidTotal','adminUnpaidTotal','adminCollectionRate'].forEach(id => attach(document.getElementById(id)?.closest('article')?.querySelector('span'), id));
    ['adminRevenueTrend','adminPaymentDonut','adminInvoiceAging','adminTopDebtors','adminTeamUtilization','adminClientGrowth','contractExpiryList','adminNotificationList','adminEmployeeRiskList'].forEach(id => attach(document.getElementById(id)?.closest('.panel')?.querySelector('h2'), id));
    ['adminPackageChart','adminCountryChart'].forEach(id => attach(document.getElementById(id)?.parentElement?.querySelector('h3'), id));
    attach(document.getElementById('adminPackageChart')?.closest('.panel')?.querySelector('h2'), 'breakdown');
    attach(document.getElementById('adminActionSummary')?.closest('.panel')?.querySelector('h2'), 'actionSummary');
    attach(document.querySelector('#admin .dashboard-filter-panel h2'), 'filters');
    attach(document.querySelector('#adminPendingApprovals summary strong'), 'pending');
    ['waTotal','waAverageEntry','waAverageUnit','waCoverage'].forEach(id => attach(document.getElementById(id)?.closest('article')?.querySelector('.wa-kpi-label'), id));
    ['waTrend','waCategories','waComparison','waClients','waDetails'].forEach(id => attach(document.getElementById(id)?.closest('.panel')?.querySelector('h2'), id));
    attach(document.querySelector('.wa-filter-help-heading'), 'waFilters');
    attach(document.getElementById('waQuantitySummary'), 'waQuantitySummary');
    attach(document.querySelector('.wa-method h2'), 'waMethod');
    attach(document.querySelector('#waSettings summary'), 'waSettings');
    const table = document.getElementById('waComparison')?.closest('table');
    ['waNameColumn','waMinutesColumn','waEntriesColumn','waAverageEntry','waQuantityColumn','waAverageUnit','waMedianColumn'].forEach((id, index) => attach(table?.querySelector(`th:nth-child(${index + 1})`), id));
  }
  // Capture first: help must never navigate a KPI card, toggle a summary, or approve a request.
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-dashboard-help]');
    if (button) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (trigger === button && pinned) close(); else open(button, true);
    } else if (panel && !panel.contains(event.target)) close();
  }, true);
  document.addEventListener('pointerover', event => {
    const button = event.target.closest('[data-dashboard-help]');
    if (button && event.pointerType !== 'touch' && !pinned) open(button);
  });
  document.addEventListener('pointerout', event => {
    if (event.target.closest('[data-dashboard-help]') && !pinned) timer = setTimeout(close, 180);
  });
  document.addEventListener('focusin', event => {
    if (restoringFocus) return;
    const button = event.target.closest('[data-dashboard-help]');
    if (button && !pinned) open(button);
    else if (panel && !panel.contains(event.target) && !button) close();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && panel && !panel.hidden) { event.preventDefault(); event.stopImmediatePropagation(); close(true); } }, true);
  window.addEventListener('resize', () => { if (panel && !panel.hidden) position(); });
  window.addEventListener('scroll', () => { if (panel && !panel.hidden) position(); }, true);
  root.MarketizoDashboardHelp = { refresh, close };
  refresh();
})(typeof window === 'undefined' ? globalThis : window);
