const DEFAULT_API_BASE = "https://api.clickup.com/api/v2";

export function normalizeClientName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\bmarketizo\s+digital\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
}

function customFieldValue(field) {
  if (field?.value == null) return "";
  const options = field.type_config?.options || [];
  const render = (value) => {
    const option = options.find((item) => item.id === value || item.orderindex === value);
    return option?.name || option?.label || value?.username || value?.name || (typeof value === "object" ? "" : value);
  };
  return Array.isArray(field.value) ? field.value.map(render).filter(Boolean).join(", ") : String(render(field.value));
}

export function taskToClient(task) {
  const fields = Object.fromEntries((task.custom_fields || []).map((field) => [field.name, customFieldValue(field)]));
  return {
    clickupTaskId: String(task.id || ""), name: String(task.name || "").trim(), package: fields.Paket || "",
    scenarist: fields["Scenarista (Tim)"] || fields.Scenarista || "", editor: fields["Editor (Tim)"] || fields.Editor || "", smm: fields["SMM (Tim)"] || fields.SMM || "",
    paidAds: fields["Paid Ads (Tim)"] || fields["Paid Ads"] || "", videographer: fields["Snimatelj (Tim)"] || fields.Snimatelj || "", checking: fields.Checking || "",
    updatedAt: task.date_updated ? new Date(Number(task.date_updated)).toISOString() : "",
    assignmentSource: "ClickUp structured role fields",
    reelsMonthly: fields["Reela mesečno"] || "", postsWeekly: fields["Postova nedeljno"] || "",
    storiesWeekly: fields["Storija nedeljno"] || "", clientStatus: fields["Status klijenta"] || "",
    smmLoad: fields["Opterećenje SMM %"] || ""
  };
}

export function matchClickUpClient(groupName, clients) {
  const group = normalizeClientName(groupName);
  const verifiedAliases = {
    "violeta golden bridge": "12445eqxrv8",
    "aleksandar": "12445eqxrvy"
  };
  if (verifiedAliases[group]) return clients.find(client => client.clickupTaskId === verifiedAliases[group]) || null;

  const compact = group.replace(/ /g, "");
  const compactMatches = clients.filter(client => normalizeClientName(client.name).replace(/ /g, "") === compact);
  if (compact && compactMatches.length) return compactMatches.length === 1 ? compactMatches[0] : null;
  if (!group) return null;
  const exact = clients.filter((client) => normalizeClientName(client.name) === group);
  if (exact.length) return exact.length === 1 ? exact[0] : null;
  const candidates = clients.filter((client) => {
    const name = normalizeClientName(client.name);
    return name.length >= 4 && (group.includes(name) || name.includes(group));
  });
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    // A group explicitly naming several businesses keeps each assignment separate.
    if (!/[+&]/.test(String(groupName))) return null;
    const active = candidates.filter(client => client.clientStatus === "Aktivan");
    const selected = active.length ? active : candidates;
    const composite = { clickupTaskId: selected.map(client => client.clickupTaskId).join("+"),
      name: selected.map(client => client.name).join(" + "), clientStatus: active.length ? "Aktivan" : "Neaktivan",
      clients: selected, assignmentSource: "Explicit multi-client group name; separate ClickUp role fields" };
    for (const role of ["scenarist", "editor", "smm", "paidAds", "videographer", "checking"]) {
      composite[role] = selected.map(client => client.name + ": " + (client[role] || "Nije potvrđeno")).join("; ");
    }
    return composite;
  }
  const tokens = group.split(" ").filter(Boolean);
  const tokenMatches = clients.filter(client => {
    const names = normalizeClientName(client.name).split(" ").filter(Boolean);
    // Token order and long inflection suffixes may differ, e.g. Posch Grabstein / Grabsteine POSCH.
    return names.length >= 2 && names.every(name => tokens.some(token =>
      token === name || (Math.min(token.length, name.length) >= 5 && (token.startsWith(name) || name.startsWith(token)))));
  });
  if (tokenMatches.length) return tokenMatches.length === 1 ? tokenMatches[0] : null;
  const identityTokens = value => normalizeClientName(value)
    .replace(/\bskorpion\b/g, "scorpion")
    .split(" ").filter(token => token && !new Set([
      "gmbh", "restaurant", "restoran", "grill", "cafe", "kafic", "caffe", "picerija",
      "parfemi", "parfumes", "perfumes", "parfum", "camping", "kamp", "prikolice",
      "rechtsanwalt", "inkasso", "finanzierung", "osiguranje", "praxis", "beauty", "slovenija", "marketing"
    ]).has(token));
  const groupTokens = identityTokens(groupName);
  if (!groupTokens.length) return null;
  const uniqueCandidates = clients.filter(client => {
    const clientTokens = identityTokens(client.name);
    return clientTokens.length && groupTokens.every(token => clientTokens.some(name =>
      token === name || (Math.min(token.length, name.length) >= 5 && (token.startsWith(name) || name.startsWith(token)))));
  });
  return uniqueCandidates.length === 1 ? uniqueCandidates[0] : null;
}

export async function fetchClickUpClients({ token, listId, fetchImpl = fetch, apiBase = DEFAULT_API_BASE }) {
  if (!token || !listId) return [];
  const clients = [];
  for (let page = 0; page < 100; page += 1) {
    const response = await fetchImpl(`${apiBase}/list/${encodeURIComponent(listId)}/task?include_closed=true&subtasks=true&page=${page}`, { headers: { Authorization: token }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`ClickUp API ${response.status}`);
    const payload = await response.json();
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
    clients.push(...tasks.map(taskToClient));
    if (payload.last_page === true || tasks.length < 100) return clients.filter(client => client.name);
    if (page === 99) throw new Error("ClickUp pagination exceeded 100 pages; refusing a partial snapshot");
  }
  return clients.filter((client) => client.name);
}
