const state = JSON.parse(localStorage.getItem("agencyCrmData") || '{"clients":[],"leads":[],"teamMembers":[]}');
let activeClient = null;
let clientFilters = {
  startDate: "",
  endDate: "",
  source: "all",
  status: "all",
  responsible: "all",
};
let unreadLeadNotifications = 0;
let deferredInstallPrompt = null;

const currency = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

function saveState() {
  localStorage.setItem("agencyCrmData", JSON.stringify(state));
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

function ensureLoginData() {
  state.clients = state.clients || [];
  state.clients.forEach((client) => {
    client.loginEmail = client.loginEmail || `${loginSlug(client.name)}@marketizo.local`;
    client.loginPassword = client.loginPassword || "123456";
  });
  saveState();
}

function renderLoginHint() {
  const hint = document.getElementById("loginHint");
  if (!hint) return;
  const client = state.clients?.[0];
  hint.innerHTML = client
    ? `<strong>Test login:</strong><span>${client.loginEmail}</span><span>Lozinka: ${client.loginPassword}</span>`
    : `<strong>Nema klijenata.</strong><span>Prvo dodaj klijenta u admin delu.</span>`;
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function updateNotificationBadge() {
  const badge = document.getElementById("notificationBadge");
  if (!badge) return;
  badge.textContent = unreadLeadNotifications;
  badge.hidden = unreadLeadNotifications === 0;
}

function showLeadNotification(lead) {
  unreadLeadNotifications += 1;
  updateNotificationBadge();
  const toast = document.getElementById("leadToast");
  if (toast) {
    toast.innerHTML = `<strong>Novi lead je stigao</strong><span>${lead.name || "Novi kontakt"} · ${lead.phone || "Telefon nije unet"}</span>`;
    toast.hidden = false;
    window.clearTimeout(showLeadNotification.timeoutId);
    showLeadNotification.timeoutId = window.setTimeout(() => {
      toast.hidden = true;
    }, 5200);
  }
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Novi lead je stigao", {
      body: `${lead.name || "Novi kontakt"} · ${lead.phone || "Telefon nije unet"}`,
    });
  }
}

function showLeadSummaryOnLogin() {
  const openNew = clientLeads().filter((lead) => (lead.status || "Novi") === "Novi");
  unreadLeadNotifications = openNew.length;
  updateNotificationBadge();
  const toast = document.getElementById("leadToast");
  if (!toast) return;
  toast.innerHTML = openNew.length
    ? `<strong>${openNew.length} leadova čeka obradu</strong><span>Otvori listu leadova i pozovi ih direktno iz aplikacije.</span>`
    : `<strong>Nema novih leadova</strong><span>Svi leadovi su trenutno obrađeni ili u procesu.</span>`;
  toast.hidden = false;
}

function defaultClientSettings() {
  return {
    statuses: ["Novi", "Kontaktiran", "Potvrđen", "Izgubljen", "Na čekanju"],
    sources: ["Facebook", "Instagram", "TikTok", "Google", "Preporuka", "Ostalo"],
    services: ["Konsultacija", "Pregled", "Tretman", "Usluga", "Ostalo"],
    lossReasons: ["Prekupo", "Nema budžet", "Nije hitno", "Odabrao konkurenciju", "Nema odgovora", "Nije dobar fit", "Odloženo", "Interno rešavaju", "Ostalo"],
  };
}

function mergeUnique(primary, fallback) {
  return [...new Set([...(primary || []), ...(fallback || [])].map((item) => String(item || "").trim()).filter(Boolean))];
}

function clientSettings() {
  if (!activeClient) return defaultClientSettings();
  const defaults = defaultClientSettings();
  const saved = activeClient.crmSettings || {};
  activeClient.crmSettings = {
    statuses: defaults.statuses,
    sources: defaults.sources,
    services: saved.services?.length ? saved.services : defaults.services,
    lossReasons: defaults.lossReasons,
  };
  return activeClient.crmSettings;
}

function parseLines(value, fallback) {
  const lines = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? [...new Set(lines)] : fallback;
}

function selectOptions(options, selected = "", emptyLabel = "") {
  const values = mergeUnique(selected ? [selected] : [], options);
  const empty = emptyLabel ? `<option value="">${emptyLabel}</option>` : "";
  return (
    empty +
    values
      .map((option) => `<option value="${option}" ${option === selected ? "selected" : ""}>${option}</option>`)
      .join("")
  );
}

function isWonStatus(status) {
  return ["Potvrđen", "Dobijen", "Zakazan"].includes(status);
}

