"use strict";
/* Swiping the cover flow: drag, flick, wheel, keys, with gliding. */
let flowT;
/* Clicks and keys switch at once; drags and the wheel settle for a moment first. */
function setFlow(i, settle){
  if (!V) return;
  const list = entries();
  i = Math.max(0, Math.min(list.length - 1, i));
  if (i === V.fi) return;
  V.selKey = entryKey(list[i]); V.back = false;
  syncSel(); layoutFlow();
  if (!V.rebase && V.editable){ const was = V.dirty; V.dirty = isDirty(); if (was !== V.dirty) renderDetailParts(); }
  clearTimeout(flowT);
  const apply = () => { if (!V) return; renderDetailParts(); upgradeCenter(); if (V.rebase){ V.box = [...frameOf(V.card).box]; loadBase(); } else if (centerIsCustom()){ loadBase(); loadUserArt(); } };
  if (settle) flowT = setTimeout(apply, 120); else apply();
}
let flowDrag = null, flowWheel = 0, flowMoved = false;
/* one card per ~half a card width of finger or mouse movement; a quick flick glides on a little */
function flowStep(){ const w = parseFloat(getComputedStyle($("#flow")).getPropertyValue("--flw")) || 240; return Math.max(60, Math.min(120, w * .45)); }
let flowGlide = 0;
function stopGlide(){ if (flowGlide){ cancelAnimationFrame(flowGlide); flowGlide = 0; } }
function setPos(p){
  if (!V) return;
  V.pos = p;
  const n = V.n || entries().length, i = Math.max(0, Math.min(n - 1, Math.round(p)));
  if (i !== V.fi) setFlow(i, true); else placeCards(false);
}
/* glide to a whole card, easing out (a little longer for longer trips) */
function glideTo(target, v0 = 0){
  stopGlide(); if (!V) return;
  const from = V.pos != null ? V.pos : V.fi, dist = target - from; V.n = entries().length;
  if (Math.abs(dist) < .002){ endGlide(target); return; }
  const dur = Math.min(650, 260 + Math.abs(dist) * 70), t0 = performance.now();
  $("#flow").classList.add("live");
  const step = now => {
    if (!V){ flowGlide = 0; return; }
    const u = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 3);   // ease-out cubic: quick start, soft landing
    setPos(from + dist * e);
    if (u < 1) flowGlide = requestAnimationFrame(step); else endGlide(target);
  };
  flowGlide = requestAnimationFrame(step);
}
function endGlide(target){
  flowGlide = 0; if (!V) return;
  V.pos = null; $("#flow").classList.remove("live");
  setFlow(target, true); layoutFlow();
}
$("#detailModal").addEventListener("pointerdown", e => {
  const f = e.target.closest("#flow"); if (!f || !V || e.target.closest(".name-over,.name-pen") || (e.target.id === "artCanvas" && V.user && !V.rebase)) return;
  const start = V.pos != null ? V.pos : V.fi; stopGlide(); V.n = entries().length;
  flowDrag = {x: e.clientX, y: e.clientY, start, step: flowStep(), pts: [[performance.now(), e.clientX]]}; flowMoved = false;
  if (V.pos != null) flowMoved = true;                   // caught a gliding flow: hold it right there
});
window.addEventListener("pointermove", e => {
  if (!flowDrag || !V) return;
  const dx = e.clientX - flowDrag.x;
  if (!flowMoved && Math.abs(dx) > 8){ flowMoved = true; flowDrag.x += Math.sign(dx) * 8; $("#flow").classList.add("live"); }
  flowDrag.pts.push([performance.now(), e.clientX]); if (flowDrag.pts.length > 6) flowDrag.pts.shift();
  if (!flowMoved) return;
  flowDrag.cx = e.clientX;
  if (flowDrag.raf) return;                               // at most one update per screen frame
  flowDrag.raf = requestAnimationFrame(() => { const fd = flowDrag; if (!fd || !V) return; fd.raf = 0; dragTo(fd); });
});
function dragTo(fd){
  const n = V.n || entries().length;
  let p = fd.start - (fd.cx - fd.x) / fd.step;
  // past the first or last artwork it stretches like a rubber band
  if (p < 0) p = -(1 - 1 / (1 - p * .9)) * .55; else if (p > n - 1){ const over = p - (n - 1); p = n - 1 + (1 - 1 / (1 + over * .9)) * .55; }
  setPos(p);
}
window.addEventListener("pointerup", () => {
  const fd = flowDrag; flowDrag = null;
  if (!fd || !V) return;
  if (fd.raf){ cancelAnimationFrame(fd.raf); fd.raf = 0; if (flowMoved && fd.cx != null) dragTo(fd); }
  if (!flowMoved){ if (V.pos != null) glideTo(Math.round(V.pos)); return; }
  const now = performance.now(), recent = fd.pts.filter(([t]) => now - t < 120);
  const pts = recent.length >= 2 ? recent : fd.pts.slice(-2);
  const [t0, x0] = pts[0], [t1, x1] = pts[pts.length - 1], v = pts.length >= 2 ? (x1 - x0) / Math.max(8, t1 - t0) : 0;   // px per ms
  const n = entries().length, p = V.pos != null ? V.pos : V.fi;
  // keep going with the finger's speed, then settle on the nearest artwork
  const throwCards = -v * 260 / fd.step;
  glideTo(Math.max(0, Math.min(n - 1, Math.round(p + Math.max(-12, Math.min(12, throwCards))))));
});
window.addEventListener("pointercancel", () => { if (flowDrag && V && V.pos != null) glideTo(Math.round(V.pos)); flowDrag = null; });
$("#detailModal").addEventListener("wheel", e => {
  if (!e.target.closest("#flow") || !V || entries().length < 2) return;
  if (e.target.id === "artCanvas" && V.user && !V.rebase) return;     // the wheel zooms your picture there
  // sideways wheel / trackpad swipe (or shift + wheel) flips artworks; normal wheel scrolls the view
  if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) && !e.shiftKey) return;
  e.preventDefault();
  flowWheel += e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
  while (Math.abs(flowWheel) >= 60){ setFlow(V.fi + Math.sign(flowWheel), true); flowWheel -= 60 * Math.sign(flowWheel); }
}, {passive: false});
$("#detailModal").addEventListener("keydown", e => {
  if (e.target.id !== "flow" || !V) return;
  if (e.key === "ArrowLeft"){ e.preventDefault(); setFlow(V.fi - 1); }
  if (e.key === "ArrowRight"){ e.preventDefault(); setFlow(V.fi + 1); }
});
window.addEventListener("resize", () => { if (V) layoutFlow(); });
