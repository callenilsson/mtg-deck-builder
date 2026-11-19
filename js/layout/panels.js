"use strict";
/* ---------------- Resizable divider between card pool and deck ---------------- */
/* When the divider moves and a row gains or loses a column, the visible cards glide to their new spots instead of jumping. */
function splitFlip(apply){
  if (REDUCED.matches){ apply(); return; }
  const vis = [];
  for (const el of document.querySelectorAll("#board .cw")){
    const r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight && r.width) vis.push([el, r, el.offsetLeft, el.offsetTop]);
  }
  apply();
  for (const [el, r, ox, oy] of vis){
    // offsetLeft/Top ignore animations: a real jump means the card changed row or column inside its panel
    if (Math.abs(el.offsetLeft - ox) < 20 && Math.abs(el.offsetTop - oy) < 20) continue;
    if (el._sa){ el._sa.cancel(); el._sa = null; }
    const n = el.getBoundingClientRect(), dx = r.left - n.left, dy = r.top - n.top;
    el._sa = el.animate([{transform: `translate(${dx}px,${dy}px)`}, {transform: "none"}], {duration: 340, easing: "cubic-bezier(.22,1,.36,1)"});
    el._sa.onfinish = () => { el._sa = null; };
  }
}
/* Upright phones: the open commander panel's height follows your finger on its bottom handle */
(() => {
  const g = $("#topHGrip"); let st = null;
  const apply = () => { if (UI.topH) document.documentElement.style.setProperty("--topH", UI.topH + "px"); else document.documentElement.style.removeProperty("--topH"); };
  apply();
  g.addEventListener("pointerdown", e => { st = {y: e.clientY, h: $("#top").getBoundingClientRect().height}; g.setPointerCapture(e.pointerId); e.preventDefault(); });
  g.addEventListener("pointermove", e => { if (!st) return; UI.topH = Math.round(Math.max(120, Math.min(innerHeight - 160, st.h + e.clientY - st.y))); apply(); });
  const end = () => { if (!st) return; st = null; saveUI(); };
  g.addEventListener("pointerup", end); g.addEventListener("pointercancel", end);
  g.addEventListener("dblclick", () => { delete UI.topH; apply(); saveUI(); });
  g.addEventListener("touchstart", e => { const t = e.touches[0]; st = {y: t.clientY, h: $("#top").getBoundingClientRect().height}; e.preventDefault(); }, {passive: false});
  g.addEventListener("touchmove", e => { if (!st) return; e.preventDefault(); const t = e.touches[0]; UI.topH = Math.round(Math.max(120, Math.min(innerHeight - 160, st.h + t.clientY - st.y))); apply(); }, {passive: false});
  g.addEventListener("touchend", end); g.addEventListener("touchcancel", end);
})();
/* Resizable deck list and commander panel: widths are a personal screen setting */
const PANE = {side: {v: "--sideW", key: "sideW", def: 272, min: 220, max: 440, el: () => $("#sidebar")},
              top: {v: "--topW", key: "topW", def: 316, min: 280, max: 560, el: () => $("#top")}};
function applyPanes(){ for (const p of Object.values(PANE)) document.documentElement.style.setProperty(p.v, (UI[p.key] || p.def) + "px"); }
for (const [k, p] of Object.entries(PANE)){
  const g = $(k === "side" ? "#sideGrip" : "#topGrip"); let on = false, want = 0, raf = 0, grab = null;
  g.addEventListener("pointerdown", e => {
    const el = p.el(), r = el.getBoundingClientRect();
    // the panel's width on screen vs in its own units (the interface scale zooms it)
    const w = UI[p.key] || p.def;
    grab = {x: e.clientX, w, scale: r.width / w || 1};
    on = true; g.setPointerCapture(e.pointerId); g.classList.add("on"); document.body.classList.add("pane-resizing"); e.preventDefault();
  });
  g.addEventListener("pointermove", e => {
    if (!on || !grab) return;
    want = Math.round(Math.max(p.min, Math.min(p.max, grab.w + (e.clientX - grab.x) / grab.scale)));
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; splitFlip(() => { UI[p.key] = want; applyPanes(); }); });
  });
  const end = () => { if (!on) return; on = false; g.classList.remove("on"); document.body.classList.remove("pane-resizing"); saveUI(); const d = cur(); if (d && d.commander) renderRail(d); };
  g.addEventListener("pointerup", end); g.addEventListener("pointercancel", end);
  g.addEventListener("dblclick", () => { splitFlip(() => { delete UI[p.key]; applyPanes(); }); saveUI(); });
}
applyPanes();
function applySplit(){ $("#board").style.setProperty("--sp", (UI.split * 100).toFixed(2) + "%"); }
(() => {
  const sp = $("#splitter"); let on = false;
  sp.addEventListener("pointerdown", e => { on = true; sp.setPointerCapture(e.pointerId); sp.classList.add("on"); document.body.classList.add("splitting"); e.preventDefault(); });
  let want = null, raf = 0;
  sp.addEventListener("pointermove", e => {
    if (!on) return;
    const r = $("#board").getBoundingClientRect();
    want = Math.max(.15, Math.min(.85, (e.clientX - r.left) / r.width));
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; const v = want; splitFlip(() => { UI.split = v; applySplit(); }); });
  });
  const end = () => { if (!on) return; on = false; sp.classList.remove("on"); document.body.classList.remove("splitting"); saveUI(); };
  sp.addEventListener("pointerup", end); sp.addEventListener("pointercancel", end);
  sp.addEventListener("dblclick", () => { UI.split = .5; applySplit(); saveUI(); });
})();