function isLostStatus(status) {
  return status === "Izgubljen";
}

function isOpenStatus(status) {
  return !isWonStatus(status) && !isLostStatus(status);
}

function isContactedStatus(status) {
  return ["Kontaktiran", "Pozvan", "Potvrđen", "Dobijen", "Zakazan"].includes(status);
}

function clientLeads() {
  if (!activeClient) return [];
  return (state.leads || []).filter((lead) => lead.client === activeClient.name);
}

function filteredClientLeads() {
  return clientLeads().filter((lead) => {
    const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
    if (clientFilters.startDate && (!createdAt || createdAt < new Date(clientFilters.startDate))) return false;
    if (clientFilters.endDate) {
      const endDate = new Date(clientFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (!createdAt || createdAt > endDate) return false;
    }
    if (clientFilters.source !== "all" && (lead.source || "Nije uneto") !== clientFilters.source) return false;
    if (clientFilters.status !== "all" && (lead.status || "Novi") !== clientFilters.status) return false;
    if (clientFilters.responsible !== "all" && (lead.responsible || "Nije dodeljeno") !== clientFilters.responsible) return false;
    return true;
  });
}

function clientTeam() {
  if (!activeClient) return [];
  state.teamMembers = state.teamMembers || [];
  return state.teamMembers.filter((member) => member.client === activeClient.name);
}

function groupCount(items, key) {
  return items.reduce((acc, item) => {
    const label = item[key] || "Nije uneto";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

function groupSum(items, key, valueKey) {
  return items.reduce((acc, item) => {
    const label = item[key] || "Nije uneto";
    acc[label] = (acc[label] || 0) + Number(item[valueKey] || 0);
    return acc;
  }, {});
}

function topEntry(data) {
  const entries = Object.entries(data);
  if (!entries.length) return ["Nije uneto", 0];
  return entries.sort((a, b) => Number(b[1]) - Number(a[1]))[0];
}

function renderBars(target, data) {
  const element = document.getElementById(target);
  if (!element) return;
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  element.innerHTML = entries.length
    ? entries
        .map(
          ([label, value]) => `
          <div class="bar-row">
            <label><span>${label}</span><span>${value}</span></label>
            <div class="bar-track"><span style="width:${(value / max) * 100}%"></span></div>
          </div>`
        )
        .join("")
    : `<div class="empty-state">Nema podataka.</div>`;
}

function statusClass(status) {
  if (isWonStatus(status)) return "ok";
  if (isLostStatus(status)) return "danger";
  if (status === "Novi") return "danger";
  return "warn";
}

function leadRowClass(lead) {
  if (isWonStatus(lead.status)) return "ok";
  if (lead.status === "Kontaktiran" || lead.status === "Pozvan" || lead.status === "Na čekanju") return "warn";
  return "danger";
}

function statusOptions(selectedStatus) {
  return selectOptions(clientSettings().statuses, selectedStatus || "Novi");
}

function updateLeadStatus(lead, status) {
  lead.status = status;
  lead.lastStatusChangeAt = new Date().toISOString();
  if (status === "Novi") {
    lead.calledAt = null;
  }
  if (isContactedStatus(status) && !lead.calledAt) {
    lead.calledAt = new Date().toISOString();
  }
}

function renderClientApp() {
  const settings = clientSettings();
  const allLeads = clientLeads();
  const leads = filteredClientLeads();
  const team = clientTeam();
  const won = leads.filter((lead) => isWonStatus(lead.status));
  const open = leads.filter((lead) => isOpenStatus(lead.status || "Novi"));
  const lost = leads.filter((lead) => isLostStatus(lead.status));
  const closed = leads.filter((lead) => isWonStatus(lead.status) || isLostStatus(lead.status));
  const conversion = leads.length ? Math.round((won.length / leads.length) * 100) : 0;
  const closedWinRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
  const pipeline = open.reduce((sum, lead) => sum + Number(lead.estimate || 0), 0);
  const closedValue = won.reduce((sum, lead) => sum + Number(lead.estimate || 0), 0);
  const lateFollowUps = open.filter(isFollowUpLate);

  setText("clientPortalName", activeClient.name);
  setText("clientTotalLeads", leads.length);
  setText("clientWonLeads", won.length);
  setText("clientOpenLeads", open.length);
  setText("clientConversion", `${conversion}%`);
  setText("clientLostLeads", lost.length);
  setText("clientPipelineValue", currency.format(pipeline));
  setText("clientClosedValue", currency.format(closedValue));
  setText("clientLateFollowUp", lateFollowUps.length);
  setText("clientClosedWinRate", `${closedWinRate}%`);
  setText("clientActionCount", `${open.length} za poziv`);
  setText("clientTeamCount", `${team.length} osoba`);

  renderFilterOptions(allLeads, team);
  renderLeadSelects();
  renderSettingsForm();
  renderTopScore(leads, won, lost, open, pipeline);
  renderBars("clientStatusBars", groupCount(leads, "status"));
  renderBars("clientSourceBars", groupCount(leads, "source"));
  renderBars("clientResponsibleBars", groupCount(leads.map((lead) => ({ ...lead, responsible: lead.responsible || "Nije dodeljeno" })), "responsible"));
  renderBars("clientLossBars", groupCount(lost.map((lead) => ({ ...lead, lossReason: lead.lossReason || "Nije unet razlog" })), "lossReason"));
  renderTeamClosing(leads, team);
  renderCallResponsibility(leads, open, lateFollowUps);
  renderActionList(open);
  renderLeadList(leads);
  renderTeam(team);
  renderResponsibleOptions(team);
}

function isFollowUpLate(lead) {
  if (!isOpenStatus(lead.status || "Novi")) return false;
  if (!lead.createdAt) return false;
  const dueTime = new Date(lead.createdAt).getTime() + 24 * 60 * 60 * 1000;
  return Date.now() > dueTime && !lead.calledAt;
}

function renderFilterOptions(leads, team) {
  const settings = clientSettings();
  updateSelectOptions("clientSourceFilter", ["all", ...mergeUnique(leads.map((lead) => lead.source || "Nije uneto"), settings.sources)], clientFilters.source, "Svi izvori");
  updateSelectOptions("clientStatusFilter", ["all", ...mergeUnique(leads.map((lead) => lead.status || "Novi"), settings.statuses)], clientFilters.status, "Svi statusi");
  const responsible = new Set(leads.map((lead) => lead.responsible || "Nije dodeljeno"));
  team.forEach((member) => responsible.add(member.name));
  updateSelectOptions("clientResponsibleFilter", ["all", ...responsible], clientFilters.responsible, "Sve osobe");
}

function renderLeadSelects() {
  const settings = clientSettings();
  const sourceOptions = selectOptions(settings.sources, "", "");
  const serviceOptions = selectOptions(settings.services, "", "");
  const statusOptionsHtml = selectOptions(settings.statuses, "Novi", "");
  const lossOptions = selectOptions(settings.lossReasons, "", "Bez razloga");
  const leadSource = document.getElementById("leadSource");
  const leadService = document.getElementById("leadService");
  const leadStatus = document.getElementById("leadStatus");
  const leadLossReason = document.getElementById("leadLossReason");
  if (leadSource) leadSource.innerHTML = sourceOptions;
  if (leadService) leadService.innerHTML = serviceOptions;
  if (leadStatus) leadStatus.innerHTML = statusOptionsHtml;
  if (leadLossReason) leadLossReason.innerHTML = lossOptions;
}

function renderSettingsForm() {
  const settings = clientSettings();
  const services = document.getElementById("settingsServices");
  if (!services || services.dataset.ready === "1") return;
  document.getElementById("settingsServices").value = settings.services.join("\n");
  const fixedPreview = document.getElementById("settingsFixedPreview");
  if (fixedPreview) {
    fixedPreview.innerHTML = [...settings.statuses, ...settings.sources, ...settings.lossReasons]
      .map((item) => `<span>${item}</span>`)
      .join("");
  }
  services.dataset.ready = "1";
}

function updateSelectOptions(id, values, selected, allLabel) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = values
    .map((value) => `<option value="${value}" ${value === selected ? "selected" : ""}>${value === "all" ? allLabel : value}</option>`)
    .join("");
}

function renderTopScore(leads, won, lost, open, pipeline) {
  const [topSource, topSourceCount] = topEntry(groupCount(leads, "source"));
  const [topCloser, topCloserCount] = topEntry(groupCount(won.map((lead) => ({ ...lead, responsible: lead.responsible || "Nije dodeljeno" })), "responsible"));
  const [topLoss, topLossCount] = topEntry(groupCount(lost.map((lead) => ({ ...lead, lossReason: lead.lossReason || "Nije unet razlog" })), "lossReason"));
  const avgWon = won.length ? won.reduce((sum, lead) => sum + Number(lead.estimate || 0), 0) / won.length : 0;
  document.getElementById("clientTopScore").innerHTML = `
    <div class="setup-item"><strong>${topSourceCount}</strong><span>Top izvor: ${topSource}</span></div>
    <div class="setup-item"><strong>${topCloserCount}</strong><span>Najviše zatvara: ${topCloser}</span></div>
    <div class="setup-item"><strong>${topLossCount}</strong><span>Najčešći razlog gubitka: ${topLoss}</span></div>
    <div class="setup-item"><strong>${open.length}</strong><span>Otvoren pipeline: ${currency.format(pipeline)}</span></div>
    <div class="setup-item"><strong>${currency.format(avgWon)}</strong><span>Prosečna vrednost dobijenog leada</span></div>`;
}

function renderTeamClosing(leads, team) {
  const names = new Set(team.map((member) => member.name));
  leads.forEach((lead) => names.add(lead.responsible || "Nije dodeljeno"));
  const rows = [...names].map((name) => {
    const personLeads = leads.filter((lead) => (lead.responsible || "Nije dodeljeno") === name);
    const won = personLeads.filter((lead) => isWonStatus(lead.status)).length;
    const lost = personLeads.filter((lead) => isLostStatus(lead.status)).length;
    const total = won + lost;
    const winRate = total ? Math.round((won / total) * 100) : 0;
    return `<tr><td>${name}</td><td>${won}</td><td>${lost}</td><td>${winRate}%</td></tr>`;
  });
  document.getElementById("clientTeamClosingRows").innerHTML = rows.join("") || `<tr><td colspan="4">Nema podataka.</td></tr>`;
}

function renderCallResponsibility(leads, open, lateFollowUps) {
  const contacted = leads.filter((lead) => lead.calledAt || isContactedStatus(lead.status)).length;
  const unassigned = open.filter((lead) => !lead.responsible).length;
  const responseRate = leads.length ? Math.round((contacted / leads.length) * 100) : 0;
  document.getElementById("clientCallResponsibility").innerHTML = `
    <div class="setup-item"><strong>${contacted}</strong><span>Kontaktirano leadova</span></div>
    <div class="setup-item"><strong>${responseRate}%</strong><span>Stopa odgovora na leadove</span></div>
    <div class="setup-item"><strong>${lateFollowUps.length}</strong><span>Kasni follow-up preko 24h</span></div>
    <div class="setup-item"><strong>${unassigned}</strong><span>Otvoreni leadovi bez odgovorne osobe</span></div>`;
}

function renderActionList(leads) {
  document.getElementById("clientActionList").innerHTML = leads.length
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

function renderLeadList(leads) {
  document.getElementById("clientLeadList").innerHTML = leads.length
    ? `<div class="lead-list-header">
        <span>Lead</span>
        <span>Izvor i usluga</span>
        <span>Vrednost i sledeći korak</span>
        <span>Status</span>
        <span>Akcija</span>
      </div>` +
      leads
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .map((lead) => {
          const leadDate = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("sr-RS") : "nije unet";
          const nextAction = lead.nextAction || (lead.status === "Novi" ? "Pozvati što pre" : "Sledeći korak nije unet");
          return `
          <article class="lead-list-row ${leadRowClass(lead)}">
            <div class="lead-list-main">
              <strong>${lead.name}</strong>
              <span>${lead.phone || "Telefon nije unet"} · ${lead.location || "Lokacija nije uneta"}</span>
            </div>
            <div class="lead-list-meta">
              <span>${leadDate}</span>
              <span>${lead.source || "Bez izvora"}</span>
              <span>${lead.service || "Tip usluge nije unet"}</span>
            </div>
            <div class="lead-list-meta">
              <span>${currency.format(Number(lead.estimate || 0))}</span>
              <span>${lead.responsible || "Nije dodeljeno"}</span>
              <span>${nextAction}</span>
            </div>
            <div>
              <select class="table-select lead-status-select" data-id="${lead.id}">
                ${statusOptions(lead.status || "Novi")}
              </select>
              ${lead.note ? `<small class="lead-note">Napomena: ${lead.note}</small>` : ""}
              ${lead.lossReason ? `<small class="lead-loss">Razlog: ${lead.lossReason}</small>` : ""}
            </div>
            <div class="lead-list-actions">
              <a class="call-button" href="tel:${normalizePhone(lead.phone)}">Pozovi</a>
              <button class="edit-button edit-lead" data-id="${lead.id}" type="button" aria-label="Izmeni lead">✎</button>
            </div>
          </article>`;
        })
        .join("")
    : `<section class="panel empty-state">Još nema leadova.</section>`;

  document.querySelectorAll(".lead-status-select").forEach((select) => {
    select.addEventListener("change", () => {
      const lead = state.leads.find((item) => item.id === select.dataset.id);
      if (!lead) return;
      updateLeadStatus(lead, select.value);
      saveState();
      renderClientApp();
    });
  });

  document.querySelectorAll(".edit-lead").forEach((button) => {
    button.addEventListener("click", () => openEditLead(button.dataset.id));
  });
}

function renderTeam(team) {
  document.getElementById("clientTeamList").innerHTML = team.length
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

function renderResponsibleOptions(team) {
  const options = team.length ? team.map((member) => member.name) : ["Vlasnik", "Recepcija", "Prodaja"];
  document.getElementById("leadResponsible").innerHTML = options.map((name) => `<option>${name}</option>`).join("");
}

function renderEditResponsibleOptions(team, selected) {
  const names = new Set(team.length ? team.map((member) => member.name) : ["Vlasnik", "Recepcija", "Prodaja"]);
  if (selected) names.add(selected);
  document.getElementById("editLeadResponsible").innerHTML = [...names]
    .map((name) => `<option value="${name}" ${name === selected ? "selected" : ""}>${name}</option>`)
    .join("");
}

function openEditLead(id) {
  const lead = state.leads.find((item) => item.id === id);
  const form = document.getElementById("editLeadForm");
  const modal = document.getElementById("editLeadModal");
  if (!lead || !form || !modal) return;
  const settings = clientSettings();
  renderEditResponsibleOptions(clientTeam(), lead.responsible);
  document.getElementById("editLeadSource").innerHTML = selectOptions(settings.sources, lead.source || "");
  document.getElementById("editLeadService").innerHTML = selectOptions(settings.services, lead.service || "");
  document.getElementById("editLeadStatus").innerHTML = selectOptions(settings.statuses, lead.status || "Novi");
  document.getElementById("editLeadLossReason").innerHTML = selectOptions(settings.lossReasons, lead.lossReason || "", "Bez razloga");
  form.elements.id.value = lead.id;
  form.elements.name.value = lead.name || "";
  form.elements.phone.value = lead.phone || "";
  form.elements.email.value = lead.email || "";
  form.elements.location.value = lead.location || "";
  form.elements.source.value = lead.source || form.elements.source.value;
  form.elements.service.value = lead.service || form.elements.service.value;
  form.elements.estimate.value = Number(lead.estimate || 0);
  form.elements.responsible.value = lead.responsible || form.elements.responsible.value;
  form.elements.status.value = lead.status || "Novi";
  form.elements.nextAction.value = lead.nextAction || "";
  form.elements.note.value = lead.note || "";
  form.elements.lossReason.value = lead.lossReason || "";
  modal.showModal();
}

document.getElementById("clientLoginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();
  activeClient = (state.clients || []).find((client) => String(client.loginEmail || "").toLowerCase() === email && String(client.loginPassword || "") === password);
  if (!activeClient) {
    document.getElementById("loginError").hidden = false;
    return;
  }
  document.getElementById("loginScreen").hidden = true;
  document.getElementById("clientApp").hidden = false;
  document.getElementById("settingsServices")?.removeAttribute("data-ready");
  renderClientApp();
  showLeadSummaryOnLogin();
});

document.querySelectorAll("[data-client-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-client-tab]").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".client-tab").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.clientTab).classList.add("active");
    setText("clientPageTitle", button.textContent);
  });
});

