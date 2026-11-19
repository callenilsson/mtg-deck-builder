"use strict";
/* Add cards window: loading picks and search results, its events, choosing a commander. */
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
