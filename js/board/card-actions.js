"use strict";
/* ---------------- Card actions ---------------- */
function findCard(u){ const d = cur(); return d && d.cards.find(c => c.uid === u); }
function toggleLock(u){ const c = findCard(u); if (!c || guard()) return; animateBoard(() => { c.locked = !c.locked; touch(cur()); renderBoard(); renderHeader(); }); }
function toggleFocus(u){ const c = findCard(u); if (!c || guard()) return; c.focus = !c.focus; touch(cur()); renderBoard(); renderHeader(); toast(c.focus ? `Building around ${c.card.name}: Add cards now also suggests cards for it` : `No longer building around ${c.card.name}`); }
function moveOther(u){ const c = findCard(u); if (c) moveZone(u, c.zone === "deck" ? "options" : "deck"); }
function moveZone(u, zone){
  const d = cur(), c = findCard(u); if (!c || c.zone === zone || guard(d)) return;
  if (c.locked && zone !== "deck"){ toast("Unlock this card to move it out of the deck"); return; }
  animateBoard(() => { c.zone = zone; d.cards.splice(d.cards.indexOf(c), 1); d.cards.push(c); touch(d); renderAll(); });
  limitWarn(c);
}
function moveAll(zone){
  const d = cur(); if (!d || guard(d)) return;
  const list = d.cards.filter(c => c.zone !== zone && !c.locked && (!(UI.filter.trim() || UI.ctype || UI.role) || matchesFilter(c)));
  if (!list.length){ toast(zone === "deck" ? "The card pool is empty" : "No unlocked cards in the deck"); return; }
  animateBoard(() => { list.forEach(c => c.zone = zone); touch(d); renderAll(); });
  toast(`Moved ${list.length} card${list.length > 1 ? "s" : ""} to the ${zone === "deck" ? "deck" : "card pool"}${UI.filter.trim() || UI.ctype || UI.role ? " (only cards matching the filter)" : ""}`);
}
function limitWarn(c){
  const d = cur(); if (c.zone !== "deck") return;
  const n = sumQ(d.cards.filter(k => k.zone === "deck" && k.bucket === c.bucket));
  if (n > (d.limits[c.bucket] ?? 0)) toast(`Over your ${PLURAL[c.bucket].toLowerCase()} limit: ${n} of ${d.limits[c.bucket]}`);
}
function removeCard(u, ask = true){
  const d = cur(), c = findCard(u); if (!c || guard(d)) return;
  if (c.locked){ toast("Unlock this card before removing it"); return; }
  const go = () => { animateBoard(() => { d.cards.splice(d.cards.indexOf(c), 1); touch(d); renderAll(); }); toast(`${c.card.name} removed`); };
  if (!ask) return go();
  confirmTwice([{title: `Remove ${esc(c.card.name)}?`, text: `It leaves the ${c.zone === "deck" ? "deck" : "card pool"}. You can add it again later from Add cards.`, yes: "Remove card"}], go);
}
