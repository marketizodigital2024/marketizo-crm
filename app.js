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

const state = loadState();
saveState();
let activeFilter = "all";
let activeLeadFilter = "all";
let searchTerm = "";
let monthFilter = "";
let dateFromFilter = "";
let dateToFilter = "";
let countryFilter = "all";
let selectedPortalClientId = state.clients[0]?.id || "";
let employeeMonthFilter = currentMonthKey();
let employeeStatusFilter = "all";
let selectedEmployeeId = state.employees?.[0]?.id || "";

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
  return monthFilter || currentMonthKey();
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("sr-RS", { month: "long", year: "numeric" });
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
  const monthKey = currentMonthKey();
  client.invoices = client.invoices || {};
  client.invoices[monthKey] = {
    invoiceStatus: client.invoiceStatus || "Nije poslat",
    paymentStatus: client.paymentStatus || "Nije plaćeno",
    paymentMethod: client.paymentMethod || "Firma",
    sentAt: "",
    paidAt: "",
    ...client.invoices[monthKey],
  };
  return client;
}

function monthlyInvoice(client, monthKey = selectedMonthKey()) {
  client.invoices = client.invoices || {};
  if (!client.invoices[monthKey]) {
    client.invoices[monthKey] = {
      invoiceStatus: "Nije poslat",
      paymentStatus: "Nije plaćeno",
      paymentMethod: client.paymentMethod || "Firma",
      sentAt: "",
      paidAt: "",
    };
  }
  return client.invoices[monthKey];
}

