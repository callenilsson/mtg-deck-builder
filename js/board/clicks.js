"use strict";
/* ---------------- Header shrinks to one line while you scroll the cards ---------------- */

/* ---------------- Board clicks: buttons act at once; single click = card view; double click = move ---------------- */
let clickT = null, clickU = null;
function setFolded(key, on){
  UI.collapsed = UI.collapsed || {};
  if (on) UI.collapsed[key] = true; else delete UI.collapsed[key];
  saveUI();
  const [zone, t] = key.split(":"), box = document.querySelector(`.panel[data-zone="${zone}"] .box[data-type="${t}"]`);
  if (box){ box.classList.toggle("collapsed", on); box.querySelector(".box-head").title = `${on ? "Show" : "Hide"} ${PLURAL[t].toLowerCase()}`; }
  markJump();
}
$("#board").addEventListener("click", e => {
  if (suppressClick) return;
  const fh = !e.target.closest(".box-grip") && e.target.closest("[data-fold]");
  if (fh){ const k = fh.dataset.fold; setFolded(k, !(UI.collapsed || {})[k]); return; }
  const add = e.target.closest("[data-add]");
  if (add){ openAdd(add.dataset.add, add.dataset.side); return; }
  const at = e.target.closest("[data-addtoken],[data-tokfind]");
  if (at){ openAddTokens(at.dataset.addtoken || at.dataset.tokfind); return; }
  const tk = e.target.closest(".cw[data-tok]");
  if (tk){
    const tu = tk.dataset.tok, ta = e.target.closest("[data-tact],[data-act]");
    if (ta){ const a = ta.dataset.tact || ta.dataset.act;
      if (a === "inc" || a === "dec") changeQty(tu, a === "inc" ? 1 : -1);
      else if (a === "remove") removeToken(tu);
      else if (a === "edit") openDetail({kind: "token", uid: tu}, tk.querySelector(".ct"));
      return; }
    if (e.target.closest(".ct")){ openDetail({kind: "token", uid: tu}, tk.querySelector(".ct")); if (V) V.dbl = {uid: tu, tok: true, t: performance.now()}; }
    return;
  }
  const cw = e.target.closest(".cw[data-uid]"); if (!cw) return;
  const u = cw.dataset.uid;
  const act = e.target.closest("[data-act]");
  if (act){
    const a = act.dataset.act;
    if (a === "inc" || a === "dec"){ changeQty(u, a === "inc" ? 1 : -1); return; }
    if (a === "move") moveOther(u); else if (a === "lock") toggleLock(u); else if (a === "focus") toggleFocus(u);
    else if (a === "remove") removeCard(u);
    else if (a === "edit") openDetail({kind: "item", uid: u}, cw.querySelector(".ct"));
    return;
  }
  const ct = e.target.closest(".ct"); if (!ct) return;
  openDetail({kind: "item", uid: u}, ct);
  if (V) V.dbl = {uid: u, t: performance.now()};
});
/* Double-click a card = move it. The first click already opened the card view, so a second press right after
   closes it again (no animation) and moves the card. */
let swallowClickUntil = 0;
document.addEventListener("pointerdown", e => {
  if (!V || !V.dbl || performance.now() - V.dbl.t > 350) return;
  e.preventDefault(); e.stopPropagation();
  const {uid: u, tok} = V.dbl;
  closeDetail(true, {anim: false}); swallowClickUntil = performance.now() + 500;
  if (tok) moveToken(u); else moveOther(u);
}, true);
document.addEventListener("click", e => { if (performance.now() < swallowClickUntil){ swallowClickUntil = 0; e.preventDefault(); e.stopPropagation(); } }, true);
$("#stats").addEventListener("click", e => {
  if (e.target.closest("#cbAll")){ CB_ALL = !CB_ALL; renderStats(); return; }
  const op = e.target.closest(".cb-item[data-open]"); if (op){ openDetail({kind: "item", uid: op.dataset.open}, null); return; }
  const ro = e.target.closest("[data-role]"); if (ro){ UI.role = UI.role === ro.dataset.role ? "" : ro.dataset.role; renderTools(cur()); animateBoard(() => renderBoard()); renderStats(); if (UI.role) toast(`Showing ${ROLES.find(x => x.k === UI.role).label.toLowerCase()} cards. Click again to show all.`); return; }
  const ct = e.target.closest("[data-ctype]"); if (ct){ UI.ctype = UI.ctype === ct.dataset.ctype ? "" : ct.dataset.ctype; renderTools(cur()); animateBoard(() => renderBoard()); renderStats(); return; }
  if (e.target.closest("#gcBtn")){ const d = cur(); const g = [...cmdrs(d), ...d.cards.filter(c => c.zone === "deck").map(c => c.card)].filter(isGC).map(c => c.name); toast(g.length ? `Game Changers: ${g.join(", ")}` : "No Game Changers in this deck"); return; }
  if (e.target.closest("#useSugg")){
    if (guard()) return;
    const d = cur(), sg = SUGG[suggestKey(d)]; if (!sg || !sg.counts) return;
    d.limits = {...sg.counts}; touch(d); renderBoard(); renderStats();
    toast("Limits updated to EDHREC’s numbers");
  }
  const ab = e.target.closest("#addBasics");
  if (ab){ const n = parseInt(ab.textContent.replace(/\D+/g, ""), 10) || 0; if (n) addBasics(n); }
});
$("#stats").addEventListener("change", e => {
  const inp = e.target.closest("[data-lim]"); if (!inp) return;
  if (guard()){ renderStats(); return; }
  const d = cur(); d.limits[inp.dataset.lim] = Math.max(0, Math.min(99, parseInt(inp.value, 10) || 0));
  touch(d); renderBoard(); renderStats();
});
