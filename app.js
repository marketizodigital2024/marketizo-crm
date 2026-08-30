const stages = ["Novi lead", "Kvalifikovan", "Poziv zakazan", "Ponuda poslata", "Zatvoren"];
const roles = ["Scenarista", "Snimatelj", "Editor", "Media buyer", "SMM"];
const leadSlaHours = 24;
const clientLeadSlaHours = 48;
const employeeAbsenceTypes = ["Godišnji odmor", "Bolovanje", "Poklon dan", "Slobodan dan"];
const employeeWorkTypes = ["Rad", "Sastanak", "Snimanje", "Administracija", "Ostalo"];
const clientLeadStatuses = ["Novi", "Kontaktiran", "Zakazan", "Dobijen", "Izgubljen"];
const clientLossReasons = ["Nema budžet", "Nije se javio", "Loš broj", "Nije fit", "Konkurencija", "Preskupo", "Nije hitno", "Odloženo", "Ostalo"];
const legacyLeadStatusMap = {
  Pozvan: "Kontaktiran",
  "Potvrđen": "Zakazan",
  "Na čekanju": "Kontaktiran",
};
const packageConfig = {
  Starter: { price: 997, months: 3 },
  Business: { price: 1497, months: 6 },
  Enterprise: { price: 1997, months: 6 },
  Custom: { price: 0, months: 3 },
};
const starterClientNames = new Set(["Marketizo Digital", "Dental Studio Wien", "Auto Detailing Zagreb", "Physio Klinik München", "Beauty Laser Beograd"]);

const defaultEmployeeProfiles = [
  {
    id: "emp-miljan",
    name: "Miljan Marinjes",
    email: "miljan@marketizo.local",
    password: "123456",
    position: "Founder / Strategija",
    startDate: "2023-07-01",
    salary: 0,
    weeklyHours: 40,
    vacationDays: 26,
    giftDays: 1,
    isLeader: true,
    leaderId: "",
    status: "Aktivan",
  },
  {
    id: "emp-ivana",
    name: "Ivana Marinjes",
    email: "ivana@marketizo.local",
    password: "123456",
    position: "Co-founder / Operativa",
    startDate: "2023-07-01",
    salary: 0,
    weeklyHours: 40,
    vacationDays: 26,
    giftDays: 1,
    isLeader: true,
    leaderId: "",
    status: "Aktivan",
  },
  {
    id: "emp-aleksandar",
    name: "Aleksandar Bugarin",
    email: "aleksandar@marketizo.local",
    password: "123456",
    position: "Scenarista",
    startDate: "2026-01-15",
    salary: 0,
    weeklyHours: 40,
    vacationDays: 26,
    giftDays: 1,
    isLeader: false,
    leaderId: "emp-ivana",
    status: "Aktivan",
  },
  {
    id: "emp-luka",
    name: "Luka Cvorovic",
    email: "luka@marketizo.local",
    password: "123456",
    position: "Editor",
    startDate: "2026-02-01",
    salary: 0,
    weeklyHours: 40,
    vacationDays: 26,
    giftDays: 1,
    isLeader: false,
    leaderId: "emp-ivana",
    status: "Aktivan",
  },
  {
    id: "emp-nikola",
    name: "Nikola Marjanovic",
    email: "nikola@marketizo.local",
    password: "123456",
    position: "Editor",
    startDate: "2026-03-01",
    salary: 0,
    weeklyHours: 40,
    vacationDays: 26,
    giftDays: 1,
    isLeader: false,
    leaderId: "emp-ivana",
    status: "Aktivan",
  },
];

const starterData = {
  clients: [
    {
      id: crypto.randomUUID(),
      name: "Marketizo Digital",
      niche: "Interni marketing i prodaja",
      country: "Austrija",
      status: "Interni",
      revenue: 0,
      leads: 0,
      cpl: 0,
      owner: "Miljan / Ivana",
      team: "Marketizo tim",
      package: "Internal Growth",
      contactName: "Miljan i Ivana",
      contactPhone: "+4368181144747",
      whatsapp: "+4368181144747",
      billingDay: 1,
      paymentStatus: "Interno",
      invoiceStatus: "Nije potrebno",
      paymentMethod: "Firma",
      contractMonths: 0,
      startDate: "2026-07-05",
      metaPageId: "",
      metaFormId: "",
    },
    {
      id: crypto.randomUUID(),
      name: "Dental Studio Wien",
      niche: "Stomatologija",
      country: "Austrija",
      status: "Aktivan",
      revenue: 997,
      leads: 42,
      cpl: 18,
      owner: "Miljan",
      team: "Ivana, Marko, Ana",
      package: "Starter",
      contactName: "Anna Gruber",
      contactPhone: "+436601112233",
      whatsapp: "+436601112233",
      billingDay: 1,
      paymentStatus: "Plaćeno",
      invoiceStatus: "Poslat",
      paymentMethod: "Firma",
      contractMonths: 3,
      startDate: "2026-05-01",
      metaPageId: "starter_page_wien",
      metaFormId: "starter_form_implants",
    },
    {
      id: crypto.randomUUID(),
      name: "Auto Detailing Zagreb",
      niche: "Auto usluge",
      country: "Hrvatska",
      status: "Rizik",
      revenue: 1497,
      leads: 21,
      cpl: 31,
      owner: "Ivana",
      team: "Luka, Sara, Nikola",
      package: "Business",
      contactName: "Ivan Kovač",
      contactPhone: "+38591111222",
      whatsapp: "+38591111222",
      billingDay: 5,
      paymentStatus: "Kasni",
      invoiceStatus: "Poslat",
      paymentMethod: "Firma",
      contractMonths: 6,
      startDate: "2026-04-15",
      metaPageId: "starter_page_zagreb",
      metaFormId: "",
    },
    {
      id: crypto.randomUUID(),
      name: "Physio Klinik München",
      niche: "Fizioterapija",
      country: "Nemačka",
      status: "Aktivan",
      revenue: 1997,
      leads: 37,
      cpl: 24,
      owner: "Miljan",
      team: "Ivana, Luka, Ana",
      package: "Enterprise",
      contactName: "Lukas Weber",
      contactPhone: "+491701112233",
      whatsapp: "+491701112233",
      billingDay: 10,
      paymentStatus: "Plaćeno",
      invoiceStatus: "Poslat",
      paymentMethod: "Firma",
      contractMonths: 6,
      startDate: "2026-03-01",
      metaPageId: "starter_page_munich",
      metaFormId: "starter_form_physio",
    },
    {
      id: crypto.randomUUID(),
      name: "Beauty Laser Beograd",
      niche: "Estetika",
      country: "Srbija",
      status: "Onboarding",
      revenue: 997,
      leads: 12,
      cpl: 22,
      owner: "Ivana",
      team: "Marko, Sara, Nikola",
      package: "Starter",
      contactName: "Jelena Simić",
      contactPhone: "+381641234567",
      whatsapp: "+381641234567",
      billingDay: 15,
      paymentStatus: "Nije plaćeno",
      invoiceStatus: "Nije poslat",
      paymentMethod: "Keš",
      contractMonths: 3,
      startDate: "2026-06-20",
      metaPageId: "",
      metaFormId: "",
    },
  ],
  deals: [
    { id: crypto.randomUUID(), name: "Orthodontie Graz", country: "Austrija", value: 3000, stage: "Poziv zakazan", note: "Traži 40+ leadova mesečno." },
    { id: crypto.randomUUID(), name: "Roofing Stuttgart", country: "Nemačka", value: 4200, stage: "Ponuda poslata", note: "Visok ticket, treba case study." },
    { id: crypto.randomUUID(), name: "Salon Novi Sad", country: "Srbija", value: 1600, stage: "Kvalifikovan", note: "Budžet potvrđen, čeka termin." },
    { id: crypto.randomUUID(), name: "Dent Zagreb", country: "Hrvatska", value: 2500, stage: "Novi lead", note: "Došao preko preporuke." },
    { id: crypto.randomUUID(), name: "Reha Wien", country: "Austrija", value: 3500, stage: "Zatvoren", note: "Onboarding sledeće nedelje." },
  ],
  tasks: [
    { id: crypto.randomUUID(), role: "Scenarista", client: "Dental Studio Wien", title: "3 hook-a za implant kampanju", due: "Danas", priority: "Visok" },
    { id: crypto.randomUUID(), role: "Snimatelj", client: "Beauty Laser Beograd", title: "Plan snimanja za tretmane", due: "Sutra", priority: "Srednji" },
    { id: crypto.randomUUID(), role: "Editor", client: "Physio Klinik München", title: "Reels paket 2/8", due: "Danas", priority: "Visok" },
    { id: crypto.randomUUID(), role: "Media buyer", client: "Auto Detailing Zagreb", title: "Nova ad grupa za lead kampanju", due: "Danas", priority: "Visok" },
    { id: crypto.randomUUID(), role: "SMM", client: "Dental Studio Wien", title: "Zakazati 6 objava", due: "Petak", priority: "Srednji" },
    { id: crypto.randomUUID(), role: "Editor", client: "Auto Detailing Zagreb", title: "Before/after montaža", due: "Četvrtak", priority: "Srednji" },
  ],
  leads: [
    {
      id: crypto.randomUUID(),
      client: "Dental Studio Wien",
      name: "Anna Gruber",
      phone: "+436601112233",
      service: "Implant konsultacija",
      source: "Facebook Lead Form",
      status: "Novi",
      priority: "Visok",
      createdAt: "2026-07-05T09:20:00+02:00",
      calledAt: null,
      note: "Želi termin ove nedelje.",
    },
    {
      id: crypto.randomUUID(),
      client: "Auto Detailing Zagreb",
      name: "Ivan Kovač",
      phone: "+38591111222",
      service: "Keramička zaštita",
      source: "Instagram Lead Form",
      status: "Novi",
      priority: "Visok",
      createdAt: "2026-07-04T11:40:00+02:00",
      calledAt: null,
      note: "Pitao za cenu i slobodan termin.",
    },
    {
      id: crypto.randomUUID(),
      client: "Physio Klinik München",
      name: "Lukas Weber",
      phone: "+491701112233",
      service: "Bol u leđima",
      source: "Facebook Lead Form",
      status: "Kontaktiran",
      priority: "Srednji",
      createdAt: "2026-07-05T08:10:00+02:00",
      calledAt: "2026-07-05T10:05:00+02:00",
      note: "Čeka potvrdu termina.",
    },
    {
      id: crypto.randomUUID(),
      client: "Beauty Laser Beograd",
      name: "Jelena Simić",
      phone: "+381641234567",
      service: "Laser tretman",
      source: "Instagram Lead Form",
      status: "Zakazan",
      priority: "Srednji",
      createdAt: "2026-07-03T16:30:00+02:00",
      calledAt: "2026-07-03T17:00:00+02:00",
      note: "Termin zakazan za utorak.",
    },
  ],
  teamMembers: [
    { id: crypto.randomUUID(), client: "Balkan Express", name: "Milan Cujić", role: "Prodaja", phone: "", email: "" },
    { id: crypto.randomUUID(), client: "Grünwand", name: "Recepcija", role: "Recepcija", phone: "", email: "" },
  ],
  employees: defaultEmployeeProfiles,
  employeeAbsences: [
    {
      id: crypto.randomUUID(),
      employeeId: "emp-aleksandar",
      type: "Godišnji odmor",
      startDate: "2026-07-20",
      endDate: "2026-07-24",
      note: "Odobren godišnji odmor.",
      status: "Odobreno",
    },
    {
      id: crypto.randomUUID(),
      employeeId: "emp-luka",
      type: "Bolovanje",
      startDate: "2026-07-08",
      endDate: "2026-07-09",
      note: "Evidentirano bolovanje.",
      status: "Evidentirano",
    },
  ],
  employeeWorkLogs: [
    { id: crypto.randomUUID(), employeeId: "emp-ivana", date: "2026-07-06", hours: 8, type: "Rad", note: "Operativa i klijenti", locked: true, submittedAt: "2026-07-06T18:00:00+02:00" },
    { id: crypto.randomUUID(), employeeId: "emp-aleksandar", date: "2026-07-06", hours: 7.5, type: "Rad", note: "Scenarija", locked: true, submittedAt: "2026-07-06T18:00:00+02:00" },
    { id: crypto.randomUUID(), employeeId: "emp-luka", date: "2026-07-06", hours: 8, type: "Rad", note: "Editovanje", locked: true, submittedAt: "2026-07-06T18:00:00+02:00" },
  ],
  employeeDocuments: [
    {
      id: crypto.randomUUID(),
      employeeId: "emp-ivana",
      month: "2026-07",
      type: "Platna lista / Lohnzettel",
      fileName: "lohnzettel-jul.pdf",
      note: "Dokument za jul.",
      uploadedBy: "Admin",
      uploadedAt: "2026-07-07T10:00:00+02:00",
    },
  ],
  employeeLateRecords: [
    {
      id: crypto.randomUUID(),
      employeeId: "emp-luka",
      date: "2026-07-06",
      minutes: 12,
      reason: "Kašnjenje na jutarnji sastanak.",
      createdAt: "2026-07-06T09:15:00+02:00",
    },
  ],
  employeeGoals: [
    {
      id: crypto.randomUUID(),
      employeeId: "emp-aleksandar",
      title: "Scenarija za aktivne klijente",
      target: "20 završenih scenarija",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      progress: 45,
      status: "U toku",
      note: "Prati se kroz nedeljne zadatke.",
    },
  ],
  employeeOneOnOnes: [
    {
      id: crypto.randomUUID(),
      employeeId: "emp-luka",
      date: "2026-07-05",
      title: "1:1 razvoj editora",
      note: "Fokus na brže završavanje prve verzije i jasnije update-e.",
      createdBy: "Admin",
      visibleToEmployee: true,
    },
  ],
  employeeReports: [
    {
      id: crypto.randomUUID(),
      employeeId: "emp-aleksandar",
      recipientId: "emp-ivana",
      date: "2026-07-06",
      title: "Dnevni izveštaj",
      positive: "Završena dva scenarija.",
      negative: "Kasnio feedback od klijenta.",
      note: "Treba potvrda za novi hook.",
      createdAt: "2026-07-06T18:10:00+02:00",
    },
  ],
  companyPlans: [
    {
      id: crypto.randomUUID(),
      date: "2026-07-15",
      title: "Webinar plan",
      note: "Priprema sledećeg webinara i cilj za nove klijente.",
      type: "Bitni datumi",
      createdAt: "2026-07-07T10:00:00+02:00",
    },
  ],
  notifications: [],
  backup: {
    lastDownloadedAt: "",
    recommendedLocation: "Google Drive / Marketizo Backups",
  },
};

const importedClients = [
  ["Balkan Express", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Grünwand", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Mikrohaus", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Mladen Zivkovic", "Business", "Poslat", "Nije plaćeno", "Firma"],
  ["Srpska Skola", "Starter", "Nije poslat", "Nije plaćeno", "Keš"],
  ["Restoran Dinar", "Business", "Nije poslat", "Nije plaćeno", "Keš"],
  ["Mtel", "Business", "Poslat", "Nije plaćeno", "Firma"],
  ["Kinng Grill", "Business", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Pizzeria Preferita", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Lav Sala", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Marko Lon Cars", "Business", "Nije poslat", "Nije plaćeno", "Firma"],
  ["XXXL Restoran", "Enterprise", "Poslat", "Nije plaćeno", "Firma"],
  ["Natasa Beauty", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Ivica Kljajic", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Zlatno Ćoše", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Posch Graben", "Enterprise", "Poslat", "Plaćeno", "Firma"],
  ["Silvija Lalic", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Bäckerei Martini", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Edin Dizdarevic", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Ana Imhotep", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Alen Bilalic", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Edison Pasic", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Vlado Kamp", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Nikonina Foto", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Violeta Djuric", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Danilo Mitic", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Lilijana Rakita", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Isopur GmbH", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Pro Bike", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Skinfinity", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Nina Pure Skin", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Laci Debljak", "Enterprise", "Nije poslat", "Nije plaćeno", "Firma"],
  ["FR Foto Vladimir", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Stevo - Roditelji i deca", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Verina", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Nemanja Bager", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["Attar Parfemi", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
  ["A - Street", "Starter", "Nije poslat", "Nije plaćeno", "Firma"],
];

let state = loadState();
let onlineHydrationComplete = window.location.protocol === "file:";

function applyAugust2026FinanceCorrections() {
  state.backup = state.backup || {};
  if (state.backup.august2026FinanceCorrected) return false;

  const monthKey = "2026-08";
  const findClient = (...names) => state.clients.find((client) =>
    names.some((name) => client.name.trim().toLowerCase() === name.toLowerCase())
  );
  const updateInvoice = (names, values) => {
    const client = findClient(...names);
    if (!client) return;
    client.invoices = client.invoices || {};
    client.invoices[monthKey] = {
      ...(client.invoices[monthKey] || {}),
      ...values,
    };
  };

  const marko = findClient("Marko Lon Cars", "Marko Cars");
  if (marko) {
    marko.package = "Custom";
    marko.revenue = 1897;
  }

  const dinar = findClient("Restoran Dinar", "Dinar");
  if (dinar) {
    dinar.package = "Custom";
    dinar.revenue = 497;
  }

  [
    ["XXXL Restoran"],
    ["Ivica Kljajic"],
    ["Danilo Mitic", "Danilo Muzicar"],
    ["Isopur GmbH"],
    ["Pro Bike", "ProBike"],
    ["Laci Debljak"],
    ["POSCH Graben", "Posch Graben"],
    ["Silvija Lalic"],
    ["Marko Lon Cars", "Marko Cars"],
  ].forEach((names) => updateInvoice(names, {
    invoiceStatus: "Poslat",
    paymentStatus: "Plaćeno",
    paidAt: "2026-08-26T00:00:00.000Z",
  }));

  updateInvoice(["Attar Parfemi"], {
    invoiceStatus: "Poslat",
    paymentStatus: "Plaćeno",
    paidAt: "2026-07-31T00:00:00.000Z",
    note: "Plaćeno u julu za avgust",
  });

  updateInvoice(["Violeta Djuric", "Violeta Đurić"], {
    invoiceStatus: "Poslat",
    paymentStatus: "Delimično",
    paidAmount: 600,
    note: "Uplaćeno 600 €",
  });

  [
    ["Restoran Dinar", "Dinar"],
    ["FR Foto Vladimir", "FR Foto"],
    ["Stevo - Roditelji i deca", "Stevo"],
    ["Lilijana Rakita", "Ljilja Rakita"],
    ["Zlatno Ćoše", "Zlatno Cose"],
    ["A-Street", "A - Street"],
    ["Sandra HIFU"],
    ["SSG Reinigung"],
    ["Der Fleischer am Eck"],
  ].forEach((names) => updateInvoice(names, { paymentStatus: "Nije plaćeno" }));

  state.backup.august2026FinanceCorrected = true;
  return true;
}

function applyAugust2026ClickUpInvoiceSyncV2() {
  state.backup = state.backup || {};
  if (state.backup.august2026ClickUpInvoiceSyncV2) return false;

  const monthKey = "2026-08";
  const normalize = (value) => String(value || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const findClient = (...names) => (state.clients || []).find((client) =>
    names.some((name) => normalize(client.name) === normalize(name))
  );
  const syncInvoice = (names, amount, invoiceStatus, paymentStatus, extra = {}) => {
    const client = findClient(...names);
    if (!client) return;
    client.invoices = client.invoices || {};
    client.invoices[monthKey] = {
      paymentMethod: client.paymentMethod || "Firma",
      sentAt: invoiceStatus === "Poslat" ? "2026-08-26T00:00:00.000Z" : "",
      paidAt: paymentStatus === "Plaćeno" ? "2026-08-26T00:00:00.000Z" : "",
      ...(client.invoices[monthKey] || {}),
      amount,
      invoiceStatus,
      paymentStatus,
      ...extra,
    };
  };

  [
    [["Mtel"], 1497],
    [["Mikrohaus", "Grünwand", "Grunwand", "Mikrohaus / Grünwand"], 1997],
    [["Balkan Express"], 497],
    [["Mladen Zivkovic", "Mladen Živković"], 1567],
    [["XXXL Restoran"], 1997],
    [["Ivica Kljajic", "Ivica Kljajić"], 1997],
    [["Danilo Mitic", "Danilo Muzicar", "Danilo Mužičar"], 1997],
    [["Isopur GmbH"], 1997],
    [["Pro Bike", "ProBike"], 1997],
    [["Laci Debljak"], 1997],
    [["POSCH Graben", "Posch Graben"], 1997],
    [["Silvija Lalic", "Silvija Lalić"], 997],
    [["Marko Lon Cars", "Marko Cars"], 1897],
  ].forEach(([names, amount]) => syncInvoice(names, amount, "Poslat", "Plaćeno"));

  [
    [["Lilijana Rakita", "Ljilja Rakita"], 1997],
    [["Zlatno Ćoše", "Zlatno Cose"], 1997],
    [["A-Street", "A - Street"], 997],
    [["Sandra HIFU"], 1997],
    [["Restoran Dinar", "Dinar"], 500],
    [["SSG Reinigung"], 1997],
  ].forEach(([names, amount]) => syncInvoice(names, amount, "Poslat", "Nije plaćeno"));

  syncInvoice(["Violeta Djuric", "Violeta Đurić"], 1997, "Poslat", "Delimično", {
    paidAmount: 600,
    note: "Uplaćeno 600 €",
  });
  syncInvoice(["Stevo - Roditelji i deca", "Stevo"], 997, "Nije poslat", "Plaćeno");
  syncInvoice(["Attar Parfemi"], 997, "Nije poslat", "Plaćeno", {
    paidAt: "2026-07-31T00:00:00.000Z",
    note: "Plaćeno u julu za avgust",
  });
  syncInvoice(["FR Foto Vladimir", "FR Foto"], 997, "Nije poslat", "Nije plaćeno");
  syncInvoice(["Der Fleischer am Eck"], 997, "Nije poslat", "Nije plaćeno");

  state.backup.august2026ClickUpInvoiceSyncV2 = true;
  return true;
}

function applyMonthlyInvoiceRostersV5() {
  state.backup = state.backup || {};
  if (state.backup.monthlyInvoiceRostersV5) return false;
  const normalize = (value) => String(value || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj");
  const findClient = (...names) => (state.clients || []).find((client) =>
    names.some((name) => normalize(client.name) === normalize(name))
  );
  if (!findClient("Der Fleischer am Eck")) {
    state.clients.push(withLoginDefaults({
      id: crypto.randomUUID(), name: "Der Fleischer am Eck", package: "Starter", revenue: 997,
      country: "Austrija", status: "Neaktivan", startDate: "2026-08-01", contractMonths: 3,
      billingDay: 1, paymentMethod: "Firma", invoiceStatus: "Nije poslat",
      paymentStatus: "Nije plaćeno", invoices: {},
    }));
  }
  const ensureRoster = (monthKey, roster) => {
    const includedIds = new Set();
    roster.forEach((names) => {
      const client = findClient(...names);
      if (!client) return;
      includedIds.add(client.id);
      client.invoices = client.invoices || {};
      client.invoices[monthKey] = {
        invoiceStatus: "Nije poslat",
        paymentStatus: "Nije plaćeno",
        paymentMethod: client.paymentMethod || "Firma",
        sentAt: "",
        paidAt: "",
        amount: Number(client.revenue || 0),
        ...(client.invoices[monthKey] || {}),
      };
    });
    (state.clients || []).forEach((client) => {
      if (!includedIds.has(client.id) && client.invoices) delete client.invoices[monthKey];
    });
  };

  ensureRoster("2026-08", [
    ["Mtel"], ["Mikrohaus", "Grünwand", "Grunwand", "Mikrohaus / Grünwand"], ["Balkan Express"],
    ["Mladen Zivkovic", "Mladen Živković"], ["XXXL Restoran"], ["Ivica Kljajic", "Ivica Kljajić"],
    ["Danilo Mitic", "Danilo Muzicar", "Danilo Mužičar"], ["Lilijana Rakita", "Ljilja Rakita"],
    ["Isopur GmbH"], ["Violeta Djuric", "Violeta Đurić"], ["Pro Bike", "ProBike"], ["Laci Debljak"],
    ["POSCH Graben", "Posch Graben"], ["Silvija Lalic", "Silvija Lalić"],
    ["Stevo - Roditelji i deca", "Stevo"], ["Zlatno Ćoše", "Zlatno Cose"], ["A-Street", "A - Street"],
    ["Sandra HIFU"], ["Restoran Dinar", "Dinar"], ["Marko Lon Cars", "Marko Cars"],
    ["FR Foto Vladimir", "FR Foto"], ["SSG Reinigung"], ["Attar Parfemi"], ["Der Fleischer am Eck"],
  ]);

  ensureRoster("2026-09", [
    ["Mladen Zivkovic", "Mladen Živković"], ["FR Foto Vladimir", "FR Foto"], ["POSCH Graben", "Posch Graben"],
    ["Isopur GmbH"], ["Milos Erdbewegung", "Miloš Erdbewegung"], ["Hand2Hand"], ["Ukus Homolja"],
    ["Verina Administracija", "Verina"], ["Nemanja Bager - Avgust", "Nemanja Bager"],
    ["Stevo - Roditelji i deca", "Stevo"], ["Vlado Camp", "Vlado Kamp"], ["Ana Imhotep"],
    ["Natasa Komsetikpraxis", "Natasa Kosmetikpraxis", "Nataša Kosmetikpraxis", "Natasa Beauty"],
    ["Edin Dizdarevic", "Edin Dizdarević"], ["Attar Parfemi"], ["Marko Lon Cars", "Marko Cars"],
    ["SSG Reinigung"], ["ReinDaheim"], ["Restoran Dinar", "Dinar"], ["Sandra HIFU"],
    ["A-Street", "A - Street"], ["Laci Debljak"], ["Pro Bike", "ProBike"],
    ["Ivica Kljajic", "Ivica Kljajić"], ["Danilo Mitic", "Danilo Muzicar", "Danilo Mužičar"],
    ["Balkan Express"], ["Mikrohaus", "Grünwand", "Grunwand", "Mikrohaus / Grünwand"], ["Mtel"],
    ["Silvija Lalic", "Silvija Lalić"], ["Violeta Djuric", "Violeta Đurić"],
    ["Lilijana Rakita", "Ljilja Rakita"], ["Zlatno Ćoše", "Zlatno Cose"], ["XXXL Restoran"],
  ]);
  state.backup.monthlyInvoiceRostersV5 = true;
  return true;
}

function applySladjan2026BalanceCorrections() {
  state.backup = state.backup || {};
  if (state.backup.sladjan2026BalancesCorrected) return false;
  const employee = (state.employees || []).find((item) =>
    String(item.name || "").trim().toLowerCase().replace(/[đ]/g, "dj") === "sladjan simic"
  );
  if (!employee) return false;
  employee.openingHourBalance = 0;
  employee.openingBalanceMonth = "2025-12";
  employee.monthlyBalanceOverrides = {
    ...(employee.monthlyBalanceOverrides || {}),
    "2026-01": 2.5,
    "2026-02": 1.5,
    "2026-03": 3.5,
    "2026-04": 0,
    "2026-05": 0,
    "2026-06": -2,
    "2026-07": 1.5,
    "2026-08": -0.5,
  };
  state.backup.sladjan2026BalancesCorrected = true;
  return true;
}

function applyHazim2026ActualsV1() {
  state.backup = state.backup || {};
  if (state.backup.hazim2026ActualsV1) return false;
  const normalize = (value) => String(value || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj");
  const employee = (state.employees || []).find((item) => normalize(item.name) === "hazim hadzic");
  if (!employee) return false;

  employee.weeklyHours = 30;
  employee.weeklyHoursByMonth = {
    ...(employee.weeklyHoursByMonth || {}),
    "2026-01": 20,
    "2026-02": 20,
    "2026-03": 20,
    "2026-04": 20,
    "2026-05": 20,
    "2026-06": 20,
    "2026-07": 30,
    "2026-08": 30,
  };
  employee.monthlyAbsenceDays = {
    ...(employee.monthlyAbsenceDays || {}),
    "2026-04": { "Godišnji odmor": 4 },
    "2026-05": { "Poklon dan": 1 },
    "2026-06": { "Godišnji odmor": 1 },
    "2026-07": { "Godišnji odmor": 5 },
    "2026-08": { "Godišnji odmor": 5 },
  };

  const monthlyHours = {
    "2026-01": 88,
    "2026-02": 82,
    "2026-03": 82,
    "2026-04": 60,
    "2026-05": 80,
    "2026-06": 120,
    "2026-07": 108,
    "2026-08": 96,
  };
  state.employeeWorkLogs = state.employeeWorkLogs || [];
  Object.entries(monthlyHours).forEach(([monthKey, targetHours]) => {
    state.employeeWorkLogs = state.employeeWorkLogs.filter((log) => !(
      log.employeeId === employee.id && String(log.date || "").startsWith(monthKey)
      && (log.activityName === "Migracija iz ClickUp-a" || log.note === "Hazim - usklađen mesečni zbir")
    ));
    const existingHours = state.employeeWorkLogs
      .filter((log) => log.employeeId === employee.id && String(log.date || "").startsWith(monthKey))
      .reduce((sum, log) => sum + Number(log.hours || 0), 0);
    const correctionHours = Math.round((targetHours - existingHours) * 100) / 100;
    if (Math.abs(correctionHours) < 0.01) return;
    const [year, month] = monthKey.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    state.employeeWorkLogs.push({
      id: `hazim-actual-${monthKey}`,
      employeeId: employee.id,
      date: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
      hours: correctionHours,
      minutes: Math.round(correctionHours * 60),
      activityId: "",
      activityName: "Prenos stvarnog mesečnog zbira",
      activityCategory: "Evidencija",
      clientId: "",
      clientName: "",
      type: "Rad",
      note: "Hazim - usklađen mesečni zbir",
      locked: true,
      submittedAt: new Date().toISOString(),
    });
  });
  state.backup.hazim2026ActualsV1 = true;
  return true;
}

function applyMilica2026ActualsV1() {
  state.backup = state.backup || {};
  if (state.backup.milica2026ActualsV1) return false;
  const normalize = (value) => String(value || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj");
  const employee = (state.employees || []).find((item) => normalize(item.name) === "milica blagojevic");
  if (!employee) return false;

  employee.startDate = "2026-07-06";
  employee.weeklyHours = 38.5;
  employee.weeklyHoursByMonth = {
    ...(employee.weeklyHoursByMonth || {}),
    "2026-07": 38.5,
    "2026-08": 38.5,
  };
  employee.monthlyAbsenceDays = {
    ...(employee.monthlyAbsenceDays || {}),
    "2026-08": { "Godišnji odmor": 7 },
  };

  state.employeeAbsences = state.employeeAbsences || [];
  const augustVacation = state.employeeAbsences.find((absence) =>
    absence.employeeId === employee.id
    && absence.type === "Godišnji odmor"
    && String(absence.startDate || "").startsWith("2026-08")
  );
  const vacationData = {
    employeeId: employee.id,
    type: "Godišnji odmor",
    startDate: "2026-08-06",
    endDate: "2026-08-14",
    note: "Milica - potvrđen godišnji odmor",
    status: "Odobreno",
  };
  if (augustVacation) Object.assign(augustVacation, vacationData);
  else state.employeeAbsences.push({ id: "milica-vacation-2026-08", ...vacationData });

  const monthlyHours = { "2026-07": 154, "2026-08": 94.5 };
  state.employeeWorkLogs = state.employeeWorkLogs || [];
  Object.entries(monthlyHours).forEach(([monthKey, targetHours]) => {
    state.employeeWorkLogs = state.employeeWorkLogs.filter((log) => !(
      log.employeeId === employee.id && String(log.date || "").startsWith(monthKey)
      && (log.activityName === "Migracija iz ClickUp-a" || log.note === "Milica - usklađen mesečni zbir")
    ));
    const existingHours = state.employeeWorkLogs
      .filter((log) => log.employeeId === employee.id && String(log.date || "").startsWith(monthKey))
      .reduce((sum, log) => sum + Number(log.hours || 0), 0);
    const correctionHours = Math.round((targetHours - existingHours) * 100) / 100;
    if (Math.abs(correctionHours) < 0.01) return;
    const [year, month] = monthKey.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    state.employeeWorkLogs.push({
      id: `milica-actual-${monthKey}`,
      employeeId: employee.id,
      date: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
      hours: correctionHours,
      minutes: Math.round(correctionHours * 60),
      activityId: "",
      activityName: "Prenos stvarnog mesečnog zbira",
      activityCategory: "Evidencija",
      clientId: "",
      clientName: "",
      type: "Rad",
      note: "Milica - usklađen mesečni zbir",
      locked: true,
      submittedAt: new Date().toISOString(),
    });
  });
  state.backup.milica2026ActualsV1 = true;
  return true;
}

function applyAleksa2026ActualsV1() {
  state.backup = state.backup || {};
  if (state.backup.aleksa2026ActualsV1) return false;
  const normalize = (value) => String(value || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj");
  const employee = (state.employees || []).find((item) => normalize(item.name) === "aleksa damjanovic");
  if (!employee) return false;

  employee.weeklyHours = 38.5;
  employee.weeklyHoursByMonth = {
    ...(employee.weeklyHoursByMonth || {}),
    "2026-06": 20,
    "2026-07": 20,
    "2026-08": 38.5,
  };

  const monthlyHours = { "2026-06": 39.5, "2026-07": 91, "2026-08": 155.5 };
  state.employeeWorkLogs = state.employeeWorkLogs || [];
  Object.entries(monthlyHours).forEach(([monthKey, targetHours]) => {
    state.employeeWorkLogs = state.employeeWorkLogs.filter((log) => !(
      log.employeeId === employee.id && String(log.date || "").startsWith(monthKey)
      && (log.activityName === "Migracija iz ClickUp-a" || log.note === "Aleksa - usklađen mesečni zbir")
    ));
    const existingHours = state.employeeWorkLogs
      .filter((log) => log.employeeId === employee.id && String(log.date || "").startsWith(monthKey))
      .reduce((sum, log) => sum + Number(log.hours || 0), 0);
    const correctionHours = Math.round((targetHours - existingHours) * 100) / 100;
    if (Math.abs(correctionHours) < 0.01) return;
    const [year, month] = monthKey.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    state.employeeWorkLogs.push({
      id: `aleksa-actual-${monthKey}`,
      employeeId: employee.id,
      date: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
      hours: correctionHours,
      minutes: Math.round(correctionHours * 60),
      activityId: "",
      activityName: "Prenos stvarnog mesečnog zbira",
      activityCategory: "Evidencija",
      clientId: "",
      clientName: "",
      type: "Rad",
      note: "Aleksa - usklađen mesečni zbir",
      locked: true,
      submittedAt: new Date().toISOString(),
    });
  });
  state.backup.aleksa2026ActualsV1 = true;
  return true;
}

function applyProductionDataCleanupV1() {
  state.backup = state.backup || {};
  if (state.backup.productionDataCleanupV1) return false;
  const normalize = (value) => String(value || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj");
  const sladjan = (state.employees || []).find((employee) => normalize(employee.name) === "sladjan simic");
  const removedAbsenceIds = new Set();

  state.employeeAbsences = (state.employeeAbsences || []).filter((absence) => {
    const isSladjanTest = sladjan && absence.employeeId === sladjan.id
      && absence.startDate === "2026-08-26" && absence.endDate === "2026-08-26";
    const isStarterDemo = (
      absence.employeeId === "emp-aleksandar" && absence.startDate === "2026-07-20" && absence.endDate === "2026-07-24"
    ) || (
      absence.employeeId === "emp-luka" && absence.startDate === "2026-07-08" && absence.endDate === "2026-07-09"
    );
    if (isSladjanTest || isStarterDemo) removedAbsenceIds.add(absence.id);
    return !isSladjanTest && !isStarterDemo;
  });

  state.employeeWorkLogs = (state.employeeWorkLogs || []).filter((log) => !(
    log.date === "2026-07-06" && ["emp-ivana", "emp-aleksandar", "emp-luka"].includes(log.employeeId)
    && ["Operativa i klijenti", "Scenarija", "Editovanje"].includes(log.note)
  ));
  state.employeeLateRecords = (state.employeeLateRecords || []).filter((record) => !(
    record.employeeId === "emp-luka" && record.date === "2026-07-06" && record.minutes === 12
  ));
  state.employeeGoals = (state.employeeGoals || []).filter((goal) => !(
    goal.employeeId === "emp-aleksandar" && goal.startDate === "2026-07-01" && goal.endDate === "2026-07-31"
  ));
  state.employeeOneOnOnes = (state.employeeOneOnOnes || []).filter((note) => !(
    note.employeeId === "emp-luka" && note.date === "2026-07-05" && note.title === "1:1 razvoj editora"
  ));
  state.employeeReports = (state.employeeReports || []).filter((report) => !(
    report.employeeId === "emp-aleksandar" && report.date === "2026-07-06" && report.title === "Dnevni izveštaj"
  ));
  state.employeeDocuments = (state.employeeDocuments || []).filter((documentItem) => !(
    documentItem.employeeId === "emp-ivana" && documentItem.month === "2026-07" && documentItem.fileName === "lohnzettel-jul.pdf"
  ));
  state.companyPlans = (state.companyPlans || []).filter((plan) => !(
    plan.date === "2026-07-15" && normalize(plan.title).includes("webinar")
  ));
  state.notifications = (state.notifications || []).filter((notification) => {
    const linkedToRemovedAbsence = [...removedAbsenceIds].some((id) => String(notification.key || "").includes(id));
    const isSladjanTestNotification = sladjan && notification.targetId === sladjan.id
      && String(notification.message || "").includes("26.08.2026");
    const isAdminSladjanTestNotification = normalize(notification.message).includes("sladjan simic")
      && String(notification.message || "").includes("26.08.2026");
    return !linkedToRemovedAbsence && !isSladjanTestNotification && !isAdminSladjanTestNotification;
  });
  state.backup.productionDataCleanupV1 = true;
  return true;
}

function applyQa20260827Cleanup() {
  state.backup = state.backup || {};
  if (state.backup.qa20260827CleanupV1) return false;
  const marker = "qa-20260827";
  const containsMarker = (value) => String(value || "").toLowerCase().includes(marker);
  const qaEmployeeIds = new Set((state.employees || []).filter((item) => containsMarker(item.name) || containsMarker(item.email)).map((item) => item.id));
  const qaClientIds = new Set((state.clients || []).filter((item) => containsMarker(item.name) || containsMarker(item.loginEmail)).map((item) => item.id));
  const qaActivityIds = new Set((state.employeeActivities || []).filter((item) => containsMarker(item.name)).map((item) => item.id));

  state.employees = (state.employees || []).filter((item) => !qaEmployeeIds.has(item.id));
  state.clients = (state.clients || []).filter((item) => !qaClientIds.has(item.id));
  state.employeeActivities = (state.employeeActivities || []).filter((item) => !qaActivityIds.has(item.id));
  state.employeeWorkLogs = (state.employeeWorkLogs || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !qaActivityIds.has(item.activityId) && !containsMarker(item.note) && !containsMarker(item.activityName));
  state.employeeAbsences = (state.employeeAbsences || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.note));
  state.employeeLateRecords = (state.employeeLateRecords || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.reason));
  state.employeeGoals = (state.employeeGoals || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.title) && !containsMarker(item.target));
  state.employeeRatings = (state.employeeRatings || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.comment));
  state.employeeRecognitions = (state.employeeRecognitions || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.message));
  state.employeeOneOnOnes = (state.employeeOneOnOnes || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.title) && !containsMarker(item.note));
  state.employeeReports = (state.employeeReports || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !qaActivityIds.has(item.activityId) && !containsMarker(item.note) && !containsMarker(item.activityName));
  state.notifications = (state.notifications || []).filter((item) => !qaEmployeeIds.has(item.targetId) && !containsMarker(item.key) && !containsMarker(item.title) && !containsMarker(item.message));
  state.leads = (state.leads || []).filter((item) => !containsMarker(item.client) && !containsMarker(item.name));
  state.teamMembers = (state.teamMembers || []).filter((item) => !containsMarker(item.client) && !containsMarker(item.name));
  state.backup.qa20260827CleanupV1 = true;
  return true;
}

function applyQa20260828Cleanup() {
  state.backup = state.backup || {};
  if (state.backup.qa20260828CleanupV1) return false;
  const marker = "qa-20260828";
  const containsMarker = (value) => String(value || "").toLowerCase().includes(marker);
  const qaEmployeeIds = new Set((state.employees || [])
    .filter((item) => containsMarker(item.name) || containsMarker(item.email))
    .map((item) => item.id));

  state.employees = (state.employees || []).filter((item) => !qaEmployeeIds.has(item.id));
  state.employeeLeaderAssignments = (state.employeeLeaderAssignments || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !qaEmployeeIds.has(item.leaderId));
  state.employeeWorkLogs = (state.employeeWorkLogs || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.note) && !containsMarker(item.activityName));
  state.employeeAbsences = (state.employeeAbsences || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.note));
  state.employeeLateRecords = (state.employeeLateRecords || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.reason));
  state.employeeGoals = (state.employeeGoals || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.title) && !containsMarker(item.target));
  state.employeeRatings = (state.employeeRatings || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.comment) && !containsMarker(item.reviewer));
  state.employeeRecognitions = (state.employeeRecognitions || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.message) && !containsMarker(item.author));
  state.employeeOneOnOnes = (state.employeeOneOnOnes || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.title) && !containsMarker(item.note));
  state.employeeReports = (state.employeeReports || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.note) && !containsMarker(item.activityName));
  state.employeeDocuments = (state.employeeDocuments || []).filter((item) => !qaEmployeeIds.has(item.employeeId) && !containsMarker(item.fileName));
  state.notifications = (state.notifications || []).filter((item) => !qaEmployeeIds.has(item.targetId) && !containsMarker(item.key) && !containsMarker(item.title) && !containsMarker(item.message));
  state.backup.qa20260828CleanupV1 = true;
  return true;
}

