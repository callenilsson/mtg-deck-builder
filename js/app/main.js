"use strict";
/* ---------------- Wiring ---------------- */
$("#profile").addEventListener("click", e => {
  if (e.target.closest("#profConnect")) driveConnect();
  else if (e.target.closest("#profSync")){ DS.rev = null; driveSync(false); }
  else if (e.target.closest("#profDrive")) $("#driveBox").scrollIntoView({behavior: "smooth", block: "center"});
});
$("#closeSide").innerHTML = I.panelL; $("#railExpand").innerHTML = I.panelR;
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
let nameT;
$("#roBanner").addEventListener("click", e => { if (e.target.closest("#roCopy")) duplicateDeck(S.active); });
$("#deckName").addEventListener("input", e => {
  const d = cur(); if (!d || roDeck(d)) return; d.name = e.target.value; renderSidebar();
  clearTimeout(nameT); nameT = setTimeout(() => touch(d), 400);
});
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
$("#welcome").addEventListener("click", e => {
  if (e.target.closest("#gateSignIn")){ driveConnect(); return; }
  if (e.target.closest("#gateOpen")){ driveOpen(); return; }
  if (e.target.closest("#gateCreate")){ driveCreate(); return; }
  if (e.target.closest("#gateRetry")){ DS.rev = null; driveSync(false); return; }
  if (e.target.closest("#welcomeSlot")) cur() ? openCommanderPicker(true) : newDeck();
});
$("#addAny").onclick = () => openAdd("Any", "options");
function setMini(on){ if (isCompact() || isPhone()) CMP_OPEN = !on; else { UI.cmdMini = on; saveUI(); }
  if (!on && isPhone() && S.sidebarOpen){ S.sidebarOpen = false; save(false); render(); } $("#top").classList.toggle("mini", on); applyZoom(); }
$("#foldTop").onclick = () => setMini(true);
$("#rail").addEventListener("click", e => {
  if (e.target.closest("#railOpen")){ setMini(false); return; }
  const ra = e.target.closest("[data-ract]");
  if (ra){ const k = ra.dataset.ract;
    if (k === "add") $("#addAny").click(); else if (k === "hand") openHand(); else if (k === "stats") openStats(); else if (k === "print") openPdf(); else if (k === "fs") toggleFull();
    return; }
  if (e.target.closest("#railMenu")){ S.sidebarOpen = !S.sidebarOpen; S.sideTouched = true; if (S.sidebarOpen && isPhone()) CMP_OPEN = false; save(false); render(); return; }
  const th = e.target.closest("[data-cmd]"); if (th){ if (isPhone() || isCompact()) setMini(false); else openDetail({kind: "commander"}, th); }
});
addEventListener("resize", () => { const d = cur(); if (d && d.commander) renderRail(d); });

$("#pdfBtn").onclick = openPdf;
$("#saveFile").onclick = saveFile;
$("#importBtn").onclick = () => $("#importFile").click();
$("#importFile").onchange = e => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ""; };

$("#total").addEventListener("change", e => {
  if (e.target.id === "curSel"){ UI.cur = e.target.value; saveUI(); renderAll(); return; }
  if (e.target.id !== "priceyIn") return;
  const d = cur(); if (!d || guard(d)){ renderHeader(); return; }
  const v = parseFloat(String(e.target.value).replace(",", "."));
  if (!(v >= 0)){ renderHeader(); return; }
  d.pricey = v; touch(d); renderBoard(); renderHeader();
});
window.addEventListener("storage", e => { if (e.key === KEY && !CLOUD()){ try { S.decks = JSON.parse(e.newValue).decks; render(); } catch {} } });

/* Always run the newest version: GitHub Pages lets browsers cache the page for ~10 minutes,
   so ask for the current build number directly and switch when it's newer. */
async function latestBuild(){
  const r = await fetch(location.pathname + "?build-check=" + Date.now(), {cache: "no-store"});
  const m = (await r.text()).match(/<meta name="build" content="([^"]+)">/);
  return m ? m[1] : null;
}
const freshUrl = b => location.pathname + "?v=" + encodeURIComponent(b) + location.hash;
async function checkForUpdate(onStart){
  if (location.protocol !== "https:" || BUILD === "dev") return;
  try {
    const b = await latestBuild();
    if (!b || b === BUILD) return;
    if (onStart && !sessionStorage.getItem("mtg-updated-to-" + b)){ sessionStorage.setItem("mtg-updated-to-" + b, "1"); location.replace(freshUrl(b)); return; }
    $("#updateBar").hidden = false; $("#updateBar").onclick = () => location.replace(freshUrl(b));
  } catch {}
}
checkForUpdate(true);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkForUpdate(false); });
setInterval(() => checkForUpdate(false), 10 * 60 * 1000);

applyZoom(); applySplit(); applyUiZoom();
initScrollBars();
installNudge();
setTimeout(syncFull, 0);
load();
render();
renderDrive(); initGoogle();
idb.loadAll().then(() => { if (IMG.size) render(); });
