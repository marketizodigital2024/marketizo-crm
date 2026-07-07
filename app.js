const stages = ["Novi lead", "Kvalifikovan", "Poziv zakazan", "Ponuda poslata", "Zatvoren"];
const roles = ["Scenarista", "Snimatelj", "Editor", "Media buyer", "SMM"];
const leadSlaHours = 24;
const packageConfig = {
  Starter: { price: 997, months: 3 },
  Business: { price: 1497, months: 6 },
  Enterprise: { price: 1997, months: 6 },
  Custom: { price: 0, months: 3 },
};
const demoClientNames = new Set(["Marketizo Digital", "Dental Studio Wien", "Auto Detailing Zagreb", "Physio Klinik München", "Beauty Laser Beograd"]);

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

const currency = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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
    })));
  });
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
      ...lead,
    })),
    teamMembers: data.teamMembers || starterData.teamMembers,
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
  renderPackageSummary(active);
  renderBars("adminCountryBars", groupSum(active, "country", "revenue"), "€");
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
      if (control.dataset.invoiceField === "invoiceStatus") client.invoiceStatus = control.value;
      if (control.dataset.invoiceField === "paymentStatus") client.paymentStatus = control.value;
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
  const statuses = clients.reduce((acc, client) => {
    const status = client.status || "Aktivan";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  document.getElementById("adminStatusSummary").innerHTML = Object.entries(statuses)
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
  renderAdminPanel();
  if (document.getElementById("activeClients")) renderDashboard();
  if (document.getElementById("pipeline")) renderSales();
  if (document.getElementById("clientCards")) renderClients();
  if (document.getElementById("leadCards")) renderLeadCrm();
  if (document.getElementById("productionBoard")) renderProduction();
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

document.getElementById("adminClientForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const values = packageValues(formData.get("package"), formData.get("revenue"), formData.get("contractMonths"));
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
    paymentStatus: formData.get("paymentStatus"),
    invoiceStatus: formData.get("invoiceStatus"),
    paymentMethod: formData.get("paymentMethod"),
    invoices: {
      [selectedMonthKey()]: {
        invoiceStatus: formData.get("invoiceStatus"),
        paymentStatus: formData.get("paymentStatus"),
        paymentMethod: formData.get("paymentMethod"),
      },
    },
    contractMonths: values.contractMonths,
    startDate: formData.get("startDate"),
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

document.getElementById("editClientForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const client = state.clients.find((item) => item.id === formData.get("id"));
  if (!client) return;
  const values = packageValues(formData.get("package"), formData.get("revenue"), formData.get("contractMonths"));
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
  });
  const invoice = monthlyInvoice(client);
  invoice.invoiceStatus = formData.get("invoiceStatus");
  invoice.paymentStatus = formData.get("paymentStatus");
  invoice.paymentMethod = formData.get("paymentMethod");
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

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "agency-crm-export.json";
  link.click();
  URL.revokeObjectURL(url);
});

renderAll();
updateContextActions("admin");