function applyQa20260828CleanupV2() {
  state.backup = state.backup || {};
  if (state.backup.qa20260828CleanupV2) return false;
  const qaEmployeeId = "1b8d4f92-b91b-4469-bf17-15a6a3d1b46c";
  const containsQaMarker = (value) => {
    const text = String(value || "").toLowerCase();
    return text.includes("qa-20260828") || text.includes("qa test 20260828");
  };

  state.employees = (state.employees || []).filter((item) => item.id !== qaEmployeeId && !containsQaMarker(item.name) && !containsQaMarker(item.email));
  state.employeeLeaderAssignments = (state.employeeLeaderAssignments || []).filter((item) => item.employeeId !== qaEmployeeId && item.leaderId !== qaEmployeeId);
  state.employeeWorkLogs = (state.employeeWorkLogs || []).filter((item) => item.employeeId !== qaEmployeeId && !containsQaMarker(item.note) && !containsQaMarker(item.activityName));
  state.employeeAbsences = (state.employeeAbsences || []).filter((item) => item.employeeId !== qaEmployeeId && !containsQaMarker(item.note));
  state.employeeLateRecords = (state.employeeLateRecords || []).filter((item) => item.employeeId !== qaEmployeeId && !containsQaMarker(item.reason));
  state.employeeGoals = (state.employeeGoals || []).filter((item) => item.employeeId !== qaEmployeeId && !containsQaMarker(item.title) && !containsQaMarker(item.target));
  state.employeeRatings = (state.employeeRatings || []).filter((item) => item.employeeId !== qaEmployeeId && !containsQaMarker(item.comment) && !containsQaMarker(item.reviewer));
  state.employeeRecognitions = (state.employeeRecognitions || []).filter((item) => item.employeeId !== qaEmployeeId && !containsQaMarker(item.message) && !containsQaMarker(item.author));
  state.employeeOneOnOnes = (state.employeeOneOnOnes || []).filter((item) => item.employeeId !== qaEmployeeId && !containsQaMarker(item.title) && !containsQaMarker(item.note));
  state.employeeReports = (state.employeeReports || []).filter((item) => item.employeeId !== qaEmployeeId && !containsQaMarker(item.note) && !containsQaMarker(item.activityName));
  state.employeeDocuments = (state.employeeDocuments || []).filter((item) => item.employeeId !== qaEmployeeId && !containsQaMarker(item.fileName));
  state.notifications = (state.notifications || []).filter((item) => item.targetId !== qaEmployeeId && !containsQaMarker(item.key) && !containsQaMarker(item.title) && !containsQaMarker(item.message));
  state.backup.qa20260828CleanupV2 = true;
  return true;
}

function applyEmployeeActivityCatalogV1() {
  state.backup = state.backup || {};
  if (state.backup.employeeActivityCatalogV1) return false;
  const catalog = {
    SMM: ["Dizajn postova", "Dizajn storija", "Komunikacija sa klijentom", "Pravljenje taskova"],
    Scenario: ["Pisanje scenarija", "Ispravke scenarija", "Istraživanje ideja", "Putovanje"],
    Sastanci: ["Sastanak Daily", "Sastanak mesečni", "Sastanak sa klijentom", "Sastanak sa liderima", "Sastanak 1:1", "Hitan sastanak"],
    Snimatelji: ["Snimanje na terenu", "Putovanje"],
    "Sales tim": ["Prodajni sastanak", "Kvalifikacioni poziv"],
    Editori: ["Edit klipova", "Ispravka klipova", "Istraživanje ideja za edit"],
    "Media Buying": ["Puštanje reklama", "Provera reklama", "Istraživanje novih stvari oko Ads Managera", "Rešavanje problema oko Ads Managera"],
  };
  state.employeeActivities = state.employeeActivities || [];
  Object.entries(catalog).forEach(([category, names]) => names.forEach((name) => {
    if (!state.employeeActivities.some((item) => item.name === name && item.category === category)) state.employeeActivities.push({ id: crypto.randomUUID(), name, category, active: true });
  }));
  state.backup.employeeActivityCatalogV1 = true;
  return true;
}

applyAugust2026FinanceCorrections();
applyAugust2026ClickUpInvoiceSyncV2();
applyMonthlyInvoiceRostersV5();
applySladjan2026BalanceCorrections();
applyHazim2026ActualsV1();
applyMilica2026ActualsV1();
applyAleksa2026ActualsV1();
applyProductionDataCleanupV1();
applyQa20260827Cleanup();
applyQa20260828Cleanup();
applyQa20260828CleanupV2();
applyEmployeeActivityCatalogV1();
saveState({ remote: false });
let activeFilter = "all";
let activeStatusFilter = "all";
let activeLeadFilter = "all";
let searchTerm = "";
let monthFilter = "";
let dateFromFilter = "";
let dateToFilter = "";
let countryFilter = "all";
const openInvoiceGroups = new Set(["unpaid"]);
let selectedPortalClientId = state.clients[0]?.id || "";
let employeeMonthFilter = currentMonthKey();
let employeeStatusFilter = "all";
let employeeWorkPersonFilter = "all";
let employeeWorkMonthFilter = currentMonthKey();
const requestedEmployeeId = new URLSearchParams(location.search).get("employee");
let selectedEmployeeId = state.employees?.some((employee) => employee.id === requestedEmployeeId)
  ? requestedEmployeeId
  : state.employees?.[0]?.id || "";
let employeeProfileTab = "summary";
let employeeOverviewFilter = "all";

const currency = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function currentDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function selectedMonthKey() {
  return monthFilter || document.getElementById("invoiceMonthFilter")?.value || currentMonthKey();
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("sr-Latn-RS", { month: "long", year: "numeric" });
}

function loginSlug(value) {
  return String(value || "klijent")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "klijent";
}

function withLoginDefaults(client) {
  client.loginEmail = client.loginEmail || `${loginSlug(client.name)}@marketizo.local`;
  client.loginPassword = client.loginPassword || "123456";
  return client;
}

function withInvoiceDefaults(client) {
  client.invoices = client.invoices || {};
  return client;
}

function monthlyInvoice(client, monthKey = selectedMonthKey()) {
  client.invoices = client.invoices || {};
  return client.invoices[monthKey] || {
    invoiceStatus: "Nije poslat",
    paymentStatus: "Nije plaćeno",
    paymentMethod: client.paymentMethod || "Firma",
    sentAt: "",
    paidAt: "",
  };
}

function clientsForInvoiceMonth(clients, monthKey) {
  return clients.filter((client) => Boolean(client.invoices && client.invoices[monthKey]));
}

function financeClientsForMonth(clients, monthKey) {
  return clientsForInvoiceMonth(clients, monthKey).filter((client) => {
    if (client.status !== "Arhiviran") return true;
    return monthlyInvoice(client, monthKey).paymentStatus !== "Plaćeno";
  });
}

function invoiceAmount(client, monthKey = selectedMonthKey()) {
  const invoice = monthlyInvoice(client, monthKey);
  const clientRevenue = Number(client.revenue || 0);
  if (monthKey === currentDateKey().slice(0, 7) && clientRevenue > 0) return clientRevenue;
  const storedAmount = Number(invoice.amount || 0);
  if (storedAmount > 0) return storedAmount;
  if (clientRevenue > 0) return clientRevenue;
  return Number(packageConfig[normalizePackage(client.package)]?.price || 0);
}

function groupInvoiceSum(clients, field, monthKey) {
  return clientsForInvoiceMonth(clients, monthKey).reduce((totals, client) => {
    const key = client[field] || "Ostalo";
    totals[key] = (totals[key] || 0) + invoiceAmount(client, monthKey);
    return totals;
  }, {});
}

function loadState(sourceData = null) {
  const saved = sourceData ? "" : localStorage.getItem("agencyCrmData");
  if (sourceData) return migrateState(structuredClone(sourceData));
  if (!saved) return migrateState(structuredClone(starterData));
  try {
    return migrateState(JSON.parse(saved));
  } catch {
    return structuredClone(starterData);
  }
}

function migrateState(data) {
  const clients = (data.clients || starterData.clients)
    .filter((client) => !starterClientNames.has(client.name))
    .map((client) => {
      const normalizedClient = {
        package: "Starter",
        contactName: "",
        contactPhone: "",
        whatsapp: "",
        billingDay: 1,
        paymentStatus: "Nije plaćeno",
        invoiceStatus: "Nije poslat",
        paymentMethod: "Firma",
        contractMonths: 3,
        startDate: "",
        metaPageId: "",
        metaFormId: "",
        contractFileName: "",
        contractFileData: "",
        contractNote: "",
        loginEmail: "",
        loginPassword: "",
        invoices: {},
        websiteService: "Ne",
        websitePrice: 0,
        hostingProvider: "",
        hostingExpiresAt: "",
        hostingPrice: 0,
        domainName: "",
        domainExpiresAt: "",
        domainPrice: 0,
        ...client,
        ...packageValues(client.package, client.revenue, client.contractMonths),
        status: normalizeClientStatus(client.status),
      };
      return withInvoiceDefaults(withLoginDefaults(normalizedClient));
    });
  importedClients.forEach(([name, packageName, invoiceStatus, paymentStatus, paymentMethod]) => {
    if (clients.some((client) => client.name === name)) return;
    const values = packageValues(packageName);
    clients.push(withInvoiceDefaults(withLoginDefaults({
      id: crypto.randomUUID(),
      name,
      niche: "Klijent",
      country: "Austrija",
      status: "Aktivan",
      revenue: values.revenue,
      leads: 0,
      cpl: 0,
      owner: "Marketizo",
      team: "",
      package: packageName,
      contactName: "",
      contactPhone: "",
      whatsapp: "",
      billingDay: 15,
      paymentStatus,
      invoiceStatus,
      paymentMethod,
      invoices: {},
      contractMonths: values.contractMonths,
      startDate: "",
      metaPageId: "",
      metaFormId: "",
      contractFileName: "",
      contractFileData: "",
      contractNote: "",
    })));
  });
  const employees = (data.employees?.length ? data.employees : defaultEmployeeProfiles).map((employee) => ({
    id: employee.id || crypto.randomUUID(),
    name: "",
    email: "",
    password: "123456",
    position: "",
    startDate: "",
    salary: 0,
    weeklyHours: 40,
    openingHourBalance: 0,
    openingBalanceMonth: "",
    vacationDays: 26,
    openingVacationUsed: 0,
    giftDays: 1,
    isLeader: false,
    leaderId: "",
    status: "Aktivan",
    ...employee,
    weeklyHours: parseNumber(employee.weeklyHours || 40, 40),
    openingHourBalance: parseNumber(employee.openingHourBalance || 0, 0),
    openingBalanceMonth: employee.openingBalanceMonth || shiftMonth(currentMonthKey(), -1),
    vacationDays: parseNumber(employee.vacationDays || 26, 26),
    openingVacationUsed: parseNumber(employee.openingVacationUsed || 0, 0),
    giftDays: parseNumber(employee.giftDays || 1, 1),
    status: ["Aktivan", "Pauza", "Neaktivan"].includes(employee.status) ? employee.status : "Aktivan",
  }));
  const employeeAbsences = (data.employeeAbsences || starterData.employeeAbsences || []).map((absence) => ({
    id: absence.id || crypto.randomUUID(),
    employeeId: absence.employeeId || employees[0]?.id || "",
    type: absence.type || "Godišnji odmor",
    startDate: absence.startDate || currentDateKey(),
    endDate: absence.endDate || absence.startDate || currentDateKey(),
    note: absence.note || "",
    status: absence.status || "Odobreno",
    requestedAt: absence.requestedAt || "",
    approvedAt: absence.approvedAt || "",
    approvedBy: absence.approvedBy || "",
    hidden: Boolean(absence.hidden),
  }));
  const employeeWorkLogs = (data.employeeWorkLogs || starterData.employeeWorkLogs || []).map((log) => ({
    id: log.id || crypto.randomUUID(),
    employeeId: log.employeeId || employees[0]?.id || "",
    date: log.date || currentDateKey(),
    hours: Number(log.hours || 0),
    minutes: Number(log.minutes || Math.round(Number(log.hours || 0) * 60)),
    activityId: log.activityId || "",
    activityName: log.activityName || log.note || "Rad",
    activityCategory: log.activityCategory || "Ostalo",
    clientId: log.clientId || "",
    clientName: log.clientName || "",
    type: log.type || "Rad",
    note: log.note || "",
    positive: log.positive || "",
    negative: log.negative || "",
    locked: log.locked !== false,
    submittedAt: log.submittedAt || new Date().toISOString(),
  }));
  const employeeActivities = (data.employeeActivities || starterData.employeeActivities || []).map((activity) => ({
    id: activity.id || crypto.randomUUID(),
    name: activity.name || "Aktivnost",
    category: activity.category || "Ostalo",
    active: activity.active !== false,
  }));
  const employeeDocuments = (data.employeeDocuments || starterData.employeeDocuments || []).map((documentItem) => ({
    id: documentItem.id || crypto.randomUUID(),
    employeeId: documentItem.employeeId || employees[0]?.id || "",
    month: documentItem.month || currentMonthKey(),
    type: documentItem.type || "Faktura",
    fileName: documentItem.fileName || "",
    fileData: documentItem.fileData || "",
    note: documentItem.note || "",
    uploadedBy: documentItem.uploadedBy || "Admin",
    uploadedAt: documentItem.uploadedAt || new Date().toISOString(),
  }));
  const employeeLateRecords = (data.employeeLateRecords || starterData.employeeLateRecords || []).map((record) => ({
    id: record.id || crypto.randomUUID(),
    employeeId: record.employeeId || employees[0]?.id || "",
    date: record.date || currentDateKey(),
    minutes: Number(record.minutes || 0),
    penaltyMinutes: Math.max(15, Number(record.penaltyMinutes || record.minutes || 0)),
    reason: record.reason || "",
    acknowledgedAt: record.acknowledgedAt || "",
    createdAt: record.createdAt || new Date().toISOString(),
  }));
  const employeeGoals = (data.employeeGoals || starterData.employeeGoals || []).map((goal) => ({
    id: goal.id || crypto.randomUUID(),
    employeeId: goal.employeeId || employees[0]?.id || "",
    title: goal.title || "",
    target: goal.target || "",
    startDate: goal.startDate || currentDateKey(),
    endDate: goal.endDate || currentDateKey(),
    progress: Number(goal.progress || 0),
    status: goal.status || "U toku",
    note: goal.note || "",
    category: goal.category || "Razvoj",
    completedDate: goal.completedDate || (goal.status === "Završeno" ? currentDateKey() : ""),
  }));
  const employeeRatings = (data.employeeRatings || []).map((rating) => ({
    id: rating.id || crypto.randomUUID(),
    employeeId: rating.employeeId || employees[0]?.id || "",
    month: rating.month || currentMonthKey(),
    source: rating.source || "Vlasnik",
    reviewer: rating.reviewer || "",
    score: Math.min(5, Math.max(1, Number(rating.score || 1))),
    note: rating.note || "",
    createdAt: rating.createdAt || new Date().toISOString(),
  }));
  const employeeRecognitions = (data.employeeRecognitions || []).map((item) => ({
    id: item.id || crypto.randomUUID(),
    employeeId: item.employeeId || employees[0]?.id || "",
    month: item.month || currentMonthKey(),
    type: item.type || "Pohvala",
    author: item.author || "Admin",
    text: item.text || "",
    createdAt: item.createdAt || new Date().toISOString(),
  }));
  const employeeOneOnOnes = (data.employeeOneOnOnes || starterData.employeeOneOnOnes || []).map((note) => ({
    id: note.id || crypto.randomUUID(),
    employeeId: note.employeeId || employees[0]?.id || "",
    date: note.date || currentDateKey(),
    title: note.title || "1:1 sastanak",
    note: note.note || "",
    createdBy: note.createdBy || "Admin",
    visibleToEmployee: note.visibleToEmployee !== false,
  }));
  const employeeReports = (data.employeeReports || starterData.employeeReports || []).map((report) => ({
    id: report.id || crypto.randomUUID(),
    employeeId: report.employeeId || employees[0]?.id || "",
    recipientId: report.recipientId || "",
    date: report.date || currentDateKey(),
    title: report.title || "Dnevni izveštaj",
    positive: report.positive || "",
    negative: report.negative || "",
    note: report.note || "",
    createdAt: report.createdAt || new Date().toISOString(),
  }));
  const companyPlans = (data.companyPlans || starterData.companyPlans || []).map((plan) => ({
    id: plan.id || crypto.randomUUID(),
    date: plan.date || currentDateKey(),
    title: plan.title || "",
    note: plan.note || "",
    type: plan.type || "Plan firme",
    createdAt: plan.createdAt || new Date().toISOString(),
  }));
  const notifications = (data.notifications || starterData.notifications || []).map((notification) => ({
    id: notification.id || crypto.randomUUID(),
    key: notification.key || "",
    scope: notification.scope || "admin",
    targetId: notification.targetId || "",
    type: notification.type || "info",
    title: notification.title || "Obaveštenje",
    message: notification.message || "",
    read: Boolean(notification.read),
    hiddenUntil: notification.hiddenUntil || "",
    createdAt: notification.createdAt || new Date().toISOString(),
  }));
  return {
    ...structuredClone(starterData),
    ...data,
    clients,
    deals: data.deals || starterData.deals,
    tasks: data.tasks || starterData.tasks,
    leads: (data.leads || starterData.leads).map((lead) => {
      const status = normalizeLeadStatus(lead.status);
      const reactedAt = lead.calledAt || lead.lastContact || lead.lastStatusChangeAt || "";
      return {
        email: "",
        location: "",
        estimate: 0,
        responsible: "",
        nextAction: "",
        lossReason: "",
        customFields: {},
        lastContact: isClientLeadStatusContacted(status) ? reactedAt : "",
        lastStatusChangeAt: lead.lastStatusChangeAt || (isClientLeadStatusContacted(status) ? reactedAt : ""),
        ...lead,
        status,
        calledAt: isClientLeadStatusContacted(status) ? reactedAt || lead.calledAt || "" : null,
      };
    }),
    teamMembers: data.teamMembers || starterData.teamMembers,
    employees,
    employeeAbsences,
    employeeWorkLogs,
    employeeActivities,
    employeeDocuments,
    employeeLateRecords,
    employeeGoals,
    employeeRatings,
    employeeRecognitions,
    employeeOneOnOnes,
    employeeReports,
    companyPlans,
    notifications,
    backup: {
      recommendedLocation: "Google Drive / Marketizo Backups",
      ...(data.backup || starterData.backup || {}),
    },
  };
}

function packageValues(packageName, revenue, contractMonths) {
  const normalized = normalizePackage(packageName);
  if (normalized === "Internal") {
    return { package: normalized, revenue: 0, contractMonths: 0 };
  }
  const config = packageConfig[normalized] || packageConfig.Starter;
  const isStandard = normalized === "Starter" || normalized === "Business" || normalized === "Enterprise";
  return {
    package: normalized,
    revenue: isStandard ? config.price : Number(revenue || config.price),
    contractMonths: Number(contractMonths || config.months),
  };
}

function normalizePackage(packageName) {
  if (packageName === "Garancija paket" || packageName === "Lead Guarantee") return "Starter";
  if (packageName === "Content + Ads") return "Business";
  if (packageName === "Full Growth") return "Enterprise";
  if (packageName === "Internal Growth") return "Internal";
  return packageName || "Starter";
}

function normalizeClientStatus(status) {
  if (status === "Interni") return "Interni";
  if (status === "Pauza") return "Pauza";
  if (status === "Neaktivan") return "Neaktivan";
  if (status === "Arhiviran") return "Arhiviran";
  return "Aktivan";
}

function normalizeLeadStatus(status) {
  const mapped = legacyLeadStatusMap[status] || status || "Novi";
  return clientLeadStatuses.includes(mapped) ? mapped : "Novi";
}

function isWonClientLeadStatus(status) {
  return normalizeLeadStatus(status) === "Dobijen";
}

function isLostClientLeadStatus(status) {
  return normalizeLeadStatus(status) === "Izgubljen";
}

function isOpenClientLeadStatus(status) {
  const normalized = normalizeLeadStatus(status);
  return normalized !== "Dobijen" && normalized !== "Izgubljen";
}

function isClientLeadStatusContacted(status) {
  return normalizeLeadStatus(status) !== "Novi";
}

function saveState(options = {}) {
  localStorage.setItem("agencyCrmData", JSON.stringify(state));
  if (options.remote !== false && onlineHydrationComplete) window.MarketizoRemote?.save(state);
}

