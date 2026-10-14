const { AsyncLocalStorage } = require('node:async_hooks');
const budgets = new AsyncLocalStorage();

async function withRequestBudget(task, milliseconds = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Online baza nije odgovorila na vreme. Pokušaj ponovo.')), milliseconds);
  timer.unref?.();
  try { return await budgets.run(controller.signal, task); }
  finally { clearTimeout(timer); }
}

async function request(fetchImpl, input, options = {}, milliseconds = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Online baza nije odgovorila na vreme. Pokušaj ponovo.')), milliseconds);
  timer.unref?.();
  const signals = [controller.signal, budgets.getStore(), options.signal].filter(Boolean);
  const signal = signals.length === 1 ? signals[0] : AbortSignal.any(signals);
  const started = Date.now();
  try {
    const response = await fetchImpl(input, { ...options, signal });
    // No credentials, query strings, request bodies, or private record contents in logs.
    if (!response.ok || Date.now() - started > 2000) {
      console.warn('crm-database-request', { method: options.method || 'GET', durationMs: Date.now() - started, status: response.status });
    }
    return response;
  } finally { clearTimeout(timer); }
}

module.exports = { request, withRequestBudget };
