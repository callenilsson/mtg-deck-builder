"use strict";
/* Resizing: divider between card pool and deck, and the widths of the deck list and commander panel. */
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
/* Resizable deck list and commander panel: widths are a personal screen setting */
const PANE = {side: {v: "--sideW", key: "sideW", def: 272, min: 180, max: 440, el: () => $("#sidebar")},
              top: {v: "--topW", key: "topW", def: 316, min: 180, max: 560, el: () => $("#top")}};
/* the widest each menu may get on this screen (same as the max-width in header.css) */
const paneCap = k => k === "side" ? Math.max(innerWidth * .30, Math.min(440, innerWidth - 150)) : Math.max(innerWidth * .36, Math.min(560, innerWidth - 150));
function applyPanes(){ for (const p of Object.values(PANE)) document.documentElement.style.setProperty(p.v, (UI[p.key] || p.def) + "px"); }
for (const [k, p] of Object.entries(PANE)){
  const g = $(k === "side" ? "#sideGrip" : "#topGrip"); let on = false, want = 0, raf = 0, grab = null;
  g.addEventListener("pointerdown", e => {
    const el = p.el(), r = el.getBoundingClientRect();
    // start from the width you see (the screen may cap the saved one), in the panel's own units (the interface scale zooms it)
    const z = parseFloat(document.documentElement.style.getPropertyValue("--uiz")) || 1;
    grab = {x: e.clientX, w: r.width / z, scale: z, max: Math.min(p.max, paneCap(k) / z)};
    on = true; g.setPointerCapture(e.pointerId); g.classList.add("on"); document.body.classList.add("pane-resizing"); e.preventDefault();
  });
  g.addEventListener("pointermove", e => {
    if (!on || !grab) return;
    want = Math.round(Math.max(p.min, Math.min(grab.max, grab.w + (e.clientX - grab.x) / grab.scale)));
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; splitFlip(() => { UI[p.key] = want; applyPanes(); }); });
  });
  const end = () => { if (!on) return; on = false; g.classList.remove("on"); document.body.classList.remove("pane-resizing"); saveUI(); updateZoomMax(); const d = cur(); if (d && d.commander) renderRail(d); };
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
  const end = () => { if (!on) return; on = false; sp.classList.remove("on"); document.body.classList.remove("splitting"); saveUI(); updateZoomMax(); };
  sp.addEventListener("pointerup", end); sp.addEventListener("pointercancel", end);
  sp.addEventListener("dblclick", () => { UI.split = .5; applySplit(); saveUI(); });
})();