async function hydrateOnlineState() {
  if (!window.MarketizoRemote || window.location.protocol === "file:") {
    onlineHydrationComplete = true;
    return;
  }
  let result;
  try {
    result = await window.MarketizoRemote.load();
  } catch (error) {
    console.error("Online state load failed", error);
    showToast("Online baza nije dostupna", "Podaci nisu poslati da se postojeća baza ne bi prepisala.", "warn");
    return;
  }
  if (result.payload) {
    state = loadState(result.payload);
    const financeCorrected = applyAugust2026FinanceCorrections();
    const clickUpInvoicesCorrected = applyAugust2026ClickUpInvoiceSyncV2();
    const invoiceRostersCorrected = applyMonthlyInvoiceRostersV5();
    const sladjanCorrected = applySladjan2026BalanceCorrections();
    const hazimCorrected = applyHazim2026ActualsV1();
    const productionDataCleaned = applyProductionDataCleanupV1();
    const qaDataCleaned = applyQa20260827Cleanup();
    const qa20260828DataCleaned = applyQa20260828Cleanup();
    const qa20260828DataCleanedV2 = applyQa20260828CleanupV2();
    const activityCatalogAdded = applyEmployeeActivityCatalogV1();
    onlineHydrationComplete = true;
    saveState({ remote: financeCorrected || clickUpInvoicesCorrected || invoiceRostersCorrected || sladjanCorrected || hazimCorrected || productionDataCleaned || qaDataCleaned || qa20260828DataCleaned || qa20260828DataCleanedV2 || activityCatalogAdded });
    renderAll();
    showToast("Online baza", "Podaci su učitani iz zajedničke baze.", "ok");
    return;
  }
  if (result.configured && result.empty) {
    onlineHydrationComplete = true;
    saveState();
    showToast("Online baza", "Zajednička baza je inicijalizovana.", "ok");
    return;
  }
  if (!result.configured) {
    onlineHydrationComplete = true;
    showToast("Online baza nije povezana", "Dodaj Supabase env varijable u Vercel da svi uređaji vide iste podatke.", "warn");
  }
}

function parseNumber(value, fallback = 0) {
  const normalized = String(value ?? "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
}

function formatHours(value) {
  const number = Math.round(parseNumber(value) * 100) / 100;
  return Number.isInteger(number) ? String(number) : String(number).replace(".", ",");
}

function formatNumber(value) {
  return formatHours(value);
}

function showToast(title, message = "", type = "ok") {
  const stack = document.getElementById("toastStack");
  if (!stack) return;
  const signature = `${title}|${message}`;
  if ([...stack.children].some((item) => item.dataset.signature === signature)) return;
  while (stack.children.length >= 3) stack.firstElementChild?.remove();
  const toast = document.createElement("div");
  toast.className = `toast-message ${notificationClass(type)}`;
  toast.dataset.signature = signature;
  toast.innerHTML = `<strong>${title}</strong>${message ? `<span>${message}</span>` : ""}`;
  stack.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 4200);
}

function setupPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    if (button.dataset.ready === "true") return;
    button.dataset.ready = "true";
    button.addEventListener("click", () => {
      const field = button.closest(".password-field");
      const input = field?.querySelector("input");
      if (!input) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.textContent = visible ? "Prikaži" : "Sakrij";
      button.setAttribute("aria-label", visible ? "Prikaži lozinku" : "Sakrij lozinku");
    });
  });
}

function bySearch(item) {
  const haystack = Object.values(item).join(" ").toLowerCase();
  return haystack.includes(searchTerm.toLowerCase());
}

function visibleClients() {
  return state.clients.filter((client) => bySearch(client) && byCountry(client) && byDateRange(client) && byMonth(client));
}

function byCountry(client) {
  if (countryFilter === "all") return true;
  const aliases = {
    austria: "austrija",
    österreich: "austrija",
    austrija: "austrija",
    germany: "nemačka",
    deutschland: "nemačka",
    nemačka: "nemačka",
    srbija: "srbija",
    serbia: "srbija",
    hrvatska: "hrvatska",
    croatia: "hrvatska",
  };
  const normalize = (value) => aliases[String(value || "").trim().toLowerCase()] || String(value || "").trim().toLowerCase();
  return normalize(client.country) === normalize(countryFilter);
}

function byDateRange(client) {
  if (!dateFromFilter && !dateToFilter) return true;
  if (!client.startDate) return true;
  const start = new Date(client.startDate);
  // Period filter shows clients already active during the selected period,
  // not only clients whose cooperation started inside that exact range.
  if (dateToFilter && start > new Date(dateToFilter)) return false;
  return true;
}

function byMonth(client) {
  if (!monthFilter) return true;
  if (!client.startDate) return true;
  const [year, month] = monthFilter.split("-").map(Number);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);
  return new Date(client.startDate) <= periodEnd;
}

function statusClass(client) {
  if (client.status === "Interni") return "ok";
  if (client.status === "Neaktivan" || client.status === "Arhiviran") return "danger";
  if (client.status === "Pauza") return "warn";
  return "ok";
}

function leadDueAt(lead) {
  return new Date(new Date(lead.createdAt).getTime() + leadSlaHours * 60 * 60 * 1000);
}

function leadHoursLeft(lead) {
  return (leadDueAt(lead).getTime() - Date.now()) / 36e5;
}

function leadSlaClass(lead) {
  if (lead.status !== "Novi") return "ok";
  const hoursLeft = leadHoursLeft(lead);
  if (hoursLeft <= 0) return "danger";
  if (hoursLeft <= 4) return "warn";
  return "ok";
}

function leadSlaLabel(lead) {
  if (lead.status !== "Novi") return "Kontaktiran";
  const hoursLeft = leadHoursLeft(lead);
  if (hoursLeft <= 0) return "Istekao rok";
  if (hoursLeft < 1) return "Manje od 1h";
  return `${Math.ceil(hoursLeft)}h do isteka`;
}

function isLeadVisibleByFilter(lead) {
  if (activeLeadFilter === "all") return true;
  if (activeLeadFilter === "Istekao rok") return lead.status === "Novi" && leadHoursLeft(lead) <= 0;
  return lead.status === activeLeadFilter;
}

function normalizePhone(phone) {
  return String(phone).replace(/[^\d+]/g, "");
}

function isClientLeadContacted(lead) {
  return Boolean(lead.calledAt) || isClientLeadStatusContacted(lead.status);
}

function clientLeads(client) {
  return (state.leads || []).filter((lead) => lead.client === client.name);
}

function clientLeadStats(client) {
  const leads = clientLeads(client);
  const contacted = leads.filter(isClientLeadContacted).length;
  const open = leads.filter((lead) => normalizeLeadStatus(lead.status) === "Novi").length;
  const late = leads.filter((lead) => normalizeLeadStatus(lead.status) === "Novi" && lead.createdAt && hoursSince(lead.createdAt) >= clientLeadSlaHours).length;
  return { total: leads.length, contacted, open, late };
}

function renderAdminPanel() {
  const scopedClients = visibleClients();
  const monthKey = monthFilter || currentMonthKey();
  const active = financeClientsForMonth(scopedClients, monthKey);
  const mrr = active.reduce((sum, client) => sum + invoiceAmount(client, monthKey), 0);
  const paidClients = active.filter((client) => monthlyInvoice(client, monthKey).paymentStatus === "Plaćeno");
  const unpaidClients = active.filter((client) => monthlyInvoice(client, monthKey).paymentStatus !== "Plaćeno");
  const paidTotal = paidClients.reduce((sum, client) => sum + invoiceAmount(client, monthKey), 0);
  const unpaidTotal = unpaidClients.reduce((sum, client) => sum + invoiceAmount(client, monthKey), 0);
  const unsentClients = active.filter((client) => monthlyInvoice(client, monthKey).invoiceStatus !== "Poslat");

  setText("adminTotalClients", active.length);
  setText("adminMrr", currency.format(mrr));
  setText("adminPaidTotal", currency.format(paidTotal));
  setText("adminPaidCount", `${paidClients.length} klijenata`);
  setText("adminUnpaidTotal", currency.format(unpaidTotal));
  setText("adminUnpaidCount", `${unpaidClients.length} nije plaćeno · ${unsentClients.length} nije poslat račun`);
  renderAdminNotifications();
  renderAdminClientSnapshot(active);
  renderAdminEmployeeRisk(monthKey);
  renderContractExpiryList();
  renderPackageSummary(active);
  renderBars("adminCountryBars", groupSum(active, "country", "revenue"), "€");
}

function notificationClass(type) {
  if (type === "danger") return "danger";
  if (type === "warn") return "warn";
  return "ok";
}

function isNotificationHidden(notification) {
  return notification.hiddenUntil && new Date(notification.hiddenUntil).getTime() > Date.now();
}

function hideNotification(id) {
  const notification = (state.notifications || []).find((item) => item.id === id);
  if (!notification) return;
  notification.hiddenUntil = addDays(currentDateKey(), 7);
  saveState();
  renderAll();
  showToast("Sakriveno", "Obaveštenje je sklonjeno na 7 dana.", "info");
}

function unhideNotification(id) {
  const notification = (state.notifications || []).find((item) => item.id === id);
  if (!notification) return;
  notification.hiddenUntil = "";
  saveState();
  renderAll();
  showToast("Vraćeno", "Obaveštenje je ponovo aktivno.", "ok");
}

function deleteNotification(id) {
  const notification = (state.notifications || []).find((item) => item.id === id);
  if (!notification) return;
  state.dismissedNotificationKeys = state.dismissedNotificationKeys || [];
  if (notification.key && !state.dismissedNotificationKeys.includes(notification.key)) {
    state.dismissedNotificationKeys.push(notification.key);
    state.dismissedNotificationKeys = state.dismissedNotificationKeys.slice(-500);
  }
  state.notifications = state.notifications.filter((item) => item.id !== id);
  saveState();
  renderAll();
  showToast("Obrisano", "Obaveštenje je trajno uklonjeno.", "ok");
}

function showAdminNotificationPopups(notifications) {
  const shown = JSON.parse(sessionStorage.getItem("shownAdminNotifications") || "[]");
  const nextShown = new Set(shown);
  notifications
    .filter((notification) => notification.title === "Zahtev za odmor" && !nextShown.has(notification.key || notification.id))
    .slice(0, 3)
    .forEach((notification) => {
      showToast(notification.title, notification.message, notification.type);
      nextShown.add(notification.key || notification.id);
    });
  sessionStorage.setItem("shownAdminNotifications", JSON.stringify([...nextShown].slice(-50)));
}

function renderAdminNotifications() {
  const scopedNotifications = (state.notifications || []).filter((notification) => notification.scope === "admin");
  const activeNotifications = scopedNotifications.filter((notification) => !isNotificationHidden(notification)).slice(0, 8);
  const hiddenNotifications = scopedNotifications.filter(isNotificationHidden).slice(0, 6);
  setText("adminNotificationCount", `${activeNotifications.length} aktivno`);
  const target = document.getElementById("adminNotificationList");
  if (!target) return;
  target.innerHTML = activeNotifications.length
    ? activeNotifications
        .map(
          (notification) => `
          <div class="setup-item alert-item ${notificationClass(notification.type)}">
            <strong>!</strong>
            <span>${notification.title}<br />${notification.message}</span>
            <div class="notification-actions">
              <button class="mini-action" data-hide-notification="${notification.id}" type="button">Sakrij 7 dana</button>
              <button class="mini-action danger-action" data-delete-notification="${notification.id}" type="button">Obriši</button>
            </div>
          </div>`
        )
        .join("") +
      (hiddenNotifications.length
        ? `<div class="notification-archive">
          <strong>Sakrivena obaveštenja</strong>
          ${hiddenNotifications
            .map(
              (notification) => `
              <div class="setup-item">
                <span>${notification.title}<br />Sakriveno do ${formatDate(notification.hiddenUntil)}</span>
                <div class="notification-actions">
                  <button class="mini-action" data-unhide-notification="${notification.id}" type="button">Vrati</button>
                  <button class="mini-action danger-action" data-delete-notification="${notification.id}" type="button">Obriši</button>
                </div>
              </div>`
            )
            .join("")}
        </div>`
        : "")
    : `<div class="empty-state">Nema obaveštenja za reakciju.</div>${
        hiddenNotifications.length
          ? `<div class="notification-archive">
          <strong>Sakrivena obaveštenja</strong>
          ${hiddenNotifications
            .map(
              (notification) => `
              <div class="setup-item">
                <span>${notification.title}<br />Sakriveno do ${formatDate(notification.hiddenUntil)}</span>
                <div class="notification-actions">
                  <button class="mini-action" data-unhide-notification="${notification.id}" type="button">Vrati</button>
                  <button class="mini-action danger-action" data-delete-notification="${notification.id}" type="button">Obriši</button>
                </div>
              </div>`
            )
            .join("")}
        </div>`
          : ""
      }`;
  showAdminNotificationPopups(activeNotifications);
  target.querySelectorAll("[data-hide-notification]").forEach((button) => {
    button.addEventListener("click", () => hideNotification(button.dataset.hideNotification));
  });
  target.querySelectorAll("[data-unhide-notification]").forEach((button) => {
    button.addEventListener("click", () => unhideNotification(button.dataset.unhideNotification));
  });
  target.querySelectorAll("[data-delete-notification]").forEach((button) => {
    button.addEventListener("click", () => deleteNotification(button.dataset.deleteNotification));
  });
}

