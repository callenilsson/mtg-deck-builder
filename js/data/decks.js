"use strict";
/* Deck state (S), versioned merging, loading and saving, the active deck. */
let S = {decks:{}, active:null, sidebarOpen: innerWidth >= 1280, lastFileSave:0, lastChange:0};
function ensureVer(d){ if (!d.ver) d.ver = uid(); if (!Array.isArray(d.past)) d.past = []; return d; }
function displayName(d){ return d.name || (d.commander ? cmdKey(d) : "Untitled deck"); }
/* Each deck carries its version id plus the ids of every earlier version.
   Incoming deck is: already known -> skip; a newer descendant of ours -> replace;
   otherwise both sides changed -> keep both, as "Name 1" (ours) and "Name 2" (theirs). */
function mergeDecks(incoming){
  const rep = {added: [], updated: [], conflicts: [], restored: [], kept: []};
  for (const raw of Object.values(incoming || {})){
    if (!raw || !raw.id) continue;
    const inc = ensureVer(JSON.parse(JSON.stringify(raw)));
    const all = Object.values(S.decks);
    if (all.some(L => L.ver === inc.ver || (L.past || []).includes(inc.ver))) continue;
    const L = S.decks[inc.id];
    if (!L){ if (!inc.deleted){ S.decks[inc.id] = inc; rep.added.push(displayName(inc)); } else S.decks[inc.id] = inc; continue; }
    ensureVer(L);
    if (inc.past.includes(L.ver)){
      S.decks[inc.id] = inc;
      if (inc.deleted) rep.updated.push(displayName(L) + " (deleted)"); else rep.updated.push(displayName(inc));
      continue;
    }
    if (L.deleted){ if (!inc.deleted){ S.decks[inc.id] = inc; rep.restored.push(displayName(inc)); } continue; }
    if (inc.deleted){ L.past.push(inc.ver); rep.kept.push(displayName(L)); continue; }
    const base = displayName(L).replace(/ [12]$/, "");
    const same = displayName(L) === displayName(inc);
    const mine = {...L, id: uid(), name: same ? base + " 1" : L.name};
    if (same) inc.name = base + " 2";
    S.decks[mine.id] = mine; S.decks[inc.id] = inc;
    if (S.active === inc.id) S.active = mine.id;
    rep.conflicts.push(base);
  }
  return rep;
}
function reportText(rep){
  const parts = [];
  if (rep.added.length) parts.push(`${rep.added.length} new deck${rep.added.length > 1 ? "s" : ""}: ${rep.added.join(", ")}`);
  if (rep.updated.length) parts.push(`${rep.updated.length} updated: ${rep.updated.join(", ")}`);
  if (rep.restored.length) parts.push(`${rep.restored.length} brought back because they were edited after you deleted them: ${rep.restored.join(", ")}`);
  if (rep.conflicts.length) parts.push(`${rep.conflicts.length} edited by both of you, so both versions were kept (same names get “1” for yours and “2” for theirs): ${rep.conflicts.join(", ")}`);
  if (rep.kept.length) parts.push(`${rep.kept.length} deleted in the file but you edited them since, so they were kept: ${rep.kept.join(", ")}`);
  return parts;
}
/* Website: decks come only from the Drive library, fresh at every sign-in, and are never kept in the browser.
   (The downloaded file keeps working offline with the browser's storage, as before.) */
const CLOUD = () => typeof GDRIVE !== "undefined" && driveUsable();
const SESSION_KEY = "mtg-session";
let LEGACY = null;        // decks this browser kept before: added to the library once, then removed here
const gated = () => CLOUD() && !DS.loaded;
function load(){
  if (CLOUD()){
    try { const loc = JSON.parse(localStorage.getItem(KEY) || "null"); if (loc && loc.decks && Object.values(loc.decks).some(d => !d.deleted)) LEGACY = {decks: loc.decks}; } catch {}
    try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); if (s){ S.active = s.active || null; if (typeof s.sidebarOpen === "boolean" && innerWidth >= 1280) S.sidebarOpen = s.sidebarOpen; } } catch {}
    if (innerWidth < 1280) S.sidebarOpen = false;   // phones, unfolded foldables, tablets: the deck list starts folded so the cards get the room
    S.decks = {};
    return;
  }
  let emb = {};
  try { emb = JSON.parse($("#embedded-decks").textContent || "{}"); } catch {}
  let loc = null;
  try { loc = JSON.parse(localStorage.getItem(KEY) || "null"); } catch {}
  if (loc){
    S.decks = loc.decks || {}; S.active = loc.active; S.lastFileSave = loc.lastFileSave || 0; S.lastChange = loc.lastChange || 0;
    if (typeof loc.sidebarOpen === "boolean" && innerWidth >= 1280) S.sidebarOpen = loc.sidebarOpen;
  }
  Object.values(S.decks).forEach(ensureVer);
  storeImages(emb.images).then(n => { if (n) render(); });
  const rep = mergeDecks(emb.decks);
  const parts = reportText(rep);
  if (parts.length && loc) setTimeout(() => showReport("Decks from this file", parts), 300);
  if (!cur()) S.active = liveDecks()[0]?.id || null;
  save(false);
}
function save(changed = true){
  if (changed){ S.lastChange = Date.now(); driveSchedule(); }
  if (CLOUD()){
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({active: S.active, sidebarOpen: S.sidebarOpen})); } catch {}
    $("#unsavedDot").hidden = true; return;
  }
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  $("#unsavedDot").hidden = !(S.lastChange > S.lastFileSave && liveDecks().length) || !!(typeof DS !== "undefined" && DS.token && DS.file);
}
function liveDecks(){ return Object.values(S.decks).filter(d => !d.deleted).sort((a, b) => (b.updated || 0) - (a.updated || 0)); }
function cur(){ return S.decks[S.active] && !S.decks[S.active].deleted ? S.decks[S.active] : null; }
function touch(d){
  ensureVer(d); d.past.push(d.ver); if (d.past.length > 1500) d.past.splice(0, d.past.length - 1500);
  d.ver = uid(); d.updated = Date.now(); save();
}
function newDeck(){
  if (gated()){ toast("Sign in first: decks are saved to your Google Drive library"); return; }
  const d = ensureVer({id: uid(), name: "", created: Date.now(), updated: Date.now(), commander: null, partner: null, owner: meNow() || undefined,
    limits: {...DEFAULT_LIMITS}, typeOrder: [...TYPES], cards: []});
  S.decks[d.id] = d; S.active = d.id;
  if (innerWidth <= 820) S.sidebarOpen = false;
  save(); render();
  openCommanderPicker(true);
}
function inDeckCount(d){ return sumQ(d.cards.filter(c => c.zone === "deck")) + cmdrs(d).length; }
function addCard(card, zone, keep){
  const d = cur(); if (!d || guard(d)) return null;
  if (cmdrs(d).some(k => k.name === card.name)){ toast(`${card.name} is your commander`); return null; }
  if (!canMulti(card) && d.cards.some(c => c.card.name === card.name)){ toast(`${card.name} is already in this deck`); return null; }
  const item = {uid: uid(), card: keep ? JSON.parse(JSON.stringify(card)) : plainPrint(card), bucket: bucketOf(card.type), zone, locked: false, focus: false};
  revealAfterAdd = item.uid;
  d.cards.push(item);
  touch(d); renderAll();
  return item.uid;
}
window.addEventListener("storage", e => { if (e.key === KEY && !CLOUD()){ try { S.decks = JSON.parse(e.newValue).decks; render(); } catch {} } });