document.getElementById("clientStartDate")?.addEventListener("input", (event) => {
  clientFilters.startDate = event.target.value;
  renderClientApp();
});

document.getElementById("clientEndDate")?.addEventListener("input", (event) => {
  clientFilters.endDate = event.target.value;
  renderClientApp();
});

document.getElementById("clientSourceFilter")?.addEventListener("change", (event) => {
  clientFilters.source = event.target.value;
  renderClientApp();
});

document.getElementById("clientStatusFilter")?.addEventListener("change", (event) => {
  clientFilters.status = event.target.value;
  renderClientApp();
});

document.getElementById("clientResponsibleFilter")?.addEventListener("change", (event) => {
  clientFilters.responsible = event.target.value;
  renderClientApp();
});

document.getElementById("resetClientFilters")?.addEventListener("click", () => {
  clientFilters = { startDate: "", endDate: "", source: "all", status: "all", responsible: "all" };
  document.getElementById("clientStartDate").value = "";
  document.getElementById("clientEndDate").value = "";
  document.getElementById("clientSourceFilter").value = "all";
  document.getElementById("clientStatusFilter").value = "all";
  document.getElementById("clientResponsibleFilter").value = "all";
  renderClientApp();
});

document.querySelectorAll('#dashboard input[type="date"]').forEach((input) => {
  input.addEventListener("click", () => input.showPicker?.());
});

