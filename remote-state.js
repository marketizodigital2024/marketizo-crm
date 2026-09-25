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
  let lastServerPayload = null;
  let pollTimer = null;
  let pollCallback = null;
  let pollInFlight = false;
  let deferredRemoteState = null;
  const stateChannel = typeof BroadcastChannel === "function" ? new BroadcastChannel("marketizo-crm-state-v1") : null;

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function accessHeaders(extra = {}) {
    let session = null;
    try { session = JSON.parse(localStorage.getItem("marketizoAdminSession") || "null"); } catch {}
    if (!session?.token) {
      try { session = JSON.parse(localStorage.getItem("marketizoEmployeeSession") || "null"); } catch {}
    }
    if (!session?.token) {
      try { session = JSON.parse(localStorage.getItem("marketizoClientSession") || "null"); } catch {}
    }
    return { ...extra, ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) };
  }

  function isLocalFile() {
    return window.location.protocol === "file:";
  }

  function setLocal(payload) {
    localStorage.setItem(storageKey, JSON.stringify(payload || {}));
  }

  function userIsEditing() {
    const active = document.activeElement;
    return Boolean(active && active.matches?.("input, textarea, select, [contenteditable='true']"));
  }

  function applyRemoteState(payload, updatedAt) {
    lastUpdatedAt = updatedAt || lastUpdatedAt;
    lastServerPayload = clone(payload);
    setLocal(payload);
    pollCallback?.(clone(payload), lastUpdatedAt);
  }

  function queueOrApplyRemoteState(payload, updatedAt) {
    if (userIsEditing() || saveInFlight || pendingPayload) {
      deferredRemoteState = { payload: clone(payload), updatedAt };
      return;
    }
    deferredRemoteState = null;
    applyRemoteState(payload, updatedAt);
  }

  function sameValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function mergeChanges(base, desired, latest) {
    if (sameValue(desired, base)) return clone(latest);
    if (Array.isArray(base) && Array.isArray(desired) && Array.isArray(latest)) {
      const idArrays = [...base, ...desired, ...latest].every((item) => item && typeof item === "object" && !Array.isArray(item) && item.id);
      if (!idArrays) return clone(desired);
      const baseById = new Map(base.map((item) => [item.id, item]));
      const desiredById = new Map(desired.map((item) => [item.id, item]));
      const latestById = new Map(latest.map((item) => [item.id, item]));
      baseById.forEach((item, id) => {
        if (!desiredById.has(id)) latestById.delete(id);
      });
      desiredById.forEach((item, id) => {
        const baseItem = baseById.get(id);
        if (!baseItem) latestById.set(id, clone(item));
        else if (!sameValue(item, baseItem)) latestById.set(id, mergeChanges(baseItem, item, latestById.get(id) || baseItem));
      });
      const desiredOrder = desired.map((item) => item.id);
      return [...latestById.values()].sort((left, right) => {
        const leftIndex = desiredOrder.indexOf(left.id);
        const rightIndex = desiredOrder.indexOf(right.id);
        if (leftIndex < 0 && rightIndex < 0) return 0;
        if (leftIndex < 0) return 1;
        if (rightIndex < 0) return -1;
        return leftIndex - rightIndex;
      });
    }
    if (base && desired && latest && typeof base === "object" && typeof desired === "object" && typeof latest === "object" && !Array.isArray(base) && !Array.isArray(desired) && !Array.isArray(latest)) {
      const merged = clone(latest);
      new Set([...Object.keys(base), ...Object.keys(desired)]).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(desired, key)) {
          if (Object.prototype.hasOwnProperty.call(base, key)) delete merged[key];
          return;
        }
        merged[key] = mergeChanges(base[key], desired[key], latest[key]);
      });
      return merged;
    }
    return clone(desired);
  }

  async function load(options = {}) {
    if (isLocalFile()) {
      configured = false;
      online = false;
      return { configured, online, payload: null, localOnly: true };
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`/api/state?ts=${Date.now()}`, { cache: "no-store", signal: controller.signal, headers: accessHeaders() });
      const data = await response.json().catch(() => ({}));
      configured = Boolean(data.configured);
      online = configured && response.ok && !data.error;
      lastError = data.error || "";
      if (data.payload && typeof data.payload === "object") {
        lastUpdatedAt = data.updatedAt || lastUpdatedAt;
        lastServerPayload = clone(data.payload);
        if (options.writeLocal !== false) setLocal(data.payload);
        return { configured, online, payload: clone(data.payload), updatedAt: data.updatedAt || "" };
      }
      return { configured, empty: Boolean(data.empty), online, payload: null, error: lastError };
    } catch (error) {
      configured = false;
      online = false;
      lastError = error?.message || "Online baza nije dostupna.";
      return { configured, online, payload: null, error: lastError };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function flush() {
    if (!pendingPayload || isLocalFile()) return { ok: true, localOnly: isLocalFile() };
    if (saveInFlight) return;
    saveInFlight = true;
    let payload = pendingPayload;
    let basePayload = clone(lastServerPayload || {});
    const waiters = pendingWaiters;
    pendingPayload = null;
    pendingWaiters = [];
    let result = { ok: false, error: "Online čuvanje nije uspelo." };
    try {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const response = await fetch("/api/state", {
          method: "PUT",
          headers: accessHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ payload, baseUpdatedAt: lastUpdatedAt }),
        });
        const data = await response.json().catch(() => ({}));
        configured = Boolean(data.configured);
        online = configured && response.ok && !data.error;
        lastError = data.error || "";
        if (response.status === 409 && data.conflict && attempt < 3) {
          const latest = await load({ writeLocal: false });
          if (!latest.payload) break;
          payload = mergeChanges(basePayload, payload, latest.payload);
          basePayload = clone(latest.payload);
          continue;
        }
        if (response.ok && data.updatedAt) {
          lastUpdatedAt = data.updatedAt;
          lastServerPayload = clone(payload);
          setLocal(payload);
          stateChannel?.postMessage({ type: "saved", payload: clone(payload), updatedAt: lastUpdatedAt });
          result = { ok: true, error: "", updatedAt: lastUpdatedAt, payload: clone(payload) };
        } else {
          const latest = response.status === 409 ? await load({ writeLocal: false }) : { payload: null };
          if (latest.payload) window.dispatchEvent(new CustomEvent("marketizo-state-conflict", { detail: { message: lastError, payload: latest.payload } }));
          result = { ok: false, error: lastError || `Online čuvanje nije uspelo (${response.status}).` };
        }
        break;
      }
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

  function startPolling(onPayload, interval = 60000) {
    window.clearInterval(pollTimer);
    if (typeof onPayload !== "function" || isLocalFile()) return;
    pollCallback = onPayload;
    pollTimer = window.setInterval(async () => {
      if (pollInFlight || saveInFlight || pendingPayload || document.hidden || userIsEditing()) return;
      pollInFlight = true;
      const previousUpdatedAt = lastUpdatedAt;
      try {
        const result = await load({ writeLocal: false });
        if (result.payload && result.updatedAt && result.updatedAt !== previousUpdatedAt) {
          queueOrApplyRemoteState(result.payload, result.updatedAt);
        }
      } finally {
        pollInFlight = false;
      }
    }, Math.max(30000, Math.min(300000, Number(interval) || 60000)));
  }

  stateChannel?.addEventListener("message", (event) => {
    const message = event.data || {};
    if (message.type !== "saved" || !message.payload || message.updatedAt === lastUpdatedAt) return;
    queueOrApplyRemoteState(message.payload, message.updatedAt);
  });

  document.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!deferredRemoteState || userIsEditing() || saveInFlight || pendingPayload) return;
      const pending = deferredRemoteState;
      deferredRemoteState = null;
      applyRemoteState(pending.payload, pending.updatedAt);
    }, 500);
  });

  window.MarketizoRemote = {
    load,
    save,
    startPolling,
    status() {
      return { configured, online, error: lastError };
    },
  };
})();
