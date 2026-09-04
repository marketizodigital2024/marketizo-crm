(function () {
  const storageKey = "agencyCrmData";
  let configured = false;
  let online = false;
  let lastError = "";
  let saveTimer = null;
  let saveInFlight = false;
  let pendingPayload = null;
  let pendingWaiters = [];
  let lastUpdatedAt = "";
  let pollTimer = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function isLocalFile() {
    return window.location.protocol === "file:";
  }

  function setLocal(payload) {
    localStorage.setItem(storageKey, JSON.stringify(payload || {}));
  }

  async function load() {
    if (isLocalFile()) {
      configured = false;
      online = false;
      return { configured, online, payload: null, localOnly: true };
    }
    try {
      const response = await fetch(`/api/state?ts=${Date.now()}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      configured = Boolean(data.configured);
      online = configured && response.ok && !data.error;
      lastError = data.error || "";
      if (data.payload && typeof data.payload === "object") {
        lastUpdatedAt = data.updatedAt || lastUpdatedAt;
        setLocal(data.payload);
        return { configured, online, payload: clone(data.payload), updatedAt: data.updatedAt || "" };
      }
      return { configured, empty: Boolean(data.empty), online, payload: null, error: lastError };
    } catch (error) {
      configured = false;
      online = false;
      lastError = error?.message || "Online baza nije dostupna.";
      return { configured, online, payload: null, error: lastError };
    }
  }

  async function flush() {
    if (!pendingPayload || isLocalFile()) return { ok: true, localOnly: isLocalFile() };
    if (saveInFlight) return;
    saveInFlight = true;
    const payload = pendingPayload;
    const waiters = pendingWaiters;
    pendingPayload = null;
    pendingWaiters = [];
    let result = { ok: false, error: "Online čuvanje nije uspelo." };
    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, baseUpdatedAt: lastUpdatedAt }),
      });
      const data = await response.json().catch(() => ({}));
      configured = Boolean(data.configured);
      online = configured && response.ok && !data.error;
      lastError = data.error || "";
      if (response.status === 409 && data.conflict) {
        const latest = await load();
        window.dispatchEvent(new CustomEvent("marketizo-state-conflict", { detail: { message: lastError, payload: latest.payload || null } }));
      } else if (response.ok && data.updatedAt) {
        lastUpdatedAt = data.updatedAt;
      }
      result = { ok: online, error: lastError || (response.ok ? "" : `Online čuvanje nije uspelo (${response.status}).`) };
    } catch (error) {
      online = false;
      lastError = error?.message || "Online čuvanje nije uspelo.";
      result = { ok: false, error: lastError };
    } finally {
      waiters.forEach((resolve) => resolve(result));
      saveInFlight = false;
      if (pendingPayload) flush();
    }
    return result;
  }

  function save(payload) {
    setLocal(payload);
    if (isLocalFile()) return Promise.resolve({ ok: true, localOnly: true });
    pendingPayload = clone(payload);
    window.clearTimeout(saveTimer);
    const result = new Promise((resolve) => pendingWaiters.push(resolve));
    saveTimer = window.setTimeout(flush, 350);
    return result;
  }

  function startPolling(onPayload, interval = 5000) {
    window.clearInterval(pollTimer);
    if (typeof onPayload !== "function" || isLocalFile()) return;
    pollTimer = window.setInterval(async () => {
      if (saveInFlight || pendingPayload || document.hidden) return;
      const previousUpdatedAt = lastUpdatedAt;
      const result = await load();
      if (result.payload && result.updatedAt && result.updatedAt !== previousUpdatedAt) {
        onPayload(clone(result.payload), result.updatedAt);
      }
    }, Math.max(3000, Number(interval) || 5000));
  }

  window.MarketizoRemote = {
    load,
    save,
    startPolling,
    status() {
      return { configured, online, error: lastError };
    },
  };
})();
