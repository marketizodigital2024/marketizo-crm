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
    return option?.name || value?.username || value?.email || value?.name || value;
  };
  return Array.isArray(field.value) ? field.value.map(render).filter(Boolean).join(", ") : String(render(field.value));
}

export function taskToClient(task) {
  const fields = Object.fromEntries((task.custom_fields || []).map((field) => [field.name, customFieldValue(field)]));
  return {
    clickupTaskId: String(task.id || ""), name: String(task.name || "").trim(), package: fields.Paket || "",
    scenarist: fields.Scenarista || "", editor: fields.Editor || "", smm: fields.SMM || "",
    paidAds: fields["Paid Ads"] || "", videographer: fields.Snimatelj || "",
    reelsMonthly: fields["Reela mesečno"] || "", postsWeekly: fields["Postova nedeljno"] || "",
    storiesWeekly: fields["Storija nedeljno"] || "", clientStatus: fields["Status klijenta"] || "",
    smmLoad: fields["Opterećenje SMM %"] || ""
  };
}

export function matchClickUpClient(groupName, clients) {
  const group = normalizeClientName(groupName);
  const exact = clients.find((client) => normalizeClientName(client.name) === group);
  if (exact) return exact;
  const candidates = clients.filter((client) => {
    const name = normalizeClientName(client.name);
    return name.length >= 4 && (group.includes(name) || name.includes(group));
  });
  return candidates.length === 1 ? candidates[0] : null;
}

export async function fetchClickUpClients({ token, listId, fetchImpl = fetch, apiBase = DEFAULT_API_BASE }) {
  if (!token || !listId) return [];
  const clients = [];
  for (let page = 0; page < 100; page += 1) {
    const response = await fetchImpl(`${apiBase}/list/${encodeURIComponent(listId)}/task?include_closed=true&subtasks=true&page=${page}`, { headers: { Authorization: token } });
    if (!response.ok) throw new Error(`ClickUp API ${response.status}`);
    const payload = await response.json();
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
    clients.push(...tasks.map(taskToClient));
    if (tasks.length < 100) break;
  }
  return clients.filter((client) => client.name);
}