function loadState() {
  const saved = localStorage.getItem("agencyCrmData");
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
  }));
  const employeeWorkLogs = (data.employeeWorkLogs || starterData.employeeWorkLogs || []).map((log) => ({
    id: log.id || crypto.randomUUID(),
    employeeId: log.employeeId || employees[0]?.id || "",
    date: log.date || currentDateKey(),
    hours: Number(log.hours || 0),
    type: log.type || "Rad",
    note: log.note || "",
    positive: log.positive || "",
    negative: log.negative || "",
    locked: log.locked !== false,
    submittedAt: log.submittedAt || new Date().toISOString(),
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
    employeeDocuments,
    employeeLateRecords,
    employeeGoals,
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

function saveState() {
  localStorage.setItem("agencyCrmData", JSON.stringify(state));
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

function showToast(title, message = "", type = "ok") {
  const stack = document.getElementById("toastStack");
  if (!stack) return;
  const toast = document.createElement("div");
  toast.className = `toast-message ${notificationClass(type)}`;
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
  return countryFilter === "all" || client.country === countryFilter;
}

function byDateRange(client) {
  if (!dateFromFilter && !dateToFilter) return true;
  if (!client.startDate) return false;
  const start = new Date(client.startDate);
  if (dateFromFilter && start < new Date(dateFromFilter)) return false;
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
  const active = scopedClients.filter((client) => client.status === "Aktivan" || client.status === "Interni");
  const monthKey = selectedMonthKey();
  const mrr = active.reduce((sum, client) => sum + Number(client.revenue || 0), 0);
  const paidClients = active.filter((client) => monthlyInvoice(client, monthKey).paymentStatus === "Plaćeno");
  const unpaidClients = active.filter((client) => monthlyInvoice(client, monthKey).paymentStatus !== "Plaćeno");
  const paidTotal = paidClients.reduce((sum, client) => sum + Number(client.revenue || 0), 0);
  const unpaidTotal = unpaidClients.reduce((sum, client) => sum + Number(client.revenue || 0), 0);
  const unsentClients = active.filter((client) => monthlyInvoice(client, monthKey).invoiceStatus !== "Poslat");

  setText("adminTotalClients", scopedClients.length);
  setText("adminMrr", currency.format(mrr));
  setText("adminPaidTotal", currency.format(paidTotal));
  setText("adminPaidCount", `${paidClients.length} klijenata`);
  setText("adminUnpaidTotal", currency.format(unpaidTotal));
  setText("adminUnpaidCount", `${unpaidClients.length} nije plaćeno · ${unsentClients.length} nije poslat račun`);
  renderAdminNotifications();
  renderAdminClientSnapshot(active);
  renderAdminEmployeeRisk(monthKey);
  renderBackupStatus();
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

function showAdminNotificationPopups(notifications) {
  const shown = JSON.parse(sessionStorage.getItem("shownAdminNotifications") || "[]");
  const nextShown = new Set(shown);
  notifications
    .filter((notification) => notification.title === "Zahtev za odmor" && !nextShown.has(notification.id))
    .slice(0, 3)
    .forEach((notification) => {
      showToast(notification.title, notification.message, notification.type);
      nextShown.add(notification.id);
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
            <button class="mini-action" data-hide-notification="${notification.id}" type="button">Sakrij 7 dana</button>
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
                <button class="mini-action" data-unhide-notification="${notification.id}" type="button">Vrati</button>
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
                <button class="mini-action" data-unhide-notification="${notification.id}" type="button">Vrati</button>
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
}

function renderAdminClientSnapshot(clients) {
  const baseClients = clients.length ? clients : state.clients.filter(bySearch);
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
          <div class="setup-item alert-item clickable-item ${status}" data-go-view="employees" data-select-shortcut-employee="${employee.id}">
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
  const lastBackup = state.backup?.lastDownloadedAt ? new Date(state.backup.lastDownloadedAt).toLocaleString("sr-RS") : "nije skinut";
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
  const rows = clients
    .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))
    .map((client) => {
      const invoice = monthlyInvoice(client, monthKey);
      return `
      <tr>
        <td><strong>${client.name}</strong><br /><span>${client.country} · naplata dan ${client.billingDay || 1}</span></td>
        <td>${currency.format(client.revenue || 0)}</td>
        <td>
          <select class="table-select" data-invoice-client="${client.id}" data-invoice-field="invoiceStatus">
            ${option("Nije poslat", invoice.invoiceStatus)}
            ${option("Poslat", invoice.invoiceStatus)}
          </select>
        </td>
        <td>
          <select class="table-select" data-invoice-client="${client.id}" data-invoice-field="paymentStatus">
            ${option("Nije plaćeno", invoice.paymentStatus)}
            ${option("Plaćeno", invoice.paymentStatus)}
            ${option("Kasni", invoice.paymentStatus)}
          </select>
        </td>
        <td>
          <select class="table-select" data-invoice-client="${client.id}" data-invoice-field="paymentMethod">
            ${option("Firma", invoice.paymentMethod)}
            ${option("Keš", invoice.paymentMethod)}
          </select>
        </td>
      </tr>`;
    })
    .join("");
  document.getElementById("monthlyInvoiceRows").innerHTML = rows || `<tr><td colspan="5">Nema klijenata za izabrani filter.</td></tr>`;
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
        <span>${packageName} · ${currency.format(info.total)}/mes</span>
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
  return new Date(value).toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" });
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
  return openingUsed + state.employeeAbsences
    .filter((absence) => absence.employeeId === employeeId && absence.type === type && absence.status !== "Zatraženo")
    .reduce((sum, absence) => {
      const days = absenceWorkdays(absence).filter((day) => day.startsWith(`${year}-`));
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
  const dailyHours = Number(employee.weeklyHours || 40) / 5;
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
  return (
    state.employeeWorkLogs.some((log) => log.employeeId === employeeId && String(log.date || "").startsWith(monthKey)) ||
    (state.employeeLateRecords || []).some((record) => record.employeeId === employeeId && String(record.date || "").startsWith(monthKey)) ||
    (state.employeeAbsences || []).some((absence) => absence.employeeId === employeeId && dateRangeKeys(absence.startDate, absence.endDate).some((day) => day.startsWith(monthKey)))
  );
}

function employeeMonthBalance(employee, monthKey) {
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

  if (state.backup?.lastDownloadedAt?.slice(0, 10) !== today) {
    notifyOnce({
      key: `backup-missing-${today}`,
      type: "warn",
      title: "Backup nije skinut danas",
      message: `Preporuka: skini JSON backup i prebaci ga u ${state.backup?.recommendedLocation || "Google Drive"}.`,
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
  ["absenceEmployeeSelect", "workEmployeeSelect", "lateEmployeeSelect", "goalEmployeeSelect", "oneOnOneEmployeeSelect"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.value = [...select.options].some((option) => option.value === employeeId) ? employeeId : "";
  });
}

function renderEmployeeOptions() {
  const employees = state.employees || [];
  ["absenceEmployeeSelect", "workEmployeeSelect", "lateEmployeeSelect", "goalEmployeeSelect", "oneOnOneEmployeeSelect"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const selected = select.value;
    select.innerHTML = employees.length
      ? employees.map((employee) => `<option value="${employee.id}">${employee.name}</option>`).join("")
      : `<option value="">Nema zaposlenih</option>`;
    if (employees.some((employee) => employee.id === selected)) select.value = selected;
  });
  const leaderSelect = document.getElementById("employeeLeaderSelect");
  if (leaderSelect) {
    const selected = leaderSelect.value;
    const leaders = employees.filter((employee) => employee.isLeader);
    leaderSelect.innerHTML = `<option value="">Nema lidera</option>${leaders.map((employee) => `<option value="${employee.id}">${employee.name}</option>`).join("")}`;
    if (leaders.some((employee) => employee.id === selected)) leaderSelect.value = selected;
  }
}

function renderEmployees() {
  if (!document.getElementById("employees")) return;
  state.employees = state.employees || [];
  state.employeeAbsences = state.employeeAbsences || [];
  state.employeeWorkLogs = state.employeeWorkLogs || [];
  state.employeeDocuments = state.employeeDocuments || [];
  state.employeeLateRecords = state.employeeLateRecords || [];
  state.employeeGoals = state.employeeGoals || [];
  state.employeeOneOnOnes = state.employeeOneOnOnes || [];
  state.employeeReports = state.employeeReports || [];
  state.companyPlans = state.companyPlans || [];
  const monthKey = employeeMonthKey();
  const year = Number(monthKey.slice(0, 4));
  const employees = visibleEmployees();
  const totalSalary = employees.reduce((sum, employee) => sum + Number(employee.salary || 0), 0);
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
  panel.hidden = false;
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
  if (panel) panel.hidden = true;
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
  state.employeeOneOnOnes = (state.employeeOneOnOnes || []).filter((item) => item.employeeId !== id);
  state.employeeReports = (state.employeeReports || []).filter((item) => item.employeeId !== id && item.recipientId !== id);
  selectedEmployeeId = state.employees[0]?.id || "";
  hideEmployeeProfileForm();
  saveState();
  renderAll();
}

function renderEmployeeWorkRows(monthKey) {
  const rows = state.employeeWorkLogs
    .filter((log) => String(log.date || "").startsWith(monthKey))
    .filter(selectedEmployeeFilter)
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
        <td>${Number(log.hours || 0)}h</td>
        <td>${log.note || ""}</td>
        <td><strong>+</strong> ${log.positive || "-"}<br /><strong>-</strong> ${log.negative || "-"}</td>
        <td><span class="status ok">${log.locked === false ? "Otključano" : "Zaključano"}</span></td>
      </tr>`;
    });
  setText("employeeWorkRowsCount", `${rows.length} unosa`);
  document.getElementById("employeeWorkRows").innerHTML = rows.join("") || `<tr><td colspan="6">Nema unetih sati za ovaj mesec.</td></tr>`;
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

function renderEmployeeGoalRows() {
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
          const status = goal.status === "Rizik" ? "danger" : goal.status === "Završeno" ? "ok" : "warn";
          return `
          <div class="setup-item alert-item ${status}">
            <strong>${goal.progress || 0}%</strong>
            <span>${employee?.name || "Zaposleni"} · ${goal.title}<br />${formatDate(goal.startDate)} - ${formatDate(goal.endDate)} · ${goal.target || ""}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema ciljeva.</div>`;
}

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
  document.getElementById("employeeReportRows").innerHTML = rows.join("") || `<tr><td colspan="6">Nema izveštaja za ovaj mesec.</td></tr>`;
}

function approveAbsence(id) {
  const absence = state.employeeAbsences.find((item) => item.id === id);
  if (!absence) return;
  absence.status = "Odobreno";
  absence.approvedAt = new Date().toISOString();
  absence.approvedBy = "Admin";
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
  const monthLogs = state.employeeWorkLogs.filter((log) => String(log.date || "").startsWith(monthKey));
  const monthPlans = (state.companyPlans || []).filter((plan) => String(plan.date || "").startsWith(monthKey));
  setText(summaryId, `${monthLabel(monthKey)} · ${monthAbsences.length} odsustava`);
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
          const logs = monthLogs.filter((log) => log.date === day);
          const plans = monthPlans.filter((plan) => plan.date === day);
          const classes = ["calendar-day"];
          if (isWeekend(day)) classes.push("weekend");
          if (holiday) classes.push("holiday");
          if (absences.length) classes.push("has-absence");
          if (logs.length) classes.push("has-hours");
          return `
          <div class="${classes.join(" ")}">
            <strong>${Number(day.slice(-2))}</strong>
            ${holiday ? `<span class="calendar-note holiday-note">${holiday}</span>` : ""}
            ${companyDay ? `<span class="calendar-note company-note">${companyDay}</span>` : ""}
            ${plans.map((plan) => `<span class="calendar-note plan-note">${plan.type}: ${plan.title}</span>`).join("")}
            ${
              absences
                .slice(0, 3)
                .map((absence) => {
                  const employee = employees.find((item) => item.id === absence.employeeId) || employeeById(absence.employeeId);
                  const requestLabel = absence.status === "Zatraženo" ? " · zahtev" : "";
                  return `<span class="calendar-note ${absence.type === "Bolovanje" ? "sick-note" : "vacation-note"}">${employee?.name || "Zaposleni"} · ${absence.type}${requestLabel}</span>`;
                })
                .join("")
            }
            ${
              logs.length
                ? `<span class="calendar-note hours-note">${logs.reduce((sum, log) => sum + Number(log.hours || 0), 0)}h uneto</span>`
                : ""
            }
          </div>`;
        })
        .join("")}
    </div>`;
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
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema odsustava za izabrani mesec.</div>`;
}

function renderClients() {
  const clients = state.clients.filter((client) => bySearch(client) && (activeFilter === "all" || client.country === activeFilter));
  setText("clientRowsCount", `${clients.length} klijenata`);
  document.getElementById("clientCards").innerHTML = clients.length
    ? clients
        .map((client) => {
          const endDate = contractEndDate(client);
          const daysLeft = endDate ? daysBetween(currentDateKey(), endDate) : null;
          const contractLabel = endDate ? `do ${formatDate(endDate)}` : "nije unet";
          const leadStats = clientLeadStats(client);
          const leadClass = leadStats.late ? "danger" : leadStats.open ? "warn" : "ok";
          const archiveLabel = client.status === "Arhiviran" ? "Vrati" : "Arhiva";
          return `
          <tr>
            <td><strong>${client.name}</strong><br /><span>${client.niche} · ${client.country}</span></td>
            <td><strong>${displayPackage(client.package)}</strong><br /><span>${currency.format(client.revenue || 0)}/mes</span></td>
            <td>${formatDate(client.startDate)}<br /><span>${contractLabel}${daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 ? ` · ${daysLeft} dana` : ""}</span></td>
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
  const active = clients.filter((client) => client.status === "Aktivan" || client.status === "Interni");
  const monthKey = selectedMonthKey();
  const revenueByCountry = groupSum(clients, "country", "revenue");
  const revenueByStatus = groupSum(clients, "status", "revenue");
  renderBars("countryBars", revenueByCountry, "€");
  renderBars("revenueBars", revenueByStatus, "€");
  setText("invoiceMonthLabel", monthLabel(monthKey));
  renderInvoiceSummary(active, monthKey);
  renderMonthlyInvoices(active, monthKey);
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
          const leadDate = new Date(lead.createdAt).toLocaleDateString("sr-RS");
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
          <span>${new Date(lead.createdAt).toLocaleString("sr-RS", { dateStyle: "short", timeStyle: "short" })}</span>
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
    setActiveView(button.dataset.view);
  });
});

function setActiveView(viewName) {
  const button = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  const view = document.getElementById(viewName);
  if (!button || !view) return;
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  view.classList.add("active");
  setText("pageTitle", button.textContent);
  updateContextActions(viewName);
}

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

document.getElementById("teamCalendarMonth")?.addEventListener("input", () => {
  renderAll();
});

document.getElementById("teamCalendarStatus")?.addEventListener("change", () => {
  renderAll();
});

document.getElementById("newEmployeeBtn")?.addEventListener("click", () => {
  setActiveView("employees");
  showEmployeeProfileForm();
  document.getElementById("employeeProfilePanel")?.scrollIntoView({ behavior: "smooth", block: "center" });
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
  if (!employeeId) {
    alert("Izaberi zaposlenog za ovaj unos.");
    return;
  }
  if (hasEmployeeWorkLog(employeeId, date)) {
    alert("Za ovog zaposlenog već postoji zaključan unos za taj dan.");
    return;
  }
  state.employeeWorkLogs.unshift({
    id: crypto.randomUUID(),
    employeeId,
    date,
    hours: parseNumber(formData.get("hours"), 0),
    type: "Rad",
    note: formData.get("note"),
    locked: true,
    submittedAt: new Date().toISOString(),
  });
  selectedEmployeeId = employeeId;
  saveState();
  event.currentTarget.reset();
  event.currentTarget.elements.date.value = currentDateKey();
  event.currentTarget.elements.hours.value = 8;
  renderAll();
  showToast("Sačuvano", "Sati su upisani za izabranog zaposlenog.", "ok");
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
  const goal = {
    id: crypto.randomUUID(),
    employeeId,
    title: formData.get("title"),
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
  const formData = new FormData(event.currentTarget);
  const values = packageValues(formData.get("package"), formData.get("revenue"), formData.get("contractMonths"));
  const contractFile = formData.get("contractFile");
  const invoiceStatus = "Nije poslat";
  const paymentStatus = "Nije plaćeno";
  const paymentMethod = "Firma";
  state.clients.unshift({
    id: crypto.randomUUID(),
    name: formData.get("name"),
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
    loginEmail: formData.get("loginEmail"),
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
  });
  withLoginDefaults(state.clients[0]);
  saveState();
  event.currentTarget.reset();
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
  });
  if (formData.has("whatsapp")) client.whatsapp = formData.get("whatsapp");
  if (contractFile?.name) {
    client.contractFileName = contractFile.name;
    client.contractFileData = contractFileData;
  }
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
renderAll();
updateContextActions("admin");
