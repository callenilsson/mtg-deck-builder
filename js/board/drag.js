"use strict";
/* ---------------- Drag & drop ----------------
   Mouse: press and move. Touch: press and hold a card ~0.2 s until it lifts, then drag.
   Box handles (⋮⋮) drag right away on both. Reordering stays inside the locked or the unlocked group. */
let press = null, drag = null, suppressClick = false;
document.addEventListener("pointerdown", e => {
  if (e.pointerType === "touch" || e.button > 0) return;
  const grip = e.target.closest(".box-grip");
  const tile = !grip && e.target.closest("#board .ct");
  if (!grip && !tile) return;
  if (tile && tile.closest("[data-tok]")) return;
  press = {x: e.clientX, y: e.clientY, kind: grip ? "box" : "card", el: grip ? grip.closest(".box") : tile.closest(".cw")};
  if (grip) e.preventDefault();
});
window.addEventListener("pointermove", e => {
  if (e.pointerType === "touch") return;
  if (drag){ e.preventDefault(); drag.x = e.clientX; drag.y = e.clientY; moveDrag(); return; }
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) startDrag(press.kind, press.el, e.clientX, e.clientY);
});
window.addEventListener("pointerup", e => { if (e.pointerType === "touch") return; press = null; if (drag) endDrag(true); });

let tp = null;
document.addEventListener("touchstart", e => {
  if (e.touches.length > 1){ cancelTouch(); return; }
  const t = e.touches[0];
  const grip = e.target.closest(".box-grip");
  if (grip){ e.preventDefault(); startDrag("box", grip.closest(".box"), t.clientX, t.clientY); return; }
  const tile = e.target.closest("#board .ct"); if (!tile || tile.closest("[data-tok]")) return;
  const cw = tile.closest(".cw");
  tp = {x: t.clientX, y: t.clientY, el: cw, timer: setTimeout(() => {
    if (!tp) return; navigator.vibrate?.(15); cw.classList.add("lifted");
    startDrag("card", cw, tp.x, tp.y); tp = null;
  }, 200)};
}, {passive: false});
document.addEventListener("touchmove", e => {
  if (drag){ e.preventDefault(); const t = e.touches[0]; drag.x = t.clientX; drag.y = t.clientY; moveDrag(); return; }
  if (tp){ const t = e.touches[0]; if (Math.hypot(t.clientX - tp.x, t.clientY - tp.y) > 10) cancelTouch(); }
}, {passive: false});
document.addEventListener("touchend", e => { cancelTouch(); if (drag){ e.preventDefault(); endDrag(true); } }, {passive: false});
document.addEventListener("touchcancel", () => { cancelTouch(); if (drag) endDrag(false); });
function cancelTouch(){ if (tp){ clearTimeout(tp.timer); tp = null; } }
document.addEventListener("contextmenu", e => { if (e.target.closest("#board .ct") || drag) e.preventDefault(); });

