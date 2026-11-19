"use strict";
/* Which cards show and in what order: filter, sort, locked first. */
function matchesFilter(c){
  const q = UI.filter.trim().toLowerCase();
  if (q && !(`${c.card.name}\n${c.card.type}\n${c.card.text}`.toLowerCase().includes(q))) return false;
  if (UI.ctype && !subtypes(c.card).includes(UI.ctype)) return false;
  if (UI.role && !rolesOf(c.card).includes(UI.role)) return false;
  return true;
}
function sortVal(c, m){
  switch (UI.sort){
    case "incl": { const s = statFor(m, c.card.name); return s ? -s.incl : 1; }
    case "syn": { const s = statFor(m, c.card.name); return s && s.syn != null ? -s.syn : 9; }
    case "price": { const p = priceOf(c.card); return p ? -p.v : 1; }
    case "cheap": { const p = priceOf(c.card); return p ? p.v : 1e9; }
    case "cmc": return c.card.cmc || 0;
    case "name": return c.card.name.toLowerCase();
    case "ctype": return (subtypes(c.card)[0] || "~").toLowerCase() + "|" + c.card.name.toLowerCase();
    default: return 0;
  }
}
/* Locked cards always come first; within each group, your order or the chosen sort. */
function zoneItems(d, zone, t){
  const items = d.cards.filter(c => c.zone === zone && c.bucket === t);
  const m = edhStats(d);
  const keyed = items.map((c, i) => ({c, i, k: UI.sort === "manual" ? 0 : sortVal(c, m)}));
  keyed.sort((a, b) => (b.c.locked - a.c.locked) || (a.k < b.k ? -1 : a.k > b.k ? 1 : 0) || a.i - b.i);
  return keyed.map(x => x.c);
}