function renderAdminClientSnapshot(clients) {
  const baseClients = clients;
  const rows = [...baseClients]
    .sort((a, b) => {
      const aStats = clientLeadStats(a);
      const bStats = clientLeadStats(b);
      return bStats.late - aStats.late || bStats.open - aStats.open || Number(b.revenue || 0) - Number(a.revenue || 0);
    })
    .slice(0, 6);
  setText("adminClientSnapshotCount", `${baseClients.length} klijenata`);
  const target = document.getElementById("adminClientSnapshotList");
  if (!target) return;
  target.innerHTML = rows.length
    ? rows
        .map((client) => {
          const stats = clientLeadStats(client);
          const invoice = monthlyInvoice(client);
          const status = stats.late ? "danger" : stats.open ? "warn" : "ok";
          return `
          <div class="setup-item alert-item clickable-item ${status}" data-go-view="clients">
            <strong>${stats.open}</strong>
            <span>${client.name}<br />${stats.contacted}/${stats.total} kontaktirano · ${stats.late} kasni · ${invoice.paymentStatus || "Nije plaćeno"}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema klijenata za izabrani filter.</div>`;
}

function renderAdminEmployeeRisk(monthKey) {
  const rows = (state.employees || [])
    .map((employee) => {
      const balance = employeeHourBalance(employee, monthKey);
      const expected = employeeExpectedHours(employee, monthKey);
      const hours = employeeMonthHours(employee.id, monthKey);
      return { employee, balance, expected, hours };
    })
    .filter(({ employee }) => employee.status !== "Neaktivan")
    .sort((a, b) => a.balance - b.balance)
    .slice(0, 6);
  const riskCount = rows.filter((row) => row.balance < 0 || row.hours > row.expected).length;
  setText("adminEmployeeRiskCount", `${riskCount} odstupanja`);
  const target = document.getElementById("adminEmployeeRiskList");
  if (!target) return;
  target.innerHTML = rows.length
    ? rows
        .map(({ employee, balance, expected, hours }) => {
          const lateStatus = employeeLateStatus(employee.id, monthKey);
          const status = balance < 0 || lateStatus.count > 3 ? "danger" : hours > expected || lateStatus.count === 3 ? "warn" : "ok";
          return `
          <div class="setup-item alert-item clickable-item employee-hours-row ${status}" data-go-view="employees" data-select-shortcut-employee="${employee.id}">
            <strong>${formatHourBalance(balance)}</strong>
            <span>${employee.name}<br />${formatHours(hours)}h od ${formatHours(expected)}h · ${formatHours(employee.weeklyHours || 40)}h nedeljno<br />${employeeCarryoverLabel(employee, monthKey)} · ${lateStatus.label}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema zaposlenih za prikaz.</div>`;
}

function renderBackupStatus() {
  const target = document.getElementById("backupStatusList");
  if (!target) return;
  const lastBackup = state.backup?.lastDownloadedAt ? new Date(state.backup.lastDownloadedAt).toLocaleString("sr-Latn-RS") : "nije skinut";
  const isToday = state.backup?.lastDownloadedAt?.slice(0, 10) === currentDateKey();
  target.innerHTML = `
    <div class="setup-item alert-item ${isToday ? "ok" : "warn"}">
      <strong>${isToday ? "OK" : "!"}</strong>
      <span>Poslednji backup: ${lastBackup}<br />Preporučena lokacija: ${state.backup?.recommendedLocation || "Google Drive / Marketizo Backups"}</span>
    </div>
    <div class="setup-item">
      <strong>JSON</strong>
      <span>Lokalno ne može potpuno automatski da skida fajl bez servera. Dugme skida backup koji čuvaš u Drive/iCloud folder.</span>
    </div>`;
}

function renderContractExpiryList() {
  const target = document.getElementById("contractExpiryList");
  if (!target) return;
  const today = currentDateKey();
  const rows = state.clients
    .map((client) => ({ client, endDate: contractEndDate(client) }))
    .filter(({ endDate }) => endDate && daysBetween(today, endDate) <= 30 && daysBetween(today, endDate) >= 0)
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
  target.innerHTML = rows.length
    ? rows
        .map(({ client, endDate }) => {
          const fileLabel = client.contractFileData
            ? `<a class="document-link" href="${client.contractFileData}" download="${client.contractFileName || "ugovor"}">${client.contractFileName || "Preuzmi ugovor"}</a>`
            : client.contractFileName || "Ugovor nije uploadovan";
          return `
          <div class="setup-item alert-item warn">
            <strong>${daysBetween(today, endDate)}</strong>
            <span>${client.name} · ističe ${formatDate(endDate)}<br />${fileLabel}${client.contractNote ? ` · ${client.contractNote}` : ""}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema ugovora koji ističu u narednih 30 dana.</div>`;
}

function renderMonthlyInvoices(clients, monthKey) {
  clients = clientsForInvoiceMonth(clients, monthKey);
  const statusFor = (client) => {
    const invoice = monthlyInvoice(client, monthKey);
    if (invoice.paymentStatus === "Plaćeno") return "paid";
    if (invoice.invoiceStatus === "Poslat") return "sent";
    return "unpaid";
  };
  const groups = [
    ["paid", "Plaćeni", "Plaćeno"],
    ["sent", "Poslati, čekaju uplatu", "Poslat"],
    ["unpaid", "Nisu plaćeni / nisu poslati", "Nije plaćeno"],
  ];
  const renderClient = (client) => {
      const invoice = monthlyInvoice(client, monthKey);
      return `<div class="invoice-compact-row">
        <div class="invoice-compact-client"><strong>${client.name}</strong><span>${client.country} · naplata ${client.billingDay || 1}.</span></div>
        <strong class="invoice-compact-amount">${currency.format(invoiceAmount(client, monthKey))}</strong>
        <label>Račun
          <select class="table-select" data-invoice-client="${client.id}" data-invoice-field="invoiceStatus">
            ${option("Nije poslat", invoice.invoiceStatus)}
            ${option("Poslat", invoice.invoiceStatus)}
          </select>
        </label>
        <label>Plaćanje
          <select class="table-select" data-invoice-client="${client.id}" data-invoice-field="paymentStatus">
            ${option("Nije plaćeno", invoice.paymentStatus)}
            ${option("Plaćeno", invoice.paymentStatus)}
            ${option("Kasni", invoice.paymentStatus)}
          </select>
        </label>
        <label>Način
          <select class="table-select" data-invoice-client="${client.id}" data-invoice-field="paymentMethod">
            ${option("Firma", invoice.paymentMethod)}
            ${option("Keš", invoice.paymentMethod)}
          </select>
        </label>
      </div>`;
  };
  const sorted = [...clients].sort((a, b) => invoiceAmount(b, monthKey) - invoiceAmount(a, monthKey));
  const target = document.getElementById("invoiceStatusGroups");
  if (target) {
    target.innerHTML = groups.map(([key, label, badge]) => {
      const entries = sorted.filter((client) => statusFor(client) === key);
      const total = entries.reduce((sum, client) => sum + invoiceAmount(client, monthKey), 0);
      return `<details class="invoice-status-group invoice-status-${key}" data-invoice-group="${key}" ${openInvoiceGroups.has(key) ? "open" : ""}>
        <summary><span class="invoice-status-dot"></span><strong>${label}</strong><span>${entries.length} klijenata</span><b>${currency.format(total)}</b><em>${badge}</em></summary>
        <div class="invoice-status-list">${entries.length ? entries.map(renderClient).join("") : `<div class="empty-state">Nema klijenata u ovoj grupi.</div>`}</div>
      </details>`;
    }).join("");
    target.querySelectorAll("[data-invoice-group]").forEach((details) => {
      details.addEventListener("toggle", () => {
        const key = details.dataset.invoiceGroup;
        if (details.open) openInvoiceGroups.add(key);
        else openInvoiceGroups.delete(key);
      });
    });
  }
  document.getElementById("monthlyInvoiceRows").innerHTML = "";
  bindInvoiceControls();
}

function bindInvoiceControls() {
  document.querySelectorAll("[data-invoice-client]").forEach((control) => {
    control.addEventListener("change", () => {
      const client = state.clients.find((item) => item.id === control.dataset.invoiceClient);
      if (!client) return;
      const invoice = monthlyInvoice(client);
      invoice[control.dataset.invoiceField] = control.value;
      if (control.dataset.invoiceField === "invoiceStatus") {
        client.invoiceStatus = control.value;
        if (control.value === "Poslat" && !invoice.sentAt) invoice.sentAt = new Date().toISOString();
        if (control.value !== "Poslat") invoice.sentAt = "";
      }
      if (control.dataset.invoiceField === "paymentStatus") {
        client.paymentStatus = control.value;
        if (control.value === "Plaćeno") invoice.paidAt = new Date().toISOString();
      }
      if (control.dataset.invoiceField === "paymentMethod") client.paymentMethod = control.value;
      saveState();
      renderAll();
      showToast("Sačuvano", `${client.name}: status računa je ažuriran.`, "ok");
    });
  });
}

function renderInvoiceSummary(clients, monthKey) {
  clients = clientsForInvoiceMonth(clients, monthKey);
  const summary = clients.reduce(
    (acc, client) => {
      const invoice = monthlyInvoice(client, monthKey);
      const key = invoice.paymentStatus === "Plaćeno" ? "Plaćeno" : invoice.invoiceStatus === "Poslat" ? "Poslat nije plaćeno" : "Račun nije poslat";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {}
  );
  renderBars("adminPaymentBars", summary, "");
}

function renderInvoiceCarryover(clients, monthKey) {
  const previousMonth = shiftMonth(monthKey, -1);
  setText("invoiceCarryoverTitle", `Otvoreni računi iz ${monthLabel(previousMonth)}`);
  if (monthKey <= "2026-08") {
    setText("invoiceCarryoverCount", "0 otvorenih");
    const initialTarget = document.getElementById("invoiceCarryoverList");
    if (initialTarget) initialTarget.innerHTML = `<div class="empty-state">Praćenje prenosa otvorenih računa počinje od avgusta 2026.</div>`;
    return;
  }
  const open = clientsForInvoiceMonth(clients, previousMonth).filter((client) => monthlyInvoice(client, previousMonth).paymentStatus !== "Plaćeno");
  setText("invoiceCarryoverCount", `${open.length} otvorenih`);
  const target = document.getElementById("invoiceCarryoverList");
  if (!target) return;
  const sent = open.filter((client) => monthlyInvoice(client, previousMonth).invoiceStatus === "Poslat");
  const notSent = open.filter((client) => monthlyInvoice(client, previousMonth).invoiceStatus !== "Poslat");
  const carryoverGroup = (items, key, label) => `<details class="invoice-status-group invoice-status-${key}">
    <summary><span class="invoice-status-dot"></span><strong>${label}</strong><span>${items.length} klijenata</span><b>${currency.format(items.reduce((sum, client) => sum + invoiceAmount(client, previousMonth), 0))}</b></summary>
    <div class="invoice-status-list">${items.map((client) => {
        const invoice = monthlyInvoice(client, previousMonth);
        return `<div class="setup-item carryover-item invoice-carryover-compact">
          <strong>${currency.format(invoiceAmount(client, previousMonth))}</strong>
          <span>${client.name}<br />${monthLabel(previousMonth)} · ${invoice.invoiceStatus} · ${invoice.paymentStatus}</span>
        </div>`;
      }).join("") || `<div class="empty-state">Nema klijenata u ovoj grupi.</div>`}</div></details>`;
  target.innerHTML = open.length
    ? carryoverGroup(sent, "sent", "Poslati, čekaju uplatu") + carryoverGroup(notSent, "unpaid", "Nisu poslati / nisu plaćeni")
    : `<div class="empty-state">Nema otvorenih računa za prenos iz ${monthLabel(previousMonth)}.</div>`;
}

function option(value, selected, label = value) {
  return `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${label}</option>`;
}

function packageOption(value, selected) {
  return `<option value="${value}" ${normalizePackage(selected) === value ? "selected" : ""}>${displayPackage(value)}</option>`;
}

function bindEditButtons() {
  document.querySelectorAll("[data-edit-client]").forEach((button) => {
    button.addEventListener("click", () => openEditClient(button.dataset.editClient));
  });
  document.querySelectorAll("[data-archive-client]").forEach((button) => {
    button.addEventListener("click", () => archiveClient(button.dataset.archiveClient));
  });
  document.querySelectorAll("[data-delete-client]").forEach((button) => {
    button.addEventListener("click", () => deleteClient(button.dataset.deleteClient));
  });
}

function archiveClient(id) {
  const client = state.clients.find((item) => item.id === id);
  if (!client) return;
  client.status = client.status === "Arhiviran" ? "Neaktivan" : "Arhiviran";
  saveState();
  renderAll();
}

function deleteClient(id) {
  const client = state.clients.find((item) => item.id === id);
  if (!client) return;
  if (!confirm(`Obrisati klijenta: ${client.name}? Brišu se i njegovi leadovi i sales osobe.`)) return;
  state.clients = state.clients.filter((item) => item.id !== id);
  state.leads = (state.leads || []).filter((lead) => lead.client !== client.name);
  state.teamMembers = (state.teamMembers || []).filter((member) => member.client !== client.name);
  if (selectedPortalClientId === id) selectedPortalClientId = state.clients[0]?.id || "";
  saveState();
  renderAll();
}

function openEditClient(id) {
  const client = state.clients.find((item) => item.id === id);
  if (!client) return;
  const form = document.getElementById("editClientForm");
  setText("editClientTitle", client.name);
  form.elements.id.value = client.id;
  form.elements.name.value = client.name || "";
  form.elements.niche.value = client.niche || "";
  form.elements.country.value = client.country || "Austrija";
  form.elements.package.value = normalizePackage(client.package);
  form.elements.revenue.value = Number(client.revenue || 0);
  form.elements.contractMonths.value = String(client.contractMonths || 3);
  form.elements.startDate.value = client.startDate || "";
  form.elements.status.value = normalizeClientStatus(client.status);
  form.elements.billingDay.value = Number(client.billingDay || 1);
  form.elements.contactName.value = client.contactName || "";
  form.elements.contactPhone.value = client.contactPhone || "";
  form.elements.loginEmail.value = client.loginEmail || "";
  form.elements.loginPassword.value = client.loginPassword || "";
  form.elements.contractNote.value = client.contractNote || "";
  const leadStats = clientLeadStats(client);
  const recentLeads = clientLeads(client)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);
  const summary = document.getElementById("editClientLeadSummary");
  if (summary) {
    summary.innerHTML = `
      <div class="setup-item alert-item ${leadStats.late ? "danger" : leadStats.open ? "warn" : "ok"}">
        <strong>${leadStats.contacted}/${leadStats.total}</strong>
        <span>Kontaktirano leadova<br />${leadStats.open} nije kontaktirano · ${leadStats.late} kasni preko 48h</span>
      </div>
      <div class="setup-item">
        <strong>WA</strong>
        <span>WhatsApp podešava klijent u svom CRM-u. Trenutno: ${client.whatsapp || "nije povezano"}</span>
      </div>
      <div class="client-lead-detail-list">
        <h3>Poslednji leadovi</h3>
        ${
          recentLeads.length
            ? recentLeads
                .map((lead) => {
                  const contacted = isClientLeadContacted(lead);
                  const late = !contacted && (lead.status || "Novi") === "Novi" && lead.createdAt && hoursSince(lead.createdAt) >= clientLeadSlaHours;
                  return `
                    <div class="setup-item alert-item ${late ? "danger" : contacted ? "ok" : "warn"}">
                      <strong>${contacted ? "Zvao" : "Nije"}</strong>
                      <span>${lead.name || "Lead"} · ${lead.phone || "telefon nije unet"}<br />${normalizeLeadStatus(lead.status)} · stigao ${lead.createdAt ? formatDate(lead.createdAt) : "nije uneto"}${lead.calledAt ? ` · pozvan ${formatDate(lead.calledAt)}` : ""}${lead.customFields && Object.keys(lead.customFields).length ? `<br />Forma: ${Object.entries(lead.customFields).map(([key, value]) => `${key}: ${value}`).join(" · ")}` : ""}</span>
                    </div>`;
                })
                .join("")
            : `<div class="empty-state">Još nema leadova za ovog klijenta.</div>`
        }
      </div>`;
  }
  document.getElementById("editClientModal").showModal();
}

function renderPackageSummary(clients) {
  const packages = clients.reduce((acc, client) => {
    const packageName = displayPackage(client.package || "Bez paketa");
    if (!acc[packageName]) acc[packageName] = { count: 0, total: 0 };
    acc[packageName].count += 1;
    acc[packageName].total += Number(client.revenue || 0);
    return acc;
  }, {});
  document.getElementById("adminPackageSummary").innerHTML = Object.entries(packages)
    .map(
      ([packageName, info]) => `
      <div class="setup-item">
        <strong>${info.count}</strong>
        <span>${info.count === 1 ? "1 klijent" : `${info.count} klijenata`} · ${packageName} · ${currency.format(info.total)}/mes</span>
      </div>`
    )
    .join("");
}

function renderStatusSummary(clients) {
  const target = document.getElementById("adminStatusSummary");
  if (!target) return;
  const statuses = clients.reduce((acc, client) => {
    const status = client.status || "Aktivan";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  target.innerHTML = Object.entries(statuses)
    .map(
      ([status, count]) => `
      <div class="setup-item">
        <strong>${count}</strong>
        <span>${status}</span>
      </div>`
    )
    .join("");
}

function displayPackage(packageName) {
  if (packageName === "Lead Guarantee") return "Starter 997€";
  if (packageName === "Internal Growth" || packageName === "Internal") return "Interno";
  if (packageName === "Starter") return "Starter 997€";
  if (packageName === "Business") return "Business 1497€";
  if (packageName === "Enterprise") return "Enterprise 1997€";
  return packageName || "Bez paketa";
}

function formatDate(value) {
  if (!value) return "nije unet";
  return new Date(value).toLocaleDateString("sr-Latn-RS", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function employeeMonthKey() {
  return employeeMonthFilter || currentMonthKey();
}

function employeeById(id) {
  return state.employees.find((employee) => employee.id === id);
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(value, days) {
  const date = typeof value === "string" ? parseDate(value) : new Date(value);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function monthDayKeys(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, index) => `${monthKey}-${String(index + 1).padStart(2, "0")}`);
}

function dateRangeKeys(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (start > end) return [];
  const days = [];
  for (let current = start; current <= end; current.setDate(current.getDate() + 1)) {
    days.push(dateKey(current));
  }
  return days;
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dateKey(new Date(year, month - 1, day));
}

function austrianHolidayMap(year) {
  const easter = easterSunday(year);
  return {
    [`${year}-01-01`]: "Neujahr",
    [`${year}-01-06`]: "Heilige Drei Könige",
    [addDays(easter, 1)]: "Ostermontag",
    [`${year}-05-01`]: "Staatsfeiertag",
    [addDays(easter, 39)]: "Christi Himmelfahrt",
    [addDays(easter, 50)]: "Pfingstmontag",
    [addDays(easter, 60)]: "Fronleichnam",
    [`${year}-08-15`]: "Mariä Himmelfahrt",
    [`${year}-10-26`]: "Nationalfeiertag",
    [`${year}-11-01`]: "Allerheiligen",
    [`${year}-12-08`]: "Mariä Empfängnis",
    [`${year}-12-25`]: "Weihnachten",
    [`${year}-12-26`]: "Stephanstag",
  };
}

function publicHolidayName(value) {
  const year = Number(value.slice(0, 4));
  return austrianHolidayMap(year)[value] || "";
}

function companySpecialDayName(value) {
  if (value.endsWith("-12-24")) return "24.12. poseban radni dan";
  if (value.endsWith("-12-31")) return "31.12. poseban radni dan";
  return "";
}

function isWeekend(value) {
  const day = parseDate(value).getDay();
  return day === 0 || day === 6;
}

function isAustrianWorkingDay(value) {
  return !isWeekend(value) && !publicHolidayName(value);
}

function workdayKeysBetween(startDate, endDate) {
  return dateRangeKeys(startDate, endDate).filter(isAustrianWorkingDay);
}

function workdaysInMonth(monthKey) {
  return monthDayKeys(monthKey).filter(isAustrianWorkingDay);
}

function absenceWorkdays(absence) {
  return workdayKeysBetween(absence.startDate, absence.endDate);
}

function employeeYearAbsenceDays(employeeId, year, type) {
  const employee = employeeById(employeeId);
  const openingUsed = type === "Godišnji odmor" && year === Number(currentDateKey().slice(0, 4)) ? parseNumber(employee?.openingVacationUsed || 0) : 0;
  const overrides = employee?.monthlyAbsenceDays || {};
  const overriddenMonths = new Set(Object.keys(overrides).filter((monthKey) => monthKey.startsWith(`${year}-`)));
  const overriddenDays = [...overriddenMonths].reduce((sum, monthKey) => {
    const monthValues = overrides[monthKey] || {};
    return sum + (type ? parseNumber(monthValues[type] || 0) : Object.values(monthValues).reduce((monthSum, value) => monthSum + parseNumber(value || 0), 0));
  }, 0);
  return openingUsed + overriddenDays + state.employeeAbsences
    .filter((absence) => absence.employeeId === employeeId && absence.type === type && absence.status !== "Zatraženo")
    .reduce((sum, absence) => {
      const days = absenceWorkdays(absence).filter((day) => day.startsWith(`${year}-`) && !overriddenMonths.has(day.slice(0, 7)));
      return sum + days.length;
    }, 0);
}

function employeeVacationAllowance(employee, year) {
  const fullAllowance = parseNumber(employee?.vacationDays || 26, 26);
  if (!employee?.startDate) return fullAllowance;
  const startYear = Number(String(employee.startDate).slice(0, 4));
  if (startYear < year) return fullAllowance;
  if (startYear > year) return 0;
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const totalWorkdays = workdayKeysBetween(yearStart, yearEnd).length || 1;
  const employeeWorkdays = workdayKeysBetween(employee.startDate, yearEnd).length;
  return Math.ceil((fullAllowance * employeeWorkdays) / totalWorkdays);
}

function employeeMonthAbsenceDays(employeeId, monthKey, type = "") {
  const employee = employeeById(employeeId);
  const override = employee?.monthlyAbsenceDays?.[monthKey];
  if (override) {
    return type
      ? parseNumber(override[type] || 0)
      : Object.values(override).reduce((sum, value) => sum + parseNumber(value || 0), 0);
  }
  return state.employeeAbsences
    .filter((absence) => absence.employeeId === employeeId && absence.status !== "Zatraženo" && (!type || absence.type === type))
    .reduce((sum, absence) => {
      const days = absenceWorkdays(absence).filter((day) => day.startsWith(monthKey));
      return sum + days.length;
    }, 0);
}

function employeeMonthHours(employeeId, monthKey) {
  const loggedHours = state.employeeWorkLogs
    .filter((log) => log.employeeId === employeeId && String(log.date || "").startsWith(monthKey))
    .reduce((sum, log) => sum + Number(log.hours || 0), 0);
  const penaltyHours = employeeMonthLatePenaltyHours(employeeId, monthKey);
  return Math.round((loggedHours - penaltyHours) * 100) / 100;
}

function employeeMonthRawHours(employeeId, monthKey) {
  return state.employeeWorkLogs
    .filter((log) => log.employeeId === employeeId && String(log.date || "").startsWith(monthKey))
    .reduce((sum, log) => sum + Number(log.hours || 0), 0);
}

function employeeMonthLatePenaltyHours(employeeId, monthKey) {
  return (state.employeeLateRecords || [])
    .filter((record) => record.employeeId === employeeId && String(record.date || "").startsWith(monthKey))
    .reduce((sum, record) => sum + Math.max(15, Number(record.penaltyMinutes || record.minutes || 0)) / 60, 0);
}

function employeeLateCount(employeeId, monthKey) {
  return (state.employeeLateRecords || []).filter((record) => record.employeeId === employeeId && String(record.date || "").startsWith(monthKey)).length;
}

function employeeLateStatus(employeeId, monthKey) {
  const count = employeeLateCount(employeeId, monthKey);
  if (count > 3) return { count, className: "danger", label: `${count}/3 kašnjenja · razgovor` };
  if (count === 3) return { count, className: "warn", label: `${count}/3 kašnjenja · poslednje` };
  return { count, className: "ok", label: `${count}/3 kašnjenja` };
}

function employeeExpectedHours(employee, monthKey) {
  const weeklyHours = parseNumber(employee.weeklyHoursByMonth?.[monthKey] ?? employee.weeklyHours ?? 40, 40);
  const dailyHours = weeklyHours / 5;
  const absenceDays = employeeMonthAbsenceDays(employee.id, monthKey);
  const eligibleWorkdays = workdaysInMonth(monthKey).filter((day) => !employee.startDate || day >= employee.startDate);
  const plannedDays = Math.max(eligibleWorkdays.length - absenceDays, 0);
  return Math.round(plannedDays * dailyHours * 100) / 100;
}

function employeeMonthlyHoursPreview(weeklyHours, monthKey, startDate = "") {
  const dailyHours = parseNumber(weeklyHours || 0, 0) / 5;
  const eligibleWorkdays = workdaysInMonth(monthKey).filter((day) => !startDate || day >= startDate);
  return {
    days: eligibleWorkdays.length,
    hours: Math.round(eligibleWorkdays.length * dailyHours * 100) / 100,
  };
}

function shiftMonth(monthKey, offset) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthIndex(monthKey) {
  const [year, month] = String(monthKey || currentMonthKey()).split("-").map(Number);
  if (!year || !month) return 0;
  return year * 12 + month;
}

function employeeMonthHasActivity(employeeId, monthKey) {
  const employee = employeeById(employeeId);
  return (
    Object.prototype.hasOwnProperty.call(employee?.monthlyBalanceOverrides || {}, monthKey) ||
    state.employeeWorkLogs.some((log) => log.employeeId === employeeId && String(log.date || "").startsWith(monthKey)) ||
    (state.employeeLateRecords || []).some((record) => record.employeeId === employeeId && String(record.date || "").startsWith(monthKey)) ||
    (state.employeeAbsences || []).some((absence) => absence.employeeId === employeeId && dateRangeKeys(absence.startDate, absence.endDate).some((day) => day.startsWith(monthKey)))
  );
}

function employeeMonthBalance(employee, monthKey) {
  if (Object.prototype.hasOwnProperty.call(employee.monthlyBalanceOverrides || {}, monthKey)) {
    return parseNumber(employee.monthlyBalanceOverrides[monthKey]);
  }
  return Math.round((employeeMonthHours(employee.id, monthKey) - employeeExpectedHours(employee, monthKey)) * 100) / 100;
}

function employeeCarryoverBalance(employee, monthKey) {
  const openingMonth = employee.openingBalanceMonth || shiftMonth(currentMonthKey(), -1);
  const openingBalance = parseNumber(employee.openingHourBalance || 0);
  let total = monthIndex(monthKey) > monthIndex(openingMonth) ? openingBalance : 0;
  for (let index = 11; index >= 1; index -= 1) {
    const key = shiftMonth(monthKey, -index);
    if (!employeeMonthHasActivity(employee.id, key)) continue;
    total += employeeMonthBalance(employee, key);
  }
  return Math.round(total * 100) / 100;
}

function employeeHourBalance(employee, monthKey) {
  return Math.round((employeeMonthBalance(employee, monthKey) + employeeCarryoverBalance(employee, monthKey)) * 100) / 100;
}

function employeeCarryoverLabel(employee, monthKey) {
  const previousMonth = shiftMonth(monthKey, -1);
  const carryover = employeeCarryoverBalance(employee, monthKey);
  const opening = parseNumber(employee.openingHourBalance || 0);
  const openingMonth = employee.openingBalanceMonth || previousMonth;
  const prefix = opening && monthIndex(monthKey) > monthIndex(openingMonth)
    ? `Ručno unet prenos iz ${monthLabel(openingMonth)}: ${formatHourBalance(opening)} · `
    : "";
  return `${prefix}Ukupan prenos do ${monthLabel(previousMonth)}: ${formatHourBalance(carryover)}`;
}

function formatHourBalance(value) {
  const rounded = Math.round(Number(value || 0) * 100) / 100;
  const formatted = formatHours(rounded);
  if (rounded > 0) return `+${formatted}h`;
  return `${formatted}h`;
}

function balanceClass(value) {
  if (value > 0) return "ok";
  if (value < 0) return "danger";
  return "warn";
}

function hasEmployeeWorkLog(employeeId, date) {
  return state.employeeWorkLogs.some((log) => log.employeeId === employeeId && log.date === date);
}

function readSmallFile(file) {
  return new Promise((resolve) => {
    if (!file || !file.name || file.size > 1500000) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function addMonths(value, months) {
  if (!value || !months) return "";
  const date = parseDate(value);
  date.setMonth(date.getMonth() + Number(months || 0));
  return dateKey(date);
}

function daysBetween(from, to) {
  return Math.ceil((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000);
}

function hoursSince(value) {
  if (!value) return 0;
  return (Date.now() - new Date(value).getTime()) / 36e5;
}

function contractEndDate(client) {
  return addMonths(client.startDate, client.contractMonths);
}

function notifyOnce({ key, scope = "admin", targetId = "", type = "info", title, message }) {
  state.notifications = state.notifications || [];
  state.dismissedNotificationKeys = state.dismissedNotificationKeys || [];
  if (key && state.dismissedNotificationKeys.includes(key)) return;
  if (key && state.notifications.some((notification) => notification.key === key)) return;
  state.notifications.unshift({
    id: crypto.randomUUID(),
    key,
    scope,
    targetId,
    type,
    title,
    message,
    read: false,
    hiddenUntil: "",
    createdAt: new Date().toISOString(),
  });
}

function generateSystemNotifications() {
  const monthKey = selectedMonthKey();
  const today = currentDateKey();

  // Dnevni izvestaji su evidencija rada, ne stavka koja trazi reakciju admina.
  state.notifications = (state.notifications || []).filter((notification) => !String(notification.key || "").startsWith("employee-report-"));

  state.clients.forEach((client) => {
    const invoice = monthlyInvoice(client, monthKey);
    if (invoice.invoiceStatus === "Poslat" && invoice.paymentStatus !== "Plaćeno" && invoice.sentAt && hoursSince(invoice.sentAt) >= 8 * 24) {
      notifyOnce({
        key: `invoice-unpaid-${client.id}-${monthKey}`,
        type: "danger",
        title: "Račun nije plaćen",
        message: `${client.name}: račun je poslat pre više od 8 dana, a nije označen kao plaćen.`,
      });
    }

    const endDate = contractEndDate(client);
    if (endDate) {
      const daysLeft = daysBetween(today, endDate);
      if (daysLeft >= 0 && daysLeft <= 30) {
        notifyOnce({
          key: `contract-expiry-${client.id}-${endDate}`,
          type: "warn",
          title: "Ugovor ističe",
          message: `${client.name}: ugovor ističe ${formatDate(endDate)}.`,
        });
      }
    }
  });

  state.leads.forEach((lead) => {
    if (!lead.createdAt || lead.calledAt) return;
    if (hoursSince(lead.createdAt) < clientLeadSlaHours) return;
    const status = lead.status || "Novi";
    if (status !== "Novi") return;
    notifyOnce({
      key: `client-lead-stale-${lead.id}`,
      type: "danger",
      title: "Klijent nije obradio lead",
      message: `${lead.client}: lead ${lead.name} nema promenu statusa duže od 48h.`,
    });
  });

  state.employeeAbsences
    .filter((absence) => absence.status === "Zatraženo")
    .forEach((absence) => {
      const employee = employeeById(absence.employeeId);
      notifyOnce({
        key: `absence-request-${absence.id}`,
        type: "warn",
        title: "Zahtev za odmor",
        message: `${employee?.name || "Zaposleni"} traži ${absence.type} od ${formatDate(absence.startDate)} do ${formatDate(absence.endDate)}.`,
      });
    });

  const yesterdayDate = new Date(`${today}T12:00:00`);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;
  const dayOfWeek = yesterdayDate.getDay();
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    (state.employees || [])
      .filter((employee) => employee.status === "Aktivan")
      .filter((employee) => !String(employee.position || "").trim().toLocaleLowerCase("sr-Latn").includes("snimatelj"))
      .forEach((employee) => {
        const hasApprovedAbsence = (state.employeeAbsences || []).some((absence) =>
          absence.employeeId === employee.id
          && absence.status === "Odobreno"
          && absence.startDate <= yesterday
          && absence.endDate >= yesterday
        );
        if (hasApprovedAbsence) return;
        const weeklyHours = Number(employee.weeklyHours || 0);
        const targetMinutes = weeklyHours === 20
          ? 240
          : weeklyHours >= 38
            ? (dayOfWeek === 5 ? 390 : 510)
            : Math.round((weeklyHours * 60) / 5);
        if (targetMinutes <= 0) return;
        const enteredMinutes = (state.employeeWorkLogs || [])
          .filter((log) => log.employeeId === employee.id && log.date === yesterday)
          .reduce((sum, log) => sum + Number(log.minutes || Math.round(Number(log.hours || 0) * 60)), 0);
        if (enteredMinutes >= targetMinutes) return;
        notifyOnce({
          key: `employee-hours-shortage-${employee.id}-${yesterday}`,
          type: "danger",
          title: "Nedostaju sati",
          message: `${employee.name}: za ${formatDate(yesterday)} upisano je ${enteredMinutes}/${targetMinutes} min. Nedostaje ${targetMinutes - enteredMinutes} min.`,
        });
      });
  }

}

function visibleEmployees() {
  return state.employees.filter((employee) => bySearch(employee) && (employeeStatusFilter === "all" || employee.status === employeeStatusFilter));
}

function selectedEmployee() {
  let employee = state.employees.find((item) => item.id === selectedEmployeeId);
  if (!employee) {
    employee = state.employees[0];
    selectedEmployeeId = employee?.id || "";
  }
  return employee;
}

function selectedEmployeeFilter(item) {
  return !selectedEmployeeId || item.employeeId === selectedEmployeeId;
}

function employeeLeaderName(employee) {
  if (!employee?.leaderId) return "Nema lidera";
  return employeeById(employee.leaderId)?.name || "Lider nije pronađen";
}

function teamUnderLeader(leaderId) {
  return (state.employees || []).filter((employee) => employee.leaderId === leaderId);
}

function setSelectedEmployeeOnForms(employeeId) {
  ["absenceEmployeeSelect", "workEmployeeSelect", "lateEmployeeSelect", "goalEmployeeSelect", "ratingEmployeeSelect", "recognitionEmployeeSelect", "oneOnOneEmployeeSelect"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.value = [...select.options].some((option) => option.value === employeeId) ? employeeId : "";
  });
}

function renderEmployeeOptions() {
  const employees = state.employees || [];
  ["absenceEmployeeSelect", "workEmployeeSelect", "lateEmployeeSelect", "goalEmployeeSelect", "ratingEmployeeSelect", "recognitionEmployeeSelect", "oneOnOneEmployeeSelect"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const selected = select.value || selectedEmployeeId;
    select.innerHTML = employees.length
      ? employees.map((employee) => `<option value="${employee.id}">${employee.name}</option>`).join("")
      : `<option value="">Nema zaposlenih</option>`;
    if (employees.some((employee) => employee.id === selected)) select.value = selected;
  });
  const activitySelect = document.getElementById("workActivitySelect");
  if (activitySelect) {
    const activities = (state.employeeActivities || []).filter((activity) => activity.active !== false);
    activitySelect.innerHTML = activities.length
      ? activities.map((activity) => `<option value="${activity.id}">${activity.name}</option>`).join("")
      : `<option value="">Admin prvo dodaje aktivnost</option>`;
  }
  const leaderSelect = document.getElementById("employeeLeaderSelect");
  if (leaderSelect) {
    const selected = leaderSelect.value;
    const leaders = employees.filter((employee) => employee.isLeader);
    leaderSelect.innerHTML = `<option value="">Nema lidera</option>${leaders.map((employee) => `<option value="${employee.id}">${employee.name}</option>`).join("")}`;
    if (leaders.some((employee) => employee.id === selected)) leaderSelect.value = selected;
  }
}

function syncRequestedEmployee() {
  const employeeId = new URLSearchParams(location.search).get("employee");
  if (employeeId && (state.employees || []).some((employee) => employee.id === employeeId)) {
    selectedEmployeeId = employeeId;
  }
}

const employeeSelectionIds = new Set(["absenceEmployeeSelect", "workEmployeeSelect", "lateEmployeeSelect", "goalEmployeeSelect", "ratingEmployeeSelect", "recognitionEmployeeSelect", "oneOnOneEmployeeSelect"]);
document.addEventListener("change", (event) => {
  if (!employeeSelectionIds.has(event.target.id) || !event.target.value) return;
  selectedEmployeeId = event.target.value;
  setSelectedEmployeeOnForms(selectedEmployeeId);
});

function renderEmployees() {
  if (!document.getElementById("employees")) return;
  syncRequestedEmployee();
  state.employees = state.employees || [];
  state.employeeAbsences = state.employeeAbsences || [];
  state.employeeWorkLogs = state.employeeWorkLogs || [];
  state.employeeActivities = state.employeeActivities || [];
  state.employeeDocuments = state.employeeDocuments || [];
  state.employeeLateRecords = state.employeeLateRecords || [];
  state.employeeGoals = state.employeeGoals || [];
  state.employeeRatings = state.employeeRatings || [];
  state.employeeRecognitions = state.employeeRecognitions || [];
  state.employeeOneOnOnes = state.employeeOneOnOnes || [];
  state.employeeReports = state.employeeReports || [];
  state.companyPlans = state.companyPlans || [];
  const monthKey = employeeMonthKey();
  const year = Number(monthKey.slice(0, 4));
  const employees = visibleEmployees();
  const totalSalary = employees
    .filter((employee) => employee.status === "Aktivan")
    .reduce((sum, employee) => sum + Number(employee.salary || 0), 0);
  const totalHourBalance = employees.reduce((sum, employee) => sum + employeeHourBalance(employee, monthKey), 0);
  const vacationUsed = employees.reduce((sum, employee) => sum + employeeYearAbsenceDays(employee.id, year, "Godišnji odmor"), 0);
  const sickDays = employees.reduce((sum, employee) => sum + employeeYearAbsenceDays(employee.id, year, "Bolovanje"), 0);
  if (!employees.some((employee) => employee.id === selectedEmployeeId)) selectedEmployeeId = employees[0]?.id || state.employees[0]?.id || "";
  const employee = selectedEmployee();

  document.getElementById("employeeMonthFilter").value = monthKey;
  setText("employeeTotal", employees.filter((employee) => employee.status === "Aktivan").length);
  setText("employeeSalaryTotal", currency.format(totalSalary));
  setText("employeeHourBalance", formatHourBalance(totalHourBalance));
  setText("employeeVacationUsed", vacationUsed);
  setText("employeeSickDays", sickDays);
  const workDateInput = document.querySelector('#employeeWorkForm input[name="date"]');
  const absenceStartInput = document.querySelector('#employeeAbsenceForm input[name="startDate"]');
  const absenceEndInput = document.querySelector('#employeeAbsenceForm input[name="endDate"]');
  if (workDateInput && !workDateInput.value) workDateInput.value = currentDateKey();
  if (absenceStartInput && !absenceStartInput.value) absenceStartInput.value = currentDateKey();
  if (absenceEndInput && !absenceEndInput.value) absenceEndInput.value = currentDateKey();
  document.querySelectorAll('#employeeLateForm input[name="date"], #employeeGoalForm input[name="startDate"], #employeeGoalForm input[name="endDate"], #employeeOneOnOneForm input[name="date"], #companyPlanForm input[name="date"]').forEach((input) => {
    if (!input.value) input.value = currentDateKey();
  });

  renderEmployeeOptions();
  setSelectedEmployeeOnForms(employee?.id || "");
  renderEmployeeRows(employees, monthKey, year);
  renderSelectedEmployeeDetail(employee, monthKey, year);
  renderEmployeeAbsenceRequests();
  renderEmployeeCalendar(monthKey, employees);
  renderEmployeeWorkRows(monthKey);
  renderEmployeeActivities();
  renderEmployeeOps(monthKey);
  renderEmployeeTeamTimeline(monthKey);
  updateEmployeeMonthlyPreview();
}

function renderEmployeeRows(employees, monthKey, year) {
  setText("employeeRowsCount", `${employees.length} osoba`);
  document.getElementById("employeeRows").innerHTML = employees.length
    ? employees
        .map((employee) => {
          const hours = employeeMonthHours(employee.id, monthKey);
          const expected = employeeExpectedHours(employee, monthKey);
          const balance = employeeHourBalance(employee, monthKey);
          const lateStatus = employeeLateStatus(employee.id, monthKey);
          const rowClass = employee.id === selectedEmployeeId ? "selected-row" : "";
          return `
          <tr class="${rowClass}" data-select-employee="${employee.id}">
            <td><strong>${employee.name}</strong><br /><span>${employee.position || "Pozicija nije uneta"} · ${employee.email}</span></td>
            <td>${employee.isLeader ? `<span class="status ok">Lider</span>` : `<span>${employeeLeaderName(employee)}</span>`}</td>
            <td><strong>${formatHours(hours)}h</strong><br /><span>od ${formatHours(expected)}h · ${lateStatus.label}</span></td>
            <td><span class="status ${balanceClass(balance)}">${formatHourBalance(balance)}</span><br /><span>${employeeCarryoverLabel(employee, monthKey)}</span></td>
            <td><span class="status ${employee.status === "Aktivan" ? "ok" : employee.status === "Pauza" ? "warn" : "danger"}">${employee.status || "Aktivan"}</span></td>
            <td>
              <button class="edit-button" data-edit-employee="${employee.id}" type="button" title="Izmeni">✎</button>
              <button class="edit-button danger-action" data-delete-employee="${employee.id}" type="button" title="Obriši">×</button>
            </td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="6">Nema zaposlenih za izabrani filter.</td></tr>`;
  bindEmployeeRowActions();
}

function renderSelectedEmployeeDetail(employee, monthKey, year) {
  const panel = document.getElementById("leaderAssignmentPanel");
  if (!employee) {
    setText("selectedEmployeeName", "Nema zaposlenih");
    setText("selectedEmployeePosition", "-");
    setText("selectedEmployeeStart", "-");
    setText("selectedEmployeeSalary", currency.format(0));
    setText("selectedEmployeeWeekly", "0h");
    setText("selectedEmployeeLeader", "-");
    setText("selectedEmployeeTeamCount", "0");
    setSelectedEmployeeOnForms("");
    if (panel) panel.hidden = true;
    document.getElementById("selectedEmployeeAbsenceList").innerHTML = `<div class="empty-state">Dodaj prvog zaposlenog.</div>`;
    return;
  }
  const team = teamUnderLeader(employee.id);
  const lateStatus = employeeLateStatus(employee.id, monthKey);
  setText("selectedEmployeeName", employee.name);
  setText("selectedEmployeePosition", employee.position || "Pozicija nije uneta");
  setText("selectedEmployeeStart", formatDate(employee.startDate));
  setText("selectedEmployeeSalary", currency.format(Number(employee.salary || 0)));
  setText("selectedEmployeeWeekly", `${formatHours(employee.weeklyHours || 40)}h`);
  setText("selectedEmployeeLeader", employee.isLeader ? "Lider" : employeeLeaderName(employee));
  setText("selectedEmployeeTeamCount", `${team.length} osoba`);
  renderSelectedEmployeeAbsenceList(employee.id, year);
  renderLeaderAssignment(employee);
  const absenceList = document.getElementById("selectedEmployeeAbsenceList");
  if (absenceList) {
    absenceList.insertAdjacentHTML(
      "afterbegin",
      `<div class="setup-item alert-item ${lateStatus.className}">
        <strong>${lateStatus.count}</strong>
        <span>Kašnjenja ovaj mesec<br />${lateStatus.label}</span>
      </div>`
    );
  }
}

function renderSelectedEmployeeAbsenceList(employeeId, year) {
  const vacationUsed = employeeYearAbsenceDays(employeeId, year, "Godišnji odmor");
  const giftUsed = employeeYearAbsenceDays(employeeId, year, "Poklon dan");
  const sickDays = employeeYearAbsenceDays(employeeId, year, "Bolovanje");
  const employee = employeeById(employeeId);
  const vacationAllowance = employeeVacationAllowance(employee, year);
  const recentAbsences = (state.employeeAbsences || [])
    .filter((absence) => absence.employeeId === employeeId)
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    .slice(0, 4);
  document.getElementById("selectedEmployeeAbsenceList").innerHTML = `
    <div class="setup-item">
      <strong>${vacationUsed}</strong>
      <span>Godišnji iskorišćen · ${Math.max(vacationAllowance - vacationUsed, 0)} dana preostalo<br />Pravo za godinu: ${vacationAllowance}/${employee?.vacationDays || 26}</span>
    </div>
    <div class="setup-item">
      <strong>${giftUsed}</strong>
      <span>Poklon dan · ${Math.max(Number(employee?.giftDays || 1) - giftUsed, 0)} preostalo</span>
    </div>
    <div class="setup-item">
      <strong>${sickDays}</strong>
      <span>Bolovanje u godini</span>
    </div>
    ${
      recentAbsences.length
        ? recentAbsences
            .map(
              (absence) => `
              <div class="setup-item alert-item ${absence.type === "Bolovanje" ? "danger" : "warn"}">
                <strong>${workdayKeysBetween(absence.startDate, absence.endDate).length}</strong>
                <span>${absence.type} · ${formatDate(absence.startDate)} - ${formatDate(absence.endDate)}<br />${absence.status || ""} ${absence.note ? `· ${absence.note}` : ""}</span>
              </div>`
            )
            .join("")
        : `<div class="empty-state">Nema skorijih odsustava.</div>`
    }`;
}

function renderLeaderAssignment(employee) {
  const panel = document.getElementById("leaderAssignmentPanel");
  if (!panel) return;
  panel.hidden = !employee?.isLeader;
  if (!employee?.isLeader) return;
  const available = (state.employees || []).filter((item) => item.id !== employee.id);
  const assigned = available.filter((item) => item.leaderId === employee.id).length;
  setText("leaderAssignmentCount", `${assigned} osoba`);
  document.getElementById("leaderAssignmentList").innerHTML = available.length
    ? available
        .map((item) => {
          const isAssigned = item.leaderId === employee.id;
          return `
          <div class="setup-item leader-assignment-row">
            <strong>${isAssigned ? "✓" : "+"}</strong>
            <span>${item.name}<br />${item.position || "Pozicija nije uneta"} ${item.leaderId && !isAssigned ? `· trenutno: ${employeeLeaderName(item)}` : ""}</span>
            <button class="secondary-button" data-assign-leader="${employee.id}" data-employee-id="${item.id}" type="button">${isAssigned ? "Ukloni" : "Dodaj"}</button>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema drugih zaposlenih za dodelu.</div>`;
  document.querySelectorAll("[data-assign-leader]").forEach((button) => {
    button.addEventListener("click", () => {
      const member = employeeById(button.dataset.employeeId);
      if (!member) return;
      member.leaderId = member.leaderId === button.dataset.assignLeader ? "" : button.dataset.assignLeader;
      saveState();
      renderAll();
    });
  });
}

function bindEmployeeRowActions() {
  document.querySelectorAll("[data-select-employee]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      selectedEmployeeId = row.dataset.selectEmployee;
      hideEmployeeProfileForm();
      renderAll();
    });
  });
  document.querySelectorAll("[data-edit-employee]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedEmployeeId = button.dataset.editEmployee;
      showEmployeeProfileForm(employeeById(selectedEmployeeId));
      renderAll();
    });
  });
  document.querySelectorAll("[data-delete-employee]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteEmployee(button.dataset.deleteEmployee);
    });
  });
}

function showEmployeeProfileForm(employee = null) {
  const panel = document.getElementById("employeeProfilePanel");
  const form = document.getElementById("employeeForm");
  if (!panel || !form) return;
  if (panel.parentElement !== document.body) document.body.appendChild(panel);
  panel.classList.add("employee-editor-modal");
  panel.hidden = false;
  document.body.classList.add("employee-editor-open");
  const deleteButton = document.getElementById("deleteSelectedEmployeeBtn");
  const modalHead = panel.querySelector(".compact-head");
  if (deleteButton && modalHead) {
    modalHead.appendChild(deleteButton);
    deleteButton.hidden = !employee;
  }
  renderEmployeeOptions();
  if (employee) {
    setText("employeeProfileMode", "Izmena");
    form.elements.id.value = employee.id;
    form.elements.name.value = employee.name || "";
    form.elements.position.value = employee.position || "";
    form.elements.email.value = employee.email || "";
    form.elements.password.value = employee.password || "123456";
    form.elements.startDate.value = employee.startDate || "";
    form.elements.salary.value = Number(employee.salary || 0);
    form.elements.weeklyHours.value = parseNumber(employee.weeklyHours || 40);
    form.elements.openingHourBalance.value = parseNumber(employee.openingHourBalance || 0);
    form.elements.openingBalanceMonth.value = employee.openingBalanceMonth || shiftMonth(currentMonthKey(), -1);
    form.elements.isLeader.checked = Boolean(employee.isLeader);
    form.elements.leaderId.value = employee.leaderId || "";
    form.elements.vacationDays.value = Number(employee.vacationDays || 26);
    form.elements.openingVacationUsed.value = parseNumber(employee.openingVacationUsed || 0);
    form.elements.giftDays.value = Number(employee.giftDays || 1);
    form.elements.status.value = employee.status || "Aktivan";
  } else {
    setText("employeeProfileMode", "Novi zaposleni");
    form.reset();
    form.elements.id.value = "";
    form.elements.password.value = "123456";
    form.elements.weeklyHours.value = 40;
    form.elements.openingHourBalance.value = 0;
    form.elements.openingBalanceMonth.value = shiftMonth(currentMonthKey(), -1);
    form.elements.isLeader.checked = false;
    form.elements.leaderId.value = "";
    form.elements.vacationDays.value = 26;
    form.elements.openingVacationUsed.value = 0;
    form.elements.giftDays.value = 1;
    form.elements.status.value = "Aktivan";
    form.elements.startDate.value = currentDateKey();
  }
  updateEmployeeMonthlyPreview();
  form.querySelector('input[name="name"]')?.focus();
}

function updateEmployeeMonthlyPreview() {
  const form = document.getElementById("employeeForm");
  const preview = document.getElementById("weeklyHoursMonthlyPreview");
  if (!form || !preview) return;
  const monthKey = employeeMonthKey();
  const estimate = employeeMonthlyHoursPreview(form.elements.weeklyHours?.value || 40, monthKey, form.elements.startDate?.value || "");
  preview.textContent = `Mesečno: ${formatHours(estimate.hours)}h za ${estimate.days} radnih dana u ${monthLabel(monthKey)}`;
}

function hideEmployeeProfileForm() {
  const panel = document.getElementById("employeeProfilePanel");
  if (panel) {
    panel.hidden = true;
    panel.classList.remove("employee-editor-modal");
  }
  document.body.classList.remove("employee-editor-open");
}

function deleteEmployee(id) {
  const employee = employeeById(id);
  if (!employee) return;
  if (!confirm(`Obrisati zaposlenog: ${employee.name}?`)) return;
  state.employees = state.employees.filter((item) => item.id !== id);
  state.employees.forEach((item) => {
    if (item.leaderId === id) item.leaderId = "";
  });
  state.employeeAbsences = (state.employeeAbsences || []).filter((item) => item.employeeId !== id);
  state.employeeWorkLogs = (state.employeeWorkLogs || []).filter((item) => item.employeeId !== id);
  state.employeeLateRecords = (state.employeeLateRecords || []).filter((item) => item.employeeId !== id);
  state.employeeGoals = (state.employeeGoals || []).filter((item) => item.employeeId !== id);
  state.employeeRatings = (state.employeeRatings || []).filter((item) => item.employeeId !== id);
  state.employeeRecognitions = (state.employeeRecognitions || []).filter((item) => item.employeeId !== id);
  state.employeeOneOnOnes = (state.employeeOneOnOnes || []).filter((item) => item.employeeId !== id);
  state.employeeReports = (state.employeeReports || []).filter((item) => item.employeeId !== id && item.recipientId !== id);
  state.notifications = (state.notifications || []).filter((item) => item.targetId !== id);
  selectedEmployeeId = state.employees[0]?.id || "";
  hideEmployeeProfileForm();
  saveState();
  renderAll();
}

function renderEmployeeWorkRows(monthKey) {
  const personFilter = document.getElementById("employeeWorkPersonFilter");
  if (personFilter) {
    const selectedValue = employeeWorkPersonFilter;
    personFilter.innerHTML = `<option value="all">Svi zaposleni</option>${state.employees
      .map((employee) => `<option value="${employee.id}">${employee.name}</option>`)
      .join("")}`;
    personFilter.value = state.employees.some((employee) => employee.id === selectedValue) ? selectedValue : "all";
    employeeWorkPersonFilter = personFilter.value;
  }
  const workMonth = employeeWorkMonthFilter || monthKey;
  const monthInput = document.getElementById("employeeWorkMonthFilter");
  if (monthInput) monthInput.value = workMonth;
  const rows = state.employeeWorkLogs
    .filter((log) => String(log.date || "").startsWith(workMonth))
    .filter((log) => employeeWorkPersonFilter === "all" || log.employeeId === employeeWorkPersonFilter)
    .filter((log) => {
      const employee = employeeById(log.employeeId);
      return employee && bySearch({ ...log, employee: employee.name });
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((log) => {
      const employee = employeeById(log.employeeId);
      return `
      <tr>
        <td>${formatDate(log.date)}</td>
        <td>${employee?.name || "Obrisan zaposleni"}</td>
        <td>${Number(log.minutes || Math.round(Number(log.hours || 0) * 60))} min<br /><span>${formatHours(log.hours || 0)}h</span></td>
        <td><strong>${log.activityName || "Rad"}</strong>${log.note ? `<br /><span>${log.note}</span>` : ""}</td>
        <td>${log.clientName || "Bez klijenta"}</td>
        <td><strong>+</strong> ${log.positive || "-"}<br /><strong>-</strong> ${log.negative || "-"}</td>
        <td><span class="status ok">${log.locked === false ? "Otključano" : "Zaključano"}</span><br /><button class="edit-button" data-edit-work-log="${log.id}" type="button">Izmeni</button> <button class="edit-button danger-action" data-delete-work-log="${log.id}" type="button">Obriši</button></td>
      </tr>`;
    });
  setText("employeeWorkRowsCount", `${rows.length} unosa`);
  document.getElementById("employeeWorkRows").innerHTML = rows.join("") || `<tr><td colspan="7">Nema unetih sati za izabrani mesec i zaposlenog.</td></tr>`;
  document.querySelectorAll("[data-edit-work-log]").forEach((button) => button.addEventListener("click", () => openWorkLogEditor(button.dataset.editWorkLog)));
  document.querySelectorAll("[data-delete-work-log]").forEach((button) => button.addEventListener("click", () => {
    const log = state.employeeWorkLogs.find((item) => item.id === button.dataset.deleteWorkLog);
    if (!log || !confirm(`Obrisati unos od ${formatDate(log.date)} (${log.activityName || "Rad"})?`)) return;
    state.employeeWorkLogs = state.employeeWorkLogs.filter((item) => item.id !== log.id);
    saveState();
    renderAll();
    showToast("Obrisano", "Pogrešan unos vremena je uklonjen.", "ok");
  }));
}

function openWorkLogEditor(id) {
  const log = (state.employeeWorkLogs || []).find((item) => item.id === id);
  if (!log) return;
  let dialog = document.getElementById("workLogEditorDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "workLogEditorDialog";
    dialog.className = "work-log-editor-dialog";
    document.body.append(dialog);
  }
  const activityOptions = (state.employeeActivities || []).filter((item) => item.active !== false)
    .map((item) => `<option value="${item.id}" ${item.id === log.activityId ? "selected" : ""}>${item.category || "Ostalo"} · ${item.name}</option>`).join("");
  const clientOptions = (state.clients || []).filter((item) => item.status === "Aktivan")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => `<option value="${item.id}" ${item.id === log.clientId ? "selected" : ""}>${item.name}</option>`).join("");
  dialog.innerHTML = `<form method="dialog" class="work-log-editor-form">
    <div class="panel-head"><div><p class="eyebrow">Evidencija rada</p><h2>Izmeni unos</h2></div><button class="icon-button" value="cancel" type="submit">×</button></div>
    <label>Datum<input name="date" type="date" value="${log.date}" required /></label>
    <label>Minuta<input name="minutes" type="number" min="1" value="${Number(log.minutes || Math.round(Number(log.hours || 0) * 60))}" required /></label>
    <label>Aktivnost<select name="activityId" required>${activityOptions}</select></label>
    <label>Klijent<select name="clientId"><option value="">Bez klijenta</option>${clientOptions}</select></label>
    <label class="wide">Napomena<textarea name="note" rows="3">${log.note || ""}</textarea></label>
    <div class="dialog-actions wide"><button class="secondary-button" value="cancel" type="submit">Otkaži</button><button class="primary-button" value="save" type="submit">Sačuvaj izmenu</button></div>
  </form>`;
  dialog.addEventListener("close", () => {
    if (dialog.returnValue !== "save") return;
    const form = dialog.querySelector("form");
    const data = new FormData(form);
    const activity = (state.employeeActivities || []).find((item) => item.id === data.get("activityId"));
    const client = (state.clients || []).find((item) => item.id === data.get("clientId"));
    const normalizedActivityName = String(log.activityName || "").trim().toLowerCase();
    const isAggregate = normalizedActivityName.includes("migracija") || normalizedActivityName.includes("prenos stvarnog");
    if (!client && !isAggregate) {
      alert("Izaberi klijenta za ovu aktivnost.");
      openWorkLogEditor(id);
      return;
    }
    const minutes = Math.max(1, parseNumber(data.get("minutes"), 1));
    Object.assign(log, {
      date: String(data.get("date") || log.date), minutes,
      hours: Math.round((minutes / 60) * 10000) / 10000,
      activityId: activity?.id || log.activityId,
      activityName: activity?.name || log.activityName,
      activityCategory: activity?.category || log.activityCategory || "Ostalo",
      clientId: client?.id || "", clientName: client?.name || "",
      note: String(data.get("note") || ""), updatedAt: new Date().toISOString(),
    });
    saveState();
    renderAll();
    showToast("Sačuvano", "Unos sati je izmenjen i odmah je vidljiv zaposlenom.", "ok");
  }, { once: true });
  dialog.showModal();
}

function renderEmployeeActivities() {
  const target = document.getElementById("employeeActivityList");
  if (!target) return;
  const activities = state.employeeActivities || [];
  target.innerHTML = activities.length
    ? activities.map((activity) => `<div class="setup-item"><strong>${activity.name}</strong><button class="edit-button danger-action" data-delete-activity="${activity.id}" type="button">Obriši</button></div>`).join("")
    : `<div class="empty-state">Dodaj prvu aktivnost koju zaposleni mogu da izaberu.</div>`;
  target.querySelectorAll("[data-delete-activity]").forEach((button) => button.addEventListener("click", () => {
    if (!confirm("Obrisati aktivnost iz ponuđene liste? Stari unosi ostaju sačuvani.")) return;
    state.employeeActivities = state.employeeActivities.filter((item) => item.id !== button.dataset.deleteActivity);
    saveState();
    renderAll();
  }));
}

function renderEmployeeAbsenceRequests() {
  const requests = state.employeeAbsences
    .filter((absence) => absence.status === "Zatraženo")
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  setText("employeeAbsenceRequestCount", `${requests.length} zahteva`);
  const target = document.getElementById("employeeAbsenceRequestRows");
  if (!target) return;
  target.innerHTML = requests.length
    ? requests
        .map((absence) => {
          const employee = employeeById(absence.employeeId);
          return `
          <tr>
            <td><strong>${employee?.name || "Zaposleni"}</strong></td>
            <td>${absence.type}</td>
            <td>${formatDate(absence.startDate)} - ${formatDate(absence.endDate)}</td>
            <td>${absence.note || ""}</td>
            <td><button class="secondary-button approve-absence" data-absence-id="${absence.id}" type="button">Odobri</button></td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="5">Nema zahteva za odmor.</td></tr>`;
  document.querySelectorAll(".approve-absence").forEach((button) => {
    button.addEventListener("click", () => approveAbsence(button.dataset.absenceId));
  });
}

function renderEmployeeOps(monthKey) {
  renderEmployeeLateRows(monthKey);
  renderEmployeeGoalRows();
  renderEmployeeOneOnOneRows();
  renderCompanyPlanList();
  renderEmployeeReportRows(monthKey);
}

function renderEmployeeLateRows(monthKey) {
  const rows = (state.employeeLateRecords || [])
    .filter((record) => String(record.date || "").startsWith(monthKey))
    .filter(selectedEmployeeFilter)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);
  const target = document.getElementById("employeeLateRows");
  if (!target) return;
  target.innerHTML = rows.length
    ? rows
        .map((record) => {
          const employee = employeeById(record.employeeId);
          const penalty = Math.max(15, Number(record.penaltyMinutes || record.minutes || 0));
          return `
          <div class="setup-item alert-item warn">
            <strong>${record.minutes}m</strong>
            <span>${employee?.name || "Zaposleni"} · ${formatDate(record.date)}<br />Odbija se ${penalty} min · ${record.acknowledgedAt ? "potvrđeno" : "čeka potvrdu"}${record.reason ? ` · ${record.reason}` : ""}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema kašnjenja u ovom mesecu.</div>`;
}

function renderEmployeePerformanceOverview() {
  const target = document.getElementById("employeePerformanceRows");
  if (!target) return;
  const month = document.getElementById("employeeMonthFilter")?.value || currentMonthKey();
  const isEmployeeProfilePage = location.pathname.endsWith("/employee-profile") || location.pathname.endsWith("/employee-profile.html");
  const profileSelect = document.getElementById("employeeProfileFilter");
  const urlEmployeeId = new URLSearchParams(location.search).get("employee");
  if (isEmployeeProfilePage && urlEmployeeId && (state.employees || []).some((item) => item.id === urlEmployeeId)) selectedEmployeeId = urlEmployeeId;
  const availableEmployees = (state.employees || []).filter((employee) => employee.status !== "Arhiviran");
  if (profileSelect) {
    profileSelect.innerHTML = `${isEmployeeProfilePage ? "" : `<option value="all">Svi zaposleni</option>`}${availableEmployees.map((employee) => `<option value="${employee.id}">${employee.name}</option>`).join("")}`;
    profileSelect.value = isEmployeeProfilePage ? selectedEmployeeId : employeeOverviewFilter;
    if (!profileSelect.dataset.bound) {
      profileSelect.dataset.bound = "true";
      profileSelect.addEventListener("change", () => {
        if (isEmployeeProfilePage) {
          selectedEmployeeId = profileSelect.value;
          setSelectedEmployeeOnForms(selectedEmployeeId);
          history.replaceState({}, "", `/employee-profile?employee=${selectedEmployeeId}`);
        } else {
          employeeOverviewFilter = profileSelect.value;
          if (employeeOverviewFilter !== "all") selectedEmployeeId = employeeOverviewFilter;
        }
        renderAll();
      });
    }
  }
  const employees = isEmployeeProfilePage
    ? availableEmployees.filter((employee) => employee.id === selectedEmployeeId).slice(0, 1)
    : employeeOverviewFilter === "all" ? availableEmployees : availableEmployees.filter((employee) => employee.id === employeeOverviewFilter);
  target.innerHTML = employees.length
    ? employees.map((employee) => {
        const ratings = (state.employeeRatings || [])
          .filter((item) => item.employeeId === employee.id)
          .sort((a, b) => String(b.month).localeCompare(String(a.month)) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
        const monthlyRatings = ratings.filter((item) => item.month === month);
        const score = monthlyRatings.length
          ? monthlyRatings.reduce((sum, item) => sum + Number(item.score || 0), 0) / monthlyRatings.length
          : null;
        const goals = (state.employeeGoals || []).filter((item) => item.employeeId === employee.id && item.status !== "Završeno");
        const progress = goals.length
          ? Math.round(goals.reduce((sum, item) => sum + Number(item.progress || 0), 0) / goals.length)
          : null;
        const recognitions = (state.employeeRecognitions || [])
          .filter((item) => item.employeeId === employee.id)
          .sort((a, b) => String(b.month).localeCompare(String(a.month)) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
        const recognition = recognitions[0];
        const history = ratings.length
          ? ratings.map((item) => `${item.month}: ${Number(item.score || 0).toLocaleString("sr-RS")}/5 · ${item.source || "Ocena"}${item.reviewer ? ` · ${item.reviewer}` : ""}`).join("<br />")
          : "Nema ranijih ocena.";
        const recognitionHistory = recognitions.length
          ? recognitions.map((item) => `${item.month}: ${item.type} · ${item.author || "Admin"}<br />${item.text || item.message || "Bez poruke"}`).join("<hr />")
          : "Nema pohvala ili fokusa.";
        return `<tr class="performance-employee-row ${employee.id === selectedEmployeeId ? "selected-row" : ""}" data-performance-employee="${employee.id}" tabindex="0" role="button" aria-label="Otvori dosije za ${employee.name}">
          <td><strong>${employee.name}</strong><br /><span class="muted">${employee.position || "Zaposleni"}</span></td>
          <td><strong>${score === null ? "Bez ocene" : `${score.toFixed(1).replace(".", ",")}/5`}</strong><br /><span class="muted">${monthlyRatings.length} ${monthlyRatings.length === 1 ? "ocena" : "ocena"} za mesec</span></td>
          <td><strong>${progress === null ? "Nema aktivnog cilja" : `${progress}%`}</strong><br /><span class="muted">${goals.length} aktivnih ciljeva</span></td>
          <td>${recognition ? `<strong>${recognition.type}</strong><br /><span class="muted">${recognition.text || recognition.message || "Bez poruke"}</span><details><summary class="history-link">Sve poruke (${recognitions.length})</summary><div class="employee-rating-history">${recognitionHistory}</div></details>` : `<span class="muted">Nema poruke</span>`}</td>
          <td><details><summary class="secondary-button compact-button">Istorija ocena (${ratings.length})</summary><div class="employee-rating-history">${history}</div></details></td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="5"><div class="empty-state">Nema zaposlenih za prikaz.</div></td></tr>`;
  const profileTarget = document.getElementById("employeeCompleteHistory");
  const employee = employees[0];
  if (profileTarget && employee && isEmployeeProfilePage) {
    const ratings = (state.employeeRatings || []).filter((item) => item.employeeId === employee.id).sort((a, b) => String(b.month).localeCompare(String(a.month)));
    const goals = (state.employeeGoals || []).filter((item) => item.employeeId === employee.id).sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)));
    const recognitions = (state.employeeRecognitions || []).filter((item) => item.employeeId === employee.id).sort((a, b) => String(b.month).localeCompare(String(a.month)));
    const absences = (state.employeeAbsences || []).filter((item) => item.employeeId === employee.id).sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
    const workLogs = (state.employeeWorkLogs || []).filter((item) => item.employeeId === employee.id).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const lateRecords = (state.employeeLateRecords || []).filter((item) => item.employeeId === employee.id).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const notes = state.employeeInternalNotes || {};
    const monthRatings = ratings.filter((item) => item.month === month);
    const previousMonthDate = new Date(`${month}-01T12:00:00`);
    previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
    const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;
    const previousRatings = ratings.filter((item) => item.month === previousMonth);
    const average = (items) => items.length ? items.reduce((sum, item) => sum + Number(item.score || 0), 0) / items.length : null;
    const currentScore = average(monthRatings);
    const previousScore = average(previousRatings);
    const monthLogs = workLogs.filter((item) => String(item.date || "").startsWith(month));
    const monthMinutes = monthLogs.reduce((sum, item) => sum + Number(item.minutes || Number(item.hours || 0) * 60), 0);
    const expectedHours = employeeExpectedHours(employee, month);
    const balance = monthMinutes / 60 - expectedHours;
    const activeGoals = goals.filter((item) => item.status !== "Završeno");
    const goalProgress = activeGoals.length ? Math.round(activeGoals.reduce((sum, item) => sum + Number(item.progress || 0), 0) / activeGoals.length) : 0;
    const alerts = [
      !monthRatings.length ? "Mesečna ocena nije uneta." : "",
      !monthLogs.length ? "Nema unetih sati za izabrani mesec." : "",
      activeGoals.some((item) => item.endDate && new Date(`${item.endDate}T23:59:59`) < new Date()) ? "Postoji cilj kome je istekao rok." : "",
      balance < -8 ? `Saldo sati je ${formatHourBalance(balance)}.` : "",
    ].filter(Boolean);
    const trendMonths = [...new Set(ratings.map((item) => item.month))].sort().slice(-6);
    const trend = trendMonths.map((key) => ({ key, value: average(ratings.filter((item) => item.month === key)) }));
    const list = (items, empty, render) => items.length ? items.map(render).join("") : `<div class="empty-state">${empty}</div>`;
    profileTarget.innerHTML = `
      <section class="employee-profile-hero">
        <div><p class="eyebrow">Dosije zaposlenog</p><h2>${employee.name}</h2><p>${employee.position || "Zaposleni"} · ${employee.status || "Aktivan"}</p></div>
        <div class="profile-header-actions"><label>Mesec<input id="employeeProfileMonth" type="month" value="${month}" /></label><div class="profile-quick-actions"><a class="secondary-button" href="/employees-ratings?employee=${employee.id}">Dodaj ocenu</a><a class="secondary-button" href="/employees-goals?employee=${employee.id}">Dodaj cilj</a><a class="secondary-button" href="/employees-recognitions?employee=${employee.id}">Dodaj pohvalu</a></div></div>
      </section>
      <nav class="employee-profile-tabs" aria-label="Sekcije dosijea"><button data-profile-tab="summary" type="button">Sažetak</button><button data-profile-tab="performance" type="button">Učinak</button><button data-profile-tab="time" type="button">Sati</button><button data-profile-tab="absence" type="button">Odsustva</button><button data-profile-tab="admin" type="button">Admin beleške</button></nav>
      <section class="employee-summary-grid profile-panel" data-profile-panel="summary">
        <article><span>Ocena</span><strong>${currentScore === null ? "Bez ocene" : `${currentScore.toFixed(1).replace(".", ",")}/5`}</strong><small>${previousScore === null || currentScore === null ? "Nema poređenja" : `${currentScore >= previousScore ? "Rast" : "Pad"} ${Math.abs(currentScore - previousScore).toFixed(1).replace(".", ",")} prema prošlom mesecu`}</small></article>
        <article><span>Sati</span><strong>${formatHours(monthMinutes / 60)}h</strong><small>od ${formatHours(expectedHours)}h</small></article>
        <article><span>Saldo</span><strong>${formatHourBalance(balance)}</strong><small>za izabrani mesec</small></article>
        <article><span>Ciljevi</span><strong>${goalProgress}%</strong><small>${activeGoals.length} aktivnih</small></article>
      </section>
      <section class="employee-alerts profile-panel ${alerts.length ? "has-alerts" : "all-clear"}" data-profile-panel="summary"><div><p class="eyebrow">Pažnja</p><h3>${alerts.length ? "Potrebna reakcija" : "Sve je uredno"}</h3></div>${alerts.length ? `<ul>${alerts.map((item) => `<li>${item}</li>`).join("")}</ul>` : `<p>Nema aktivnih upozorenja za izabrani mesec.</p>`}</section>
      <section class="employee-history-section employee-trend profile-panel" data-profile-panel="summary"><div class="panel-head"><div><p class="eyebrow">Trend</p><h3>Ocene poslednjih 6 meseci</h3></div></div><div class="score-trend">${trend.length ? trend.map((item) => `<div><span style="height:${Math.max(8, Number(item.value || 0) * 20)}%"></span><strong>${item.value?.toFixed(1).replace(".", ",")}</strong><small>${item.key.slice(5)}</small></div>`).join("") : `<div class="empty-state">Nema dovoljno ocena za grafikon.</div>`}</div></section>
      <section class="employee-history-section profile-panel" data-profile-panel="performance"><div class="panel-head"><div><p class="eyebrow">Ocene</p><h3>Istorija ocena</h3></div><span>${ratings.length} unosa</span></div>${list(ratings, "Nema ocena.", (item) => `<div class="history-record"><strong>${item.score}/5 · ${item.month}</strong><span>${item.source || "Ocena"}${item.reviewer ? ` · ${item.reviewer}` : ""}<br />${item.note || "Bez komentara"}</span></div>`)}</section>
      <section class="employee-history-section profile-panel" data-profile-panel="performance"><div class="panel-head"><div><p class="eyebrow">Razvoj</p><h3>Ciljevi</h3></div><span>${goals.length} ciljeva</span></div>${list(goals, "Nema ciljeva.", (item) => `<div class="history-record"><strong>${item.progress || 0}% · ${item.status || "U toku"}</strong><span>${item.title}<br />${item.target || ""} · rok ${formatDate(item.endDate)}</span></div>`)}</section>
      <section class="employee-history-section profile-panel" data-profile-panel="performance"><div class="panel-head"><div><p class="eyebrow">Motivacija</p><h3>Pohvale i fokus</h3></div><span>${recognitions.length} poruka</span></div>${list(recognitions, "Nema pohvala ili fokusa.", (item) => `<div class="history-record"><strong>${item.type} · ${item.month}</strong><span>${item.author || "Admin"}<br />${item.text || item.message || "Bez poruke"}</span></div>`)}</section>
      <section class="employee-history-section profile-panel profile-panel-wide" data-profile-panel="time"><div class="panel-head"><div><p class="eyebrow">Evidencija</p><h3>Sati i aktivnosti za ${month}</h3></div><span>${monthLogs.length} unosa</span></div>${list(monthLogs.slice(0, 20), "Nema upisanih aktivnosti za izabrani mesec.", (item) => `<div class="history-record"><strong>${formatDate(item.date)} · ${item.minutes || Math.round(Number(item.hours || 0) * 60)} min</strong><span>${item.activityName || "Rad"}${item.clientName ? ` · ${item.clientName}` : ""}<br />${item.note || "Bez napomene"}</span></div>`)}</section>
      <section class="employee-history-section profile-panel" data-profile-panel="absence"><div class="panel-head"><div><p class="eyebrow">Odsustva</p><h3>Odmori i bolovanja</h3></div><span>${absences.length} unosa</span></div>${list(absences, "Nema odsustava.", (item) => `<div class="history-record"><strong>${item.type}</strong><span>${formatDate(item.startDate)} – ${formatDate(item.endDate)} · ${item.status || "Upisano"}<br />${item.note || ""}</span></div>`)}</section>
      <section class="employee-history-section profile-panel" data-profile-panel="absence"><div class="panel-head"><div><p class="eyebrow">Kašnjenja</p><h3>Evidencija</h3></div><span>${lateRecords.length} unosa</span></div>${list(lateRecords, "Nema kašnjenja.", (item) => `<div class="history-record"><strong>${formatDate(item.date)} · ${item.minutes} min</strong><span>${item.reason || "Bez napomene"}</span></div>`)}</section>
      <section class="employee-history-section employee-internal-note profile-panel profile-panel-wide" data-profile-panel="admin"><div class="panel-head"><div><p class="eyebrow">Samo za vlasnike</p><h3>Interna napomena</h3></div><span>nije vidljivo zaposlenom</span></div><textarea id="employeeInternalNote" rows="5" placeholder="Interna zapažanja o zaposlenom...">${notes[employee.id] || ""}</textarea><button class="primary-button" id="saveEmployeeInternalNote" type="button">Sačuvaj napomenu</button></section>`;
    const activateProfileTab = () => {
      profileTarget.querySelectorAll("[data-profile-panel]").forEach((panel) => panel.hidden = panel.dataset.profilePanel !== employeeProfileTab);
      profileTarget.querySelectorAll("[data-profile-tab]").forEach((button) => button.classList.toggle("active", button.dataset.profileTab === employeeProfileTab));
    };
    profileTarget.querySelectorAll("[data-profile-tab]").forEach((button) => button.addEventListener("click", () => {
      employeeProfileTab = button.dataset.profileTab;
      activateProfileTab();
    }));
    document.getElementById("employeeProfileMonth")?.addEventListener("change", (event) => {
      employeeMonthFilter = event.target.value || currentMonthKey();
      const globalMonth = document.getElementById("employeeMonthFilter");
      if (globalMonth) globalMonth.value = employeeMonthFilter;
      renderAll();
    });
    activateProfileTab();
    document.getElementById("saveEmployeeInternalNote")?.addEventListener("click", () => {
      state.employeeInternalNotes = state.employeeInternalNotes || {};
      state.employeeInternalNotes[employee.id] = document.getElementById("employeeInternalNote")?.value.trim() || "";
      saveState();
      showToast("Sačuvano", "Interna napomena je sačuvana samo za admina.", "ok");
    });
  }
  target.querySelectorAll("[data-performance-employee]").forEach((row) => {
    const nameCell = row.querySelector("td");
    if (nameCell && !nameCell.querySelector(".employee-row-edit")) {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "employee-row-edit";
      editButton.setAttribute("aria-label", `Izmeni ${employeeById(row.dataset.performanceEmployee)?.name || "zaposlenog"}`);
      editButton.title = "Izmeni zaposlenog";
      editButton.innerHTML = "&#9998;";
      editButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectedEmployeeId = row.dataset.performanceEmployee;
        setSelectedEmployeeOnForms(selectedEmployeeId);
        showEmployeeProfileForm(employeeById(selectedEmployeeId));
      });
      nameCell.classList.add("employee-name-cell");
      nameCell.append(editButton);
    }
    const openEmployee = () => {
      selectedEmployeeId = row.dataset.performanceEmployee;
      setSelectedEmployeeOnForms(selectedEmployeeId);
      renderAll();
      if (isEmployeeProfilePage) {
        history.replaceState({}, "", `/employee-profile?employee=${selectedEmployeeId}`);
        document.getElementById("employeeCompleteHistory")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        location.href = `/employee-profile?employee=${selectedEmployeeId}`;
      }
    };
    row.addEventListener("click", (event) => {
      if (event.target.closest("details, summary, button, a")) return;
      openEmployee();
    });
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openEmployee();
    });
  });
}

function renderEmployeeGoalRows() {
  renderEmployeePerformanceOverview();
  const selectedEmployee = employeeById(selectedEmployeeId);
  const rows = (state.employeeGoals || [])
    .filter(selectedEmployeeFilter)
    .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))
    .slice(0, 8);
  const target = document.getElementById("employeeGoalRows");
  if (!target) return;
  target.innerHTML = rows.length
    ? rows
        .map((goal) => {
          const employee = employeeById(goal.employeeId);
          const daysLeft = Math.ceil((new Date(`${goal.endDate}T23:59:59`) - new Date()) / 86400000);
          const isLate = goal.status !== "Završeno" && daysLeft < 0;
          const isNear = goal.status !== "Završeno" && daysLeft >= 0 && daysLeft <= 7;
          const status = isLate || goal.status === "Rizik" ? "danger" : goal.status === "Završeno" ? "ok" : "warn";
          const deadline = goal.status === "Završeno"
            ? `Završeno ${formatDate(goal.completedDate)}`
            : isLate ? `Kasni ${Math.abs(daysLeft)} dana` : isNear ? `Rok za ${daysLeft} dana` : `Rok ${formatDate(goal.endDate)}`;
          return `
          <div class="setup-item alert-item ${status}" data-admin-goal-id="${goal.id}">
            <strong>${goal.progress || 0}%</strong>
            <span>${employee?.name || "Zaposleni"} · ${goal.category || "Razvoj"} · ${goal.title}<br />${goal.target || ""} · ${deadline}</span>
            <div class="admin-goal-progress"><input type="range" min="0" max="100" step="5" value="${goal.progress || 0}" aria-label="Progres za ${goal.title}" /><output>${goal.progress || 0}%</output><button type="button">Sačuvaj progres</button></div>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">${selectedEmployee ? `${selectedEmployee.name} trenutno nema unetih ciljeva.` : "Nema ciljeva."}</div>`;

  target.querySelectorAll("[data-admin-goal-id]").forEach((row) => {
    const slider = row.querySelector('input[type="range"]');
    const output = row.querySelector("output");
    slider.addEventListener("input", () => output.value = `${slider.value}%`);
    row.querySelector("button").addEventListener("click", () => {
      const goal = (state.employeeGoals || []).find((item) => item.id === row.dataset.adminGoalId);
      if (!goal) return;
      goal.progress = Number(slider.value);
      if (goal.progress >= 100) {
        goal.status = "Završeno";
        goal.completedDate = goal.completedDate || currentDateKey();
      } else if (goal.status === "Završeno") {
        goal.status = "U toku";
        goal.completedDate = "";
      }
      saveState();
      renderAll();
      showToast("Progres sačuvan", `${employeeById(goal.employeeId)?.name || "Zaposleni"}: ${goal.progress}%`, "ok");
    });
  });

  const ratingTarget = document.getElementById("employeeRatingRows");
  if (!ratingTarget) return;
  const ratings = (state.employeeRatings || [])
    .filter(selectedEmployeeFilter)
    .sort((a, b) => String(b.month).localeCompare(String(a.month)))
    .slice(0, 12);
  ratingTarget.innerHTML = ratings.length
    ? ratings.map((rating) => `<div class="setup-item rating-row"><strong>${rating.score}/5</strong><span>${rating.month} · ${rating.source}${rating.reviewer ? ` · ${rating.reviewer}` : ""}<br />${rating.note || "Bez komentara"}</span></div>`).join("")
    : `<div class="empty-state">${selectedEmployee ? `${selectedEmployee.name} trenutno nema mesečnih ocena.` : "Nema mesečnih ocena."}</div>`;

  const recognitionTarget = document.getElementById("employeeRecognitionRows");
  if (!recognitionTarget) return;
  const recognitions = (state.employeeRecognitions || [])
    .filter(selectedEmployeeFilter)
    .sort((a, b) => String(b.month).localeCompare(String(a.month)))
    .slice(0, 10);
  recognitionTarget.innerHTML = recognitions.length
    ? recognitions.map((item) => `<div class="setup-item recognition-row ${item.type === "Pohvala" ? "ok" : "warn"}"><strong>${item.type === "Pohvala" ? "+" : "→"}</strong><span>${item.month} · ${item.type} · ${item.author || "Admin"}<br />${item.text || item.message || "Bez poruke"}</span></div>`).join("")
    : `<div class="empty-state">${selectedEmployee ? `${selectedEmployee.name} trenutno nema unetih pohvala ili fokusa.` : "Nema unetih pohvala ili fokusa."}</div>`;
}

document.getElementById("employeeRatingForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  selectedEmployeeId = data.employeeId;
  state.employeeRatings = state.employeeRatings || [];
  state.employeeRatings.push({
    id: crypto.randomUUID(),
    employeeId: data.employeeId,
    month: data.month,
    source: data.source,
    reviewer: data.reviewer.trim(),
    score: Number(data.score),
    note: data.note.trim(),
    createdAt: new Date().toISOString(),
  });
  saveState();
  form.reset();
  form.elements.month.value = currentMonthKey();
  setSelectedEmployeeOnForms(selectedEmployeeId);
  renderAll();
});

document.getElementById("employeeGoalForm")?.addEventListener("submit", (event) => {
  const submitted = Object.fromEntries(new FormData(event.currentTarget));
  window.setTimeout(() => {
    const goal = [...(state.employeeGoals || [])].reverse().find((item) => item.employeeId === submitted.employeeId && item.title === submitted.title);
    if (!goal) return;
    goal.category = submitted.category || "Razvoj";
    if (goal.status === "Završeno" && !goal.completedDate) goal.completedDate = currentDateKey();
    saveState();
    renderAll();
  }, 0);
});

document.getElementById("employeeRecognitionForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  selectedEmployeeId = data.employeeId;
  state.employeeRecognitions = state.employeeRecognitions || [];
  state.employeeRecognitions.push({
    id: crypto.randomUUID(),
    employeeId: data.employeeId,
    month: data.month,
    type: data.type,
    author: data.author.trim() || "Admin",
    text: data.text.trim(),
    createdAt: new Date().toISOString(),
  });
  saveState();
  form.reset();
  form.elements.month.value = currentMonthKey();
  setSelectedEmployeeOnForms(selectedEmployeeId);
  renderAll();
});

function setupEmployeeAdminSections() {
  const monthFilter = document.getElementById("employeeMonthFilter");
  const root = monthFilter?.closest(".view");
  if (!root || root.dataset.sectionsReady) return;
  root.dataset.sectionsReady = "true";
  root.dataset.employeeSection = "overview";
  const simpleLabels = { admin: "Početna", clients: "Klijenti", employees: "Tim", calendar: "Kalendar", reports: "Finansije" };
  document.querySelectorAll(".sidebar .nav-item[data-view]").forEach((item) => {
    if (simpleLabels[item.dataset.view]) item.textContent = simpleLabels[item.dataset.view];
  });
  const employeeTitle = document.getElementById("pageTitle");
  if (employeeTitle) employeeTitle.textContent = "Tim";
  const mainNav = document.querySelector('.sidebar .nav-item[data-view="employees"]');

  const sections = [
    ["overview", "Tim"],
    ["entries", "Unosi rada"],
    ["leave", "Odmori i kalendar"],
    ["meetings", "1:1 sastanci"],
    ["performance", "Učinak i ciljevi"],
    ["activities", "Aktivnosti"],
    ["settings", "Podešavanja"],
  ];
  const sectionRoutes = {
    overview: "employees-overview.html",
    entries: "employees-hours.html",
    leave: "employees-absences.html",
    meetings: "employees-recognitions.html",
    performance: "employees-ratings.html",
    activities: "employees-goals.html",
    settings: "employees-settings.html",
  };
  const validSections = new Set(Object.keys(sectionRoutes));

  const classifyPanel = (panel) => {
    const heading = [...panel.querySelectorAll("h2, h3")].map((item) => item.textContent.trim().toLowerCase()).join(" ");
    const text = panel.textContent.toLowerCase();
    const result = new Set();
    if (/dodaj sate|sati zaposlenih|uneti sati|evidencija sati|radni sati/.test(heading)) result.add("entries");
    if (/dodaj kašnjenje/.test(heading)) result.add("entries");
    if (/dodaj odsustvo/.test(heading)) result.add("entries");
    if (/odmori za odobrenje|datumi, plan firme i odsustva tima|ko je na odmoru|odsustva po danima|lista odsustava/.test(heading)) result.add("leave");
    if (/beleške sa sastanka|1:1/.test(heading)) result.add("meetings");
    if (/učinak zaposlenog|mesečna ocena|pohvala ili fokus|motivacij|cilj zaposlenog|ciljevi razvoja|napredak|datumi i ciljevi za tim/.test(heading)) result.add("performance");
    if (/aktivnosti zaposlenih/.test(heading) || /admin definiše ponuđene aktivnosti/.test(text)) result.add("activities");
    if (/dodaj zaposlenog|izmeni zaposlenog|dokumenti|pristup|podešavanj/.test(heading) || panel.classList.contains("employee-detail-panel")) result.add("settings");
    if (result.size > 1) result.delete("overview");
    if (panel.classList.contains("employee-detail-panel")) result.add("overview");
    if (!result.size) result.add("overview");
    return [...result];
  };

  root.querySelectorAll(".panel").forEach((panel) => {
    panel.dataset.employeeSections = classifyPanel(panel).join(" ");
  });

  // Glavna navigacija ostaje kratka. Sve informacije o jednoj osobi
  // otvaraju se iz njenog dosijea, umesto kroz dodatni bočni podmeni.
  // Elementi postoje samo interno da ostatak rutiranja ostane kompatibilan.
  const mobileNav = document.createElement("nav");
  const sideNav = document.createElement("div");

  const activate = (section) => {
    if (!validSections.has(section)) section = "overview";
    root.dataset.employeeSection = section;
    root.querySelectorAll(".panel[data-employee-sections]").forEach((panel) => {
      panel.classList.toggle("employee-section-hidden", !panel.dataset.employeeSections.split(" ").includes(section));
    });
    document.querySelectorAll("[data-employee-admin-section]").forEach((button) => button.classList.toggle("active", button.dataset.employeeAdminSection === section));
    root.querySelectorAll(".employee-action-grid").forEach((grid) => grid.classList.toggle("employee-grid-empty", !grid.querySelector(".panel:not(.employee-section-hidden)")));
    root.querySelectorAll(".employee-section-heading").forEach((heading) => heading.classList.toggle("employee-section-hidden", section !== "performance"));
    const sectionLabel = sections.find(([key]) => key === section)?.[1] || "Pregled";
    const pageTitle = document.querySelector(".main .topbar h1");
    if (pageTitle) pageTitle.textContent = section === "overview" ? "Zaposleni" : sectionLabel;
    if (location.hash.startsWith("#employees")) history.replaceState(null, "", `#employees/${section}`);
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  window.activateEmployeeAdminSection = activate;

  document.querySelectorAll("[data-employee-admin-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.employeeAdminSection;
      const route = sectionRoutes[section];
      if (route && !location.pathname.endsWith(route)) {
        location.href = route;
        return;
      }
      if (mainNav && !mainNav.classList.contains("active")) mainNav.click();
      activate(section);
    });
  });
  const currentFile = location.pathname.replace(/\/+$/, "").split("/").pop().replace(/\.html$/, "");
  const routedSection = Object.entries(sectionRoutes).find(([, route]) => route.replace(/\.html$/, "") === currentFile)?.[0];
  if (routedSection) {
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    root.classList.add("active");
    document.querySelectorAll(".sidebar .nav-item").forEach((item) => item.classList.toggle("active", item === mainNav));
  }
  const requestedSection = routedSection || (location.hash.startsWith("#employees/") ? location.hash.split("/")[1] : "overview");
  const legacySections = { hours: "entries", absences: "leave", ratings: "performance", recognitions: "meetings", goals: "activities", development: "performance" };
  const initialSection = legacySections[requestedSection] || requestedSection;
  activate(sections.some(([key]) => key === initialSection) ? initialSection : "overview");

  window.addEventListener("hashchange", () => {
    if (!location.hash.startsWith("#employees/")) return;
    const nextSection = location.hash.split("/")[1];
    activate(validSections.has(nextSection) ? nextSection : "overview");
  });
}

setupEmployeeAdminSections();

function normalizeVisibleLayouts() {
  document.querySelectorAll("#employees .panel[hidden]").forEach((panel) => {
    panel.hidden = false;
  });

  document.querySelectorAll(".admin-layout").forEach((layout) => {
    const visiblePanels = [...layout.children].filter((panel) => {
      const style = getComputedStyle(panel);
      return !panel.hidden && style.display !== "none" && style.visibility !== "hidden";
    });
    layout.classList.toggle("single-visible", visiblePanels.length === 1);
  });
}

window.addEventListener("hashchange", () => setTimeout(normalizeVisibleLayouts, 0));
window.addEventListener("load", () => setTimeout(normalizeVisibleLayouts, 150));
new MutationObserver(() => requestAnimationFrame(normalizeVisibleLayouts)).observe(document.body, {
  childList: true,
  subtree: true
});

function buildStructuredSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const teamButton = sidebar?.querySelector('.nav-item[data-view="employees"]');
  if (!sidebar || !teamButton || sidebar.querySelector(".team-navigation")) return;

  const labels = {
    admin: "Početna",
    clients: "Klijenti",
    employees: "Tim",
    calendar: "Kalendar",
    reports: "Finansije"
  };
  sidebar.querySelectorAll(".nav-item[data-view]").forEach((item) => {
    if (labels[item.dataset.view]) item.textContent = labels[item.dataset.view];
  });

  const teamPages = [
    ["Pregled tima", "employees-overview.html", "overview"],
    ["Odmori i kalendar", "employees-absences.html", "leave"],
    ["1:1 sastanci", "employees-recognitions.html", "meetings"],
    ["Učinak i ciljevi", "employees-ratings.html", "performance"],
    ["Aktivnosti", "employees-goals.html", "activities"],
    ["Podešavanja", "employees-settings.html", "settings"]
  ];
  const navigation = document.createElement("nav");
  navigation.className = "team-navigation";
  navigation.setAttribute("aria-label", "Sekcije tima");
  navigation.innerHTML = `<span class="sidebar-section-label">Upravljanje timom</span>${teamPages
    .map(([label, href, section]) => `<a class="team-navigation-link" data-team-section="${section}" href="${href}">${label}</a>`)
    .join("")}`;
  teamButton.insertAdjacentElement("afterend", navigation);

  const workEntryNavigation = document.createElement("nav");
  workEntryNavigation.className = "work-entry-navigation";
  workEntryNavigation.setAttribute("aria-label", "Unosi rada");
  workEntryNavigation.innerHTML = `
    <span class="work-entry-navigation-title">Unosi rada</span>
    <a class="work-entry-navigation-link" data-work-entry-link="history" href="employees-hours.html#work/history">Sati zaposlenih</a>
    <a class="work-entry-navigation-link" data-work-entry-link="absence" href="employees-hours.html#work/absence">Dodaj odsustvo</a>
    <a class="work-entry-navigation-link" data-work-entry-link="hours" href="employees-hours.html#work/hours">Dodaj sate</a>
    <a class="work-entry-navigation-link" data-work-entry-link="late" href="employees-hours.html#work/late">Dodaj kašnjenje</a>
  `;
  navigation.insertAdjacentElement("afterend", workEntryNavigation);

  const syncActiveLink = () => {
    const current = location.hash || "#admin";
    const isWorkEntriesPage = /\/employees-hours(?:\.html)?\/?$/.test(location.pathname);
    const currentFile = location.pathname.replace(/\/+$/, "").split("/").pop().replace(/\.html$/, "");
    const fileSections = {
      "employees-overview": "overview",
      "employees-absences": "leave",
      "employees-recognitions": "meetings",
      "employees-ratings": "performance",
      "employees-goals": "activities",
      "employees-settings": "settings",
    };
    const currentTeamSection = fileSections[currentFile] || (current.startsWith("#employees/") ? current.split("/")[1] : "");
    navigation.querySelectorAll("a").forEach((link) => {
      link.classList.toggle("active", link.dataset.teamSection === currentTeamSection ||
        (current === "#employees" && link.dataset.teamSection === "overview"));
    });
    const workSection = location.hash.startsWith("#work/") ? location.hash.split("/")[1] : "hours";
    workEntryNavigation.classList.toggle("active", isWorkEntriesPage || current === "#employees/entries");
    workEntryNavigation.querySelectorAll("[data-work-entry-link]").forEach((link) => {
      link.classList.toggle("active", isWorkEntriesPage && link.dataset.workEntryLink === workSection);
    });
  };
  window.addEventListener("hashchange", syncActiveLink);
  syncActiveLink();
}

buildStructuredSidebar();

function setupWorkEntrySubsections() {
  if (!/\/employees-hours(?:\.html)?\/?$/.test(location.pathname)) return;
  const root = document.getElementById("employees");
  if (!root || root.dataset.workEntrySectionsReady) return;
  root.dataset.workEntrySectionsReady = "true";
  const sections = {
    history: { elementId: "employeeWorkRows", label: "Sati zaposlenih" },
    absence: { formId: "employeeAbsenceForm", label: "Dodaj odsustvo" },
    hours: { formId: "employeeWorkForm", label: "Dodaj sate" },
    late: { formId: "employeeLateForm", label: "Dodaj kašnjenje" },
  };

  Object.entries(sections).forEach(([key, config]) => {
    const panel = document.getElementById(config.formId || config.elementId)?.closest(".panel");
    if (panel) panel.dataset.workEntrySubsection = key;
  });
  root.querySelectorAll('.panel[data-employee-sections~="entries"]:not([data-work-entry-subsection])').forEach((panel) => {
    panel.dataset.workEntrySubsection = "other";
  });

  const activate = (requestedSection) => {
    const section = sections[requestedSection] ? requestedSection : "hours";
    root.dataset.workEntrySubsection = section;
    root.querySelectorAll("[data-work-entry-subsection]").forEach((panel) => {
      panel.classList.toggle("work-entry-subsection-hidden", panel.dataset.workEntrySubsection !== section);
    });
    root.querySelectorAll(".employee-action-grid").forEach((grid) => {
      const hasVisiblePanel = [...grid.querySelectorAll(":scope > .panel")].some((panel) =>
        !panel.classList.contains("employee-section-hidden") && !panel.classList.contains("work-entry-subsection-hidden"));
      grid.classList.toggle("work-entry-grid-empty", !hasVisiblePanel);
    });
    const pageTitle = document.querySelector(".main .topbar h1");
    if (pageTitle) pageTitle.textContent = sections[section].label;
    if (!location.hash.startsWith("#work/")) history.replaceState(null, "", `#work/${section}`);
  };

  const pageTitle = document.querySelector(".main .topbar h1");
  if (pageTitle) {
    new MutationObserver(() => {
      const section = root.dataset.workEntrySubsection || "hours";
      const expectedTitle = sections[section]?.label || sections.hours.label;
      if (pageTitle.textContent.trim() !== expectedTitle) pageTitle.textContent = expectedTitle;
    }).observe(pageTitle, { childList: true, characterData: true, subtree: true });
  }

  activate(location.hash.startsWith("#work/") ? location.hash.split("/")[1] : "hours");
  window.addEventListener("hashchange", () => {
    if (location.hash.startsWith("#work/")) activate(location.hash.split("/")[1]);
  });
}

setupWorkEntrySubsections();

function setupClientCostAnalysis() {
  const sidebar = document.querySelector(".sidebar .main-nav, .sidebar nav");
  const main = document.querySelector(".main");
  if (!sidebar || !main || document.getElementById("clientCosts")) return;

  const button = document.createElement("button");
  button.className = "nav-item client-cost-nav";
  button.type = "button";
  button.textContent = "Trošak klijenata";
  const financeButton = [...sidebar.querySelectorAll(".nav-item")].find((item) => /Finansije|Računi/.test(item.textContent));
  sidebar.insertBefore(button, financeButton || null);

  const view = document.createElement("section");
  view.className = "view client-cost-view";
  view.id = "clientCosts";
  view.innerHTML = `
    <div class="client-cost-header">
      <div><p class="eyebrow">Profitabilnost</p><h1>Trošak klijenata</h1><p>Koliko vremena i novca tim ulaže u svakog klijenta.</p></div>
    </div>
    <section class="panel client-cost-filters">
      <div class="panel-head"><div><p class="eyebrow">Filter</p><h2>Period i tim</h2></div><button class="secondary-button" id="clientCostReset" type="button">Reset</button></div>
      <div class="client-cost-presets"><button type="button" data-cost-period="day">Danas</button><button type="button" data-cost-period="week">Ova nedelja</button><button type="button" data-cost-period="month" class="active">Ovaj mesec</button></div>
      <div class="client-cost-filter-grid">
        <label>Od datuma<input id="clientCostFrom" type="date" /></label>
        <label>Do datuma<input id="clientCostTo" type="date" /></label>
        <label>Klijent<select id="clientCostClient"><option value="">Svi klijenti</option></select></label>
        <div class="client-cost-employee-picker"><label>Zaposleni <small>izaberi jednog ili više</small><input id="clientCostEmployeeSearch" type="search" placeholder="Pretraži zaposlene..." /></label><div class="client-cost-picker-actions"><button id="clientCostSelectAll" type="button">Izaberi sve</button><button id="clientCostClearEmployees" type="button">Poništi izbor</button></div><div class="client-cost-employee-list" id="clientCostEmployeeList"></div><select id="clientCostEmployees" multiple hidden></select></div>
      </div>
    </section>
    <section class="client-cost-kpis">
      <article><span>Ukupno vreme</span><strong id="clientCostHours">0h</strong></article>
      <article><span>Trošak rada</span><strong id="clientCostAmount">€ 0</strong></article>
      <article><span>Aktivnosti</span><strong id="clientCostEntries">0</strong></article>
      <article><span>Zaposlenih</span><strong id="clientCostPeople">0</strong></article>
    </section>
    <section class="panel client-cost-results"><div class="panel-head"><div><p class="eyebrow">Analiza</p><h2>Utrošak po klijentu i zaposlenom</h2></div><span id="clientCostRange"></span></div><div id="clientCostRows"></div></section>`;
  main.append(view);

  const from = view.querySelector("#clientCostFrom");
  const to = view.querySelector("#clientCostTo");
  const clientSelect = view.querySelector("#clientCostClient");
  const employeeSelect = view.querySelector("#clientCostEmployees");
  const employeeSearch = view.querySelector("#clientCostEmployeeSearch");
  const employeeList = view.querySelector("#clientCostEmployeeList");
  const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const setPeriod = (period) => {
    const end = new Date();
    const start = new Date(end);
    if (period === "week") start.setDate(end.getDate() - ((end.getDay() + 6) % 7));
    if (period === "month") start.setDate(1);
    from.value = localDate(start);
    to.value = localDate(end);
    view.querySelectorAll("[data-cost-period]").forEach((item) => item.classList.toggle("active", item.dataset.costPeriod === period));
  };
  const employeeName = (id) => (state.employees || []).find((item) => item.id === id)?.name || "Nepoznat zaposleni";
  const clientName = (log) => log.clientName || (state.clients || []).find((item) => item.id === log.clientId)?.name || "Bez klijenta";
  const hourlyRate = (employee) => Number(employee?.salary || 0) / Math.max(1, Number(employee?.weeklyHours || 40) * 52 / 12);
  const money = (amount) => `€ ${Math.round(amount).toLocaleString("de-DE")}`;
  const hours = (minutes) => `${(minutes / 60).toLocaleString("sr-RS", { maximumFractionDigits: 2 })}h`;

  const populate = () => {
    clientSelect.innerHTML = `<option value="">Svi aktivni klijenti</option>${(state.clients || []).filter((item) => item.status === "Aktivan").slice().sort((a,b) => a.name.localeCompare(b.name)).map((item) => `<option value="${item.id}">${item.name}</option>`).join("")}`;
    employeeSelect.innerHTML = (state.employees || []).filter((item) => item.status !== "Neaktivan").slice().sort((a,b) => a.name.localeCompare(b.name)).map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
    employeeList.innerHTML = [...employeeSelect.options].map((item) => `<label data-employee-name="${item.textContent.toLowerCase()}"><input type="checkbox" value="${item.value}" /><span>${item.textContent}</span></label>`).join("");
    employeeList.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => checkbox.addEventListener("change", () => {
      const option = [...employeeSelect.options].find((item) => item.value === checkbox.value);
      if (option) option.selected = checkbox.checked;
      render();
    }));
  };
  const render = () => {
    const selectedEmployees = new Set([...employeeSelect.selectedOptions].map((item) => item.value));
    const selectedClient = clientSelect.value;
    const logs = (state.employeeWorkLogs || state.employeeLogs || []).filter((log) => {
      const date = String(log.date || "").slice(0, 10);
      if (!date || date < from.value || date > to.value) return false;
      if (clientName(log) === "Bez klijenta") return false;
      if (selectedEmployees.size && !selectedEmployees.has(log.employeeId)) return false;
      if (selectedClient && log.clientId !== selectedClient) return false;
      return true;
    });
    const groups = new Map();
    let totalMinutes = 0;
    let totalCost = 0;
    logs.forEach((log) => {
      const minutes = Number(log.minutes || Math.round(Number(log.hours || 0) * 60) || 0);
      const employee = (state.employees || []).find((item) => item.id === log.employeeId);
      const cost = minutes / 60 * hourlyRate(employee);
      const client = clientName(log);
      const key = `${client}::${log.employeeId}`;
      const group = groups.get(key) || { client, employee: employeeName(log.employeeId), minutes: 0, cost: 0, entries: 0 };
      group.minutes += minutes; group.cost += cost; group.entries += 1; groups.set(key, group);
      totalMinutes += minutes; totalCost += cost;
    });
    const rows = [...groups.values()].sort((a,b) => b.cost - a.cost);
    view.querySelector("#clientCostHours").textContent = hours(totalMinutes);
    view.querySelector("#clientCostAmount").textContent = money(totalCost);
    view.querySelector("#clientCostEntries").textContent = logs.length;
    view.querySelector("#clientCostPeople").textContent = new Set(logs.map((item) => item.employeeId)).size;
    view.querySelector("#clientCostRange").textContent = `${from.value} – ${to.value}`;
    view.querySelector("#clientCostRows").innerHTML = rows.length ? `<div class="client-cost-table"><div class="client-cost-table-head"><span>Klijent</span><span>Zaposleni</span><span>Aktivnosti</span><span>Vreme</span><span>Trošak</span></div>${rows.map((row) => `<div class="client-cost-table-row"><strong>${row.client}</strong><span>${row.employee}</span><span>${row.entries}</span><span>${hours(row.minutes)}</span><strong>${money(row.cost)}</strong></div>`).join("")}</div>` : `<div class="empty-state">Nema upisanih aktivnosti za izabrane filtere.</div>`;
  };
  const show = () => {
    document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".sidebar .nav-item").forEach((item) => item.classList.remove("active"));
    view.classList.add("active"); button.classList.add("active");
    history.replaceState(null, "", "#client-costs");
    populate(); render();
  };
  button.addEventListener("click", show);
  view.querySelectorAll("[data-cost-period]").forEach((item) => item.addEventListener("click", () => { setPeriod(item.dataset.costPeriod); render(); }));
  [from, to, clientSelect, employeeSelect].forEach((item) => item.addEventListener("change", render));
  employeeSearch.addEventListener("input", () => { const query = employeeSearch.value.trim().toLowerCase(); employeeList.querySelectorAll("label").forEach((item) => item.hidden = Boolean(query) && !item.dataset.employeeName.includes(query)); });
  view.querySelector("#clientCostSelectAll").addEventListener("click", () => { employeeList.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach((item) => item.checked = true); [...employeeSelect.options].forEach((item) => item.selected = true); render(); });
  view.querySelector("#clientCostClearEmployees").addEventListener("click", () => { employeeList.querySelectorAll('input[type="checkbox"]').forEach((item) => item.checked = false); [...employeeSelect.options].forEach((item) => item.selected = false); render(); });
  view.querySelector("#clientCostReset").addEventListener("click", () => { clientSelect.value = ""; employeeSearch.value = ""; employeeList.querySelectorAll("label").forEach((item) => { item.hidden = false; item.querySelector("input").checked = false; }); [...employeeSelect.options].forEach((item) => item.selected = false); setPeriod("month"); render(); });
  setPeriod("month"); populate();
  if (location.hash === "#client-costs") show();
}