document.getElementById("toggleLeadForm").addEventListener("click", () => {
  const panel = document.getElementById("leadFormPanel");
  panel.hidden = !panel.hidden;
  if (!panel.hidden) panel.querySelector("input")?.focus();
});

document.getElementById("enableNotifications")?.addEventListener("click", async () => {
  unreadLeadNotifications = 0;
  updateNotificationBadge();
  if (!("Notification" in window)) {
    const toast = document.getElementById("leadToast");
    if (toast) {
      toast.innerHTML = `<strong>Notifikacije u browseru nisu dostupne</strong><span>CRM će i dalje prikazati poruku dok je aplikacija otvorena.</span>`;
      toast.hidden = false;
    }
    return;
  }
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  const toast = document.getElementById("leadToast");
  if (toast) {
    toast.innerHTML =
      Notification.permission === "granted"
        ? `<strong>Notifikacije su uključene</strong><span>Kada lead stigne dok je aplikacija otvorena, prikazaće se obaveštenje.</span>`
        : `<strong>Notifikacije nisu uključene</strong><span>Možeš ih dozvoliti kasnije u podešavanjima browsera.</span>`;
    toast.hidden = false;
  }
});

document.getElementById("clientLeadForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.leads = state.leads || [];
  const newLead = {
    id: crypto.randomUUID(),
    client: activeClient.name,
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
    calledAt: isContactedStatus(formData.get("status")) ? new Date().toISOString() : null,
    lastStatusChangeAt: isContactedStatus(formData.get("status")) ? new Date().toISOString() : "",
  };
  state.leads.unshift(newLead);
  activeClient.leads = Number(activeClient.leads || 0) + 1;
  saveState();
  event.currentTarget.reset();
  document.getElementById("leadFormPanel").hidden = true;
  renderClientApp();
  showLeadNotification(newLead);
});

