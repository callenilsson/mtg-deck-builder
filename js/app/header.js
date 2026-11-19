"use strict";
/* The commander panel: commander(s), deck name, Build around, totals, the folded rail, and their events. */
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
function renderRail(d){
  const {n, locked, value} = deckTotals(d);
  const deck = d.cards.filter(c => c.zone === "deck");
  const chips = d.typeOrder.filter(t => (d.limits[t] ?? 0) > 0 || deck.some(c => c.bucket === t)).map(t => {
    const k = sumQ(deck.filter(c => c.bucket === t)), lim = d.limits[t] ?? 0;
    return `<span class="r-chip ${k > lim ? "over" : k === lim && lim ? "met" : ""}" title="${PLURAL[t]}: ${k} of ${lim}"><i class="ms ${MS[t]}"></i>${k}/${lim}</span>`;
  }).join("");
  $("#rail").innerHTML = `<button class="icon-btn r-open panel-btn" id="railOpen" title="Show commander and stats">${I.panelR}</button><button class="icon-btn" id="railMenu" title="Show or hide your decks">${I.menu}</button>
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
  $("#foldTop").innerHTML = I.panelL;
}
$("#roBanner").addEventListener("click", e => { if (e.target.closest("#roCopy")) duplicateDeck(S.active); });
$("#deckName").addEventListener("input", e => {
  const d = cur(); if (!d || roDeck(d)) return; d.name = e.target.value; renderSidebar();
  clearTimeout(nameT); nameT = setTimeout(() => touch(d), 400);
});
let nameT;
$("#cmds").addEventListener("click", e => {
  const a = e.target.closest("[data-cact]");
  if (a){
    const kind = a.dataset.kind, slotEl = a.closest(".cmd-col").querySelector(".cmd-slot");
    if (a.dataset.cact === "edit") openDetail({kind}, slotEl);
    else if (a.dataset.cact === "change") kind === "partner" ? openPartnerPicker() : openCommanderPicker();
    else if (a.dataset.cact === "remove"){
      const d = cur();
      confirmTwice([{title: "Remove the partner?", text: `${esc(d.partner.name)} leaves the command zone. Recommendations go back to ${esc(d.commander.name)} alone.`, yes: "Remove partner"}], () => { d.partner = null; touch(d); render(); toast("Partner removed"); });
    }
    return;
  }
  const b = e.target.closest("[data-cmd]"); if (!b) return;
  const k = b.dataset.cmd;
  if (k === "addPartner") openPartnerPicker(); else openDetail({kind: k}, b);
});
$("#combo").addEventListener("click", e => {
  const x = e.target.closest("[data-unfocus]"); if (x){ e.stopPropagation(); toggleFocus(x.dataset.unfocus); return; }
  if (e.target.closest("#comboAdd")){
    toast("Press the two circles under any card to build around it");
    document.body.classList.remove("pulse-focus"); void document.body.offsetWidth; document.body.classList.add("pulse-focus");
    setTimeout(() => document.body.classList.remove("pulse-focus"), 2300); return;
  }
  const m = e.target.closest("[data-open]"); if (m && findCard(m.dataset.open)) openDetail({kind: "item", uid: m.dataset.open}, m);
});
$("#addAny").onclick = () => openAdd("Any", "options");
function setMini(on){ if (isCompact() || isPhone()) CMP_OPEN = !on; else { UI.cmdMini = on; saveUI(); }
  if (!on && isPhone() && S.sidebarOpen){ S.sidebarOpen = false; save(false); render(); } $("#top").classList.toggle("mini", on); applyZoom(); }
$("#foldTop").onclick = () => setMini(true);
$("#rail").addEventListener("click", e => {
  if (e.target.closest("#railOpen")){ setMini(false); return; }
  const ra = e.target.closest("[data-ract]");
  if (ra){ const k = ra.dataset.ract;
    if (k === "add") $("#addAny").click(); else if (k === "hand") openHand(); else if (k === "stats") openStats(); else if (k === "print") openPdf();
    return; }
  if (e.target.closest("#railMenu")){ S.sidebarOpen = !S.sidebarOpen; S.sideTouched = true; if (S.sidebarOpen && isPhone()) CMP_OPEN = false; save(false); render(); return; }
  const th = e.target.closest("[data-cmd]"); if (th){ if (isPhone() || isCompact()) setMini(false); else openDetail({kind: "commander"}, th); }
});
addEventListener("resize", () => { const d = cur(); if (d && d.commander) renderRail(d); });
$("#total").addEventListener("change", e => {
  if (e.target.id === "curSel"){ UI.cur = e.target.value; saveUI(); renderAll(); return; }
  if (e.target.id !== "priceyIn") return;
  const d = cur(); if (!d || guard(d)){ renderHeader(); return; }
  const v = parseFloat(String(e.target.value).replace(",", "."));
  if (!(v >= 0)){ renderHeader(); return; }
  d.pricey = v; touch(d); renderBoard(); renderHeader();
});