setupClientCostAnalysis();

function setupEmployeeActivityCategories() {
  const form = document.getElementById("employeeActivityForm");
  if (!form || form.dataset.categoriesReady) return;
  form.dataset.categoriesReady = "true";
  const submitArea = form.querySelector(".admin-submit") || form.lastElementChild;
  const field = document.createElement("label");
  field.className = "activity-category-field";
  field.innerHTML = `Kategorija aktivnosti
    <select id="employeeActivityCategory" required>
      <option value="">Izaberi kategoriju</option>
      <option>SMM</option><option>Scenario</option><option>Sastanci</option><option>Snimatelji</option><option>Sales tim</option><option>Editori</option><option>Media Buying</option>
      <option value="__new__">+ Nova kategorija</option>
    </select>
    <input id="employeeActivityNewCategory" type="text" placeholder="Naziv nove kategorije" hidden />`;
  form.insertBefore(field, submitArea);
  const select = field.querySelector("select");
  const newCategory = field.querySelector("input");
  (state.employeeActivityCategories || []).forEach((category) => {
    if ([...select.options].some((option) => option.value === category)) return;
    select.querySelector('option[value="__new__"]').insertAdjacentHTML("beforebegin", `<option>${category}</option>`);
  });
  select.addEventListener("change", () => {
    const creating = select.value === "__new__";
    newCategory.hidden = !creating;
    newCategory.required = creating;
    if (creating) newCategory.focus();
  });
  form.addEventListener("submit", () => {
    const nameInput = form.querySelector('input[name="name"], input[type="text"]');
    const name = nameInput?.value.trim();
    const category = select.value === "__new__" ? newCategory.value.trim() : select.value;
    if (!name || !category) return;
    state.employeeActivityCategoryMap = state.employeeActivityCategoryMap || {};
    state.employeeActivityCategoryMap[name] = category;
    if (!state.employeeActivityCategories?.includes(category)) {
      state.employeeActivityCategories = [...(state.employeeActivityCategories || []), category];
    }
    saveState();
  }, true);

  const decorate = () => {
    const list = document.getElementById("employeeActivityRows");
    if (!list) return;
    list.querySelectorAll(".setup-item").forEach((item) => {
      if (item.querySelector(".activity-category-badge")) return;
      const strong = item.querySelector("strong");
      const category = state.employeeActivityCategoryMap?.[strong?.textContent.trim()];
      if (!category || !strong) return;
      const badge = document.createElement("span");
      badge.className = "activity-category-badge";
      badge.textContent = category;
      strong.insertAdjacentElement("afterend", badge);
    });
  };
  new MutationObserver(decorate).observe(document.getElementById("employeeActivityRows") || form.parentElement, { childList: true, subtree: true });
  decorate();
}