document.getElementById("editLeadForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const lead = state.leads.find((item) => item.id === formData.get("id"));
  if (!lead) return;
  lead.name = formData.get("name");
  lead.phone = formData.get("phone");
  lead.email = formData.get("email");
  lead.location = formData.get("location");
  lead.source = formData.get("source");
  lead.service = formData.get("service");
  lead.estimate = Number(formData.get("estimate") || 0);
  lead.responsible = formData.get("responsible");
  updateLeadStatus(lead, formData.get("status"));
  lead.nextAction = formData.get("nextAction");
  lead.note = formData.get("note");
  lead.lossReason = formData.get("lossReason");
  saveState();
  document.getElementById("editLeadModal").close();
  renderClientApp();
});

document.getElementById("clientSettingsForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const defaults = defaultClientSettings();
  activeClient.crmSettings = {
    services: parseLines(document.getElementById("settingsServices").value, defaults.services),
  };
  clientFilters.source = "all";
  clientFilters.status = "all";
  saveState();
  renderClientApp();
});

document.getElementById("closeEditLead")?.addEventListener("click", () => {
  document.getElementById("editLeadModal").close();
});

document.getElementById("cancelEditLead")?.addEventListener("click", () => {
  document.getElementById("editLeadModal").close();
});

document.getElementById("clientTeamForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  state.teamMembers = state.teamMembers || [];
  state.teamMembers.push({
    id: crypto.randomUUID(),
    client: activeClient.name,
    name: formData.get("name"),
    role: formData.get("role"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  saveState();
  event.currentTarget.reset();
  renderClientApp();
});

document.getElementById("logoutClient").addEventListener("click", () => {
  activeClient = null;
  document.getElementById("clientApp").hidden = true;
  document.getElementById("loginScreen").hidden = false;
  document.getElementById("clientLoginForm").reset();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

document.getElementById("installClientAppBtn")?.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    const toast = document.getElementById("leadToast");
    if (toast) {
      toast.innerHTML = `<strong>Instalacija aplikacije</strong><span>Opcija se pojavljuje kada je CRM online ili otvoren preko lokalnog servera.</span>`;
      toast.hidden = false;
    }
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
});

ensureLoginData();
renderLoginHint();
