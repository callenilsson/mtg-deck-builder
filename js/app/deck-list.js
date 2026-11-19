"use strict";
/* One ⋯ per deck in the list (like databases in a data browser): Rename, Duplicate, Delete, or Copy for others' decks. */
function closeDeckMenu(){ const m = document.getElementById("deckRowMenu"); if (m) m.remove(); document.querySelectorAll(".deck-item.menu-open").forEach(e => e.classList.remove("menu-open")); }
function openDeckMenu(btn){
  const id = btn.dataset.deckmenu, mine = !!btn.dataset.mine, open = document.getElementById("deckRowMenu");
  closeDeckMenu(); if (open && open.dataset.id === id) return;
  const ic = (p, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24">${p}</svg>`;
  const m = document.createElement("div"); m.className = "menu row-menu"; m.id = "deckRowMenu"; m.dataset.id = id; m.setAttribute("role", "menu");
  m.innerHTML = mine
    ? `<button role="menuitem" data-act="ren">${I.pencil}<span><b>Rename</b></span></button>
       <button role="menuitem" data-act="dup">${I.copy}<span><b>Duplicate</b></span></button>
       <div class="menu-sep"></div>
       <button role="menuitem" data-act="wipe" class="danger" title="Empties the pool and the deck. Commander and limits stay.">${I.trash}<span><b>Delete all cards</b></span></button>
       <button role="menuitem" data-act="del" class="danger" title="Removes the whole deck from your list.">${I.trash}<span><b>Delete deck</b></span></button>`
    : `<button role="menuitem" data-act="dup" title="Make your own copy you can change">${I.copy}<span><b>Copy to my decks</b></span></button>`;
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + "px";
  m.style.top = (r.bottom + 4 + mh > innerHeight - 8 ? r.top - mh - 4 : r.bottom + 4) + "px";
  btn.closest(".deck-item").classList.add("menu-open");
  m.onclick = e => { const b = e.target.closest("[data-act]"); if (!b) return; closeDeckMenu();
    if (b.dataset.act === "ren") renameInList(id); else if (b.dataset.act === "dup") duplicateDeck(id);
    else if (b.dataset.act === "wipe"){ if (S.active !== id){ S.active = id; save(false); render(); } wipeDeck(); }
    else deleteDeck(id); };
}
document.addEventListener("click", e => { if (!e.target.closest("#deckRowMenu,[data-deckmenu]")) closeDeckMenu(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDeckMenu(); });
addEventListener("resize", closeDeckMenu);
document.addEventListener("scroll", e => { if (e.target && e.target.id === "deckList") closeDeckMenu(); }, true);
function deckItemHTML(d, mine){
  const n = inDeckCount(d);
  const thumb = d.commander && d.commander.art ? `style="background-image:url('${esc(d.commander.art)}')"` : "";
  const acts = `<button class="deck-more" data-deckmenu="${d.id}" data-mine="${mine ? 1 : ""}" title="Deck actions" aria-haspopup="menu"><svg class="i" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg></button>`;
  return `<div class="deck-item ${d.id === S.active ? "active" : ""}" data-deck="${d.id}" role="button" tabindex="0">
      <span class="deck-thumb" ${thumb}>${thumb ? "" : '<i class="ms ms-commander"></i>'}</span>
      <span class="deck-meta"><b>${esc(displayName(d))}</b>
      <small><span class="pips">${d.commander ? pipsHTML(deckCI(d)) : ""}</span>${n}/100 cards</small></span>
      <span class="deck-acts">${acts}</span></div>`;
}
/* Decks grouped by who made them: yours first, then everyone else in the library (also people without decks yet). */
/* The deck list is a set of folders, one per person: yours first (with New deck inside), then everyone in the library.
   Each folder collapses on its own; the state is remembered per device. */
function folderOpen(id, mineFolder){ const o = UI.openPeople || {}; return mineFolder ? o[id] !== false : o[id] === true; }
function renderRailDecks(){
  const box = $("#railDecks"); if (!box) return;
  if (gated()){ box.innerHTML = ""; return; }
  const mine = liveDecks().filter(isMine);
  box.innerHTML = mine.map(d => `<button class="rd ${d.id === S.active ? "on" : ""}" data-deck="${d.id}" title="${esc(displayName(d))}">${d.commander ? `<img src="${esc(d.commander.art || imgOf(d.commander))}" alt="">` : `<i class="ms ms-commander"></i>`}</button>`).join("")
    + `<button class="rd add" data-newdeck="1" title="New deck">+</button>`;
}
function renderSidebar(){
  renderRailDecks();
  if (gated()){ $("#deckList").innerHTML = `<div class="side-note people-hint">${DS.token ? "Loading your decks…" : "Sign in to see your decks."}</div>`; renderProfile(); return; }
  const list = liveDecks(), me = meNow();
  const people = new Map();
  const add = (id, p) => { if (!people.has(id)) people.set(id, {id, name: p.name || "Someone", photo: p.photo || "", decks: []}); const q = people.get(id); if (p.photo && !q.photo) q.photo = p.photo; return q; };
  const mine = [];
  for (const d of list){
    if (isMine(d)) mine.push(d);
    else if (d.owner) add(d.owner.id, d.owner).decks.push(d);
    else { const lo = libOwner() || {}; add(lo.permissionId || "library-owner", {name: lo.displayName || "Library owner", photo: lo.photoLink || ""}).decks.push(d); }
  }
  for (const [id, m] of Object.entries(DS.members || {})) if (!me || id !== me.id) add(id, m);
  for (const p of DS.perms || []) if (p.type === "user" && p.id && (!me || p.id !== me.id)) add(p.id, {name: p.displayName, photo: p.photoLink});
  const roleOf = id => { const p = (DS.perms || []).find(x => x.id === id); return p ? (p.role === "owner" ? "Owner" : p.role === "writer" ? "Editor" : p.role === "commenter" || p.role === "reader" ? "Viewer" : "") : ""; };
  const others = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
  const myId = me ? me.id : "me";
  const folder = (id, person, decks, isMe) => {
    const open = folderOpen(id, isMe), role = isMe ? "You" : roleOf(id);
    let h = `<div class="folder ${isMe ? "mine" : ""} ${open ? "open" : ""}">
      <button class="folder-head" data-folder="${esc(id)}" data-mine="${isMe ? 1 : ""}" aria-expanded="${open}" title="${open ? "Collapse" : "Expand"} ${esc(person.name)}’s decks">
        <span class="chev">${I.down}</span>${personAvatar(person)}<span class="p-name">${esc(person.name)}</span>${role ? `<span class="p-role ${isMe ? "you" : ""}">${role}</span>` : ""}<span class="p-count">${decks.length}</span></button>`;
    if (open){
      h += `<div class="folder-body">`;
      if (isMe) h += `<button class="new-deck in-folder" data-newdeck="1"><span class="card-plus-ico" style="width:15px;height:20px;font-size:12px">+</span>New deck</button>`;
      h += decks.length ? decks.map(d => deckItemHTML(d, isMe)).join("") : `<div class="side-note folder-empty">${isMe ? "No decks yet." : "No decks yet."}</div>`;
      h += `</div>`;
    }
    return h + `</div>`;
  };
  const all = [myId, ...others.map(p => p.id)];
  const anyOpen = all.some(id => folderOpen(id, id === myId));
  let h = `<div class="folders-bar"><span>Decks</span>${others.length ? `<button class="link-btn" id="foldAll">${anyOpen ? "Collapse all" : "Expand all"}</button>` : ""}</div>`;
  h += folder(myId, me || {name: "My decks"}, mine, true);
  for (const p of others) h += folder(p.id, p, p.decks, false);
  if (!others.length) h += `<div class="side-note people-hint">${!me ? "Sign in with Google (top) to share decks with friends." : DS.file ? (DS.permErr ? `Couldn’t read who the library is shared with (${esc(DS.permErr)}).` : "When friends join your library, each gets a folder here.") : "Create or open a shared library (Google Drive, below) to see friends’ folders here."}</div>`;
  $("#deckList").innerHTML = h;
  renderProfile();
}
/* Signed-in person at the top of the sidebar. */
function renderProfile(){
  const box = $("#profile"); if (!box) return;
  const me = meNow();
  const rm = $("#railMe"); if (rm) rm.innerHTML = me ? personAvatar(me) : "";
  if (!driveUsable()){ box.innerHTML = me ? `${personAvatar(me, "lg")}<div class="pf-text"><b>${esc(me.name)}</b><small>Decks on this device</small></div>` : ""; box.hidden = !me; return; }
  box.hidden = false;
  if (!DS.token){
    box.innerHTML = me
      ? `${personAvatar(me, "lg")}<div class="pf-text"><b>${esc(me.name)}</b><small>Not syncing</small></div><button class="btn sm drv-main" id="profConnect">Sync</button>`
      : `<div class="pf-text"><b>Sign in</b><small>to sync and share decks</small></div><button class="btn sm drv-main" id="profConnect">Sign in with Google</button>`;
    return;
  }
  const st = DS.status === "syncing" ? "Syncing…" : DS.status === "pending" ? "Saving…" : DS.status === "error" ? "Sync problem" : DS.file ? (DS.last ? `Synced ${agoText(DS.last)}` : "Connected") : "No library yet";
  box.innerHTML = `${personAvatar(me || {name: "?"}, "lg")}<div class="pf-text"><b>${esc((me && me.name) || "Signed in")}</b><small class="pf-status ${DS.status}"><i></i>${st}</small></div>
    <button class="icon-btn" id="${DS.file ? "profSync" : "profDrive"}" title="${DS.file ? "Sync now" : "Set up the shared library"}">${DS.file ? I.flip : I.right}</button>`;
}
function deckTotals(d){
  const deck = d.cards.filter(c => c.zone === "deck");
  const value = sumPrice([...cmdrs(d), ...cardsQ(deck)]);
  return {n: inDeckCount(d), locked: sumQ(deck.filter(c => c.locked)), value};
}
function renderHeader(){
  const d = cur();
  if (!d) return;
  if (document.activeElement !== $("#deckName")) $("#deckName").value = d.name || "";
  const {n, locked, value} = deckTotals(d);
  const tot = $("#total");
  tot.innerHTML = `<b>${n}<span>/100</span></b><small>${n > 100 ? `${n - 100} too many` : n === 100 ? "Complete" : "in deck"}</small>
    ${d.commander ? `<div class="tot-sub"><span title="Locked final picks in the deck">${I.lock}<b>${locked}</b> locked</span><span title="Deck value, commander included (${value.n} of ${n} cards have a price)"><b>${fmtMoney(value.tot, value.sym)}</b> value</span></div>
    <label class="pricey-row" title="Cards whose cheapest printing costs this much or more get a purple outline. A quick hint for cards that may be too strong for a casual table."><span class="pr-lbl">💎 Expensive above ${infoBtn("pricey")}</span><input id="priceyIn" type="number" min="0" step="0.5" inputmode="decimal" value="${priceyTh(d)}" ${roDeck(d) ? "disabled" : ""} aria-label="Expensive card threshold"><select id="curSel" class="cur-sel" title="Price currency: € from Cardmarket, $ from TCGplayer" aria-label="Currency"><option value="eur" ${UI.cur === "usd" ? "" : "selected"}>€</option><option value="usd" ${UI.cur === "usd" ? "selected" : ""}>$</option></select>${(() => { const k = [...cmdrs(d), ...d.cards.map(c => c.card)].filter(isPricey).length; return `<span class="pr-count" title="${k} expensive card${k === 1 ? "" : "s"} in this deck and pool">${k}</span>`; })()}</label>${infoText("pricey")}` : ""}`;
  tot.classList.toggle("full", n === 100); tot.classList.toggle("over", n > 100);
  if (!d.commander) return;
  // commanders
  const slot = (c, kind, label) => `<div class="cmd-col"><button class="cmd-slot" data-cmd="${kind}" title="${esc(c.name)}"><img src="${esc(imgOf(c))}" ${srcsetAttr(c)} alt="${esc(c.name)}">${kind === "partner" ? `<span class="cmd-lbl">${label}</span>` : ""}</button>
    <div class="acts"><button data-cact="edit" data-kind="${kind}" title="Edit art and name">${I.brush}</button><button data-cact="change" data-kind="${kind}" title="Change ${kind === "partner" ? "partner" : "commander"}">${I.swap}</button>${kind === "partner" ? `<button class="del" data-cact="remove" title="Remove partner">${I.trash}</button>` : ""}</div></div>`;
  let cm = slot(d.commander, "commander", d.partner ? "Commander" : "Commander");
  if (d.partner) cm += slot(d.partner, "partner", "Partner");
  else if (partnerQuery(d.commander)) cm += `<button class="cmd-slot partner empty" data-cmd="addPartner" title="This commander can have a partner"><span><span class="card-plus-ico">+</span>Partner</span></button>`;
  $("#cmds").innerHTML = cm;
  // combine row: always shows the empty slot, so it's clear there's room for more
  const foc = d.cards.filter(c => c.focus);
  $("#combo").innerHTML = `<div class="combo-lbl" title="Add cards suggests cards that work with your commander${foc.length ? " and with these cards" : ". Press the two circles under any card to build around it too"}"><span class="eyebrow">${I.focus} Build around ${infoBtn("build")}</span><small>${foc.length ? "Add cards also suggests cards for these" : `Press ${I.focus} under a card`}</small>${infoText("build")}</div>
    ${foc.map(c => `<button class="mini" data-open="${c.uid}" data-img="${esc(largeOf(c.card))}" title="${esc(c.card.name)}"><img src="${esc(imgOf(c.card))}" alt="${esc(c.card.name)}"><span class="x" data-unfocus="${c.uid}" title="Stop building around this card">×</span></button>`).join("")}
    <button class="mini empty" id="comboAdd" title="Build around another card">+</button>`;
  renderStats();
  renderRail(d);
}
const COMPACT_Q = matchMedia("(pointer: coarse) and (orientation: landscape) and (max-height: 500px), (pointer: coarse) and (min-width: 821px) and (max-width: 1100px)");
const LAND_Q = matchMedia("(orientation: landscape) and (max-height: 500px)");
const isCompact = () => COMPACT_Q.matches;
const isPhone = () => innerWidth <= 820 && !LAND_Q.matches;
let CMP_OPEN = false;      // compact mode: is the full commander panel open (it starts folded into the rail)
function applyCompact(){ document.body.classList.toggle("compact", isCompact()); }
applyCompact();
for (const q of [COMPACT_Q, LAND_Q]) q.addEventListener("change", () => { applyCompact(); CMP_OPEN = false; if (isCompact() || innerWidth < 1280) S.sidebarOpen = false; render(); applyZoom(); });
function renderRail(d){
  const {n, locked, value} = deckTotals(d);
  const deck = d.cards.filter(c => c.zone === "deck");
  const chips = d.typeOrder.filter(t => (d.limits[t] ?? 0) > 0 || deck.some(c => c.bucket === t)).map(t => {
    const k = sumQ(deck.filter(c => c.bucket === t)), lim = d.limits[t] ?? 0;
    return `<span class="r-chip ${k > lim ? "over" : k === lim && lim ? "met" : ""}" title="${PLURAL[t]}: ${k} of ${lim}"><i class="ms ${MS[t]}"></i>${k}/${lim}</span>`;
  }).join("");
  $("#rail").innerHTML = `<button class="icon-btn r-open panel-btn" id="railOpen" title="Show commander and stats">${isPhone() ? I.foldD : I.panelR}</button><button class="icon-btn" id="railMenu" title="Show or hide your decks">${I.menu}</button>
    <button class="r-thumb" data-cmd="commander" title="${esc(d.commander.name)}"><img src="${esc(imgOf(d.commander))}" alt=""></button>
    <div class="r-tot ${n === 100 ? "full" : n > 100 ? "over" : ""}" title="Cards in deck"><b>${n}</b><span>/100</span></div>
    <div class="r-meta" title="Locked final picks">${I.lock}${locked}</div>
    <div class="r-meta" title="Deck value">${fmtMoney(value.tot, value.sym)}</div>
    <div class="r-types">${chips}</div>
    <div class="r-acts">
      <button class="r-act gold" data-ract="add" title="Add cards"><span class="card-plus-ico">+</span><small>Add</small></button>
      <button class="r-act" data-ract="hand" title="Test hand"><svg class="i" viewBox="0 0 24 24"><rect x="3" y="6" width="9" height="13" rx="1.5" transform="rotate(-12 7.5 12.5)"/><rect x="9" y="4" width="9" height="13" rx="1.5"/><path d="M13.5 8.5v4M11.5 10.5h4"/></svg><small>Test</small></button>
      <button class="r-act" data-ract="stats" title="Deck stats and odds"><svg class="i" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg><small>Stats</small></button>
      <button class="r-act" data-ract="print" title="Print"><svg class="i" viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/></svg><small>Print</small></button>
    </div>`;
  $("#foldTop").innerHTML = isPhone() ? I.foldU : I.panelL;
}