setupEmployeeActivityCategories();

function setupExistingGoalProgressEditor() {
  const form = document.getElementById("employeeGoalForm");
  const employeeSelect = form?.elements?.employeeId;
  if (!form || !employeeSelect || document.getElementById("existingGoalProgressEditor")) return;
  const section = document.createElement("section");
  section.id = "existingGoalProgressEditor";
  section.className = "existing-goal-editor";
  form.insertAdjacentElement("afterend", section);
  const render = () => {
    const employeeId = employeeSelect.value;
    const employee = employeeById(employeeId);
    const goals = (state.employeeGoals || []).filter((goal) => goal.employeeId === employeeId).sort((a,b) => String(b.endDate || "").localeCompare(String(a.endDate || "")));
    section.innerHTML = `<div class="panel-head"><div><p class="eyebrow">Aktivni razvoj</p><h3>Postojeći ciljevi: ${employee?.name || "zaposleni"}</h3></div><span>${goals.length} ciljeva</span></div>${goals.length ? goals.map((goal) => `<div class="existing-goal-row" data-existing-goal-id="${goal.id}"><div><strong>${goal.title}</strong><span>${goal.target || "Bez opisa"} · rok ${formatDate(goal.endDate)}</span></div><div class="admin-goal-progress"><input type="range" min="0" max="100" step="5" value="${goal.progress || 0}" aria-label="Progres za ${goal.title}" /><output>${goal.progress || 0}%</output><button type="button">Sačuvaj progres</button></div></div>`).join("") : `<div class="empty-state">Ovaj zaposleni nema unetih ciljeva.</div>`}`;
    section.querySelectorAll("[data-existing-goal-id]").forEach((row) => {
      const slider = row.querySelector('input[type="range"]');
      const output = row.querySelector("output");
      slider.addEventListener("input", () => output.value = `${slider.value}%`);
      row.querySelector("button").addEventListener("click", () => {
        const goal = (state.employeeGoals || []).find((item) => item.id === row.dataset.existingGoalId);
        if (!goal) return;
        goal.progress = Number(slider.value);
        if (goal.progress >= 100) { goal.status = "Završeno"; goal.completedDate = goal.completedDate || currentDateKey(); }
        else if (goal.status === "Završeno") { goal.status = "U toku"; goal.completedDate = ""; }
        saveState();
        render();
        showToast("Progres sačuvan", `${employee?.name || "Zaposleni"}: ${goal.progress}%`, "ok");
      });
    });
  };
  employeeSelect.addEventListener("change", () => window.setTimeout(render, 0));
  new MutationObserver(render).observe(employeeSelect, { childList: true });
  window.renderExistingGoalProgressEditor = render;
  render();
}

