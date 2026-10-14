(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MarketizoStatePatch = api;
})(typeof window === 'object' ? window : globalThis, function () {
  const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const safeKey = key => !['__proto__', 'constructor', 'prototype'].includes(key);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  function create(base, desired) {
    if (JSON.stringify(base) === JSON.stringify(desired)) return null;
    if (Array.isArray(base) && Array.isArray(desired) && [...base, ...desired].every(item => object(item) && item.id)) {
      const previous = new Map(base.map(item => [item.id, item]));
      const next = new Map(desired.map(item => [item.id, item]));
      const upsert = desired.map(item => ({ id: item.id, change: create(previous.get(item.id), item) })).filter(item => item.change);
      const remove = base.filter(item => !next.has(item.id)).map(item => item.id);
      const oldOrder = base.map(item => item.id), order = desired.map(item => item.id);
      return { type: 'rows', upsert, remove, ...(JSON.stringify(oldOrder) !== JSON.stringify(order) ? { order } : {}) };
    }
    if (object(base) && object(desired)) {
      const set = {};
      for (const key of Object.keys(desired)) {
        if (!safeKey(key)) throw Error('Nedozvoljeno ime polja.');
        const change = create(base[key], desired[key]);
        if (change) set[key] = change;
      }
      return { type: 'object', set, remove: Object.keys(base).filter(key => !Object.hasOwn(desired, key)) };
    }
    return { type: 'replace', value: copy(desired) };
  }

  function apply(base, change, depth = 0) {
    if (depth > 40) throw Error('Izmena ima previše ugnježdenih polja.');
    if (change === null) return copy(base);
    if (!change || typeof change !== 'object') throw Error('Neispravna izmena.');
    if (change.type === 'replace') return copy(change.value);
    if (change.type === 'object') {
      if (!object(base) || !object(change.set) || !Array.isArray(change.remove)) throw Error('Neispravna izmena objekta.');
      const result = copy(base);
      for (const key of change.remove) { if (!safeKey(key)) throw Error('Nedozvoljeno ime polja.'); delete result[key]; }
      for (const [key, value] of Object.entries(change.set)) { if (!safeKey(key)) throw Error('Nedozvoljeno ime polja.'); result[key] = apply(result[key], value, depth + 1); }
      return result;
    }
    if (change.type === 'rows') {
      if (!Array.isArray(base) || !Array.isArray(change.upsert) || !Array.isArray(change.remove)) throw Error('Neispravna izmena kolekcije.');
      if (new Set(change.upsert.map(item => item.id)).size !== change.upsert.length) throw Error('Dupliran ID izmene.');
      const rows = new Map(base.map(item => [item.id, copy(item)]));
      for (const id of change.remove) rows.delete(id);
      for (const item of change.upsert) {
        const row = apply(rows.get(item.id), item.change, depth + 1);
        if (!object(row) || row.id !== item.id) throw Error('ID zapisa nije usaglašen.');
        rows.set(item.id, row);
      }
      const order = change.order || Array.from(rows.keys());
      if (!Array.isArray(order) || new Set(order).size !== order.length) throw Error('Neispravan redosled zapisa.');
      return [...order.filter(id => rows.has(id)).map(id => rows.get(id)), ...Array.from(rows).filter(([id]) => !order.includes(id)).map(([, row]) => row)];
    }
    throw Error('Nepoznat tip izmene.');
  }
  return { create, apply };
});
