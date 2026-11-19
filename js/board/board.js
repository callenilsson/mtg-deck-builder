"use strict";
/* renderBoard(): both panels, and scrolling to a card after adding it. */
let CAST = null;
function renderBoard(){
  const d = cur(); if (!d || !d.commander) return;
  CAST = castCtx(d);      // shared mana counts for the "often late" marks
  $("#optBoxes").innerHTML = (d.typeOrder.map(t => boxHTML(d, "options", t)).join("") || `<div class="empty-note">No cards match the filter.</div>`) + tokenBoxHTML(d, "options");
  $("#deckBoxes").innerHTML = (d.typeOrder.map(t => boxHTML(d, "deck", t)).join("") || `<div class="empty-note">No cards match the filter.</div>`) + tokenBoxHTML(d, "deck");
  const pool = d.cards.filter(c => c.zone === "options"), deck = d.cards.filter(c => c.zone === "deck");
  const pv = sumPrice(cardsQ(pool)), dv = sumPrice([...cmdrs(d), ...cardsQ(deck)]);   // deck value includes the commander, same as the commander panel
  const pc = list => sumQ(list.filter(c => isPricey(c.card))), po = pc(pool), pd = pc(deck);
  const sym = UI.cur === "usd" ? "$" : "€";
  $("#optMeta").innerHTML = `${sumQ(pool)} cards · ${fmtMoney(pv.tot, pv.sym)}${po ? ` · <span class="ph-pricey" title="${po} cards at ${sym}${priceyTh(d)} or more">💎 ${po}</span>` : ""}`;
  $("#deckMeta").innerHTML = `${sumQ(deck)} cards · ${fmtMoney(dv.tot, dv.sym)}${pd ? ` · <span class="ph-pricey" title="${pd} cards at ${sym}${priceyTh(d)} or more">💎 ${pd}</span>` : ""}`;
  renderJump();
  renderTools(d);
  updateZoomMax();
}
let revealAfterAdd = null;
function revealCard(u){
  const el = document.querySelector(`#board .cw[data-uid="${u}"], #board .cw[data-tok="${u}"]`); if (!el) return;
  const box = el.closest(".box"); if (box && box.classList.contains("collapsed")) setFolded(`${box.dataset.zone}:${box.dataset.type}`, false);
  el.scrollIntoView({block: "center", behavior: REDUCED.matches ? "auto" : "smooth"});
  setTimeout(() => el.querySelector(".ct")?.animate([{boxShadow: "0 0 0 0 rgba(217,171,79,.9)"}, {boxShadow: "0 0 0 10px rgba(217,171,79,0)"}], {duration: 900, iterations: 2}), 350);
}