setupExistingGoalProgressEditor();


function setupCompactClientFilters() {
  const root = document.getElementById("clients");
  if (!root || root.dataset.compactFiltersReady) return;
  root.dataset.compactFiltersReady = "true";
  const allButtons = [...root.querySelectorAll("button")];
  const countries = ["Svi", "Austrija", "Nemačka", "Srbija", "Hrvatska"];
  const statuses = ["Svi statusi", "Aktivni", "Neaktivni", "Arhivirani"];
  const countryButtons = allButtons.filter((button) => countries.includes(button.textContent.trim()));
  const statusButtons = allButtons.filter((button) => statuses.includes(button.textContent.trim()));
  const anchor = countryButtons[0]?.parentElement || statusButtons[0]?.parentElement;
  if (!anchor) return;
  [...countryButtons, ...statusButtons].forEach((button) => button.classList.add("legacy-client-filter"));
  const filters = document.createElement("div");
  filters.className = "compact-client-filters";
  filters.innerHTML = `
    <label><span>Država</span><select id="compactClientCountry">${countries.map((label) => `<option>${label}</option>`).join("")}</select></label>
    <label><span>Status</span><select id="compactClientStatus">${statuses.map((label) => `<option>${label}</option>`).join("")}</select></label>`;
  anchor.append(filters);
  filters.querySelector("#compactClientCountry").addEventListener("change", (event) => countryButtons.find((button) => button.textContent.trim() === event.target.value)?.click());
  filters.querySelector("#compactClientStatus").addEventListener("change", (event) => statusButtons.find((button) => button.textContent.trim() === event.target.value)?.click());
}

function hideJsonDownloadAction() {
  [...document.querySelectorAll(".top-actions button, .topbar button")]
    .filter((button) => button.textContent.trim() === "⇩")
    .forEach((button) => {
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
    });
}

setupCompactClientFilters();
hideJsonDownloadAction();

function renderEmployeeOneOnOneRows() {
  const rows = (state.employeeOneOnOnes || [])
    .filter(selectedEmployeeFilter)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);
  const target = document.getElementById("employeeOneOnOneRows");
  if (!target) return;
  target.innerHTML = rows.length
    ? rows
        .map((note) => {
          const employee = employeeById(note.employeeId);
          return `
          <div class="setup-item">
            <strong>1:1</strong>
            <span>${employee?.name || "Zaposleni"} · ${formatDate(note.date)}<br />${note.title}: ${note.note}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema 1:1 beleški.</div>`;
}

function renderCompanyPlanList() {
  const rows = (state.companyPlans || [])
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);
  const target = document.getElementById("companyPlanList");
  if (!target) return;
  target.innerHTML = rows.length
    ? rows
        .map(
          (plan) => `
          <div class="setup-item">
            <strong>${formatDate(plan.date).slice(0, 5)}</strong>
            <span>${plan.type} · ${plan.title}<br />${plan.note}</span>
          </div>`
        )
        .join("")
    : `<div class="empty-state">Nema unetog plana firme.</div>`;
}

function renderEmployeeReportRows(monthKey) {
  const rows = (state.employeeReports || [])
    .filter((report) => String(report.date || "").startsWith(monthKey))
    .filter(selectedEmployeeFilter)
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
    .map((report) => {
      const employee = employeeById(report.employeeId);
      const recipient = report.recipientId === "admin" || !report.recipientId ? "Admin" : employeeById(report.recipientId)?.name || "Lider";
      return `
      <tr>
        <td>${formatDate(report.date)}</td>
        <td>${employee?.name || "Zaposleni"}</td>
        <td>${recipient}</td>
        <td>${report.positive || ""}</td>
        <td>${report.negative || ""}</td>
        <td>${report.note || ""}</td>
      </tr>`;
    });
  setText("employeeOpsCount", `${rows.length} izveštaja`);
  const reportRows = document.getElementById("employeeReportRows");
  if (reportRows) reportRows.innerHTML = rows.join("") || `<tr><td colspan="6">Nema izveštaja za ovaj mesec.</td></tr>`;
}

function approveAbsence(id) {
  const absence = state.employeeAbsences.find((item) => item.id === id);
  if (!absence) return;
  absence.status = "Odobreno";
  absence.approvedAt = new Date().toISOString();
  absence.approvedBy = "Admin";
  state.notifications = (state.notifications || []).filter((item) => item.key !== `absence-request-${absence.id}`);
  const employee = employeeById(absence.employeeId);
  notifyOnce({
    key: `absence-approved-${absence.id}`,
    scope: "employee",
    targetId: absence.employeeId,
    type: "ok",
    title: "Odmor je odobren",
    message: `${absence.type} od ${formatDate(absence.startDate)} do ${formatDate(absence.endDate)} je odobren.`,
  });
  notifyOnce({
    key: `absence-approved-admin-${absence.id}`,
    scope: "admin",
    type: "ok",
    title: "Odmor odobren",
    message: `${employee?.name || "Zaposleni"} ima odobren ${absence.type} od ${formatDate(absence.startDate)} do ${formatDate(absence.endDate)}.`,
  });
  saveState();
  renderAll();
}

function renderEmployeeTeamTimeline(monthKey) {
  const target = document.getElementById("employeeTeamTimeline");
  if (!target) return;
  const plans = (state.companyPlans || [])
    .filter((plan) => String(plan.date || "").startsWith(monthKey))
    .map((plan) => ({
      date: plan.date,
      type: plan.type,
      title: plan.title,
      note: plan.note,
      className: "ok",
    }));
  const absences = (state.employeeAbsences || [])
    .filter((absence) => absence.status !== "Zatraženo")
    .filter((absence) => dateRangeKeys(absence.startDate, absence.endDate).some((day) => day.startsWith(monthKey)))
    .map((absence) => {
      const employee = employeeById(absence.employeeId);
      return {
        date: absence.startDate,
        type: absence.type,
        title: employee?.name || "Zaposleni",
        note: `${formatDate(absence.startDate)} - ${formatDate(absence.endDate)}${absence.note ? ` · ${absence.note}` : ""}`,
        className: absence.type === "Bolovanje" ? "danger" : "warn",
      };
    });
  const rows = [...plans, ...absences].sort((a, b) => new Date(a.date) - new Date(b.date));
  target.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
          <div class="setup-item alert-item ${row.className}">
            <strong>${formatDate(row.date).slice(0, 5)}</strong>
            <span>${row.type} · ${row.title}<br />${row.note || ""}</span>
          </div>`
        )
        .join("")
    : `<div class="empty-state">Nema unetih datuma ili odsustava za ovaj mesec.</div>`;
}

function calendarAbsences(monthKey, includeRequests = false) {
  return (state.employeeAbsences || []).filter((absence) => {
    if (absence.hidden) return false;
    if (!includeRequests && absence.status === "Zatraženo") return false;
    return dateRangeKeys(absence.startDate, absence.endDate).some((day) => day.startsWith(monthKey));
  });
}

function renderEmployeeCalendar(monthKey, employees, targetId = "employeeCalendar", summaryId = "employeeCalendarSummary", includeRequests = false) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const days = monthDayKeys(monthKey);
  const firstDay = parseDate(days[0]).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const blanks = Array.from({ length: offset }, () => `<div class="calendar-day empty"></div>`).join("");
  const monthAbsences = calendarAbsences(monthKey, includeRequests);
  const monthPlans = (state.companyPlans || []).filter((plan) => String(plan.date || "").startsWith(monthKey));
  setText(summaryId, `${monthLabel(monthKey)} · ${monthAbsences.length} odsustava · ${monthPlans.length} bitnih datuma`);
  target.innerHTML = `
    <div class="calendar-weekdays">
      <span>Pon</span><span>Uto</span><span>Sre</span><span>Čet</span><span>Pet</span><span>Sub</span><span>Ned</span>
    </div>
    <div class="calendar-grid">
      ${blanks}
      ${days
        .map((day) => {
          const holiday = publicHolidayName(day);
          const companyDay = companySpecialDayName(day);
          const absences = monthAbsences.filter((absence) => dateRangeKeys(absence.startDate, absence.endDate).includes(day));
          const plans = monthPlans.filter((plan) => plan.date === day);
          const classes = ["calendar-day"];
          if (isWeekend(day)) classes.push("weekend");
          if (holiday) classes.push("holiday");
          if (absences.length) classes.push("has-absence");
          const absentNames = absences.map((absence) => (employees.find((item) => item.id === absence.employeeId) || employeeById(absence.employeeId))?.name || "Zaposleni");
          return `
          <div class="${classes.join(" ")}" data-calendar-date="${day}" role="button" tabindex="0">
            <strong>${Number(day.slice(-2))}</strong>
            ${holiday ? `<span class="calendar-note holiday-note">${holiday}</span>` : ""}
            ${companyDay ? `<span class="calendar-note company-note">${companyDay}</span>` : ""}
            ${plans.length ? `<span class="calendar-note plan-note">${plans[0].title}${plans.length > 1 ? ` +${plans.length - 1}` : ""}</span>` : ""}
            ${absentNames.length ? `<span class="calendar-note vacation-note">${absentNames.slice(0, 2).join(", ")}${absentNames.length > 2 ? ` +${absentNames.length - 2}` : ""}</span>` : ""}
          </div>`;
        })
        .join("")}
    </div>`;
  target.querySelectorAll("[data-calendar-date]").forEach((cell) => {
    const showDetails = () => {
      const day = cell.dataset.calendarDate;
      const absences = monthAbsences.filter((absence) => dateRangeKeys(absence.startDate, absence.endDate).includes(day));
      const plans = monthPlans.filter((plan) => plan.date === day);
      if (!absences.length && !plans.length) return;
      const lines = [formatDate(day)];
      plans.forEach((plan) => lines.push(`Bitni datum: ${plan.title}${plan.note ? ` - ${plan.note}` : ""}`));
      absences.forEach((absence) => lines.push(`${employeeById(absence.employeeId)?.name || "Zaposleni"}: ${absence.type}${absence.status === "Zatraženo" ? " (zahtev)" : ""}`));
      alert(lines.join("\n"));
    };
    cell.addEventListener("click", showDetails);
    cell.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") showDetails(); });
  });
}

function renderAdminTeamCalendar() {
  const monthInput = document.getElementById("teamCalendarMonth");
  const statusInput = document.getElementById("teamCalendarStatus");
  if (!monthInput) return;
  const monthKey = monthInput.value || employeeMonthKey();
  if (!monthInput.value) monthInput.value = monthKey;
  const includeRequests = statusInput?.value === "all";
  renderEmployeeCalendar(monthKey, state.employees || [], "adminTeamCalendar", "adminTeamCalendarSummary", includeRequests);
  const absences = calendarAbsences(monthKey, includeRequests).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const hiddenAbsences = (state.employeeAbsences || [])
    .filter((absence) => absence.hidden)
    .filter((absence) => includeRequests || absence.status !== "Zatraženo")
    .filter((absence) => dateRangeKeys(absence.startDate, absence.endDate).some((day) => day.startsWith(monthKey)))
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  setText("adminTeamAbsenceCount", `${absences.length} unosa`);
  const target = document.getElementById("adminTeamAbsenceList");
  if (!target) return;
  target.innerHTML = absences.length
    ? absences
        .map((absence) => {
          const employee = employeeById(absence.employeeId);
          const days = workdayKeysBetween(absence.startDate, absence.endDate).length;
          return `
          <div class="setup-item alert-item ${absence.type === "Bolovanje" ? "danger" : absence.status === "Zatraženo" ? "warn" : "ok"}">
            <strong>${days}</strong>
            <span>${employee?.name || "Zaposleni"} · ${absence.type}<br />${formatDate(absence.startDate)} - ${formatDate(absence.endDate)} · ${absence.status || "Odobreno"}${absence.note ? ` · ${absence.note}` : ""}</span>
            <div class="notification-actions">
              <button class="mini-action" data-hide-absence="${absence.id}" type="button">Sakrij</button>
              <button class="mini-action danger-action" data-delete-absence="${absence.id}" type="button">Obriši</button>
            </div>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema vidljivih odsustava za izabrani mesec.</div>`;
  if (hiddenAbsences.length) {
    target.insertAdjacentHTML("beforeend", `<div class="notification-archive absence-archive">
      <strong>Sakrivena odsustva (${hiddenAbsences.length})</strong>
      ${hiddenAbsences.map((absence) => {
        const employee = employeeById(absence.employeeId);
        return `<div class="setup-item">
          <span>${employee?.name || "Zaposleni"} · ${absence.type}<br />${formatDate(absence.startDate)} - ${formatDate(absence.endDate)}</span>
          <div class="notification-actions">
            <button class="mini-action" data-unhide-absence="${absence.id}" type="button">Vrati</button>
            <button class="mini-action danger-action" data-delete-absence="${absence.id}" type="button">Obriši</button>
          </div>
        </div>`;
      }).join("")}
    </div>`);
  }
  target.querySelectorAll("[data-hide-absence]").forEach((button) => button.addEventListener("click", () => {
    const absence = state.employeeAbsences.find((item) => item.id === button.dataset.hideAbsence);
    if (!absence) return;
    absence.hidden = true;
    saveState();
    renderAll();
    showToast("Sakriveno", "Odsustvo je sklonjeno iz glavnog kalendara.", "info");
  }));
  target.querySelectorAll("[data-unhide-absence]").forEach((button) => button.addEventListener("click", () => {
    const absence = state.employeeAbsences.find((item) => item.id === button.dataset.unhideAbsence);
    if (!absence) return;
    absence.hidden = false;
    saveState();
    renderAll();
  }));
  target.querySelectorAll("[data-delete-absence]").forEach((button) => button.addEventListener("click", () => {
    const absence = state.employeeAbsences.find((item) => item.id === button.dataset.deleteAbsence);
    if (!absence || !confirm("Trajno obrisati ovo odsustvo iz evidencije?")) return;
    state.employeeAbsences = state.employeeAbsences.filter((item) => item.id !== absence.id);
    saveState();
    renderAll();
    showToast("Obrisano", "Odsustvo je uklonjeno iz evidencije.", "ok");
  }));
}

function renderClients() {
  const clients = state.clients.filter(
    (client) =>
      bySearch(client) &&
      (activeFilter === "all" || client.country === activeFilter) &&
      (activeStatusFilter === "all" || client.status === activeStatusFilter)
  );
  setText("clientRowsCount", `${clients.length} klijenata`);
  document.getElementById("clientCards").innerHTML = clients.length
    ? clients
        .map((client) => {
          const endDate = contractEndDate(client);
          const daysLeft = endDate ? daysBetween(currentDateKey(), endDate) : null;
          const contractLabel = endDate ? `do ${formatDate(endDate)}` : "nije unet";
          const contractDownload = client.contractFileData
            ? `<a class="document-link client-contract-download" href="${client.contractFileData}" download="${client.contractFileName || "ugovor"}">Preuzmi ugovor</a>`
            : `<span class="muted">Ugovor nije dodat</span>`;
          const leadStats = clientLeadStats(client);
          const leadClass = leadStats.late ? "danger" : leadStats.open ? "warn" : "ok";
          const archiveLabel = client.status === "Arhiviran" ? "Vrati" : "Arhiva";
          return `
          <tr>
            <td><strong>${client.name}</strong><br /><span>${client.niche} · ${client.country}</span></td>
            <td><strong>${displayPackage(client.package)}</strong><br /><span>${currency.format(client.revenue || 0)}/mes</span></td>
            <td>${formatDate(client.startDate)}<br /><span>${contractLabel}${daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 ? ` · ${daysLeft} dana` : ""}</span><br />${contractDownload}</td>
            <td><span class="status ${statusClass(client)}">${client.status || "Aktivan"}</span></td>
            <td><span class="status ${leadClass}">${leadStats.contacted}/${leadStats.total}</span><br /><span>${leadStats.open} nov · ${leadStats.late} kasni 48h</span></td>
            <td>${client.loginEmail || "Nije unet"}<br /><span>Šifra: ${client.loginPassword || "123456"}</span></td>
            <td>${client.contactName || "Nije unet"}<br /><span>${client.contactPhone || client.whatsapp || "Telefon nije unet"}</span></td>
            <td>
              <div class="row-actions">
                <button class="edit-button" data-edit-client="${client.id}" type="button" title="Izmeni klijenta">✎</button>
                <button class="edit-button" data-archive-client="${client.id}" type="button" title="${archiveLabel}">${client.status === "Arhiviran" ? "↺" : "A"}</button>
                <button class="edit-button danger-action" data-delete-client="${client.id}" type="button" title="Obriši klijenta">×</button>
              </div>
            </td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="8">Nema klijenata za izabrani filter.</td></tr>`;
  bindEditButtons();
}

function renderReports() {
  const clients = visibleClients();
  const monthKey = selectedMonthKey();
  const invoiceClients = financeClientsForMonth(clients, monthKey);
  const revenueByCountry = groupInvoiceSum(invoiceClients, "country", monthKey);
  const revenueByStatus = groupInvoiceSum(invoiceClients, "status", monthKey);
  renderBars("countryBars", revenueByCountry, "€");
  renderBars("revenueBars", revenueByStatus, "€");
  setText("invoiceMonthLabel", monthLabel(monthKey));
  renderInvoiceCarryover(clients, monthKey);
  renderInvoiceSummary(invoiceClients, monthKey);
  renderMonthlyInvoices(invoiceClients, monthKey);
}

function selectedPortalClient() {
  let client = state.clients.find((item) => item.id === selectedPortalClientId);
  if (!client) {
    client = state.clients[0];
    selectedPortalClientId = client?.id || "";
  }
  return client;
}

function portalClientLeads() {
  const client = selectedPortalClient();
  if (!client) return [];
  return state.leads.filter((lead) => lead.client === client.name);
}

function portalClientTeam() {
  const client = selectedPortalClient();
  if (!client) return [];
  return state.teamMembers.filter((member) => member.client === client.name);
}

function renderClientPortal() {
  renderPortalClientOptions();
  const client = selectedPortalClient();
  if (!client) return;
  const leads = portalClientLeads();
  const team = portalClientTeam();
  const won = leads.filter((lead) => isWonClientLeadStatus(lead.status));
  const open = leads.filter((lead) => isOpenClientLeadStatus(lead.status));
  const conversion = leads.length ? Math.round((won.length / leads.length) * 100) : 0;

  setText("portalClientName", client.name);
  setText("portalTotalLeads", leads.length);
  setText("portalWonLeads", won.length);
  setText("portalOpenLeads", open.length);
  setText("portalConversion", `${conversion}%`);
  setText("portalActionCount", `${open.length} otvoreno`);
  setText("portalTeamCount", `${team.length} osoba`);

  renderBars("portalStatusBars", groupCount(leads, "status"), "");
  renderBars("portalSourceBars", groupCount(leads, "source"), "");
  renderPortalActions(open);
  renderPortalLeads(leads);
  renderPortalTeam(team);
  renderPortalResponsibleOptions(team);
}

function renderPortalClientOptions() {
  const select = document.getElementById("portalClientSelect");
  if (!select) return;
  select.innerHTML = state.clients
    .map((client) => `<option value="${client.id}" ${client.id === selectedPortalClientId ? "selected" : ""}>${client.name}</option>`)
    .join("");
}

function renderPortalResponsibleOptions(team) {
  const select = document.getElementById("portalLeadResponsible");
  if (!select) return;
  const options = team.length ? team.map((member) => member.name) : ["Vlasnik", "Recepcija", "Prodaja"];
  select.innerHTML = options.map((name) => `<option>${name}</option>`).join("");
}

function renderPortalActions(leads) {
  document.getElementById("portalActionList").innerHTML = leads.length
    ? leads
        .slice(0, 5)
        .map(
          (lead) => `
          <div class="portal-row">
            <div><strong>${lead.name}</strong><span>${lead.phone} · ${lead.source || "Izvor nije unet"} · ${lead.nextAction || "Pozvati u roku od 1 radnog dana"}</span></div>
            <a class="call-button" href="tel:${normalizePhone(lead.phone)}">Pozovi</a>
          </div>`
        )
        .join("")
    : `<div class="empty-state">Nema otvorenih leadova.</div>`;
}

function renderPortalLeads(leads) {
  document.getElementById("portalLeadCards").innerHTML = leads.length
    ? leads
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((lead) => {
          const phone = normalizePhone(lead.phone);
          const leadDate = new Date(lead.createdAt).toLocaleDateString("sr-Latn-RS");
          return `
          <article class="lead-card portal-lead-card">
            <header>
              <div>
                <h3>${lead.name}</h3>
                <p>${lead.service || "Tip usluge nije unet"} · ${lead.location || "Lokacija nije uneta"}</p>
              </div>
              <span class="status ${portalLeadStatusClass(lead.status)}">${normalizeLeadStatus(lead.status)}</span>
            </header>
            <div class="lead-details">
              <span>ID ${lead.id.slice(0, 8)}</span>
              <span>${leadDate}</span>
              <span>${lead.source || "Bez izvora"}</span>
              <span>${currency.format(Number(lead.estimate || 0))}</span>
              <span>${lead.responsible || "Nije dodeljeno"}</span>
            </div>
            <p>${lead.note || "Bez napomene."}</p>
            ${lead.lossReason ? `<p><strong>Razlog gubitka:</strong> ${lead.lossReason}</p>` : ""}
            <div class="lead-actions">
              <a class="call-button" href="tel:${phone}">Pozovi</a>
              <button class="secondary-button portal-lead-status" data-lead-id="${lead.id}" data-status="Kontaktiran" type="button">Kontaktiran</button>
              <button class="secondary-button portal-lead-status" data-lead-id="${lead.id}" data-status="Zakazan" type="button">Zakazan</button>
              <button class="secondary-button portal-lead-status" data-lead-id="${lead.id}" data-status="Dobijen" type="button">Dobijen</button>
              <button class="secondary-button portal-lead-status" data-lead-id="${lead.id}" data-status="Izgubljen" type="button">Izgubljen</button>
            </div>
          </article>`;
        })
        .join("")
    : `<section class="panel empty-state">Još nema leadova za ovog klijenta.</section>`;

  document.querySelectorAll(".portal-lead-status").forEach((button) => {
    button.addEventListener("click", () => updateLeadStatus(button.dataset.leadId, button.dataset.status));
  });
}

function renderPortalTeam(team) {
  document.getElementById("portalTeamList").innerHTML = team.length
    ? team
        .map(
          (member) => `
          <div class="setup-item">
            <strong>${member.name.slice(0, 1).toUpperCase()}</strong>
            <span>${member.name} · ${member.role}<br />${member.phone || "Telefon nije unet"} ${member.email ? `· ${member.email}` : ""}</span>
          </div>`
        )
        .join("")
    : `<div class="empty-state">Dodaj prvu osobu koja će zvati leadove.</div>`;
}

function portalLeadStatusClass(status) {
  const normalized = normalizeLeadStatus(status);
  if (normalized === "Dobijen") return "ok";
  if (normalized === "Novi" || normalized === "Izgubljen") return "danger";
  return "warn";
}

function groupCount(items, key) {
  return items.reduce((acc, item) => {
    const label = item[key] || "Nije uneto";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

function renderLeadCrm() {
  const leads = state.leads
    .filter((lead) => isLeadVisibleByFilter(lead) && bySearch(lead))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const newLeads = state.leads.filter((lead) => lead.status === "Novi");
  const riskyLeads = newLeads.filter((lead) => leadHoursLeft(lead) <= 4);
  const calledLeads = state.leads.filter((lead) => lead.calledAt);
  const avgResponse = calledLeads.length
    ? calledLeads.reduce((sum, lead) => sum + (new Date(lead.calledAt) - new Date(lead.createdAt)) / 36e5, 0) / calledLeads.length
    : 0;

  setText("newLeadCount", newLeads.length);
  setText("slaRiskCount", riskyLeads.length);
  setText("avgResponseTime", `${avgResponse.toFixed(1)}h`);

  document.getElementById("leadCards").innerHTML = leads
    .map((lead) => {
      const phone = normalizePhone(lead.phone);
      const whatsappText = encodeURIComponent(`Novi lead za ${lead.client}: ${lead.name}, ${lead.phone}, usluga: ${lead.service}.`);
      return `
      <article class="lead-card">
        <header>
          <div>
            <h3>${lead.name}</h3>
            <p>${lead.client} · ${lead.service}</p>
          </div>
          <span class="status ${leadSlaClass(lead)}">${leadSlaLabel(lead)}</span>
        </header>
        <div class="lead-details">
          <span>${lead.source}</span>
          <span>${new Date(lead.createdAt).toLocaleString("sr-Latn-RS", { dateStyle: "short", timeStyle: "short" })}</span>
          <span>${lead.priority} prioritet</span>
        </div>
        <p>${lead.note || "Bez napomene."}</p>
        <div class="lead-actions">
          <a class="call-button" href="tel:${phone}">Pozovi</a>
          <a class="whatsapp-button" href="https://wa.me/${phone.replace("+", "")}?text=${whatsappText}" target="_blank" rel="noreferrer">WhatsApp</a>
          <button class="secondary-button lead-status-btn" data-lead-id="${lead.id}" data-status="Kontaktiran" type="button">Kontaktiran</button>
          <button class="secondary-button lead-status-btn" data-lead-id="${lead.id}" data-status="Zakazan" type="button">Zakazan</button>
          <button class="secondary-button lead-status-btn" data-lead-id="${lead.id}" data-status="Dobijen" type="button">Dobijen</button>
          <button class="secondary-button lead-status-btn" data-lead-id="${lead.id}" data-status="Izgubljen" type="button">Izgubljen</button>
        </div>
      </article>`;
    })
    .join("");

  document.querySelectorAll(".lead-status-btn").forEach((button) => {
    button.addEventListener("click", () => {
      updateLeadStatus(button.dataset.leadId, button.dataset.status);
    });
  });
}

function groupSum(items, key, value) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + Number(item[value]);
    return acc;
  }, {});
}

function renderBars(target, data, suffix) {
  const targetElement = document.getElementById(target);
  if (!targetElement) return;
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  targetElement.innerHTML = entries
    .map(([label, value]) => {
      const display = suffix === "€" ? currency.format(value) : value;
      return `
      <div class="bar-row">
        <label><span>${label}</span><span>${display}</span></label>
        <div class="bar-track"><span style="width:${(value / max) * 100}%"></span></div>
      </div>`;
    })
    .join("");
}

function setText(id, value) {
  const target = document.getElementById(id);
  if (target) target.textContent = value;
}

function renderAll() {
  const notificationCount = (state.notifications || []).length;
  generateSystemNotifications();
  if ((state.notifications || []).length !== notificationCount) saveState();
  renderAdminPanel();
  if (document.getElementById("clientCards")) renderClients();
  if (document.getElementById("leadCards")) renderLeadCrm();
  if (document.getElementById("employees")) renderEmployees();
  if (document.getElementById("adminTeamCalendar")) renderAdminTeamCalendar();
  if (document.getElementById("countryBars")) renderReports();
  if (document.getElementById("clientPortal")) renderClientPortal();
  renderLeadClientOptions();
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    const viewName = button.dataset.view;
    const currentFile = location.pathname.split("/").pop().replace(/\.html$/, "");
    if (currentFile.startsWith("employees-") && viewName !== "employees") {
      location.href = `index.html#${viewName}`;
      return;
    }
    setActiveView(viewName, true);
  });
});

function setActiveView(viewName, updateUrl = false) {
  const button = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  const view = document.getElementById(viewName);
  if (!button || !view) return;
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  view.classList.add("active");
  document.body.dataset.activeView = viewName;
  if (viewName === "admin") {
    monthFilter = currentMonthKey();
    const dashboardMonth = document.getElementById("monthFilter");
    const invoiceMonth = document.getElementById("invoiceMonthFilter");
    if (dashboardMonth) dashboardMonth.value = monthFilter;
    if (invoiceMonth) invoiceMonth.value = monthFilter;
  }
  setText("pageTitle", button.textContent);
  updateContextActions(viewName);
  if (updateUrl && !location.pathname.split("/").pop().startsWith("employees-")) {
    history.replaceState(null, "", `#${viewName}`);
  }
}

function activateMainRoute() {
  const currentFile = location.pathname.split("/").pop().replace(/\.html$/, "");
  if (currentFile.startsWith("employees-")) {
    setActiveView("employees");
    return;
  }
  const requested = location.hash.replace(/^#/, "").split("/")[0];
  const valid = requested && document.getElementById(requested) && document.querySelector(`.nav-item[data-view="${requested}"]`);
  setActiveView(valid ? requested : "admin");
}

activateMainRoute();
window.addEventListener("hashchange", activateMainRoute);

function updateContextActions(view) {
  const leadButton = document.getElementById("openLeadModal");
  if (leadButton) leadButton.hidden = view !== "leadCrm";
}

document.querySelectorAll(".chip").forEach((button) => {
  button.addEventListener("click", () => {
    if (!button.dataset.filter) return;
    document.querySelectorAll(".chip[data-filter]").forEach((chip) => chip.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderClients();
  });
});

document.querySelectorAll(".chip[data-status-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".chip[data-status-filter]").forEach((chip) => chip.classList.remove("active"));
    button.classList.add("active");
    activeStatusFilter = button.dataset.statusFilter || "all";
    renderClients();
  });
});

document.querySelectorAll(".lead-filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".lead-filter").forEach((chip) => chip.classList.remove("active"));
    button.classList.add("active");
    activeLeadFilter = button.dataset.leadFilter;
    renderLeadCrm();
  });
});

document.querySelectorAll(".portal-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".portal-tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".portal-view").forEach((view) => view.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.portalTab)?.classList.add("active");
  });
});

document.getElementById("portalClientSelect")?.addEventListener("change", (event) => {
  selectedPortalClientId = event.target.value;
  renderClientPortal();
});

document.getElementById("togglePortalLeadForm")?.addEventListener("click", () => {
  const panel = document.getElementById("portalLeadPanel");
  if (!panel) return;
  panel.hidden = !panel.hidden;
  if (!panel.hidden) panel.querySelector("input")?.focus();
});

document.getElementById("searchInput").addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  renderAll();
});

document.getElementById("monthFilter")?.addEventListener("input", (event) => {
  monthFilter = event.target.value;
  const invoiceMonth = document.getElementById("invoiceMonthFilter");
  if (invoiceMonth) invoiceMonth.value = monthFilter || currentMonthKey();
  renderAll();
});

document.getElementById("dateFromFilter")?.addEventListener("input", (event) => {
  dateFromFilter = event.target.value;
  renderAll();
});

document.getElementById("dateToFilter")?.addEventListener("input", (event) => {
  dateToFilter = event.target.value;
  renderAll();
});

document.getElementById("countryFilter")?.addEventListener("change", (event) => {
  countryFilter = event.target.value;
  renderAll();
});

