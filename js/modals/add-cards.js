"use strict";
/* ---------------- Add-cards modal: search always on top; empty search = EDHREC picks ---------------- */
const A = {mode: "cards", bucket: "Any", side: "options", q: "", colors: true, results: [], loading: false, error: "", page: 1, more: false, token: 0, isNew: false, addedNow: new Set()};
function openAdd(bucket, side){
  const d = cur(); if (!d || guard(d)) return;
  if (!d.commander){ openCommanderPicker(); return; }
  Object.assign(A, {mode: "cards", bucket: bucket || "Any", side: side || "options", q: "", results: [], error: "", addedNow: new Set()});
  showScrim("#addScrim"); renderAddShell(); loadAdd();
}
function openCommanderPicker(isNew){
  Object.assign(A, {mode: "commander", q: "", results: [], error: "", isNew: !!isNew});
  showScrim("#addScrim"); renderAddShell(); loadAdd();
}
function openAddTokens(side){
  const d = cur(); if (!d || guard(d)) return;
  Object.assign(A, {mode: "token", side: side === "options" ? "options" : "deck", bucket: "Any", q: "", results: [], error: "", isNew: false, addedNow: new Set()});
  showScrim("#addScrim"); renderAddShell(); loadAdd();
}
function openPartnerPicker(){
  const d = cur(); if (!d || !d.commander) return;
  Object.assign(A, {mode: "partner", q: "", results: [], error: "", isNew: false});
  showScrim("#addScrim"); renderAddShell(); loadAdd();
}
function renderAddShell(){
  const d = cur(), isCmd = A.mode !== "cards";
  let top = "";
  if (A.mode === "token"){
    top = `<div class="searchrow"><div class="search">${I.search}<input id="addQ" type="search" placeholder="Search tokens: Squirrel, Food, Treasure, Rat…" autocomplete="off"><button class="clear" id="clearQ" title="Clear search" hidden>${I.close}</button></div></div>
      <div class="basis" id="basis"></div>`;
  } else if (isCmd){
    top = `${A.isNew ? `<div class="namefield"><input id="newName" placeholder="Deck name (optional, defaults to your commander)" value="${esc(d.name || "")}" autocomplete="off"></div>` : ""}
      <div class="searchrow"><div class="search">${I.search}<input id="addQ" type="search" placeholder="${A.mode === "partner" ? "Search partners…" : "Search legends: Atraxa, Edgar Markov, elves…"}" autocomplete="off"><button class="clear" id="clearQ" title="Clear search" hidden>${I.close}</button></div></div>
      <div class="basis" id="basis">${A.mode === "partner" ? `Commanders that can pair with <b>${esc(d.commander.name)}</b>.` : "Legal commanders, most played on EDHREC first."}</div>`;
  } else {
    const chips = ["Any", ...d.typeOrder].map(t => `<button class="chip ${A.bucket === t && !A.hl ? "on" : ""}" data-bucket="${t}"><i class="ms ${MS[t]}"></i>${PLURAL[t]}</button>`).join("")
      + `<span class="chip-break" aria-hidden="true"></span><span class="chip-lbl">EDHREC lists</span>` + HIGHLIGHTS.map(h => `<button class="chip hl-chip hl-${h.k} ${A.hl === h.k ? "on" : ""}" data-hl="${h.k}" title="${esc(h.tip)}">${h.icon} ${h.chip}</button>`).join("");
    loadGameChangers();
    top = `<div class="searchrow"><div class="search">${I.search}<input id="addQ" type="search" placeholder="Search name or rules text. Creature types: t:squirrel" autocomplete="off"><button class="clear" id="clearQ" title="Clear search, back to EDHREC picks" hidden>${I.close}</button></div>
      <label class="toggle" title="Only show cards your commander allows when searching"><input type="checkbox" id="onlyColors" ${A.colors ? "checked" : ""}>Only ${pipsHTML(deckCI(d))}</label></div>
      <div class="chips" id="chips">${chips}</div>
      <div class="basis" id="basis"></div>`;
  }
  const title = A.mode === "commander" ? "Choose your commander" : A.mode === "partner" ? "Choose a partner" : A.mode === "token" ? "Add tokens" : "Add cards";
  $("#addModal").innerHTML = `<div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-close title="Close">${I.close}</button></div>
    <div class="modal-top">${top}</div><div class="modal-body" id="addBody"></div>`;
  if (HOVER.matches || isCmd) setTimeout(() => (A.isNew ? $("#newName") : $("#addQ"))?.focus(), 50);
}
function sortedResults(){
  if (A.mode !== "cards" || A.q.trim() || UI.addSort === "best") return A.results;
  const v = r => UI.addSort === "incl" ? -(r.incl ?? -1) : UI.addSort === "syn" ? -(r.syn ?? -9) : UI.addSort === "price" ? -((priceOf(r.card) || {v: -1}).v) : ((priceOf(r.card) || {v: 1e9}).v);
  return [...A.results].sort((a, b) => v(a) - v(b));
}
function renderAddBody(){
  const d = cur();
  if (A.mode === "token") $("#basis").innerHTML = A.q.trim() ? `Tokens matching <b>“${esc(A.q.trim())}”</b>. Clear the search to see the ones your deck makes.` : `Tokens made by the cards in <b>${esc(displayName(d))}</b>.`;
  if (A.mode === "cards"){
    const foc = d.cards.filter(c => c.focus).map(c => esc(c.card.name));
    $("#basis").innerHTML = A.q.trim()
      ? `Search results for <b>“${esc(A.q.trim())}”</b>${A.bucket !== "Any" ? ` among ${PLURAL[A.bucket].toLowerCase()}` : ""}. Clear the search to see EDHREC picks again.`
      : `EDHREC picks for <b>${esc(cmdKey(d))}</b>${foc.length ? `, built around ${d.cards.filter(c => c.focus).map(c => `<span class="ba-chip"><b>${esc(c.card.name)}</b><button data-unfocus="${c.uid}" title="Stop building around ${esc(c.card.name)}">×</button></span>`).join(" ")}` : ""}.
        <select id="addSort" aria-label="Sort picks"><option value="best">Best match first</option><option value="incl">% of decks</option><option value="syn">Highest synergy</option><option value="cheap">Cheapest</option><option value="price">Most expensive</option></select>`;
    if ($("#addSort")) $("#addSort").value = UI.addSort;
    document.querySelectorAll("#chips .chip").forEach(ch => ch.classList.toggle("on", ch.dataset.hl ? ch.dataset.hl === A.hl : !A.hl && ch.dataset.bucket === A.bucket));
  }
  $("#clearQ").hidden = !A.q;
  const hl = A.mode === "cards" && !A.q.trim() && A.hl ? HIGHLIGHTS.find(h => h.k === A.hl) : null;
  const visible = sortedResults().filter(r => A.mode !== "cards" || canMulti(r.card) || A.addedNow.has(r.card.name) || !d.cards.some(k => k.card.name === r.card.name)).filter(r => !hl || hl.test(r));
  let body;
  if (A.error) body = `<div class="notice">${esc(A.error)}</div>`;
  else if (A.loading && !A.results.length) body = `<div class="results">${'<div class="skel"></div>'.repeat(12)}</div>`;
  else if (!visible.length && hl){
    const all = A.results.filter(hl.test).length;
    body = `<div class="notice">${all ? `You already have all ${all} of EDHREC’s ${hl.chip.toLowerCase()} for this deck in your deck or pool.` : hl.k === "gc" ? "None of the EDHREC picks for this deck are Game Changers. Nice for a casual table." : `EDHREC has no ${hl.chip.toLowerCase()} for this deck right now.`}</div>`;
  }
  else if (!visible.length) body = `<div class="notice">${A.q.trim() || A.mode !== "cards" ? "No cards match that search." : `EDHREC has no more ${PLURAL[A.bucket].toLowerCase()} to suggest for this deck. Try searching above.`}</div>`;
  else body = `<div class="results">${visible.slice(0, A.q.trim() || A.mode !== "cards" ? 999 : 60).map(r => resultHTML(r)).join("")}</div>` + (A.more ? `<div class="more"><button class="btn" id="moreBtn">${A.loading ? "Loading…" : "Show more"}</button></div>` : "");
  $("#addBody").innerHTML = body;
}
/* EDHREC's special lists (and the official Game Changers list) shown as labels on the picks, with filter chips.
   They are not card types, so they don't become sections in the pool or deck. */
