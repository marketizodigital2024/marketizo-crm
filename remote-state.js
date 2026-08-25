(function () {
  const storageKey = "agencyCrmData";
  let configured = false;
  let online = false;
  let lastError = "";
  let saveTimer = null;
  let saveInFlight = false;
  let pendingPayload = null;
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
    if (!pendingPayload || isLocalFile()) return;
    if (saveInFlight) return;
    saveInFlight = true;
    const payload = pendingPayload;
    pendingPayload = null;
    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const data = await response.json().catch(() => ({}));
      configured = Boolean(data.configured);
      online = configured && response.ok && !data.error;
      lastError = data.error || "";
    } catch (error) {
      online = false;
      lastError = error?.message || "Online čuvanje nije uspelo.";
    } finally {
      saveInFlight = false;
      if (pendingPayload) flush();
    }
  }

  function save(payload) {
    setLocal(payload);
    pendingPayload = clone(payload);
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(flush, 350);
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
