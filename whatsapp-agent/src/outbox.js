import crypto from 'node:crypto';

export function createOutbox({ load, save, transmit, checkDelivery, isReady, now = Date.now, logger = console }) {
  const state = load() || { entries: {} };
  state.entries ||= {};
  const inflight = new Map();
  let timer;
  function persist() { save(state); }
  function keyFor(to, body, label) {
    return crypto.createHash('sha256').update(`${to}\n${label}\n${body}`).digest('hex');
  }
  async function attempt(key) {
    if (inflight.has(key)) return inflight.get(key);
    const entry = state.entries[key];
    if (entry.messageId) return { id: { _serialized: entry.messageId }, ack: entry.ack };
    const promise = (async () => {
      try {
        if (!isReady()) throw Error('WhatsApp not connected; retained in durable outbox');
        const result = await transmit(entry.to, entry.body, entry.label);
        if (!result?.id?._serialized) throw Error('WhatsApp returned no message id');
        entry.messageId = result.id._serialized;
        entry.sentAt = now();
        entry.ack = result.ack ?? 0;
        if (entry.ack >= 2) entry.deliveredAt = now();
        entry.lastError = '';
        persist();
        logger.log(`[OUTBOX_SENT] ${entry.label}: ack=${entry.ack}`);
        return result;
      } catch (error) {
        entry.attempts = Number(entry.attempts || 0) + 1;
        entry.lastError = String(error.message || error).slice(0, 240);
        entry.retryAt = now() + Math.min(1800000, 30000 * 2 ** Math.min(entry.attempts - 1, 6));
        persist();
        throw error;
      }
    })();
    inflight.set(key, promise);
    try { return await promise; } finally { inflight.delete(key); }
  }
  async function send(to, body, label) {
    body = String(body || '').trim();
    if (!body) throw Error('Refusing an empty WhatsApp message');
    if (body.length > 3500) throw Error('WhatsApp report exceeds 3500 characters; refusing silent truncation');
    const key = keyFor(to, body, label);
    state.entries[key] ||= { to, body, label, createdAt: now(), attempts: 0, retryAt: 0 };
    persist();
    return attempt(key);
  }
  async function retry() {
    if (!isReady()) return;
    for (const [key, entry] of Object.entries(state.entries)) {
      if (entry.messageId) {
        if (!entry.deliveredAt && checkDelivery && now() - Number(entry.checkedAt || 0) >= 60000) {
          entry.checkedAt = now();
          try {
            const message = await checkDelivery(entry.messageId);
            if (Number(message?.ack) >= 2) ack(entry.messageId, Number(message.ack));
          } catch (error) { logger.error(`[DELIVERY_UNCONFIRMED] ${entry.label}: ${error.message}`); }
        }
        continue;
      }
      if (Number(entry.retryAt || 0) > now()) continue;
      try { await attempt(key); } catch (error) { logger.error(`[OUTBOX_RETRY] ${entry.label}: ${error.message}`); }
    }
    const expiry = now() - 14 * 86400000;
    for (const [key, entry] of Object.entries(state.entries)) {
      if (entry.deliveredAt && entry.deliveredAt < expiry) delete state.entries[key];
    }
    persist();
  }
  function ack(messageId, value) {
    for (const entry of Object.values(state.entries)) {
      if (entry.messageId !== messageId) continue;
      entry.ack = Math.max(Number(entry.ack || 0), value);
      if (value >= 2) { entry.deliveredAt ||= now(); logger.log(`[OUTBOX_DELIVERED] ${entry.label}: ack=${value}`); }
      persist();
      return true;
    }
    return false;
  }
  return { send, retry, ack,
    status() {
      const entries = Object.values(state.entries);
      return { pending: entries.filter(e => !e.messageId).length,
        sentUnconfirmed: entries.filter(e => e.messageId && !e.deliveredAt).length,
        delivered: entries.filter(e => e.deliveredAt).length,
        lastDeliveredAt: Math.max(0, ...entries.map(e => e.deliveredAt || 0)) || null,
        oldestPendingAt: entries.some(e => !e.messageId) ? Math.min(...entries.filter(e => !e.messageId).map(e => e.createdAt)) : null };
    },
    start() { if (!timer) { timer = setInterval(() => void retry().catch(e => logger.error('[OUTBOX_FAILURE]', e)), 30000); timer.unref?.(); } },
    stop() { clearInterval(timer); timer = null; }
  };
}
