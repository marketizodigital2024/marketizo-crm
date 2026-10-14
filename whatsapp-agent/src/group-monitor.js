// Reconcile WhatsApp group membership and bounded history independently of AI work.
export function createGroupMonitor({ getChats, fetchMessages, idOf, isReady, load, save,
  remember, enqueue, onInventory, shouldRead = () => true, onCycle = () => {}, onError = () => {}, onSuccess = () => {}, now = Date.now, logger = console, pollMs = 120000 }) {
  const state = load() || { groups: {}, lastDiscoveryAt: 0 };
  state.groups ||= {};
  let running = false, timer;
  let chats = [];
  const failures = new Map();
  async function reconcile() {
    if (running || !isReady()) return false;
    running = true;
    try {
      const discovered = (await getChats()).filter(chat => chat.isGroup);
      if (!discovered.length && chats.length) throw Error('Unexpected empty group inventory; retaining previous inventory');
      chats = discovered;
      const discoveredAt = now();
      const active = new Set(chats.map(chat => idOf(chat.id)));
      for (const [id, group] of Object.entries(state.groups)) group.active = active.has(id);
      for (const chat of chats) {
        const id = idOf(chat.id);
        const previous = state.groups[id];
        state.groups[id] = { ...previous, id, name: chat.name, active: true, monitored: shouldRead(chat), discoveredAt: previous?.discoveredAt || discoveredAt };
      }
      state.lastDiscoveryAt = discoveredAt;
      state.discoveryError = '';
      onSuccess('group-discovery');
      save(state);
      onInventory(chats);
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(3, chats.length) }, async () => {
        while (next < chats.length && isReady()) {
          const chat = chats[next++], id = idOf(chat.id), group = state.groups[id];
          if (!shouldRead(chat)) { group.monitored = false; failures.delete(id); onSuccess('group-read:' + id); continue; }
          group.monitored = true;
          const since = Number(group.lastReadAt || 0);
          // Read every group initially and periodically; changed chats are read on every poll.
          if (since && Number(chat.timestamp || 0) > 0 && Number(chat.timestamp) * 1000 < since && now() - since < 900000) continue;
          const scanStarted = now();
          try {
            const historyLimit = since && scanStarted - since > 900000 ? 500 : 100;
            const messages = (await fetchMessages(chat, historyLimit))
              .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
            const oldest = Number(messages[0]?.timestamp || 0) * 1000;
            if (since && messages.length >= historyLimit && oldest > since) group.historyGap = true;
            for (const message of messages) {
              const at = Number(message.timestamp || 0) * 1000;
              if (!Number.isFinite(at) || !at) continue;
              if (since && at < since - 300000) continue;
              await remember(chat, message);
              // Initial history is context, not a burst of stale alerts. Daily review reads it.
              if (since && at >= since - 300000) enqueue(message);
            }
            group.lastReadAt = scanStarted;
            group.lastMessageAt = Number(messages.at(-1)?.timestamp || 0) * 1000;
            group.messagesRead = messages.length;
            group.lastError = '';
            failures.delete(id);
            onSuccess('group-read:' + id);
          } catch (error) {
            group.lastError = String(error.message || error).slice(0, 240);
            failures.set(id, group.lastError);
            logger.error(`[GROUP_READ_FAILED] ${chat.name}: ${group.lastError}`);
            onError('group-read:' + id, chat.name);
          }
          save(state);
        }
      }));
      logger.log(`[GROUP_SYNC] discovered=${chats.length} readable=${chats.filter(c => !state.groups[idOf(c.id)].lastError).length} failed=${failures.size}`);
      try { await onCycle(status()); } catch (error) { logger.error('[MONITOR_NOTIFICATION_FAILED]', error.message); }
      return true;
    } catch (error) {
      state.discoveryError = String(error.message || error).slice(0, 240);
      save(state);
      logger.error('[GROUP_DISCOVERY_FAILED]', error);
      onError('group-discovery');
      return false;
    } finally { running = false; }
  }
  function status() {
    const all = Object.values(state.groups).filter(group => group.active);
    const groups = all.filter(group => group.monitored);
    return {
      discoveredGroups: all.length,
      monitoredGroups: groups.length,
      excludedGroups: all.length - groups.length,
      readableGroups: groups.filter(group => group.lastReadAt && !group.lastError).length,
      unreadableGroups: groups.filter(group => !group.lastReadAt || group.lastError).map(group => group.name),
      historyGapGroups: groups.filter(group => group.historyGap).map(group => group.name),
      lastDiscoveryAt: state.lastDiscoveryAt ? new Date(state.lastDiscoveryAt).toISOString() : '',
      discoveryError: state.discoveryError || '',
      syncing: running
    };
  }
  return { reconcile, status, chats: () => [...chats],
    start() { if (!timer) { void reconcile(); timer = setInterval(() => void reconcile(), pollMs); timer.unref?.(); } },
    stop() { clearInterval(timer); timer = null; }
  };
}
