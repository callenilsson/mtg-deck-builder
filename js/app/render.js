"use strict";
/* ---------------- Render ---------------- */
function renderAll(){ renderBoard(); renderHeader(); renderSidebar(); }
function normalizeStacks(d){
  if (!d || !isMine(d)) return false;
  const seen = new Map(); let merged = false;
  d.cards = d.cards.filter(c => {
    if (!canMulti(c.card) || hasCustoms(c.card)) return true;
    const k = `${c.zone}|${c.card.id}|${c.locked ? 1 : 0}`, st = seen.get(k);
    if (!st){ seen.set(k, c); return true; }
    st.qty = qOf(st) + qOf(c); merged = true; return false;
  });
  return merged;
}
function render(){
  $("#app").classList.toggle("side-closed", !S.sidebarOpen);
  const d = cur(), ready = !!(d && d.commander);
  $("#board").hidden = !ready; $("#tools").hidden = !ready;
  $("#welcome").hidden = ready;
  for (const id of ["#cmds", "#combo", "#stats"]) $(id).hidden = !ready;
  $(".top-actions").style.visibility = ready ? "" : "hidden";
  $("#total").style.visibility = d ? "" : "hidden";
  $(".name-wrap").hidden = !d;
  $("#top").classList.toggle("mini", (isCompact() || isPhone() ? !CMP_OPEN : !!UI.cmdMini) && ready);
  const ro = roDeck(d);
  document.body.classList.toggle("ro", ro);
  $("#deckName").readOnly = ro;
  $("#roBanner").hidden = !ro;
  if (ro) $("#roBanner").innerHTML = `${personAvatar(d.owner)}<span><b>${esc(ownerName(d))}’s deck</b><small>View only</small></span><button class="btn sm" id="roCopy">${I.copy}Copy to my decks</button>`;
  renderSidebar(); renderHeader();
  if (ready){ renderBoard(); refreshPrices(d); refreshCheap(d); } else renderWelcome();
}
function personAvatar(p, cls = ""){
  const n = (p && p.name) || "?";
  return p && p.photo ? `<img class="avatar ${cls}" src="${esc(p.photo)}" alt="" referrerpolicy="no-referrer">`
    : `<span class="avatar ${cls}" style="background:hsl(${[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % 360} 35% 32%)">${esc(n.trim()[0] || "?").toUpperCase()}</span>`;
}