document.getElementById("resetFiltersBtn")?.addEventListener("click", () => {
  monthFilter = "";
  dateFromFilter = "";
  dateToFilter = "";
  countryFilter = "all";
  document.getElementById("monthFilter").value = "";
  const invoiceMonth = document.getElementById("invoiceMonthFilter");
  if (invoiceMonth) invoiceMonth.value = currentMonthKey();
  document.getElementById("dateFromFilter").value = "";
  document.getElementById("dateToFilter").value = "";
  document.getElementById("countryFilter").value = "all";
  renderAll();
});

["monthFilter", "dateFromFilter", "dateToFilter"].forEach((id) => {
  const input = document.getElementById(id);
  input?.addEventListener("click", () => input.showPicker?.());
});

document.querySelectorAll('input[type="date"], input[type="month"]').forEach((input) => {
  input.addEventListener("click", () => input.showPicker?.());
});

document.getElementById("employeeForm")?.addEventListener("input", (event) => {
  if (["weeklyHours", "startDate"].includes(event.target.name)) updateEmployeeMonthlyPreview();
});

window.addEventListener("storage", (event) => {
  if (event.key !== "agencyCrmData") return;
  state = loadState();
  renderAll();
});

document.getElementById("employeeMonthFilter")?.addEventListener("input", (event) => {
  employeeMonthFilter = event.target.value || currentMonthKey();
  renderAll();
  updateEmployeeMonthlyPreview();
});

document.getElementById("employeeStatusFilter")?.addEventListener("change", (event) => {
  employeeStatusFilter = event.target.value;
  renderAll();
});

document.getElementById("employeeWorkPersonFilter")?.addEventListener("change", (event) => {
  employeeWorkPersonFilter = event.target.value;
  renderEmployeeWorkRows(employeeMonthKey());
});

document.getElementById("employeeWorkMonthFilter")?.addEventListener("input", (event) => {
  employeeWorkMonthFilter = event.target.value || employeeMonthKey();
  renderEmployeeWorkRows(employeeMonthKey());
});

document.getElementById("resetEmployeeWorkFilters")?.addEventListener("click", () => {
  employeeWorkPersonFilter = "all";
  employeeWorkMonthFilter = employeeMonthKey();
  renderEmployeeWorkRows(employeeMonthKey());
});

document.getElementById("teamCalendarMonth")?.addEventListener("input", () => {
  renderAll();
});

document.getElementById("teamCalendarStatus")?.addEventListener("change", () => {
  renderAll();
});

document.getElementById("newEmployeeBtn")?.addEventListener("click", () => {
  window.location.hash = "employees/overview";
  setActiveView("employees");
  window.setTimeout(() => {
    showEmployeeProfileForm();
  }, 0);
});

document.getElementById("manageSelectedEmployeeBtn")?.addEventListener("click", () => {
  const employee = selectedEmployee();
  if (!employee) {
    alert("Prvo izaberi zaposlenog iz pregleda.");
    return;
  }
  showEmployeeProfileForm(employee);
});

document.getElementById("editSelectedEmployeeBtn")?.addEventListener("click", () => {
  const employee = selectedEmployee();
  if (!employee) return;
  showEmployeeProfileForm(employee);
});

document.getElementById("deleteSelectedEmployeeBtn")?.addEventListener("click", () => {
  const employee = selectedEmployee();
  if (!employee) return;
  deleteEmployee(employee.id);
});

document.getElementById("cancelEmployeeEditBtn")?.addEventListener("click", () => {
  hideEmployeeProfileForm();
});

document.querySelectorAll("[data-go-view]").forEach((element) => {
  element.addEventListener("click", () => setActiveView(element.dataset.goView));
});

document.addEventListener("click", (event) => {
  const shortcut = event.target.closest("[data-go-view]");
  if (!shortcut) return;
  if (shortcut.dataset.selectShortcutEmployee) selectedEmployeeId = shortcut.dataset.selectShortcutEmployee;
  setActiveView(shortcut.dataset.goView);
  renderAll();
});

document.getElementById("employeeForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const id = String(formData.get("id") || "");
  const payload = {
    name,
    email: String(formData.get("email") || `${loginSlug(name)}@marketizo.local`).trim().toLowerCase(),
    password: String(formData.get("password") || "123456").trim(),
    position: formData.get("position"),
    startDate: formData.get("startDate"),
    salary: parseNumber(formData.get("salary"), 0),
    weeklyHours: parseNumber(formData.get("weeklyHours"), 40),
    openingHourBalance: parseNumber(formData.get("openingHourBalance"), 0),
    openingBalanceMonth: formData.get("openingBalanceMonth") || shiftMonth(currentMonthKey(), -1),
    isLeader: Boolean(form.elements.isLeader?.checked),
    leaderId: formData.get("leaderId") || "",
    vacationDays: parseNumber(formData.get("vacationDays"), 26),
    openingVacationUsed: parseNumber(formData.get("openingVacationUsed"), 0),
    giftDays: parseNumber(formData.get("giftDays"), 1),
    status: ["Aktivan", "Pauza", "Neaktivan"].includes(formData.get("status")) ? formData.get("status") : "Aktivan",
  };
  if (payload.leaderId === id) payload.leaderId = "";
  if (id) {
    const employee = state.employees.find((item) => item.id === id);
    if (!employee) return;
    Object.assign(employee, payload);
    if (!employee.isLeader) {
      state.employees.forEach((item) => {
        if (item.leaderId === employee.id) item.leaderId = "";
      });
    }
    selectedEmployeeId = employee.id;
  } else {
    const employee = { id: crypto.randomUUID(), ...payload };
    state.employees.unshift(employee);
    selectedEmployeeId = employee.id;
  }
  saveState();
  event.currentTarget.reset();
  event.currentTarget.elements.id.value = "";
  event.currentTarget.elements.password.value = "123456";
  event.currentTarget.elements.weeklyHours.value = 40;
  event.currentTarget.elements.openingHourBalance.value = 0;
  event.currentTarget.elements.openingBalanceMonth.value = shiftMonth(currentMonthKey(), -1);
  event.currentTarget.elements.isLeader.checked = false;
  event.currentTarget.elements.leaderId.value = "";
  event.currentTarget.elements.vacationDays.value = 26;
  event.currentTarget.elements.openingVacationUsed.value = 0;
  event.currentTarget.elements.giftDays.value = 1;
  hideEmployeeProfileForm();
  renderAll();
  showToast("Sačuvano", `${name} je sačuvan u zaposlenima.`, "ok");
});

document.getElementById("employeeAbsenceForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || startDate);
  const employeeId = formData.get("employeeId");
  if (!employeeId) {
    alert("Izaberi zaposlenog za ovaj unos.");
    return;
  }
  const absence = {
    id: crypto.randomUUID(),
    employeeId,
    type: formData.get("type"),
    startDate: startDate <= endDate ? startDate : endDate,
    endDate: endDate >= startDate ? endDate : startDate,
    note: formData.get("note"),
    status: "Odobreno",
    approvedAt: new Date().toISOString(),
    approvedBy: "Admin",
  };
  state.employeeAbsences.unshift(absence);
  selectedEmployeeId = employeeId;
  notifyOnce({
    key: `absence-admin-added-${absence.id}`,
    scope: "employee",
    targetId: employeeId,
    type: "ok",
    title: "Odsustvo je upisano",
    message: `${absence.type} od ${formatDate(absence.startDate)} do ${formatDate(absence.endDate)} je upisan u kalendar.`,
  });
  saveState();
  event.currentTarget.reset();
  renderAll();
  showToast("Sačuvano", "Odsustvo je upisano i zaposlenom je poslato obaveštenje.", "ok");
});

document.getElementById("employeeWorkForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const employeeId = formData.get("employeeId");
  const date = formData.get("date");
  const activity = (state.employeeActivities || []).find((item) => item.id === formData.get("activityId"));
  const minutes = Math.max(1, parseNumber(formData.get("minutes"), 0));
  if (!employeeId) {
    alert("Izaberi zaposlenog za ovaj unos.");
    return;
  }
  if (!activity) {
    alert("Izaberi aktivnost. Admin mora prvo da doda ponuđene aktivnosti.");
    return;
  }
  state.employeeWorkLogs.unshift({
    id: crypto.randomUUID(),
    employeeId,
    date,
    hours: Math.round((minutes / 60) * 10000) / 10000,
    minutes,
    activityId: activity.id,
    activityName: activity.name,
    type: "Rad",
    note: formData.get("note"),
    locked: true,
    submittedAt: new Date().toISOString(),
  });
  selectedEmployeeId = employeeId;
  saveState();
  const employee = state.employees.find((item) => item.id === employeeId);
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
  const fullTimeTarget = dayOfWeek >= 1 && dayOfWeek <= 4 ? 480 : dayOfWeek === 5 ? 390 : 0;
  const weeklyHours = Number(employee?.weeklyHours || 0);
  const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isCameraperson = String(employee?.position || "").toLowerCase().includes("snimatelj");
  const dailyTarget = isCameraperson
    ? 0
    : weeklyHours === 20
      ? (isWorkingDay ? 240 : 0)
      : weeklyHours === 38.5
        ? fullTimeTarget
        : (isWorkingDay ? Math.round((weeklyHours * 60) / 5) : 0);
  const dailyMinutes = state.employeeWorkLogs
    .filter((item) => item.employeeId === employeeId && item.date === date)
    .reduce((sum, item) => sum + Number(item.minutes || Math.round(Number(item.hours || 0) * 60)), 0);
  if (dailyTarget > 0 && dailyMinutes < dailyTarget) {
    alert(`Aktivnost je sačuvana. Danas je upisano ${dailyMinutes} min. Nedostaje još ${dailyTarget - dailyMinutes} min aktivnosti do dnevne kvote od ${dailyTarget} min.`);
  } else if (dailyTarget > 0) {
    alert(`Aktivnost je sačuvana. Dnevna kvota je ispunjena: ${dailyMinutes}/${dailyTarget} min.`);
  }
  event.currentTarget.reset();
  event.currentTarget.elements.date.value = currentDateKey();
  event.currentTarget.elements.minutes.value = 60;
  renderAll();
  showToast("Sačuvano", "Sati su upisani za izabranog zaposlenog.", "ok");
});

document.getElementById("employeeActivityForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = String(new FormData(event.currentTarget).get("activityName") || "").trim();
  if (!name) return;
  state.employeeActivities = state.employeeActivities || [];
  if (state.employeeActivities.some((activity) => activity.name.toLowerCase() === name.toLowerCase())) {
    alert("Aktivnost sa tim nazivom već postoji.");
    return;
  }
  state.employeeActivities.push({ id: crypto.randomUUID(), name, category: "Ostalo", active: true });
  saveState();
  event.currentTarget.reset();
  renderAll();
  showToast("Sačuvano", "Aktivnost je dostupna zaposlenima.", "ok");
});

document.getElementById("employeeLateForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const employeeId = formData.get("employeeId");
  if (!employeeId) {
    alert("Izaberi zaposlenog za ovaj unos.");
    return;
  }
  const minutes = parseNumber(formData.get("minutes"), 0);
  const penaltyMinutes = Math.max(15, minutes);
  const record = {
    id: crypto.randomUUID(),
    employeeId,
    date: formData.get("date"),
    minutes,
    penaltyMinutes,
    reason: formData.get("reason"),
    acknowledgedAt: "",
    createdAt: new Date().toISOString(),
  };
  state.employeeLateRecords.unshift(record);
  selectedEmployeeId = employeeId;
  notifyOnce({
    key: `late-record-${record.id}`,
    scope: "employee",
    targetId: record.employeeId,
    type: "warn",
    title: "Upisano kašnjenje",
    message: `${record.minutes} minuta · odbija se ${record.penaltyMinutes} minuta · ${formatDate(record.date)} · ${record.reason}. Potvrdi u dashboardu.`,
  });
  saveState();
  event.currentTarget.reset();
  event.currentTarget.elements.date.value = currentDateKey();
  event.currentTarget.elements.minutes.value = 10;
  renderAll();
  showToast("Sačuvano", `Kašnjenje je upisano. Odbija se ${penaltyMinutes} minuta.`, "warn");
});

document.getElementById("employeeGoalForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const employeeId = formData.get("employeeId");
  if (!employeeId) {
    alert("Izaberi zaposlenog za ovaj unos.");
    return;
  }
  const title = String(formData.get("title") || "").trim();
  const duplicate = (state.employeeGoals || []).some((item) => item.employeeId === employeeId && String(item.title || "").trim().toLowerCase() === title.toLowerCase() && item.startDate === formData.get("startDate") && item.endDate === formData.get("endDate"));
  if (duplicate) {
    showToast("Već postoji", "Isti cilj je već dodat zaposlenom.", "warn");
    return;
  }
  const goal = {
    id: crypto.randomUUID(),
    employeeId,
    title,
    target: formData.get("target"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    progress: Number(formData.get("progress") || 0),
    status: formData.get("status"),
    note: "",
  };
  state.employeeGoals.unshift(goal);
  selectedEmployeeId = employeeId;
  notifyOnce({
    key: `goal-created-${goal.id}`,
    scope: "employee",
    targetId: goal.employeeId,
    type: "info",
    title: "Dodat ti je cilj",
    message: `${goal.title}: ${goal.target || "bez dodatnog opisa"} · rok ${formatDate(goal.endDate)}.`,
  });
  saveState();
  event.currentTarget.reset();
  event.currentTarget.elements.startDate.value = currentDateKey();
  event.currentTarget.elements.endDate.value = currentDateKey();
  event.currentTarget.elements.progress.value = 0;
  renderAll();
  showToast("Sačuvano", "Cilj je dodat zaposlenom.", "ok");
});

document.getElementById("employeeOneOnOneForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const employeeId = formData.get("employeeId");
  if (!employeeId) {
    alert("Izaberi zaposlenog za ovaj unos.");
    return;
  }
  const note = {
    id: crypto.randomUUID(),
    employeeId,
    date: formData.get("date"),
    title: formData.get("title"),
    note: formData.get("note"),
    createdBy: "Admin",
    visibleToEmployee: true,
  };
  state.employeeOneOnOnes.unshift(note);
  selectedEmployeeId = employeeId;
  notifyOnce({
    key: `one-on-one-${note.id}`,
    scope: "employee",
    targetId: note.employeeId,
    type: "info",
    title: "Nova 1:1 beleška",
    message: `${note.title} · ${formatDate(note.date)}`,
  });
  saveState();
  event.currentTarget.reset();
  event.currentTarget.elements.date.value = currentDateKey();
  renderAll();
  showToast("Sačuvano", "1:1 beleška je sačuvana.", "ok");
});

document.getElementById("companyPlanForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const plan = {
    id: crypto.randomUUID(),
    date: formData.get("date"),
    type: formData.get("type"),
    title: formData.get("title"),
    note: formData.get("note"),
    createdAt: new Date().toISOString(),
  };
  state.companyPlans.unshift(plan);
  state.employees.forEach((employee) => {
    notifyOnce({
      key: `company-plan-${plan.id}-${employee.id}`,
      scope: "employee",
      targetId: employee.id,
      type: "info",
      title: "Novi plan firme",
      message: `${plan.type}: ${plan.title} · ${formatDate(plan.date)}`,
    });
  });
  saveState();
  event.currentTarget.reset();
  event.currentTarget.elements.date.value = currentDateKey();
  renderAll();
  showToast("Sačuvano", "Plan firme je dodat i vidljiv zaposlenima.", "ok");
});

document.getElementById("openClientModal").addEventListener("click", () => {
  setActiveView("clients");
  const panel = document.getElementById("clientAddPanel");
  if (panel) panel.hidden = false;
  const firstInput = document.querySelector('#adminClientForm input[name="name"]');
  firstInput?.scrollIntoView({ behavior: "smooth", block: "center" });
  firstInput?.focus();
});

document.getElementById("adminClientForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const loginEmail = String(formData.get("loginEmail") || "").trim().toLowerCase();
  const duplicate = state.clients.some((item) => String(item.name || "").trim().toLowerCase() === name.toLowerCase() || (loginEmail && String(item.loginEmail || "").trim().toLowerCase() === loginEmail));
  if (duplicate) {
    showToast("Klijent već postoji", "Proveri naziv ili login email pre novog unosa.", "warn");
    return;
  }
  const submitButton = form.querySelector('[type="submit"]');
  if (submitButton?.disabled) return;
  if (submitButton) submitButton.disabled = true;
  const values = packageValues(formData.get("package"), formData.get("revenue"), formData.get("contractMonths"));
  const contractFile = formData.get("contractFile");
  const invoiceStatus = "Nije poslat";
  const paymentStatus = "Nije plaćeno";
  const paymentMethod = "Firma";
  state.clients.unshift({
    id: crypto.randomUUID(),
    name,
    niche: formData.get("niche"),
    country: formData.get("country"),
    status: formData.get("status"),
    revenue: values.revenue,
    leads: 0,
    cpl: 0,
    owner: "Miljan / Ivana",
    team: "",
    package: values.package,
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    whatsapp: "",
    loginEmail,
    loginPassword: formData.get("loginPassword"),
    billingDay: Number(formData.get("billingDay")),
    paymentStatus,
    invoiceStatus,
    paymentMethod,
    invoices: {
      [selectedMonthKey()]: {
        invoiceStatus,
        paymentStatus,
        paymentMethod,
        sentAt: invoiceStatus === "Poslat" ? new Date().toISOString() : "",
        paidAt: paymentStatus === "Plaćeno" ? new Date().toISOString() : "",
      },
    },
    contractMonths: values.contractMonths,
    startDate: formData.get("startDate"),
    contractFileName: contractFile?.name || "",
    contractFileData: await readSmallFile(contractFile),
    contractNote: formData.get("contractNote"),
    metaPageId: formData.get("metaPageId"),
    metaFormId: formData.get("metaFormId") || "",
    websiteService: formData.get("websiteService") || "Ne",
    websitePrice: Number(formData.get("websitePrice") || 0),
    hostingProvider: formData.get("hostingProvider") || "",
    hostingExpiresAt: formData.get("hostingExpiresAt") || "",
    hostingPrice: Number(formData.get("hostingPrice") || 0),
    domainName: formData.get("domainName") || "",
    domainExpiresAt: formData.get("domainExpiresAt") || "",
    domainPrice: Number(formData.get("domainPrice") || 0),
  });
  withLoginDefaults(state.clients[0]);
  saveState();
  form.reset();
  if (submitButton) submitButton.disabled = false;
  document.getElementById("clientAddPanel")?.setAttribute("hidden", "");
  renderAll();
  showToast("Sačuvano", "Klijent je dodat u bazu.", "ok");
});

const adminPackageSelect = document.querySelector('#adminClientForm select[name="package"]');
adminPackageSelect?.addEventListener("change", () => {
  const form = document.getElementById("adminClientForm");
  const values = packageValues(adminPackageSelect.value);
  form.elements.revenue.value = values.revenue;
  form.elements.contractMonths.value = values.contractMonths || 3;
});

const editClientModal = document.getElementById("editClientModal");
document.getElementById("closeEditClientModal")?.addEventListener("click", () => editClientModal.close());
document.getElementById("cancelEditClient")?.addEventListener("click", () => editClientModal.close());

document.getElementById("editClientForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const client = state.clients.find((item) => item.id === formData.get("id"));
  if (!client) return;
  const values = packageValues(formData.get("package"), formData.get("revenue"), formData.get("contractMonths"));
  const contractFile = formData.get("contractFile");
  const contractFileData = await readSmallFile(contractFile);
  Object.assign(client, {
    name: formData.get("name"),
    niche: formData.get("niche"),
    country: formData.get("country"),
    package: values.package,
    revenue: values.revenue,
    contractMonths: values.contractMonths,
    startDate: formData.get("startDate"),
    status: formData.get("status"),
    billingDay: Number(formData.get("billingDay")),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    loginEmail: formData.get("loginEmail"),
    loginPassword: formData.get("loginPassword"),
    contractNote: formData.get("contractNote"),
    websiteService: formData.get("websiteService") || "Ne",
    websitePrice: Number(formData.get("websitePrice") || 0),
    hostingProvider: formData.get("hostingProvider") || "",
    hostingExpiresAt: formData.get("hostingExpiresAt") || "",
    hostingPrice: Number(formData.get("hostingPrice") || 0),
    domainName: formData.get("domainName") || "",
    domainExpiresAt: formData.get("domainExpiresAt") || "",
    domainPrice: Number(formData.get("domainPrice") || 0),
  });
  if (formData.has("whatsapp")) client.whatsapp = formData.get("whatsapp");
  if (contractFile?.name) {
    client.contractFileName = contractFile.name;
    client.contractFileData = contractFileData;
  }
  client.invoices = client.invoices || {};
  client.invoices[selectedMonthKey()] = {
    ...monthlyInvoice(client, selectedMonthKey()),
    amount: values.revenue,
  };
  withLoginDefaults(client);
  saveState();
  editClientModal.close();
  renderAll();
  showToast("Sačuvano", "Izmene klijenta su sačuvane.", "ok");
});

document.getElementById("portalLeadForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const client = selectedPortalClient();
  if (!client) return;
  const formData = new FormData(event.currentTarget);
  const lead = {
    id: crypto.randomUUID(),
    client: client.name,
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    location: formData.get("location"),
    source: formData.get("source"),
    service: formData.get("service"),
    estimate: Number(formData.get("estimate") || 0),
    responsible: formData.get("responsible"),
    status: formData.get("status"),
    priority: "Visok",
    nextAction: formData.get("nextAction"),
    note: formData.get("note"),
    lossReason: formData.get("lossReason"),
    customFields: {},
    createdAt: new Date().toISOString(),
    calledAt: isClientLeadStatusContacted(formData.get("status")) ? new Date().toISOString() : null,
    lastContact: "",
    lastStatusChangeAt: isClientLeadStatusContacted(formData.get("status")) ? new Date().toISOString() : "",
  };
  state.leads.unshift(lead);
  client.leads = Number(client.leads || 0) + 1;
  saveState();
  event.currentTarget.reset();
  document.getElementById("portalLeadPanel")?.setAttribute("hidden", "");
  renderAll();
  showToast("Sačuvano", "Lead je dodat za izabranog klijenta.", "ok");
});

document.getElementById("portalTeamForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const client = selectedPortalClient();
  if (!client) return;
  const formData = new FormData(event.currentTarget);
  state.teamMembers.push({
    id: crypto.randomUUID(),
    client: client.name,
    name: formData.get("name"),
    role: formData.get("role"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  saveState();
  event.currentTarget.reset();
  renderAll();
  showToast("Sačuvano", "Osoba je dodata u tim klijenta.", "ok");
});

document.querySelector('#editClientForm select[name="package"]')?.addEventListener("change", (event) => {
  const form = document.getElementById("editClientForm");
  const values = packageValues(event.target.value, form.elements.revenue.value, form.elements.contractMonths.value);
  if (event.target.value !== "Custom") form.elements.revenue.value = values.revenue;
  form.elements.contractMonths.value = values.contractMonths || 3;
});

const invoiceMonthFilter = document.getElementById("invoiceMonthFilter");
if (invoiceMonthFilter) {
  invoiceMonthFilter.value = monthFilter || currentMonthKey();
  invoiceMonthFilter.addEventListener("change", (event) => {
    monthFilter = event.target.value;
    const dashboardMonth = document.getElementById("monthFilter");
    if (dashboardMonth) dashboardMonth.value = monthFilter;
    renderAll();
  });
}

const leadModal = document.getElementById("leadModal");
const leadButton = document.getElementById("openLeadModal");
if (leadButton && leadModal) leadButton.addEventListener("click", () => leadModal.showModal());
document.getElementById("closeLeadModal")?.addEventListener("click", () => leadModal?.close());
document.getElementById("cancelLead")?.addEventListener("click", () => leadModal?.close());

document.getElementById("leadForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.leads.unshift({
    id: crypto.randomUUID(),
    client: formData.get("client"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    service: formData.get("service"),
    source: formData.get("source"),
    status: "Novi",
    priority: formData.get("priority"),
    createdAt: new Date().toISOString(),
    calledAt: null,
    lastStatusChangeAt: "",
    customFields: {},
    note: "Ručno dodat lead.",
  });
  const client = state.clients.find((item) => item.name === formData.get("client"));
  if (client) client.leads = Number(client.leads) + 1;
  saveState();
  event.currentTarget.reset();
  leadModal?.close();
  renderAll();
  showToast("Sačuvano", "Lead je ručno dodat.", "ok");
});

function updateLeadStatus(id, status) {
  const lead = state.leads.find((item) => item.id === id);
  if (!lead) return;
  lead.status = normalizeLeadStatus(status);
  if (isClientLeadStatusContacted(lead.status) && !lead.calledAt) {
    lead.calledAt = new Date().toISOString();
  }
  lead.lastStatusChangeAt = new Date().toISOString();
  saveState();
  renderAll();
  showToast("Sačuvano", `Lead je prebačen u status ${lead.status}.`, "ok");
}

function renderLeadClientOptions() {
  const select = document.getElementById("leadClientSelect");
  if (!select) return;
  select.innerHTML = state.clients.map((client) => `<option>${client.name}</option>`).join("");
}

document.getElementById("addDealBtn")?.addEventListener("click", () => {
  const name = prompt("Naziv prilike");
  if (!name) return;
  state.deals.unshift({
    id: crypto.randomUUID(),
    name,
    country: "Austrija",
    value: 2500,
    stage: "Novi lead",
    note: "Dodato iz CRM-a.",
  });
  saveState();
  renderAll();
});

document.getElementById("addTaskBtn")?.addEventListener("click", () => {
  const title = prompt("Naziv zadatka");
  if (!title) return;
  state.tasks.unshift({
    id: crypto.randomUUID(),
    role: "SMM",
    client: state.clients[0]?.name || "Novi klijent",
    title,
    due: "Danas",
    priority: "Srednji",
  });
  saveState();
  renderAll();
});

function downloadBackup(filename = "agency-crm-export.json") {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

document.getElementById("exportBtn").addEventListener("click", () => {
  downloadBackup("agency-crm-export.json");
});

document.getElementById("backupNowBtn")?.addEventListener("click", () => {
  state.backup = state.backup || {};
  state.backup.lastDownloadedAt = new Date().toISOString();
  saveState();
  downloadBackup(`marketizo-crm-backup-${currentDateKey()}.json`);
  renderAll();
});

setupPasswordToggles();
hydrateOnlineState().then(() => {
  renderAll();
  window.MarketizoRemote?.startPolling((payload) => {
    state = loadState(payload);
    renderAll();
  });
});
updateContextActions("admin");

// Compact filters and current-period defaults added for the admin workspace.
(() => {
  const currentLocalMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  const setHomeCurrentMonth = () => {
    const home = document.getElementById("admin");
    const month = document.getElementById("monthFilter");
    if (!home?.classList.contains("active") || !month) return;
    month.value = currentLocalMonth();
    const from = document.getElementById("dateFromFilter");
    const to = document.getElementById("dateToFilter");
    if (from) from.value = "";
    if (to) to.value = "";
    month.dispatchEvent(new Event("input", { bubbles: true }));
    month.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const minutesFromText = (value) => {
    const text = String(value || "").toLowerCase().replace(/\s+/g, " ");
    let minutes = 0;
    const hours = text.match(/([\d.,]+)\s*h/);
    const mins = text.match(/([\d.,]+)\s*min/);
    if (mins) minutes = Number(mins[1].replace(",", "."));
    else if (hours) minutes = Number(hours[1].replace(",", ".")) * 60;
    if (!hours && !mins) {
      const number = Number(text.replace(/[^\d,.-]/g, "").replace(",", "."));
      if (Number.isFinite(number)) minutes = number;
    }
    return Number.isFinite(minutes) ? minutes : 0;
  };

  const enhanceWorkHours = () => {
    const body = document.getElementById("employeeWorkRows");
    const count = document.getElementById("employeeWorkRowsCount");
    if (!body || !count) return;
    let total = document.getElementById("employeeWorkHoursTotal");
    if (!total) {
      const summary = document.createElement("div");
      summary.className = "worklog-summary";
      total = document.createElement("strong");
      total.id = "employeeWorkHoursTotal";
      const summaryParent = count.parentElement;
      summary.append(count, total);
      summaryParent?.append(summary);
    }
    const sync = () => {
      const rows = [...body.querySelectorAll("tr")].filter((row) => getComputedStyle(row).display !== "none");
      const minutes = rows.reduce((sum, row) => sum + minutesFromText(row.children[2]?.textContent), 0);
      const hours = minutes / 60;
      const nextTotal = `Ukupno ${new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 2 }).format(hours)}h`;
      if (total.textContent !== nextTotal) total.textContent = nextTotal;
    };
    if (!body.dataset.totalReady) {
      body.dataset.totalReady = "true";
      new MutationObserver(sync).observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
      [document.getElementById("employeeWorkPersonFilter"), document.getElementById("employeeWorkMonthFilter"), document.getElementById("resetEmployeeWorkFilters")]
        .filter(Boolean)
        .forEach((control) => control.addEventListener("change", () => setTimeout(sync, 0)));
    }
    sync();
  };

  const enhanceClientCostPicker = () => {
    const picker = document.querySelector(".client-cost-employee-picker");
    if (!picker || picker.dataset.compactReady) return;
    picker.dataset.compactReady = "true";
    const hiddenSelect = document.getElementById("clientCostEmployees");
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "client-cost-picker-trigger";
    trigger.setAttribute("aria-expanded", "false");
    const dropdown = document.createElement("div");
    dropdown.className = "client-cost-picker-dropdown";
    dropdown.hidden = true;
    [...picker.children].filter((child) => child !== hiddenSelect).forEach((child) => dropdown.append(child));
    picker.insertBefore(trigger, hiddenSelect || null);
    picker.insertBefore(dropdown, hiddenSelect || null);

    const update = () => {
      const checked = [...picker.querySelectorAll('#clientCostEmployeeList input[type="checkbox"]:checked')];
      const total = picker.querySelectorAll('#clientCostEmployeeList input[type="checkbox"]').length;
      trigger.textContent = checked.length ? `${checked.length} zaposlenih izabrano` : `Svi zaposleni (${total})`;
    };
    trigger.addEventListener("click", () => {
      dropdown.hidden = !dropdown.hidden;
      trigger.setAttribute("aria-expanded", String(!dropdown.hidden));
      if (!dropdown.hidden) document.getElementById("clientCostEmployeeSearch")?.focus();
    });
    picker.addEventListener("change", update);
    picker.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => setTimeout(update, 0)));
    document.addEventListener("click", (event) => {
      if (!picker.contains(event.target)) {
        dropdown.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      }
    });
    update();
  };

  const enhance = () => {
    enhanceWorkHours();
    enhanceClientCostPicker();
  };
  window.addEventListener("load", () => {
    setTimeout(() => {
      setHomeCurrentMonth();
      enhance();
    }, 250);
  });
  window.addEventListener("hashchange", () => setTimeout(() => {
    if (location.hash === "#admin" || location.hash === "" || location.hash === "#") setHomeCurrentMonth();
    enhance();
  }, 80));
  document.addEventListener("click", (event) => {
    if (!event.target.closest('.nav-item[data-view="admin"], [data-go-view="admin"]')) return;
    setTimeout(setHomeCurrentMonth, 80);
  });
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
})();