function startDrag(kind, el, x, y){
  press = null; if (!el) return;
  if (roDeck(cur())){ guard(); return; }
  if (kind === "card" && UI.sort !== "manual") adoptShownOrder();
  const src = kind === "box" ? el.querySelector(".box-head") : el.querySelector(".ct");
  const r = src.getBoundingClientRect();
  let ghost;
  if (kind === "box"){
    ghost = src.cloneNode(true); ghost.classList.add("ghost");
    ghost.style.background = "var(--surface-2)"; ghost.style.borderRadius = "10px"; ghost.style.border = "1px solid var(--gold-line)";
    ghost.style.boxShadow = "0 18px 40px rgba(0,0,0,.6)";
  } else {
    // like moving apps on a phone: the card lifts a little under your finger, its spot stays open
    ghost = document.createElement("div"); ghost.className = "ghost"; ghost.style.borderRadius = "8px";
    const inner = document.createElement("div"); inner.className = "ghost-in";
    inner.style.setProperty("--gx", (x - r.left) + "px"); inner.style.setProperty("--gy", (y - r.top) + "px");
    inner.appendChild(src.cloneNode(true)); ghost.appendChild(inner);
    requestAnimationFrame(() => requestAnimationFrame(() => { inner.style.transform = "scale(1.08)"; }));
  }
  ghost.style.width = r.width + "px"; ghost.style.height = r.height + "px";
  document.body.appendChild(ghost);
  prev.hidden = true;
  drag = {kind, el, ghost, ox: x - r.left, oy: y - r.top, x, y, target: null, uid: el.dataset.uid, type: el.dataset.type};
  el.classList.remove("lifted"); el.classList.add("dragging");
  document.body.classList.add("is-dragging");
  moveDrag(); autoScroll();
}
/* Dragging a card while sorted by % or synergy: "Your order" takes over the order you are looking at, so nothing jumps. */
function adoptShownOrder(){
  const d = cur(); if (!d) return;
  const shown = [...document.querySelectorAll("#board .cw[data-uid]")].map(e => e.dataset.uid);
  const pos = new Map(shown.map((u, i) => [u, i]));
  const rest = d.cards.filter(c => !pos.has(c.uid));
  d.cards = [...d.cards.filter(c => pos.has(c.uid)).sort((a, b) => pos.get(a.uid) - pos.get(b.uid)), ...rest];
  UI.sort = "manual"; saveUI();
  const sel = $("#sortSel"); if (sel) sel.value = "manual";
  toast("Sorted by “Your order” now, so you can arrange the cards");
}
function clearMarks(){
  document.querySelectorAll(".ins-before,.ins-after,.ins-top,.ins-bottom,.target,.drop-target").forEach(el => el.classList.remove("ins-before","ins-after","ins-top","ins-bottom","target","drop-target"));
}
function moveDrag(){
  const {ghost, x, y} = drag;
  ghost.style.transform = `translate3d(${x - drag.ox}px, ${y - drag.oy}px, 0)`;
  if (!drag.raf) drag.raf = requestAnimationFrame(() => { if (drag){ drag.raf = 0; hitTest(); } });
}
function setMarks(list){
  const key = list.map(([el, c]) => (el.dataset.uid || el.dataset.type || el.dataset.zone) + c).join("|");
  if (key === drag.markKey) return;
  drag.markKey = key; clearMarks(); list.forEach(([el, c]) => el.classList.add(c));
}
function hitTest(){
  const {x, y} = drag;
  const marks = [];
  const under = document.elementFromPoint(x, y);
  const panel = under && under.closest(".panel");
  if (!panel){ if (drag.kind !== "card") drag.target = null; return setMarks([]); }   // outside: a card keeps its last place
  drag.panel = panel; drag.target = null;
  if (drag.kind === "card"){
    const c = findCard(drag.uid); if (!c) return;
    const zone = panel.dataset.zone;
    const box = panel.querySelector(`.box[data-type="${c.bucket}"]`);
    if (box) marks.push([box, "target"]);
    marks.push([panel, "drop-target"]);
    drag.target = {zone, live: true};
    if (box && !(c.locked && zone !== "deck")){
      const grid = box.querySelector(".grid"), el = drag.el;
      let tEl = slotUnder(grid, el, x, y);
      if (!tEl) drag.lastOver = null;
      const tc = tEl && findCard(tEl.dataset.uid);
      // reorder only in "Your order", and only among cards in the same group (locked or not)
      if (UI.sort === "manual" && tEl && tc && tc.locked === c.locked && drag.lastOver !== tEl){
        const sib = [...grid.children], before = el.parentElement === grid && sib.indexOf(el) < sib.indexOf(tEl);
        if (before ? tEl.nextElementSibling !== el : tEl.previousElementSibling !== el){
          liveMove(grid, () => grid.insertBefore(el, before ? tEl.nextElementSibling : tEl));
          drag.lastOver = tEl;
        }
      } else if (el.parentElement !== grid){
        // another side or section: join the end of the matching group
        const firstUnlocked = [...grid.querySelectorAll(".cw[data-uid]")].find(k => { const kc = findCard(k.dataset.uid); return kc && !kc.locked; });
        liveMove(grid, () => grid.insertBefore(el, c.locked ? (firstUnlocked || grid.querySelector(".add-tile")) : grid.querySelector(".add-tile")));
      }
    }
  } else {
    const box = under.closest(".box");
    if (!box || box.dataset.type === drag.type) return setMarks([]);
    const r = box.getBoundingClientRect();
    const after = y > r.top + r.height / 2;
    marks.push([box, after ? "ins-bottom" : "ins-top"]);
    drag.target = {type: box.dataset.type, after};
  }
  setMarks(marks);
}
/* Which card's resting place is under the finger. Uses where the cards really sit (their slide animations removed)
   and the middle 70% of each card, so edges and moving cards don't cause flip-flopping. */