const HIGHLIGHTS = [
  {k: "top", label: "Top card", chip: "Top cards", icon: "★", tip: "One of the most played cards with this commander on EDHREC", test: r => r.lists && r.lists.includes("topcards")},
  {k: "lift", label: "High synergy", chip: "High synergy", icon: "⚡", tip: "EDHREC's High Lift list: played far more with this commander than elsewhere", test: r => r.lists && r.lists.includes("highliftcards")},
  {k: "new", label: "New", chip: "New cards", icon: "✦", tip: "A recently released card that's catching on with this commander", test: r => r.lists && r.lists.includes("newcards")},
  {k: "ramp", label: "Mana rock", chip: "Mana rocks", icon: "⬢", tip: "EDHREC's Mana Artifacts list: artifacts that make mana", test: r => r.lists && r.lists.includes("manaartifacts")},
  {k: "uland", label: "Utility land", chip: "Utility lands", icon: "⛰", tip: "EDHREC's Utility Lands list: lands that do more than make mana", test: r => r.lists && r.lists.includes("utilitylands")},
  {k: "gc", label: "Game Changer", chip: "Game Changers", icon: "◆", tip: "On the official Game Changers list: one of the strongest Commander cards. Even one moves a deck up a power bracket.", test: r => isGC(r.card)}
];
function hlBadges(r){
  if (A.mode !== "cards") return "";
  const hs = HIGHLIGHTS.filter(h => h.test(r));
  return hs.length ? `<span class="hl-tags">${hs.map(h => `<span class="hl hl-${h.k}" title="${esc(h.tip)}">${h.icon} ${h.label}</span>`).join("")}</span>` : "";
}
function resultHTML(r){
  const d = cur(), c = r.card, i = A.results.indexOf(r);
  let meta = "", tag = "";
  if (r.incl != null){
    const pct = Math.round(r.incl * 100), syn = r.syn != null ? Math.round(r.syn * 100) : null;
    meta = `<div class="bar"><i style="width:${pct}%"></i></div>In ${pct}% of decks${syn != null ? ` · ${syn >= 0 ? "+" : ""}${syn}% synergy` : ""}`;
  }
  if (A.mode === "token" && r.pairs && r.pairs.length) meta = `${esc(c.pt || "")} · made by ${r.pairs.slice(0, 3).map(esc).join(", ")}${r.pairs.length > 3 ? "…" : ""}`;
  else if (r.pairs && r.pairs.length){ meta += `${meta ? "<br>" : ""}Pairs with ${r.pairs.map(esc).join(", ")}`; tag = `<span class="tag">Combo ×${r.pairs.length + (r.incl != null ? 1 : 0)}</span>`; }
  if (!meta) meta = esc(c.type);
  let acts;
  if (A.mode === "token"){
    const have = (d.tokens || []).filter(k => k.card.name === c.name).reduce((a, k) => a + qOf(k), 0);
    acts = `<button class="btn ${have ? "" : "primary"}" style="grid-column:1/-1;justify-content:center" data-addtok="${i}" title="Adds it as its own card, so it can have its own art">${have ? `+ Add another (${have} in deck)` : `+ Add to ${A.side === "options" ? "pool" : "deck"}`}</button>`;
  } else if (A.mode !== "cards") acts = `<button class="btn primary" style="grid-column:1/-1;justify-content:center" data-pick="${i}">${A.mode === "partner" ? "Choose as partner" : "Choose"}</button>`;
  else {
    const have = d.cards.find(k => k.card.name === c.name);
    const deckFirst = A.side === "deck";
    if (have && !canMulti(c)) acts = `<button class="btn done" disabled>✓ In ${have.zone === "deck" ? "deck" : "pool"}</button>`;
    else acts = `<button class="btn ${deckFirst ? "" : "primary"}" data-addto="options" data-i="${i}">+ Pool</button><button class="btn ${deckFirst ? "primary" : ""}" data-addto="deck" data-i="${i}">+ Deck</button>`;
  }
  return `<div class="rt"><button class="rt-img" data-zoom="${i}" data-img="${esc(c.large)}" title="${HOVER.matches ? "" : "Open " + esc(c.name)}"><img src="${esc(c.img)}" alt="${esc(c.name)}" loading="lazy">${hlBadges(r)}${tag}</button>
    <div class="rt-meta"><b>${esc(c.name)}</b><span class="price${isPricey(c) ? " pricey" : ""}">${priceText(c)}</span>${meta}</div><div class="rt-acts">${acts}</div></div>`;
}
async function loadAdd(append = false){
  const d = cur(); const tok = ++A.token;
  A.loading = true; A.error = "";
  if (!append){ A.results = []; A.page = 1; A.more = false; }
  renderAddBody();
  try {
    const raw = A.q.trim();
    if (A.mode === "token" && !raw){
      const recs = await deckTokens(d);
      if (tok !== A.token) return;
      A.results = recs; A.more = false;
    } else if (A.mode === "token"){
      const res = await sfSearch(`${raw} t:token`, A.page, true);
      if (tok !== A.token) return;
      const lo = raw.toLowerCase(), rank = c => c.name.toLowerCase() === lo ? 0 : c.name.toLowerCase().startsWith(lo) ? 1 : c.name.includes("//") ? 3 : 2;
      // one result per distinct token; its other artworks are in its card view
      for (const card of res.cards.sort((a, b) => rank(a) - rank(b))){
        const g = A.results.find(r => sameToken(r.card, card));
        if (g) g.arts = (g.arts || 1) + 1; else A.results.push({card, arts: 1});
      }
      A.more = res.more;
    } else if (A.mode !== "cards" || raw){
      let q = raw;
      if (q && !/[:<>=!]/.test(q)) q = `(${q} or o:"${q.replace(/"/g, "")}")`;
      if (A.mode === "commander") q = `${q} is:commander game:paper`;
      else if (A.mode === "partner") q = `${q} ${partnerQuery(d.commander) || "is:commander keyword:partner"} game:paper`;
      else {
        if (A.bucket !== "Any") q += ` t:${A.bucket.toLowerCase()}`;
        if (A.colors) q += ` id<=${deckCI(d).join("").toLowerCase() || "c"}`;
        q += " game:paper";
      }
      const res = await sfSearch(q.trim(), A.page);
      if (tok !== A.token) return;
      A.results = A.results.concat(res.cards.filter(c => A.mode !== "partner" || c.name !== d.commander.name).map(card => ({card})));
      A.more = res.more;
    } else {
      const recs = await recommend(d, A.bucket);
      if (tok !== A.token) return;
      A.results = recs;
    }
  } catch (err){
    if (tok !== A.token) return;
    A.error = navigator.onLine === false ? "You’re offline. Recommendations and search need an internet connection." : (err.message || "Something went wrong loading cards. Try again.");
  }
  A.loading = false; renderAddBody();
}
let qT;
$("#addModal").addEventListener("input", e => {
  if (e.target.id === "addQ"){ A.q = e.target.value; $("#clearQ").hidden = !A.q; clearTimeout(qT); qT = setTimeout(() => loadAdd(), 300); }
});
$("#addModal").addEventListener("change", e => {
  if (e.target.id === "onlyColors"){ A.colors = e.target.checked; if (A.q.trim()) loadAdd(); }
  if (e.target.id === "addSort"){ UI.addSort = e.target.value; saveUI(); renderAddBody(); }
});
$("#addModal").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "newName") $("#addQ").focus(); });
$("#addModal").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.hasAttribute("data-close")) return hideScrim("#addScrim");
  if (b.dataset.unfocus){ toggleFocus(b.dataset.unfocus); loadAdd(); return; }
  if (b.id === "clearQ"){ A.q = ""; $("#addQ").value = ""; loadAdd(); if (HOVER.matches) $("#addQ").focus(); return; }
  if (b.dataset.bucket){ A.bucket = b.dataset.bucket; A.hl = null; loadAdd(); return; }
  if (b.dataset.hl){ const on = A.hl === b.dataset.hl; A.hl = on ? null : b.dataset.hl; if (A.bucket !== "Any"){ A.bucket = "Any"; loadAdd(); } else renderAddBody(); return; }
  if (b.id === "moreBtn"){ A.page++; loadAdd(true); return; }
  if (b.dataset.zoom != null){ const r = A.results[+b.dataset.zoom]; openDetail({kind: "add", card: r.card, rec: r}, b); return; }
  if (b.dataset.pick != null){ setCommander(A.results[+b.dataset.pick].card); return; }
  if (b.dataset.addtok != null){ const r = A.results[+b.dataset.addtok]; if (addToken(r.card, A.side)){ toast(`${r.card.name} token added`); renderAddBody(); } return; }
  if (b.dataset.addto){
    const r = A.results[+b.dataset.i];
    if (addCard(r.card, b.dataset.addto)){ A.addedNow.add(r.card.name); toast(`${r.card.name} added to ${b.dataset.addto === "deck" ? "deck" : "card pool"}`); renderAddBody(); }
  }
});
function setCommander(card, keep){
  const d = cur(); if (!d || guard(d)) return;
  card = keep ? JSON.parse(JSON.stringify(card)) : plainPrint(card);
  if (A.mode === "partner"){
    d.partner = card;
    d.cards = d.cards.filter(c => c.card.name !== card.name);
    touch(d); hideScrim("#addScrim"); closeDetail(true, {anim: false}); render();
    toast(`${card.name} joins as partner`); return;
  }
  const old = d.commander;
  const typed = $("#newName") ? $("#newName").value.trim() : null;
  d.commander = card;
  if (d.partner && !partnerQuery(card)) d.partner = null;
  if (typed) d.name = typed;
  else if (!d.name || (old && d.name === old.name)) d.name = card.name;
  touch(d); hideScrim("#addScrim"); closeDetail(true, {anim: false}); render();
  toast(`${card.name} leads this deck`);
}
