"use strict";
/* Test hand window: dealing, mulligans, playing cards by tap or drag. */
function openHand(){ const d = cur(); if (!d || !d.cards.some(c => c.zone === "deck")){ toast("Add cards to the deck first"); return; } newHand(false); showScrim("#handScrim"); }
function handCard(c, i, cls, attr){ return `<button class="hc ${cls}" ${attr} title="${esc(c.card.name)}"><img src="${esc(imgOf(c.card))}" alt="${esc(c.card.name)}" loading="lazy" draggable="false"></button>`; }
function renderHand(){
  const lands = H.hand.filter(isLandC).length, mana = manaNow(), left = mana - H.used, bfL = H.bf.filter(x => isLandC(x.c)), bfO = H.bf.filter(x => !isLandC(x.c));
  const opening = H.turn === 1 && !H.bf.length && !H.gy.length;
  const verdict = opening && !H.bottom ? (lands >= 2 && lands <= 4 ? `<span class="hv good">✓ Keepable: ${lands} lands</span>` : `<span class="hv bad">⚠ ${lands} land${lands === 1 ? "" : "s"}: most players would mulligan</span>`) : "";
  const playable = c => H.free || (isLandC(c) ? !H.landPlayed : Math.round(c.card.cmc || 0) <= left);
  const cm = cur().commander, cmCost = cm ? Math.max(0, Math.round(cm.cmc || 0)) : 0;
  $("#handModal").innerHTML = `<div class="modal-head"><h2>Test hand ${infoBtn("hand")}</h2><button class="icon-btn" data-close title="Close">${I.close}</button></div>
    <div class="hand-top">
      <span class="ht-turn">Turn <b>${H.turn}</b></span>
      <span class="ht-chip ${H.landPlayed ? "done" : ""}">${H.landPlayed ? "✓ Land played" : "Land drop available"}</span>
      <span class="ht-chip">Mana <b>${left}</b> of ${mana} left</span>
      ${H.cmdTurn ? `<span class="ht-chip done">✓ Commander cast on turn ${H.cmdTurn}</span>` : ""}
      <span class="ht-dim">${H.lib.length} in library${H.gy.length ? ` · ${H.gy.length} in graveyard` : ""}${H.mull ? ` · mulligan ${H.mull}` : ""}</span>${verdict}
      <button class="ht-free ${H.free ? "on" : ""}" id="hFree" title="Free play: play any card at any time (no land or mana limits)">${H.free ? "Free play: on" : "Free play: off"}</button></div>
    ${H.sim ? simHTML(H.sim) : ""}
    ${H.bottom ? `<p class="hand-note">Mulligan: tap <b>${H.bottom} card${H.bottom > 1 ? "s" : ""}</b> to put on the bottom of your library (the first mulligan in Commander is free).</p>` : ""}
    <div class="zone zone-split">${cm ? `<div class="cz"><div class="zone-h">Command zone</div>${H.cmdTurn ? `<p class="cz-done">On the battlefield</p>` : `<button class="hc ${H.free || cmCost <= left ? "can" : "cant"}" id="hCmd" title="Cast ${esc(cm.name)} (${cmCost} mana)"><img src="${esc(imgOf(cm))}" alt="${esc(cm.name)}"></button><small>${cmCost} mana</small>`}</div>` : ""}
      <div class="bfz"><div class="zone-h">Battlefield</div>
      <div class="bf" id="hBf">${H.bf.length ? `<div class="bf-row">${bfL.map(x => handCard(x.c, 0, "sm land", `data-bi="${H.bf.indexOf(x)}"`)).join("")}</div><div class="bf-row">${bfO.map(x => handCard(x.c, 0, `sm ${x.cmd ? "cmd" : ""} ${makesMana(x.c) ? "mana" : ""} ${makesMana(x.c) && x.since >= H.turn ? "sick" : ""}`, `data-bi="${H.bf.indexOf(x)}"`)).join("")}</div>` : `<p class="zone-empty">Tap or drag a card from your hand to play it: one land a turn, spells if you have enough mana.</p>`}</div></div></div>
    <div class="zone"><div class="zone-h">Hand <span>${H.hand.length}</span></div>
      <div class="hand-row ${H.bottom ? "picking" : ""}">${H.hand.map((c, i) => handCard(c, i, `${H.bottom ? "" : playable(c) ? "can" : "cant"} ${H.drew === c && i === H.hand.length - 1 ? "new" : ""}`, `data-hi="${i}"`)).join("")}</div></div>
    <div class="hand-acts"><button class="btn" id="hNew">New hand</button><button class="btn" id="hMull" ${!opening ? "disabled" : ""}>Mulligan</button><button class="btn" id="hSim" title="Play 1,000 quick games automatically and show the averages">Play 1,000 games</button><span class="ha-gap"></span><button class="btn primary" id="hNext" ${H.bottom || !H.lib.length ? "disabled" : ""}>Next turn (draw)</button></div>`;
}
/* the card flies from where it was to its new place on the battlefield */
function flyToBf(fromRect, src){
  const el = [...document.querySelectorAll("#hBf [data-bi]")].find(x => +x.dataset.bi === H.bf.length - 1);
  if (!el || !fromRect || REDUCED.matches) return;
  const to = el.getBoundingClientRect();
  el.animate([{transform: `translate(${fromRect.left - to.left}px,${fromRect.top - to.top}px) scale(${fromRect.width / to.width})`, transformOrigin: "0 0", zIndex: 5},
              {transform: "none", transformOrigin: "0 0"}], {duration: 320, easing: "cubic-bezier(.2,.8,.2,1)"});
}
function playFromHand(i, fromRect){
  const c = H.hand[i]; if (!c) return;
  if (isLandC(c)){
    if (H.landPlayed && !H.free){ toast("You've already played a land this turn (Free play allows more)"); return; }
    H.hand.splice(i, 1); H.bf.push({c, since: H.turn}); H.landPlayed = true; renderHand(); flyToBf(fromRect); return;
  }
  const cost = Math.round(c.card.cmc || 0), left = manaNow() - H.used;
  if (cost > left && !H.free){ toast(`${c.card.name} costs ${cost}: you have ${left} mana left this turn`); return; }
  H.used += Math.min(cost, Math.max(0, left)); H.hand.splice(i, 1);
  if (isPermC(c)){ H.bf.push({c, since: H.turn}); renderHand(); flyToBf(fromRect); }
  else { H.gy.push(c); renderHand(); toast(`${c.card.name} cast (to the graveyard)`); }
}
$("#handModal").addEventListener("click", e => {
  if (hDrag && hDrag.moved) return;
  const b = e.target.closest("button"); if (!b) return;
  if (b.hasAttribute("data-close")) return hideScrim("#handScrim");
  if (b.id === "hFree"){ H.free = !H.free; renderHand(); return; }
  if (b.id === "hSim"){ b.disabled = true; b.textContent = "Playing…"; setTimeout(() => { H.sim = simulate(1000); renderHand(); }, 20); return; }
  if (b.id === "hSimX"){ H.sim = null; renderHand(); return; }
  if (b.id === "hCmd"){
    const cm = cur().commander, cost = Math.round(cm.cmc || 0), left = manaNow() - H.used;
    if (cost > left && !H.free){ toast(`${cm.name} costs ${cost}: you have ${left} mana left this turn`); return; }
    const r = b.getBoundingClientRect(); H.used += Math.min(cost, Math.max(0, left));
    H.bf.push({c: {card: cm, bucket: "Creature"}, since: H.turn, cmd: true}); H.cmdTurn = H.turn; renderHand(); flyToBf(r); return;
  }
  if (b.id === "hNew") return newHand(false);
  if (b.id === "hMull"){ H.mull++; newHand(true); return; }
  if (b.id === "hNext"){ if (H.lib.length){ H.turn++; H.landPlayed = false; H.used = 0; H.drew = H.lib.shift(); H.hand.push(H.drew); renderHand(); } return; }
  if (b.dataset.hi == null) return;
  const i = +b.dataset.hi, c = H.hand[i]; if (!c) return;
  if (H.bottom){ H.hand.splice(i, 1); H.lib.push(c); H.bottom--; renderHand(); return; }
  playFromHand(i, b.getBoundingClientRect());
});
/* drag a card from your hand onto the battlefield */
let hDrag = null;
$("#handModal").addEventListener("pointerdown", e => {
  const b = e.target.closest(".hand-row .hc"); if (!b || H.bottom) return;
  hDrag = {b, i: +b.dataset.hi, x: e.clientX, y: e.clientY, moved: false};
});
window.addEventListener("pointermove", e => {
  if (!hDrag) return;
  const dx = e.clientX - hDrag.x, dy = e.clientY - hDrag.y;
  if (!hDrag.moved && Math.hypot(dx, dy) < 8) return;
  if (!hDrag.moved){
    hDrag.moved = true; const r = hDrag.b.getBoundingClientRect();
    hDrag.g = hDrag.b.cloneNode(true); hDrag.g.className = "hc hc-ghost";
    Object.assign(hDrag.g.style, {left: r.left + "px", top: r.top + "px", width: r.width + "px"});
    document.body.appendChild(hDrag.g); hDrag.b.style.opacity = ".25"; hDrag.r = r;
  }
  hDrag.g.style.transform = `translate(${dx}px,${dy}px) rotate(${Math.max(-8, Math.min(8, dx / 30))}deg) scale(1.05)`;
  const bf = $("#hBf"); if (bf){ const br = bf.getBoundingClientRect(); bf.classList.toggle("over", e.clientX > br.left && e.clientX < br.right && e.clientY > br.top && e.clientY < br.bottom); }
});
window.addEventListener("pointercancel", () => { const d = hDrag; hDrag = null; if (d && d.g){ d.g.remove(); d.b.style.opacity = ""; } });
window.addEventListener("pointerup", e => {
  const d = hDrag; if (!d) return;
  setTimeout(() => { hDrag = null; }, 0);
  if (!d.moved) return;
  const bf = $("#hBf"), over = bf && bf.classList.contains("over"); if (bf) bf.classList.remove("over");
  const gr = d.g.getBoundingClientRect();
  if (over){ d.g.remove(); playFromHand(d.i, gr); return; }
  d.b.style.opacity = "";
  const back = d.g.animate([{transform: d.g.style.transform}, {transform: "none"}], {duration: 220, easing: "cubic-bezier(.2,.8,.2,1)"});
  back.onfinish = () => d.g.remove();
});
document.addEventListener("click", e => { if (e.target.closest("#drawHand,[data-drawhand]")) openHand(); });
