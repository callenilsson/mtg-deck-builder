"use strict";
/* Card view state (V): what is open, its printings and your customized versions. */
let V = null, vTok = 0;
/* ---------------- Card view state ----------------
   The cover flow holds every official printing, plus your customization as its own card ("✦ Yours"), placed just before the
   printing it's built on. Whatever is in the middle when you press Save is what the deck uses; the customization is kept either way.
   A card stores it as  card.cust = {key (finished image), artKey (your picture), name, mode, zoom, pan, box, base (the printing)}
   and, while the custom version is the one in use, card.custom = {key, name}. */
function viewTarget(v){
  const d = cur(); if (!d || !v) return null;
  if (v.kind === "item") return findCard(v.uid)?.card || null;
  if (v.kind === "commander") return d.commander;
  if (v.kind === "partner") return d.partner;
  if (v.kind === "token") return (d.tokens || []).find(k => k.uid === v.uid)?.card || null;
  return v.card0;
}
const plainPrint = c => { const p = {...c}; delete p.custom; delete p.cust; delete p.custs; return p; };
const hasCustoms = c => !!(c && (c.custom || c.cust || (c.custs && c.custs.length)));
/* all customizations of a card (older single-customization and pre-customization cards included) */
function custList(card){
  if (card.custs) return card.custs;
  if (card.cust) return [card.cust];
  if (card.custom) return [{key: card.custom.key, name: card.custom.name || "", artKey: null, legacy: true, base: plainPrint(card)}];
  return [];
}
const SLOT_FIELDS = ["name", "userKey", "user", "mode", "zoom", "pan", "box", "custBase", "legacy", "legacyKey", "custKey", "snap"];
function slotFrom(c, card){
  const base = plainPrint(c.base || card);
  return {cid: c.cid || uid(), name: c.name || "", userKey: c.artKey || null, user: null, mode: c.mode || "frame", zoom: c.zoom || 1,
    pan: c.pan ? {...c.pan} : {x: 0, y: 0}, box: c.box ? [...c.box] : [...frameOf(base).box], custBase: base,
    legacy: !!c.legacy, legacyKey: c.legacy ? c.key : null, custKey: c.key || null, snap: (c.key && IMG.get(c.key)) || "", changed: false};
}
function initView(o){
  const card = o.kind === "add" ? o.card : o.kind === "token" ? cur().tokens.find(k => k.uid === o.uid).card : (o.kind === "item" ? findCard(o.uid).card : o.kind === "commander" ? cur().commander : cur().partner);
  const custs = custList(card).map(c => slotFrom(c, card));
  const active = card.custom ? (custs.find(s => card.custom.cid && s.cid === card.custom.cid) || custs.find(s => s.custKey === card.custom.key) || custs[0]) : null;
  const v = {kind: o.kind, uid: o.uid, card0: o.kind === "add" ? o.card : null, rec: o.rec || null,
    editable: !roDeck(cur()), token: ++vTok, flying: false, back: false, dirty: false, custChanged: false,
    prints: [plainPrint(active ? active.custBase : card)], custs, cid: null, hasCust: false,
    name: "", userKey: null, user: null, mode: "frame", zoom: 1, pan: {x: 0, y: 0}, box: [...frameOf(card).box], custBase: null,
    legacy: false, legacyKey: null, custKey: null, snap: "", base: null, baseFor: null, rebase: false,
    selKey: active ? "c:" + active.cid : card.id, fi: 0, card: plainPrint(card)};
  for (const s of custs) if (!v.prints.some(p => p.id === s.custBase.id)) v.prints.push(s.custBase);
  return v;
}
const slotOf = cid => V.custs.find(s => s.cid === cid);
/* the version in the middle is "loaded": its settings live on V while you edit it */
function stashCust(){
  if (!V || !V.cid) return;
  const s = slotOf(V.cid); if (!s) return;
  for (const f of SLOT_FIELDS) s[f] = V[f];
  s.changed = s.changed || V.custChanged;
}
function loadCust(cid){
  if (V.cid === cid) return;
  clearTimeout(snapT);
  stashCust();
  const s = slotOf(cid); if (!s) return;
  for (const f of SLOT_FIELDS) V[f] = s[f];
  V.cid = cid; V.hasCust = true; V.custChanged = s.changed; V.base = null; V.baseFor = null;
  ["#artName", "#artName2"].forEach(x => { if ($(x)) $(x).value = V.name; });
}
function unloadCust(){
  if (!V.cid) return;
  clearTimeout(snapT);
  stashCust();
  Object.assign(V, {cid: null, hasCust: false, custChanged: false, name: "", user: null, userKey: null, custBase: null, legacy: false, legacyKey: null, custKey: null, snap: "", base: null, baseFor: null, mode: "frame", zoom: 1, pan: {x: 0, y: 0}});
  ["#artName", "#artName2"].forEach(x => { if ($(x)) $(x).value = ""; });
}
/* "Find art": only printings whose set name, set code, artist or year match every word */
function artMatch(p){
  const q = String(V.artQ || "").trim().toLowerCase(); if (!q) return true;
  const hay = `${p.set} ${p.setCode || ""} ${p.artist} ${p.year || ""}`.toLowerCase();
  return q.split(/\s+/).every(w => hay.includes(w));
}
function entries(){
  const list = [], placed = new Set();
  const custsFor = id => V.rebase ? [] : V.custs.filter(s => s.custBase.id === id);
  for (const p of V.prints){ for (const s of custsFor(p.id)){ list.push({t: "c", cid: s.cid}); placed.add(s.cid); } if (artMatch(p)) list.push({t: "p", p}); }
  if (!V.rebase) V.custs.filter(s => !placed.has(s.cid)).forEach(s => list.unshift({t: "c", cid: s.cid}));
  return list;
}
const entryKey = e => e.t === "c" ? "c:" + e.cid : e.p.id;
function syncSel(){
  const list = entries();
  let i = list.findIndex(e => entryKey(e) === V.selKey);
  if (i < 0){ i = 0; V.selKey = list[0] ? entryKey(list[0]) : V.selKey; }
  V.fi = i;
  const e = list[i];
  if (e && e.t === "c"){
    if (V.cid !== e.cid){ loadCust(e.cid); setTimeout(() => { if (V && V.cid === e.cid){ loadBase(); loadUserArt(); updateOverlay(); } }, 0); }
  } else if (e && !V.rebase) unloadCust();
  V.card = e ? (e.t === "c" ? V.custBase : e.p) : V.card;
  V.drawCard = V.rebase ? V.card : V.custBase;
}
const centerIsCustom = () => !!(V && !V.rebase && String(V.selKey).startsWith("c:"));
const custNumber = cid => V.custs.findIndex(s => s.cid === cid) + 1;
function openDetail(o, srcEl){
  if (o.kind === "item" && !findCard(o.uid)) return;
  if (o.kind === "token" && !(cur().tokens || []).some(k => k.uid === o.uid)) return;
  V = initView(o); V.srcEl = srcEl; syncSel(); V.startKey = V.selKey;
  prev.hidden = true; showScrim("#detailScrim"); renderDetail();
  animateOpen(srcEl);
  loadUserArt(); loadBase(); loadPrints();
  // the card you opened gets its cheapest price right away (the background lookups wait meanwhile)
  const nm = V.card.name, tok = V.token;
  if (usesCheapest(V.card) && !V.card.cheap && !CHEAP_MEM[nm]) fetchCheapest(nm).then(() => { if (V && V.token === tok) renderDetailParts(); }).catch(() => {});
}
