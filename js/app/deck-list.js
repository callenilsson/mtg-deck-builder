"use strict";
/* The deck list (left menu): folders per person, deck menu (⋯), the folded rail, profile, and their events. */
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
$("#profile").addEventListener("click", e => {
  if (e.target.closest("#profConnect")) driveConnect();
  else if (e.target.closest("#profSync")){ DS.rev = null; driveSync(false); }
  else if (e.target.closest("#profDrive")) $("#driveBox").scrollIntoView({behavior: "smooth", block: "center"});
});
$("#closeSide").innerHTML = I.panelL;
 $("#railExpand").innerHTML = I.panelR;
$("#railExpand").onclick = () => { S.sidebarOpen = true; S.sideTouched = true; if (isPhone()) CMP_OPEN = false; save(false); render(); applyZoom(); };
$("#railDecks").addEventListener("click", e => {
  if (e.target.closest("[data-newdeck]")){ newDeck(); return; }
  const b = e.target.closest("[data-deck]"); if (!b) return;
  S.active = b.dataset.deck; save(false); render();
});
$("#closeSide").onclick = () => { S.sidebarOpen = false; save(false); render(); };
$("#openSide").onclick = () => { S.sidebarOpen = !S.sidebarOpen; S.sideTouched = true; if (S.sidebarOpen && isPhone()) CMP_OPEN = false; save(false); render(); };
$("#sideScrim").onclick = () => { S.sidebarOpen = false; render(); };
$("#deckList").addEventListener("click", e => {
  const dm = e.target.closest("[data-deckmenu]"); if (dm){ e.stopPropagation(); openDeckMenu(dm); return; }
  if (e.target.closest("[data-newdeck]")){ newDeck(); return; }
  const fh = e.target.closest("[data-folder]");
  if (fh){ UI.openPeople = UI.openPeople || {}; const k = fh.dataset.folder, mineF = !!fh.dataset.mine; UI.openPeople[k] = !folderOpen(k, mineF); saveUI(); renderSidebar(); return; }
  if (e.target.closest("#foldAll")){
    const me = meNow(), myId = me ? me.id : "me", ids = [...document.querySelectorAll("#deckList [data-folder]")].map(b => b.dataset.folder);
    const anyOpen = ids.some(id => folderOpen(id, id === myId));
    UI.openPeople = UI.openPeople || {}; ids.forEach(id => UI.openPeople[id] = !anyOpen); saveUI(); renderSidebar(); return;
  }
  if (e.target.closest(".deck-rename")) return;
  const it = e.target.closest("[data-deck]"); if (!it) return;
  S.active = it.dataset.deck; if (innerWidth <= 820) S.sidebarOpen = false; save(false); render();
});
function renameInList(id){
  if (guard(S.decks[id])) return;
  const d = S.decks[id]; const b = document.querySelector(`.deck-item[data-deck="${id}"] .deck-meta b`); if (!d || !b) return;
  const inp = document.createElement("input"); inp.className = "deck-rename"; inp.value = d.name || displayName(d); inp.setAttribute("aria-label", "Deck name");
  b.replaceWith(inp); inp.focus(); inp.select();
  let done = false;
  const finish = ok => { if (done) return; done = true; if (ok){ const v = inp.value.trim(); if (v && v !== d.name){ d.name = v; touch(d); } } renderSidebar(); renderHeader(); };
  inp.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); });
  inp.addEventListener("blur", () => finish(true));
}
function duplicateDeck(id){
  const src = S.decks[id]; if (!src) return;
  const d = JSON.parse(JSON.stringify(src));
  d.id = uid(); d.ver = uid(); d.past = []; d.created = d.updated = Date.now();
  d.name = isMine(src) ? displayName(src) + " (copy)" : `${displayName(src)} (from ${ownerName(src).split(" ")[0]})`;
  d.owner = meNow() || undefined; delete d.by;
  d.cards.forEach(c => { c.locked = c.locked && isMine(src); });
  d.cards.forEach(c => c.uid = uid());
  S.decks[d.id] = d; S.active = d.id; save(); render();
  toast(`Copied to your decks: ${d.name}`);
}
$("#deckList").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset.deck) e.target.click(); });