function slotUnder(grid, self, x, y){
  for (const k of grid.querySelectorAll(".cw[data-uid]")){
    if (k === self) continue;
    const r = k.getBoundingClientRect(), m = new DOMMatrixReadOnly(getComputedStyle(k).transform === "none" ? undefined : getComputedStyle(k).transform);
    const L = r.left - m.m41, T = r.top - m.m42, w = r.width, h = r.height;
    if (x > L + w * .15 && x < L + w * .85 && y > T + h * .15 && y < T + h * .85) return k;
  }
  return null;
}
/* Move the dragged card's place in the page; the cards around it glide to their new spots. */
function liveMove(grid, mutate){
  const old = drag.el.parentElement;
  const els = [...new Set([...grid.querySelectorAll(".cw"), ...(old ? old.querySelectorAll(".cw") : [])])].filter(e => e !== drag.el);
  const rects = new Map(els.map(e => [e, e.getBoundingClientRect()]));
  mutate();
  if (REDUCED.matches) return;
  for (const [e, r] of rects){
    const n = e.getBoundingClientRect(), dx = r.left - n.left, dy = r.top - n.top;
    if (Math.abs(dx) > .5 || Math.abs(dy) > .5) e.animate([{transform: `translate(${dx}px,${dy}px)`}, {transform: "none"}], {duration: 300, easing: "cubic-bezier(.22,1.12,.36,1)"});
  }
}
/* After a drop the lifted card glides into its new spot and settles (the board has re-rendered by then). */
let LANDING = null;
function landGhost(dr){
  const g = dr.ghost, inner = g.querySelector(".ghost-in");
  const el = document.querySelector(`#board .cw[data-uid="${dr.uid}"]`), ct = el && el.querySelector(".ct");
  const unhide = () => { LANDING = null; document.querySelectorAll("#board .cw.landing").forEach(e => e.classList.remove("landing")); };
  if (!ct || REDUCED.matches){ g.remove(); unhide(); return; }
  const to = ct.getBoundingClientRect(), from = g.getBoundingClientRect();
  if (!to.width || to.bottom < 0 || to.top > innerHeight){ g.remove(); unhide(); return; }
  el.classList.add("landing");
  const sx = to.width / from.width, sy = to.height / from.height;
  g.style.transformOrigin = "0 0";
  const anim = g.animate([{transform: g.style.transform}, {transform: `translate3d(${to.left}px, ${to.top}px, 0) scale(${sx}, ${sy})`}],
    {duration: 240, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards"});
  if (inner){ inner.style.transform = "scale(1)"; inner.style.boxShadow = "0 0 0 0 rgba(0,0,0,0)"; }
  let fin = false;
  const done = () => { if (fin) return; fin = true; unhide(); g.remove(); };
  anim.onfinish = done; setTimeout(done, 400);
}
function autoScroll(){
  if (!drag) return;
  const sc = drag.panel && drag.panel.querySelector(".panel-scroll");
  if (sc){
    const r = sc.getBoundingClientRect(), edge = 70;
    let v = 0;
    if (drag.y < r.top + edge) v = -Math.ceil((r.top + edge - drag.y) / 5);
    else if (drag.y > r.bottom - edge) v = Math.ceil((drag.y - (r.bottom - edge)) / 5);
    if (v){ sc.scrollTop += v; hitTest(); }
  }
  requestAnimationFrame(autoScroll);
}
function endDrag(commit){
  if (drag && commit) hitTest();
  const dr = drag; drag = null; if (dr.raf) cancelAnimationFrame(dr.raf);
  if (dr.kind === "card"){ LANDING = dr.uid; dr.el.classList.add("landing"); setTimeout(() => landGhost(dr), 0); } else dr.ghost.remove();
  dr.el.classList.remove("dragging", "lifted");
  if (!commit && dr.kind === "card") renderBoard();
  document.body.classList.remove("is-dragging");
  clearMarks();
  suppressClick = true; setTimeout(() => suppressClick = false, 80);
  if (DS.renderAfterDrag && !(commit && dr.target)){ DS.renderAfterDrag = false; render(); }
  if (!commit || !dr.target) return;
  const d = cur();
  if (dr.kind === "card"){
    const c = findCard(dr.uid); if (!c){ renderBoard(); return; }
    const panel = dr.el.closest(".panel"), zone = panel ? panel.dataset.zone : c.zone;
    if (c.locked && zone !== "deck"){ toast("Unlock this card to move it out of the deck"); renderBoard(); return; }
    // the card already sits where it was dropped: read its new neighbours from the page
    const near = (el, dir) => { let s = el[dir]; while (s && !(s.classList && s.classList.contains("cw") && s.dataset.uid)) s = s[dir]; return s && s.dataset.uid; };
    const prevU = near(dr.el, "previousElementSibling"), nextU = near(dr.el, "nextElementSibling");
    const was = c.zone, oldIdx = d.cards.indexOf(c);
    d.cards.splice(oldIdx, 1); c.zone = zone;
    let j = prevU ? d.cards.findIndex(k => k.uid === prevU) + 1 : nextU ? d.cards.findIndex(k => k.uid === nextU) : d.cards.length;
    if (j < 0) j = d.cards.length;
    d.cards.splice(j, 0, c);
    if (was === zone && d.cards.indexOf(c) === oldIdx){ renderBoard(); if (DS.renderAfterDrag){ DS.renderAfterDrag = false; render(); } return; }
    DS.renderAfterDrag = false;
    touch(d); renderAll();
    if (was !== zone) limitWarn(c);
  } else {
    const o = d.typeOrder.filter(t => t !== dr.type);
    let j = o.indexOf(dr.target.type); if (dr.target.after) j++;
    o.splice(j, 0, dr.type); d.typeOrder = o;
    touch(d); renderBoard(); renderStats();
  }
}
