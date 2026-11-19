"use strict";
/* ---------------- Custom images (kept in IndexedDB, embedded when saving the file) ---------------- */
const IMG = new Map();
const idb = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open("commandzone", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("imgs");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const run = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction("imgs", mode); const q = fn(t.objectStore("imgs")); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  const cloud = () => typeof CLOUD === "function" && CLOUD();
  return {
    set: (k, v) => cloud() ? Promise.resolve() : run("readwrite", st => st.put(v, k)).catch(() => {}),
    del: k => cloud() ? Promise.resolve() : run("readwrite", st => st.delete(k)).catch(() => {}),
    wipe: () => { try { indexedDB.deleteDatabase("commandzone"); } catch {} },
    loadAll: async () => { try { const keys = await run("readonly", st => st.getAllKeys()); const vals = await run("readonly", st => st.getAll()); keys.forEach((k, i) => IMG.set(k, vals[i])); } catch {} }
  };
})();
const imgOf = c => (c.custom && IMG.get(c.custom.key)) || c.img;
const largeOf = c => (c.custom && IMG.get(c.custom.key)) || c.large || c.img;
function usedImageKeys(){
  const keys = new Set();
  for (const d of Object.values(S.decks)){ if (d.deleted) continue;
    for (const k of [d.commander, d.partner, ...(d.cards || []).map(c => c.card), ...(d.tokens || []).map(c => c.card)]){
      if (!k) continue;
      if (k.custom) keys.add(k.custom.key);
      for (const c of custList(k)){ if (c.key) keys.add(c.key); if (c.artKey) keys.add(c.artKey); }
    } }
  return keys;
}
async function storeImages(images){
  let n = 0;
  for (const [k, v] of Object.entries(images || {})) if (!IMG.has(k) && typeof v === "string" && v.startsWith("data:image/")){ IMG.set(k, v); await idb.set(k, v); n++; }
  return n;
}
