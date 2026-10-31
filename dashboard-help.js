(function (root) {
  'use strict';
  // Read-only explanations. No CRM save, network call or business-record mutation.
  const definitions = {
    adminTotalClients: { title: 'Klijenti sa računom', text: 'Broj klijenata koji imaju sačuvan mesečni obračun. Jedan klijent se broji jednom, čak i ako račun još nije poslat.', flow: ['Sačuvan obračun', 'Izabrani mesec', 'Broj klijenata'], scope: 'Važe pretraga, država i početak saradnje. Arhivirani klijenti su isključeni, kao i u Finansijama.' },
    adminMrr: { title: 'Fakturisano', text: 'Zbir vrednosti mesečnih računa u CRM-u, uključujući pripremljene račune koji još nisu poslati. Ovo nije dobit.', flow: ['Vrednost svakog računa', 'Sabiranje', 'Ukupan iznos'], scope: 'Ako iznos nije posebno sačuvan, koristi se mesečna cena klijenta, pa cena paketa. Sačuvana nula ostaje nula. Važe filteri klijenata; arhivirani su isključeni.' },
    adminPaidTotal: { title: 'Naplaćeno za račune meseca', text: 'Uplate povezane sa računima izabranog meseca. Uplata za septembarski račun ostaje u septembru i kada novac legne u oktobru.', flow: ['Računi izabranog meseca', 'Povezane uplate', 'Naplaćen iznos'], scope: 'Ovo nije promet banke po datumu uplate. Koriste se sačuvane uplate; kod starijih računa bez stavki uplate koristi se plaćeni iznos ili oznaka „Plaćeno“. Višak uplate se čuva. Važe filteri klijenata.' },
    adminUnpaidTotal: { title: 'Otvorena naplata', text: 'Koliko još ostaje za naplatu za izabrani mesec. Svaki račun se računa posebno: višak uplate jednog klijenta ne briše dug drugog.', flow: ['Račun − njegove uplate', 'Najmanje nula', 'Zbir ostataka'], scope: 'Primer: račun 100 €, uplaćeno 40 € → otvoreno 60 €. Broj klijenata se računa po preostalom iznosu, a ne samo po ručnoj oznaci statusa. Važe filteri klijenata.' },
    adminCollectionRate: { title: 'Stopa naplate', text: 'Koliki deo vrednosti računa je pokriven uplatama. Primer: od 1.000 € računa pokriveno je 600 € → 60%.', flow: ['Pokriveni iznos', '÷ vrednost računa × 100', 'Procenat naplate'], scope: 'Višak preko vrednosti pojedinačnog računa ne povećava procenat. Ako nema vrednosti računa, prikazuje se 0%. Važe filteri klijenata.' },
    actionSummary: { title: 'Šta traži reakciju', text: 'Četiri prečice: neposlati računi, otvoreni iznosi stari preko 30 dana, odstupanja sati i ugovori koji uskoro ističu.', flow: ['Računi, sati, ugovori', 'Provera uslova', 'Prečica na detalje'], scope: 'Računi koriste filtere klijenata. Tim koristi samo izabrani mesec. Ugovori koriste današnji datum i celu bazu.' },
    'action-0': { title: 'Računi koji nisu poslati', text: 'Broj sačuvanih mesečnih obračuna čiji status nije „Poslat“. Račun može biti pripremljen, a još neposlat.', flow: ['Izabrani mesec', 'Status nije „Poslat“', 'Broj računa'], scope: 'Važe filteri klijenata i pravilo Finansija koje isključuje arhivirane. Klik na karticu otvara Finansije.' },
    'action-1': { title: 'Otvoreno preko 30 dana', text: 'Zbir preostalih iznosa na računima starijim od 30 dana. Starost je od datuma slanja; kada on nedostaje, od prvog dana meseca računa.', flow: ['Otvoreni računi', 'Starost preko 30 dana', 'Zbir ostataka'], scope: 'Poslednjih 12 meseci do izabranog meseca, starost prema današnjem datumu. Ovo nije obračun ugovorenog roka plaćanja. Važe filteri klijenata.' },
    'action-2': { title: 'Odstupanja kapaciteta', text: 'Broj zaposlenih sa manje od 80% ili više od 110% upisanih sati u odnosu na plan. Porede se isti završeni dani.', flow: ['Upisani sati', '÷ planirani sati × 100', 'Ispod 80% / preko 110%'], scope: 'Današnji nepotpuni dan i budući dani se ne računaju. Odobrena odsustva i neradni dani smanjuju plan. Nije ocena kvaliteta rada. Filteri klijenata ne utiču.' },
    'action-3': { title: 'Ugovori koji ističu', text: 'Broj ugovora čiji izračunati datum isteka pada od danas do narednih 30 dana, uključujući oba kraja.', flow: ['Početak + trajanje ugovora', 'Danas do +30 dana', 'Broj ugovora'], scope: 'Cela baza, nezavisno od meseca i filtera klijenata. Prethodno uklonjeni podsetnici se ne prikazuju.' },
    filters: { title: 'Kako rade filteri', text: 'Mesec bira račune i sate. Država i pretraga sužavaju klijente. Datumi „Početak saradnje od/do“ biraju klijente prema datumu početka saradnje.', flow: ['Izaberi klijente', 'Izaberi mesec', 'Uporedi pokazatelje'], scope: 'Kod raspona početka saradnje klijenti bez tog datuma se izostavljaju. Sati tima koriste samo mesec; obaveštenja i isticanje ugovora koriste trenutno stanje cele baze.' },
    adminRevenueTrend: { title: 'Prihod i naplata', text: 'Za svaki od poslednjih šest meseci prikazuje vrednost računa i uplate povezane sa tim računima. Završava se izabranim mesecom.', flow: ['Mesec računa', 'Vrednost i uplate', 'Poređenje 6 meseci'], scope: 'Uplate nisu grupisane po datumu priliva novca. Promena u procentima poredi vrednost računa poslednjeg i prethodnog meseca. Kada je prethodni iznos nula, nema procentualne osnovice. Važe filteri klijenata.' },
    adminPaymentDonut: { title: 'Status naplate', text: 'Isti obračun kao na karticama iznad: naplaćeno, preostalo za naplatu i procenat pokrivene vrednosti računa.', flow: ['Pokrivena vrednost', '÷ ukupna vrednost', 'Krug naplate'], scope: 'Izabrani mesec i filteri klijenata. Uplata iznad vrednosti računa prikazuje se posebno; ne prebija dug drugih klijenata.' },
    adminInvoiceAging: { title: 'Starost otvorenih računa', text: 'Preostali iznosi su podeljeni prema starosti: 0–7, 8–14, 15–30 i preko 30 dana. Duža traka znači veći iznos, ne veći broj računa.', flow: ['Preostali iznos', 'Starost računa', 'Zbir u grupi'], scope: 'Poslednjih 12 meseci do izabranog meseca, uz filtere klijenata. Starost prema danas: od slanja, ili od prvog dana meseca ako datum slanja nedostaje. Nije datum dospelosti.' },
    adminTopDebtors: { title: 'Najveća otvorena dugovanja', text: 'Do pet klijenata sa najvećim zbirom preostalih računa. „Najstarije“ pokazuje starost njihovog najstarijeg otvorenog računa.', flow: ['Ostaci po klijentu', 'Najveći zbir prvo', 'Prvih 5'], scope: 'Poslednjih 12 meseci do izabranog meseca, uz filtere klijenata; arhivirani su isključeni. Klik otvara Finansije.' },
    adminTeamUtilization: { title: 'Odstupanja kapaciteta', text: 'Upisani sati podeljeni planiranim satima. Primer: 32 h od planiranih 40 h → 80%. Uredni zaposleni su u proširivoj listi ispod.', flow: ['Upisani sati', '÷ plan × 100', 'Iskorišćenost vremena'], scope: 'Aktivni zaposleni sa planom većim od nule. Za tekući mesec do juče, za prošli mesec svi dani. Koristi sačuvani raspored, praznike i odobrena odsustva. Današnji i budući upisi ne ulaze. Uključuje sve upisane aktivnosti, ne samo rad za klijente; bez kazni i korekcija salda. Nije mera učinka po komadu.' },
    breakdown: { title: 'Paketi i države', text: 'Ista vrednost računa kao na kartici „Fakturisano“, raspoređena prema paketu ili državi klijenta.', flow: ['Vrednost računa', 'Grupisanje klijenata', 'Zbir po grupi'], scope: 'Izabrani mesec i filteri klijenata. Ako ima više od šest grupa, manje grupe su sabrane kao „Preostale grupe“, pa se zbir ne gubi. Paket i država su trenutni podaci klijenta.' },
    adminPackageChart: { title: 'Paketi', text: 'Zbir vrednosti računa za svaki paket. Paket preuzet iz trenutne kartice klijenta.', flow: ['Računi meseca', 'Paket klijenta', 'Zbir po paketu'], scope: 'Važe filteri klijenata. Kod više od šest grupa ostale su sabrane zajedno.' },
    adminCountryChart: { title: 'Države', text: 'Zbir vrednosti računa prema državi klijenta. Različiti zapisi iste države, na primer Austria i Austrija, sabiraju se zajedno.', flow: ['Računi meseca', 'Država klijenta', 'Zbir po državi'], scope: 'Izabrani mesec i filteri klijenata. Država je trenutni podatak sa kartice klijenta.' },
    adminClientGrowth: { title: 'Novi klijenti', text: 'Broj klijenata prema mesecu početka saradnje. Ovo nisu novi leadovi, novi računi niti broj potpisa.', flow: ['Datum početka saradnje', 'Mesec', 'Broj novih klijenata'], scope: 'Poslednjih šest meseci do izabranog meseca. Važe pretraga, država i raspon početka saradnje. Uključuje i sada arhivirane klijente koji su tada počeli; bez datuma se ne broje. Interni profili se ne broje.' },
    contractExpiryList: { title: 'Ističu uskoro', text: 'Ugovori čiji datum isteka pada u narednih 30 dana. Isti spisak određuje broj na kartici u fokusu.', flow: ['Početak saradnje', '+ broj meseci ugovora', 'Datum isteka'], scope: 'Gleda današnji datum i celu bazu, nezavisno od izabranih filtera. „Ukloni“ sklanja podsetnik za taj ugovor; ne briše ugovor.' },
    adminNotificationList: { title: 'Sva aktivna obaveštenja', text: 'Sva trenutno vidljiva administratorska obaveštenja. Broj u naslovu odgovara celoj listi, a ne samo prvih nekoliko stavki.', flow: ['Trenutna obaveštenja', 'Bez sakrivenih', 'Ceo aktivni spisak'], scope: 'Ne zavisi od izabranog meseca ili klijenta. Zahtevi za odsustvo ostaju do odluke. Privremeno sakrivena obaveštenja su u posebnom delu liste.' },
    adminEmployeeRiskList: { title: 'Sati, saldo i kašnjenja', text: 'Za svakog aktivnog zaposlenog: upisani sati umanjeni za kazne i korekcije, plan sati, preneti saldo i broj kašnjenja. „Vidi aktivnosti“ prikazuje originalne minute rada.', flow: ['Preneti saldo', '+ rezultat meseca', 'Ukupan saldo sati'], scope: 'Izabrani mesec; filteri klijenata ne utiču. Plan u redu je za ceo mesec, dok saldo tekućeg meseca izostavlja današnji rad i plan. Odobrena odsustva smanjuju plan; Zeitausgleich ima povezano skidanje salda. Odstupanje je minus salda, višak preko mesečnog plana ili najmanje 3 kašnjenja. Ovo nije isti pokazatelj kao procenat kapaciteta.' },
    pending: { title: 'Zahtevi koji čekaju odluku', text: 'Zahtevi zaposlenih koje administrator treba da odobri ili odbije. Ostaju vidljivi sve dok odluka nije uspešno sačuvana.', flow: ['Zaposleni podnese zahtev', 'Odluka administratora', 'Potvrđeno čuvanje'], scope: 'Trenutno stanje cele baze, bez obzira na filtere. Otvaranje objašnjenja ne odobrava niti odbija zahtev.' }
  };
  Object.assign(definitions, {
    waFilters: { title: 'Filteri analitike', text: 'Datumi biraju dane kada je rad upisan. Zaposleni, pozicija, kategorija, aktivnost i klijent sužavaju evidenciju rada.', flow: ['Izaberi period i posao', 'Izdvoji upise', 'Izračunaj prikaz'], scope: 'Pozicije su iz sadašnjeg profila. Jedinica bira samo prosek po komadu i završene količine; sama ne sužava sate. Za sate određene vrste rada izaberi i Aktivnost. Istorijski mesečni prenosi su isključeni dok ih ne uključiš.' },
    waTotal: { title: 'Ukupno vreme u periodu', text: 'Svi minuti sačuvanih upisa koji odgovaraju filterima, podeljeni sa 60. Primer: 150 minuta → 2,5 sata.', flow: ['Minuti izabranih upisa', '÷ 60', 'Sati'], scope: 'Računa datum rada, uključujući današnje upise. Nije saldo prekovremenih: kazne i skidanje salda za Zeitausgleich nisu radni minuti. Rad bez količine ulazi u sate.' },
    waAverageEntry: { title: 'Prosek po upisu', text: 'Ukupni minuti podeljeni brojem sačuvanih upisa. Primer: 120 minuta kroz 3 upisa → 40 minuta po upisu.', flow: ['Ukupni minuti', '÷ broj upisa', 'Minuta po upisu'], scope: 'Jedan upis može biti jedan klip ili više njih. Zato ovo nije prosečno vreme izrade klipa ili scenarija. Važe filteri perioda i rada.' },
    waAverageUnit: { title: 'Prosek po završenom komadu', text: 'Minuti rada sa zabeleženom završenom količinom podeljeni brojem komada iste jedinice. Primer: 120 minuta za 4 klipa → 30 minuta po klipu.', flow: ['Vreme završenog posla', '÷ završeni komadi', 'Minuta po komadu'], scope: 'Izaberi jedinicu. Kod starijih povezanih serija sabiraju se i raniji dani rada, a period bira datum završetka. Upisi bez količine i rad u toku ne ulaze. Crtica znači da nema dovoljno tih podataka, ne da je prosek nula.' },
    waCoverage: { title: 'Podaci o količini', text: 'Koliki deo relevantnih upisa ima ispravno povezanu količinu ili status rada. Primer: 8 od 10 upisa → 80%.', flow: ['Upisi sa količinom/statusom', '÷ relevantni upisi × 100', 'Pokrivenost evidencije'], scope: 'Relevantni su upisi aktivnosti za koje se prati količina ili koji već imaju povezanu količinu. Nije procenat završenih poslova: i pravilno označen rad u toku je pokriven. Stare količine se ne izmišljaju.' },
    waQuantitySummary: { title: 'Završene količine', text: 'Broj završenih scenarija, klipova i drugih jedinica prikazuje se odvojeno. Za svaku jedinicu prikazan je njen prosek vremena.', flow: ['Završeni poslovi', 'Sabiranje iste jedinice', 'Količina i prosek'], scope: 'Klipovi se ne sabiraju sa scenarijima. Period bira datum završetka; kod povezanih serija vreme može uključivati ranije dane. Nezabeležene količine ne ulaze. Mali uzorak znači manje od pet završenih poslova/serija.' },
    waTrend: { title: 'Vreme kroz period', text: 'Svaka kolona prikazuje zbir sati upisanih tog dana. Viša kolona znači više upisanog vremena.', flow: ['Upisi jednog datuma', 'Zbir minuta ÷ 60', 'Sati tog dana'], scope: 'Važe svi filteri rada i datuma. Dani bez upisa se ne crtaju. Ne pokazuje završene komade niti planirani kapacitet.' },
    waCategories: { title: 'Aktivnosti po kategoriji', text: 'Sati iz izabranog perioda sabrani po kategoriji aktivnosti. Prikazuje do sedam kategorija sa najviše vremena.', flow: ['Upisani minuti', 'Kategorija aktivnosti', 'Sati po kategoriji'], scope: 'Koristi sadašnji katalog aktivnosti, a sačuvanu kategoriju ako aktivnost više nije u katalogu. „Druge aktivnosti“ je prikaz kategorije Ostalo. Lista je top 7, pa ne mora obuhvatati sve sate.' },
    waComparison: { title: 'Pregled proseka', text: 'Isti podaci grupisani po zaposlenom, aktivnosti, klijentu ili poziciji. Dugmad menjaju grupisanje, a nazivi kolona menjaju redosled.', flow: ['Izabrani upisi', 'Grupisanje', 'Sati, upisi i proseci'], scope: 'Za pošteno poređenje biraj istu aktivnost i jedinicu. Sati prate datum rada; prosek po komadu prati datum završetka i sav povezani rad. Razlika u složenosti i kvalitetu posla nije automatski izmerena.' },
    waClients: { title: 'Gde odlazi najviše vremena', text: 'Do sedam klijenata sa najvećim zbirom upisanih sati u izabranom periodu.', flow: ['Minuti po klijentu', 'Najviše sati prvo', 'Prvih 7'], scope: 'Važe filteri rada i datuma. „Bez klijenta“ znači da stari upis nema zabeleženog klijenta. Lista nije prikaz svih klijenata, niti procenat profitabilnosti.' },
    waMethod: { title: 'Kako čitati podatke', text: 'Prosek po upisu meri veličinu upisa. Prosek po komadu meri vreme za zabeleženu završenu količinu. Ta dva pokazatelja imaju različit osnov.', flow: ['Proveri aktivnost', 'Proveri jedinicu i uzorak', 'Uporedi proseke'], scope: 'Bez količine ne možemo znati koliko je scenarija ili klipova urađeno. Kod manje od pet završenih poslova/serija zaključak je manje pouzdan. Ne merimo zasebno složenost niti kvalitet svakog komada.' },
    waDetails: { title: 'Upisi u izabranom periodu', text: 'Izvorna evidencija iz koje se računaju sati i prosek po upisu. Prikazuje datum, zaposlenog, aktivnost, klijenta, minute i povezanu količinu.', flow: ['Sačuvani upis', 'Filteri', 'Red u tabeli'], scope: 'Po 30 redova na strani. Broj u naslovu je ceo filtrirani spisak. CSV izvozi sve filtrirane upise, ne samo otvorenu stranu. Prosek po komadu može uključiti i raniji rad iz iste završene serije.' },
    waSettings: { title: 'Podešavanja količine', text: 'Određuje koja se postojeća aktivnost meri scenarijima, klipovima, snimljenim reelovima, zadacima ili drugom jedinicom.', flow: ['Postojeća aktivnost', 'Jedinica količine', 'Novi unosi rada'], scope: 'Ne menja nazive aktivnosti i ne dopisuje količine starim upisima. Već započeti povezani poslovi zadržavaju svoju jedinicu. Samo otvaranje ovog objašnjenja ništa ne čuva.' },
    waNameColumn: { title: 'Naziv grupe', text: 'Zaposleni, aktivnost, klijent ili pozicija, prema izabranom grupisanju iznad tabele.', flow: ['Izabrano grupisanje', 'Isti naziv / identitet', 'Jedan red'], scope: 'Pozicije su iz sadašnjih profila. Zaposleni sa više pozicija prikazan je pod njihovom kombinacijom, bez dupliranja njegovih sati.' },
    waMinutesColumn: { title: 'Vreme grupe', text: 'Zbir minuta svih filtriranih upisa u ovom redu, prikazan u satima.', flow: ['Minuti upisa u grupi', '÷ 60', 'Sati grupe'], scope: 'Računa datum rada u izabranom periodu. Uključuje i upise bez zabeležene količine.' },
    waEntriesColumn: { title: 'Upisi', text: 'Broj sačuvanih evidencija rada u grupi. Jedan upis nije isto što i jedan završen komad.', flow: ['Sačuvani upisi', 'Filteri i grupa', 'Broj upisa'], scope: 'Računa upise sa pozitivnim, ispravnim minutima u izabranom periodu.' },
    waQuantityColumn: { title: 'Završeni komadi', text: 'Zbir zabeleženih završenih količina u grupi, odvojeno za svaku jedinicu.', flow: ['Završene količine', 'Ista jedinica', 'Zbir komada'], scope: 'Period bira datum završetka. Ako ništa nije zabeleženo, prikazuje se crtica. Ne pretvaramo broj upisa u broj komada.' },
    waMedianColumn: { title: 'Medijana po komadu', text: 'Srednja vrednost proseka završenih poslova/serija. Primer proseka 10, 20 i 90 minuta → medijana je 20 minuta.', flow: ['Prosek svake serije', 'Poređaj od manjeg', 'Srednja vrednost'], scope: 'Kod parnog broja uzima se prosek dve srednje vrednosti. Svaka serija ima istu težinu; nije medijana vremena pojedinačnih klipova jer to vreme ne beležimo zasebno. Potrebna je izabrana jedinica.' }
  });
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
