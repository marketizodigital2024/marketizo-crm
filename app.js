const stages = ["Novi lead", "Kvalifikovan", "Poziv zakazan", "Ponuda poslata", "Zatvoren"];
const roles = ["Scenarista", "Snimatelj", "Editor", "Media buyer", "SMM"];
const leadSlaHours = 24;
const clientLeadSlaHours = 48;
const employeeAbsenceTypes = ["Godišnji odmor", "Bolovanje", "Poklon dan", "Slobodan dan"];
const employeeWorkTypes = ["Rad", "Sastanak", "Snimanje", "Administracija", "Ostalo"];
const packageConfig = {
  Starter: { price: 997, months: 3 },
  Business: { price: 1497, months: 6 },
  Enterprise: { price: 1997, months: 6 },
  Custom: { price: 0, months: 3 },
};
const demoClientNames = new Set(["Marketizo Digital", "Dental Studio Wien", "Auto Detailing Zagreb", "Physio Klinik München", "Beauty Laser Beograd"]);

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
      guaranteeTarget: 0,
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
      guaranteeTarget: 30,
      contactName: "Anna Gruber",
      contactPhone: "+436601112233",
      whatsapp: "+436601112233",
      billingDay: 1,
      paymentStatus: "Plaćeno",
      invoiceStatus: "Poslat",
      paymentMethod: "Firma",
      contractMonths: 3,
      startDate: "2026-05-01",
      metaPageId: "demo_page_wien",
      metaFormId: "demo_form_implants",
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
      guaranteeTarget: 30,
      contactName: "Ivan Kovač",
      contactPhone: "+38591111222",
      whatsapp: "+38591111222",
      billingDay: 5,
      paymentStatus: "Kasni",
      invoiceStatus: "Poslat",
      paymentMethod: "Firma",
      contractMonths: 6,
      startDate: "2026-04-15",
      metaPageId: "demo_page_zagreb",
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
      guaranteeTarget: 30,
      contactName: "Lukas Weber",
      contactPhone: "+491701112233",
      whatsapp: "+491701112233",
      billingDay: 10,
      paymentStatus: "Plaćeno",
      invoiceStatus: "Poslat",
      paymentMethod: "Firma",
      contractMonths: 6,
      startDate: "2026-03-01",
      metaPageId: "demo_page_munich",
      metaFormId: "demo_form_physio",
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
      guaranteeTarget: 30,
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
    { id: crypto.randomUUID(), role: "Media buyer", client: "Auto Detailing Zagreb", title: "Nova ad grupa za garanciju", due: "Danas", priority: "Visok" },
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
      status: "Pozvan",
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
      note: "Primer unosa odmora.",
      status: "Odobreno",
    },
    {
      id: crypto.randomUUID(),
      employeeId: "emp-luka",
      type: "Bolovanje",
      startDate: "2026-07-08",
      endDate: "2026-07-09",
      note: "Primer bolovanja.",
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
      fileName: "primer-lohnzettel-jul.pdf",
      note: "Primer dokumenta.",
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
let employeeCalendarFilter = "all";

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
    .filter((client) => !demoClientNames.has(client.name))
    .map((client) => {
      const normalizedClient = {
        package: "Starter",
        guaranteeTarget: 30,
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
      team: "Dodeliti tim",
      package: packageName,
      guaranteeTarget: 30,
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
    vacationDays: 26,
    giftDays: 1,
    isLeader: false,
    leaderId: "",
    status: "Aktivan",
    ...employee,
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
    reason: record.reason || "",
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
    createdAt: notification.createdAt || new Date().toISOString(),
  }));
  return {
    ...structuredClone(starterData),
    ...data,
    clients,
    deals: data.deals || starterData.deals,
    tasks: data.tasks || starterData.tasks,
    leads: (data.leads || starterData.leads).map((lead) => ({
      email: "",
      location: "",
      estimate: 0,
      responsible: "",
      nextAction: "",
      lossReason: "",
      lastContact: lead.calledAt || "",
      lastStatusChangeAt: lead.lastStatusChangeAt || lead.calledAt || "",
      ...lead,
    })),
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
  return "Aktivan";
}

function saveState() {
  localStorage.setItem("agencyCrmData", JSON.stringify(state));
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
  const target = Number(client.guaranteeTarget || 30);
  if (client.status === "Rizik" || client.leads < target * 0.8) return "danger";
  if (client.status === "Onboarding" || client.leads < target) return "warn";
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

function renderDashboard() {
  const clients = state.clients.filter(bySearch);
  const active = state.clients.filter((client) => client.status !== "Pauza");
  const leads = active.reduce((sum, client) => sum + Number(client.leads), 0);
  const revenue = active.reduce((sum, client) => sum + Number(client.revenue), 0);
  const pipeline = state.deals
    .filter((deal) => deal.stage !== "Zatvoren")
    .reduce((sum, deal) => sum + Number(deal.value), 0);
  const underGuarantee = active.filter((client) => Number(client.leads) < Number(client.guaranteeTarget || 30));
  const countries = new Set(active.map((client) => client.country)).size;

  setText("activeClients", active.length);
  setText("clientCountries", `${countries} države u bazi`);
  setText("monthlyLeads", leads);
  setText("guaranteeStatus", `${underGuarantee.length} ispod 30 leadova`);
  setText("monthlyRevenue", currency.format(revenue));
  setText("avgRevenue", `${currency.format(revenue / Math.max(active.length, 1))} prosek`);
  setText("pipelineValue", currency.format(pipeline));
  setText("hotDeals", `${state.deals.filter((deal) => deal.stage !== "Zatvoren").length} otvorene prilike`);
  setText("riskCount", `${underGuarantee.length} rizika`);

  const table = document.getElementById("clientTable");
  table.innerHTML = clients
    .map(
      (client) => `
      <tr>
        <td><strong>${client.name}</strong><br /><span>${client.niche}</span></td>
        <td>${client.country}</td>
        <td><span class="status ${statusClass(client)}">${client.status}</span></td>
        <td><strong>${client.leads}/${client.guaranteeTarget || 30}</strong></td>
        <td>${currency.format(client.cpl)}</td>
        <td>${client.team}</td>
      </tr>`
    )
    .join("");

  const today = state.tasks.filter((task) => task.due === "Danas" && bySearch(task));
  setText("todayCount", today.length);
  document.getElementById("todayTasks").innerHTML = today
    .map(
      (task) => `
      <div class="task-row">
        <div><strong>${task.title}</strong><span>${task.client} · ${task.role}</span></div>
        <span class="pill">${task.priority}</span>
      </div>`
    )
    .join("");
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

function renderAdminNotifications() {
  const notifications = (state.notifications || []).filter((notification) => notification.scope === "admin").slice(0, 8);
  setText("adminNotificationCount", `${notifications.length} aktivno`);
  const target = document.getElementById("adminNotificationList");
  if (!target) return;
  target.innerHTML = notifications.length
    ? notifications
        .map(
          (notification) => `
          <div class="setup-item alert-item ${notificationClass(notification.type)}">
            <strong>!</strong>
            <span>${notification.title}<br />${notification.message}</span>
          </div>`
        )
        .join("")
    : `<div class="empty-state">Nema obaveštenja za reakciju.</div>`;
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
  setText("adminEmployeeRiskCount", `${riskCount} za proveru`);
  const target = document.getElementById("adminEmployeeRiskList");
  if (!target) return;
  target.innerHTML = rows.length
    ? rows
        .map(({ employee, balance, expected, hours }) => {
          const status = balance < 0 ? "danger" : hours > expected ? "warn" : "ok";
          return `
          <div class="setup-item alert-item ${status}">
            <strong>${formatHourBalance(balance)}</strong>
            <span>${employee.name}<br />${hours}h od ${expected}h · ${employee.weeklyHours || 40}h nedeljno</span>
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
  form.elements.invoiceStatus.value = client.invoiceStatus || "Nije poslat";
  form.elements.paymentStatus.value = client.paymentStatus || "Nije plaćeno";
  form.elements.paymentMethod.value = client.paymentMethod || "Firma";
  form.elements.billingDay.value = Number(client.billingDay || 1);
  form.elements.contactName.value = client.contactName || "";
  form.elements.contactPhone.value = client.contactPhone || "";
  form.elements.whatsapp.value = client.whatsapp || "";
  form.elements.loginEmail.value = client.loginEmail || "";
  form.elements.loginPassword.value = client.loginPassword || "";
  form.elements.contractNote.value = client.contractNote || "";
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
  if (packageName === "Lead Guarantee") return "Garancija paket";
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
  if (value.endsWith("-12-24")) return "24.12. proveriti KV / firma";
  if (value.endsWith("-12-31")) return "31.12. proveriti KV / firma";
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
  return state.employeeAbsences
    .filter((absence) => absence.employeeId === employeeId && absence.type === type && absence.status !== "Zatraženo")
    .reduce((sum, absence) => {
      const days = absenceWorkdays(absence).filter((day) => day.startsWith(`${year}-`));
      return sum + days.length;
    }, 0);
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
  return state.employeeWorkLogs
    .filter((log) => log.employeeId === employeeId && String(log.date || "").startsWith(monthKey))
    .reduce((sum, log) => sum + Number(log.hours || 0), 0);
}

function employeeExpectedHours(employee, monthKey) {
  return Math.round(workdaysInMonth(monthKey).length * (Number(employee.weeklyHours || 40) / 5) * 100) / 100;
}

function employeeHourBalance(employee, monthKey) {
  return Math.round((employeeMonthHours(employee.id, monthKey) - employeeExpectedHours(employee, monthKey)) * 100) / 100;
}

function formatHourBalance(value) {
  const rounded = Math.round(Number(value || 0) * 100) / 100;
  if (rounded > 0) return `+${rounded}h`;
  return `${rounded}h`;
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

function renderEmployeeOptions() {
  const employees = state.employees || [];
  ["absenceEmployeeSelect", "workEmployeeSelect", "documentEmployeeSelect", "lateEmployeeSelect", "goalEmployeeSelect", "oneOnOneEmployeeSelect"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const selected = select.value;
    select.innerHTML = employees.map((employee) => `<option value="${employee.id}">${employee.name}</option>`).join("");
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
  const workingDays = workdaysInMonth(monthKey);
  const totalSalary = employees.reduce((sum, employee) => sum + Number(employee.salary || 0), 0);
  const totalHourBalance = employees.reduce((sum, employee) => sum + employeeHourBalance(employee, monthKey), 0);
  const vacationUsed = employees.reduce((sum, employee) => sum + employeeYearAbsenceDays(employee.id, year, "Godišnji odmor"), 0);
  const sickDays = employees.reduce((sum, employee) => sum + employeeYearAbsenceDays(employee.id, year, "Bolovanje"), 0);

  document.getElementById("employeeMonthFilter").value = monthKey;
  setText("employeeTotal", employees.filter((employee) => employee.status === "Aktivan").length);
  setText("employeeSalaryTotal", currency.format(totalSalary));
  setText("employeeHourBalance", formatHourBalance(totalHourBalance));
  setText("employeeVacationUsed", vacationUsed);
  setText("employeeSickDays", sickDays);
  setText("employeeWorkingDaysLabel", `${workingDays.length} radnih dana · ${workingDays.length * 8}h baza`);
  setText("employeeCalendarTitle", monthLabel(monthKey));
  const workDateInput = document.querySelector('#employeeWorkForm input[name="date"]');
  const absenceStartInput = document.querySelector('#employeeAbsenceForm input[name="startDate"]');
  const absenceEndInput = document.querySelector('#employeeAbsenceForm input[name="endDate"]');
  if (workDateInput && !workDateInput.value) workDateInput.value = currentDateKey();
  if (absenceStartInput && !absenceStartInput.value) absenceStartInput.value = currentDateKey();
  if (absenceEndInput && !absenceEndInput.value) absenceEndInput.value = currentDateKey();
  const documentMonthInput = document.querySelector('#employeeDocumentForm input[name="month"]');
  if (documentMonthInput && !documentMonthInput.value) documentMonthInput.value = monthKey;
  document.querySelectorAll('#employeeLateForm input[name="date"], #employeeGoalForm input[name="startDate"], #employeeGoalForm input[name="endDate"], #employeeOneOnOneForm input[name="date"], #companyPlanForm input[name="date"]').forEach((input) => {
    if (!input.value) input.value = currentDateKey();
  });

  renderEmployeeOptions();
  renderEmployeeRows(employees, monthKey, year);
  renderEmployeeAbsenceRequests();
  renderEmployeeWorkRows(monthKey);
  renderEmployeeDocumentRows(monthKey);
  renderEmployeeOps(monthKey);
  renderEmployeeCalendar(monthKey, employees);
}

function renderEmployeeRows(employees, monthKey, year) {
  setText("employeeRowsCount", `${employees.length} osoba`);
  document.getElementById("employeeRows").innerHTML = employees.length
    ? employees
        .map((employee) => {
          const vacationUsed = employeeYearAbsenceDays(employee.id, year, "Godišnji odmor");
          const giftUsed = employeeYearAbsenceDays(employee.id, year, "Poklon dan");
          const sickDays = employeeYearAbsenceDays(employee.id, year, "Bolovanje");
          const hours = employeeMonthHours(employee.id, monthKey);
          const expected = employeeExpectedHours(employee, monthKey);
          const balance = employeeHourBalance(employee, monthKey);
          const vacationLeft = Math.max(Number(employee.vacationDays || 0) - vacationUsed, 0);
          const giftLeft = Math.max(Number(employee.giftDays || 0) - giftUsed, 0);
          return `
          <tr>
            <td><strong>${employee.name}</strong><br /><span>${employee.email}</span></td>
            <td>${employee.position || "Nije uneto"}<br /><span>${employee.status || "Aktivan"}</span></td>
            <td>${formatDate(employee.startDate)}</td>
            <td>${currency.format(Number(employee.salary || 0))}</td>
            <td><strong>${vacationUsed}/${employee.vacationDays || 26}</strong><br /><span>${vacationLeft} preostalo</span></td>
            <td><strong>${giftUsed}/${employee.giftDays || 1}</strong><br /><span>${giftLeft} preostalo</span></td>
            <td>${sickDays} dana</td>
            <td><strong>${hours}h</strong><br /><span>od ${expected}h</span></td>
            <td><span class="status ${balanceClass(balance)}">${formatHourBalance(balance)}</span></td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="9">Nema zaposlenih za izabrani filter.</td></tr>`;
}

function renderEmployeeWorkRows(monthKey) {
  const rows = state.employeeWorkLogs
    .filter((log) => String(log.date || "").startsWith(monthKey))
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

function renderEmployeeDocumentRows(monthKey) {
  const rows = state.employeeDocuments
    .filter((documentItem) => String(documentItem.month || "").startsWith(monthKey))
    .filter((documentItem) => {
      const employee = employeeById(documentItem.employeeId);
      return employee && bySearch({ ...documentItem, employee: employee.name });
    })
    .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
    .map((documentItem) => {
      const employee = employeeById(documentItem.employeeId);
      const fileLabel = documentItem.fileData
        ? `<a class="document-link" href="${documentItem.fileData}" download="${documentItem.fileName || "dokument"}">${documentItem.fileName || "Preuzmi"}</a>`
        : documentItem.fileName || "Fajl nije sačuvan lokalno";
      return `
      <tr>
        <td>${monthLabel(documentItem.month)}</td>
        <td>${employee?.name || "Obrisan zaposleni"}</td>
        <td>${documentItem.type || "Dokument"}</td>
        <td>${fileLabel}</td>
        <td>${documentItem.note || ""}</td>
      </tr>`;
    });
  setText("employeeDocumentRowsCount", `${rows.length} dokumenata`);
  document.getElementById("employeeDocumentRows").innerHTML = rows.join("") || `<tr><td colspan="5">Nema dokumenata za ovaj mesec.</td></tr>`;
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
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);
  const target = document.getElementById("employeeLateRows");
  if (!target) return;
  target.innerHTML = rows.length
    ? rows
        .map((record) => {
          const employee = employeeById(record.employeeId);
          return `
          <div class="setup-item alert-item warn">
            <strong>${record.minutes}m</strong>
            <span>${employee?.name || "Zaposleni"} · ${formatDate(record.date)}<br />${record.reason || ""}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state">Nema kašnjenja u ovom mesecu.</div>`;
}

function renderEmployeeGoalRows() {
  const rows = (state.employeeGoals || [])
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

function renderEmployeeCalendar(monthKey, employees) {
  const days = monthDayKeys(monthKey);
  const firstDay = parseDate(days[0]).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const blanks = Array.from({ length: offset }, () => `<div class="calendar-day empty"></div>`).join("");
  const monthAbsences = state.employeeAbsences.filter((absence) => dateRangeKeys(absence.startDate, absence.endDate).some((day) => day.startsWith(monthKey)));
  const monthLogs = state.employeeWorkLogs.filter((log) => String(log.date || "").startsWith(monthKey));
  const monthPlans = (state.companyPlans || []).filter((plan) => String(plan.date || "").startsWith(monthKey));
  document.getElementById("employeeCalendar").innerHTML = `
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
          const shouldShowAbsence = employeeCalendarFilter === "all" || employeeCalendarFilter === "absence";
          const shouldShowHours = employeeCalendarFilter === "all" || employeeCalendarFilter === "hours";
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
              shouldShowAbsence
                ? absences
                    .slice(0, 3)
                    .map((absence) => {
                      const employee = employees.find((item) => item.id === absence.employeeId) || employeeById(absence.employeeId);
                      return `<span class="calendar-note ${absence.type === "Bolovanje" ? "sick-note" : "vacation-note"}">${employee?.name || "Zaposleni"} · ${absence.type}</span>`;
                    })
                    .join("")
                : ""
            }
            ${
              shouldShowHours && logs.length
                ? `<span class="calendar-note hours-note">${logs.reduce((sum, log) => sum + Number(log.hours || 0), 0)}h uneto</span>`
                : ""
            }
          </div>`;
        })
        .join("")}
    </div>`;
}

function renderSales() {
  document.getElementById("pipeline").innerHTML = stages
    .map((stage) => {
      const deals = state.deals.filter((deal) => deal.stage === stage && bySearch(deal));
      const total = deals.reduce((sum, deal) => sum + Number(deal.value), 0);
      return `
        <section class="column">
          <div class="column-head"><strong>${stage}</strong><span>${currency.format(total)}</span></div>
          ${deals
            .map(
              (deal) => `
              <article class="deal-card">
                <h3>${deal.name}</h3>
                <p>${deal.note}</p>
                <div class="deal-meta">
                  <span class="pill">${deal.country}</span>
                  <span class="pill">${currency.format(deal.value)}</span>
                </div>
              </article>`
            )
            .join("")}
        </section>`;
    })
    .join("");
}

function renderClients() {
  const clients = visibleClients().filter((client) => activeFilter === "all" || client.country === activeFilter);
  document.getElementById("clientCards").innerHTML = clients
    .map((client) => {
      const paymentClass = paymentStatusClass(client);
      const endDate = contractEndDate(client);
      const daysLeft = endDate ? daysBetween(currentDateKey(), endDate) : null;
      return `
      <article class="client-card" data-client-id="${client.id}">
        <header>
          <div>
            <h3>${client.name}</h3>
            <p>${client.niche} · ${client.country}</p>
          </div>
          <div class="card-actions">
            <span class="status ${paymentClass}">${client.paymentStatus || "Plaćeno"}</span>
            <button class="edit-button" data-edit-client="${client.id}" type="button" title="Izmeni klijenta">✎</button>
          </div>
        </header>
        <div class="client-meta">
          <span class="pill">${displayPackage(client.package)}</span>
          <span class="pill">${currency.format(client.revenue)}/mes</span>
          <span class="pill">Start ${formatDate(client.startDate)}</span>
          <span class="pill">${endDate ? `Ugovor do ${formatDate(endDate)}` : "Ugovor nije unet"}</span>
          ${daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 ? `<span class="pill danger-pill">${daysLeft} dana do isteka</span>` : ""}
          <span class="pill">Naplata dan ${client.billingDay || 1}</span>
        </div>
        <p><strong>Kontakt:</strong> ${client.contactName || "Nije unet"}</p>
        <p><strong>Login:</strong> ${client.loginEmail || "nije unet"} · ${client.loginPassword || "nije uneta"}</p>
        <div class="lead-actions">
          <a class="secondary-button" href="client-login.html" target="_blank" rel="noreferrer">Otvori login</a>
        </div>
      </article>`;
    })
    .join("");
  bindEditButtons();
}

function renderProduction() {
  document.getElementById("productionBoard").innerHTML = roles
    .map((role) => {
      const tasks = state.tasks.filter((task) => task.role === role && bySearch(task));
      return `
        <section class="column">
          <div class="column-head"><strong>${role}</strong><span>${tasks.length}</span></div>
          ${tasks
            .map(
              (task) => `
              <article class="task-card">
                <h3>${task.title}</h3>
                <p>${task.client}</p>
                <div class="task-meta">
                  <span class="pill">${task.due}</span>
                  <span class="pill">${task.priority}</span>
                </div>
              </article>`
            )
            .join("")}
        </section>`;
    })
    .join("");
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
  const won = leads.filter((lead) => lead.status === "Zakazan" || lead.status === "Dobijen");
  const open = leads.filter((lead) => lead.status === "Novi" || lead.status === "Pozvan");
  const conversion = leads.length ? Math.round((won.length / leads.length) * 100) : 0;

  setText("portalClientName", client.name);
  setText("portalTotalLeads", leads.length);
  setText("portalWonLeads", won.length);
  setText("portalOpenLeads", open.length);
  setText("portalConversion", `${conversion}%`);
  setText("portalActionCount", `${open.length} za proveru`);
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
              <span class="status ${portalLeadStatusClass(lead.status)}">${lead.status || "Novi"}</span>
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
              <button class="secondary-button portal-lead-status" data-lead-id="${lead.id}" data-status="Pozvan" type="button">Pozvan</button>
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
  if (status === "Dobijen" || status === "Zakazan") return "ok";
  if (status === "Izgubljen") return "danger";
  return "warn";
}

function groupCount(items, key) {
  return items.reduce((acc, item) => {
    const label = item[key] || "Nije uneto";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

function paymentStatusClass(client) {
  if (client.paymentStatus === "Plaćeno" || client.paymentStatus === "Interno") return "ok";
  if (client.paymentStatus === "Kasni") return "danger";
  return "warn";
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
      const whatsappText = encodeURIComponent(
        `Novi lead za ${lead.client}: ${lead.name}, ${lead.phone}, usluga: ${lead.service}. Pozvati u roku od 1 radnog dana da garancija ostane važeća.`
      );
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
          <button class="secondary-button lead-status-btn" data-lead-id="${lead.id}" data-status="Pozvan" type="button">Pozvan</button>
          <button class="secondary-button lead-status-btn" data-lead-id="${lead.id}" data-status="Zakazan" type="button">Zakazan</button>
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
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  document.getElementById(target).innerHTML = entries
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
  document.getElementById(id).textContent = value;
}

function renderAll() {
  const notificationCount = (state.notifications || []).length;
  generateSystemNotifications();
  if ((state.notifications || []).length !== notificationCount) saveState();
  renderAdminPanel();
  if (document.getElementById("activeClients")) renderDashboard();
  if (document.getElementById("pipeline")) renderSales();
  if (document.getElementById("clientCards")) renderClients();
  if (document.getElementById("leadCards")) renderLeadCrm();
  if (document.getElementById("productionBoard")) renderProduction();
  if (document.getElementById("employees")) renderEmployees();
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

document.getElementById("employeeMonthFilter")?.addEventListener("input", (event) => {
  employeeMonthFilter = event.target.value || currentMonthKey();
  renderAll();
});

document.getElementById("employeeStatusFilter")?.addEventListener("change", (event) => {
  employeeStatusFilter = event.target.value;
  renderAll();
});

document.getElementById("employeeCalendarFilter")?.addEventListener("change", (event) => {
  employeeCalendarFilter = event.target.value;
  renderAll();
});

document.getElementById("employeeForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const name = String(formData.get("name") || "").trim();
  state.employees.unshift({
    id: crypto.randomUUID(),
    name,
    email: String(formData.get("email") || `${loginSlug(name)}@marketizo.local`).trim().toLowerCase(),
    password: String(formData.get("password") || "123456").trim(),
    position: formData.get("position"),
    startDate: formData.get("startDate"),
    salary: Number(formData.get("salary") || 0),
    weeklyHours: Number(formData.get("weeklyHours") || 40),
    isLeader: formData.get("isLeader") === "true",
    leaderId: formData.get("leaderId") || "",
    vacationDays: Number(formData.get("vacationDays") || 26),
    giftDays: Number(formData.get("giftDays") || 1),
    status: formData.get("status"),
  });
  saveState();
  event.currentTarget.reset();
  event.currentTarget.elements.password.value = "123456";
  event.currentTarget.elements.weeklyHours.value = 40;
  event.currentTarget.elements.isLeader.value = "false";
  event.currentTarget.elements.leaderId.value = "";
  event.currentTarget.elements.vacationDays.value = 26;
  event.currentTarget.elements.giftDays.value = 1;
  renderAll();
});

document.getElementById("employeeAbsenceForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || startDate);
  const employeeId = formData.get("employeeId");
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
});

document.getElementById("employeeWorkForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const employeeId = formData.get("employeeId");
  const date = formData.get("date");
  if (hasEmployeeWorkLog(employeeId, date)) {
    alert("Za ovog zaposlenog već postoji zaključan unos za taj dan.");
    return;
  }
  state.employeeWorkLogs.unshift({
    id: crypto.randomUUID(),
    employeeId,
    date,
    hours: Number(formData.get("hours") || 0),
    type: "Rad",
    note: formData.get("note"),
    locked: true,
    submittedAt: new Date().toISOString(),
  });
  saveState();
  event.currentTarget.reset();
  event.currentTarget.elements.date.value = currentDateKey();
  event.currentTarget.elements.hours.value = 8;
  renderAll();
});

document.getElementById("employeeDocumentForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const file = formData.get("file");
  state.employeeDocuments.unshift({
    id: crypto.randomUUID(),
    employeeId: formData.get("employeeId"),
    month: formData.get("month") || employeeMonthKey(),
    type: formData.get("type"),
    fileName: file?.name || "",
    fileData: await readSmallFile(file),
    note: formData.get("note"),
    uploadedBy: "Admin",
    uploadedAt: new Date().toISOString(),
  });
  saveState();
  event.currentTarget.reset();
  event.currentTarget.elements.month.value = employeeMonthKey();
  renderAll();
});

document.getElementById("employeeLateForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const record = {
    id: crypto.randomUUID(),
    employeeId: formData.get("employeeId"),
    date: formData.get("date"),
    minutes: Number(formData.get("minutes") || 0),
    reason: formData.get("reason"),
    createdAt: new Date().toISOString(),
  };
  state.employeeLateRecords.unshift(record);
  notifyOnce({
    key: `late-record-${record.id}`,
    scope: "employee",
    targetId: record.employeeId,
    type: "warn",
    title: "Upisano kašnjenje",
    message: `${record.minutes} minuta · ${formatDate(record.date)} · ${record.reason}`,
  });
  saveState();
  event.currentTarget.reset();
  event.currentTarget.elements.date.value = currentDateKey();
  event.currentTarget.elements.minutes.value = 10;
  renderAll();
});

document.getElementById("employeeGoalForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const goal = {
    id: crypto.randomUUID(),
    employeeId: formData.get("employeeId"),
    title: formData.get("title"),
    target: formData.get("target"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    progress: Number(formData.get("progress") || 0),
    status: formData.get("status"),
    note: "",
  };
  state.employeeGoals.unshift(goal);
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
});

document.getElementById("employeeOneOnOneForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const note = {
    id: crypto.randomUUID(),
    employeeId: formData.get("employeeId"),
    date: formData.get("date"),
    title: formData.get("title"),
    note: formData.get("note"),
    createdBy: "Admin",
    visibleToEmployee: true,
  };
  state.employeeOneOnOnes.unshift(note);
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
});

const clientModal = document.getElementById("clientModal");
document.getElementById("openClientModal").addEventListener("click", () => {
  setActiveView("clients");
  const panel = document.getElementById("clientAddPanel");
  if (panel) panel.hidden = false;
  const firstInput = document.querySelector('#adminClientForm input[name="name"]');
  firstInput?.scrollIntoView({ behavior: "smooth", block: "center" });
  firstInput?.focus();
});
document.getElementById("closeClientModal").addEventListener("click", () => clientModal.close());
document.getElementById("cancelClient").addEventListener("click", () => clientModal.close());

document.getElementById("clientForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.clients.unshift({
    id: crypto.randomUUID(),
    name: formData.get("name"),
    niche: formData.get("niche"),
    country: formData.get("country"),
    status: formData.get("status"),
    revenue: Number(formData.get("revenue")),
    leads: Number(formData.get("leads")),
    cpl: 0,
    owner: "Miljan / Ivana",
    team: "Dodeliti tim",
    package: "Garancija paket",
    guaranteeTarget: 30,
    contactName: "",
    contactPhone: "",
    whatsapp: "",
    billingDay: 1,
    paymentStatus: "Nije plaćeno",
    invoiceStatus: "Nije poslat",
    paymentMethod: "Firma",
    invoices: {},
    startDate: "",
    metaPageId: "",
    metaFormId: "",
  });
  withInvoiceDefaults(state.clients[0]);
  saveState();
  event.currentTarget.reset();
  clientModal.close();
  renderAll();
});

document.getElementById("adminClientForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const values = packageValues(formData.get("package"), formData.get("revenue"), formData.get("contractMonths"));
  const contractFile = formData.get("contractFile");
  const invoiceStatus = formData.get("invoiceStatus");
  const paymentStatus = formData.get("paymentStatus");
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
    team: "Dodeliti tim",
    package: values.package,
    guaranteeTarget: Number(formData.get("guaranteeTarget")),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    whatsapp: formData.get("whatsapp"),
    loginEmail: formData.get("loginEmail"),
    loginPassword: formData.get("loginPassword"),
    billingDay: Number(formData.get("billingDay")),
    paymentStatus,
    invoiceStatus,
    paymentMethod: formData.get("paymentMethod"),
    invoices: {
      [selectedMonthKey()]: {
        invoiceStatus,
        paymentStatus,
        paymentMethod: formData.get("paymentMethod"),
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
    invoiceStatus: formData.get("invoiceStatus"),
    paymentStatus: formData.get("paymentStatus"),
    paymentMethod: formData.get("paymentMethod"),
    billingDay: Number(formData.get("billingDay")),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    whatsapp: formData.get("whatsapp"),
    loginEmail: formData.get("loginEmail"),
    loginPassword: formData.get("loginPassword"),
    contractNote: formData.get("contractNote"),
  });
  if (contractFile?.name) {
    client.contractFileName = contractFile.name;
    client.contractFileData = contractFileData;
  }
  const invoice = monthlyInvoice(client);
  invoice.invoiceStatus = formData.get("invoiceStatus");
  invoice.paymentStatus = formData.get("paymentStatus");
  invoice.paymentMethod = formData.get("paymentMethod");
  if (invoice.invoiceStatus === "Poslat" && !invoice.sentAt) invoice.sentAt = new Date().toISOString();
  if (invoice.invoiceStatus !== "Poslat") invoice.sentAt = "";
  if (invoice.paymentStatus === "Plaćeno") invoice.paidAt = new Date().toISOString();
  withLoginDefaults(client);
  saveState();
  editClientModal.close();
  renderAll();
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
    createdAt: new Date().toISOString(),
    calledAt: null,
    lastContact: "",
    lastStatusChangeAt: "",
  };
  state.leads.unshift(lead);
  client.leads = Number(client.leads || 0) + 1;
  saveState();
  event.currentTarget.reset();
  document.getElementById("portalLeadPanel")?.setAttribute("hidden", "");
  renderAll();
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
    note: "Ručno dodat lead.",
  });
  const client = state.clients.find((item) => item.name === formData.get("client"));
  if (client) client.leads = Number(client.leads) + 1;
  saveState();
  event.currentTarget.reset();
  leadModal?.close();
  renderAll();
});

function updateLeadStatus(id, status) {
  const lead = state.leads.find((item) => item.id === id);
  if (!lead) return;
  lead.status = status;
  if ((status === "Pozvan" || status === "Zakazan") && !lead.calledAt) {
    lead.calledAt = new Date().toISOString();
  }
  lead.lastStatusChangeAt = new Date().toISOString();
  saveState();
  renderAll();
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

renderAll();
updateContextActions("admin");
