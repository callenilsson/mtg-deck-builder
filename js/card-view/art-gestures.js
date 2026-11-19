"use strict";
/* Moving and zooming your picture on the card (finger, mouse, wheel, pinch) and dropping a picture file. */
function canvasPoint(e){ const cv = $("#artCanvas"), r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) * 672 / r.width, y: (e.clientY - r.top) * 936 / r.height}; }
/* Moving and zooming your picture: one finger or the mouse drags it (or the gold frame corners);
   two fingers pinch to zoom and move together; the wheel or a trackpad pinch zooms at the pointer; double-tap resets. */
let artDrag = null, artRaf = 0;
const artPts = new Map();
const ZMIN = 1, ZMAX = 6;
function artArea(){ return V.mode === "whole" ? [0, 0, 672, 936] : V.box; }
/* zoom to z while keeping the picture point under (fx, fy) in place */
function zoomAt(z, fx, fy){
  z = Math.max(ZMIN, Math.min(ZMAX, z));
  const [x1, y1, x2, y2] = artArea(), cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, k = z / V.zoom;
  V.pan = {x: fx - cx - (fx - cx - V.pan.x) * k, y: fy - cy - (fy - cy - V.pan.y) * k};
  V.zoom = z;
  const zs = $("#artZoom"); if (zs) zs.value = z;
}
function artRedraw(){ if (artRaf) return; artRaf = requestAnimationFrame(() => { artRaf = 0; if (V){ drawArt(); markCust(); } }); }
function artReset(){ V.zoom = 1; V.pan = {x: 0, y: 0}; const zs = $("#artZoom"); if (zs) zs.value = 1; artRedraw(); }
function pinchState(){
  const [a, b] = [...artPts.values()];
  return {d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2};
}
$("#detailModal").addEventListener("pointerdown", e => {
  if (!V || e.target.id !== "artCanvas" || !V.user || V.rebase) return;
  e.preventDefault(); e.target.setPointerCapture(e.pointerId);
  const p = canvasPoint(e);
  artPts.set(e.pointerId, p);
  if (artPts.size === 2){ const ps = pinchState(); artDrag = {kind: "pinch", d: ps.d, mx: ps.mx, my: ps.my, zoom: V.zoom, pan: {...V.pan}}; return; }
  if (artPts.size > 2) return;
  // double-tap / double-click: back to a perfect fit
  const now = performance.now();
  if (artDrag === null && V.lastTap && now - V.lastTap.t < 320 && Math.hypot(p.x - V.lastTap.x, p.y - V.lastTap.y) < 40){ V.lastTap = null; artReset(); return; }
  V.lastTap = {t: now, x: p.x, y: p.y};
  const [x1, y1, x2, y2] = V.box, near = (a, b) => Math.hypot(p.x - a, p.y - b) < 40;
  artDrag = {p, kind: V.mode === "frame" && near(x1, y1) ? "tl" : V.mode === "frame" && near(x2, y2) ? "br" : "pan", pan: {...V.pan}, box: [...V.box]};
});
$("#detailModal").addEventListener("pointermove", e => {
  if (!artDrag || !artPts.has(e.pointerId)) return;
  artPts.set(e.pointerId, canvasPoint(e));
  if (artDrag.kind === "pinch"){
    if (artPts.size < 2) return;
    const ps = pinchState();
    // start from the state when the pinch began: zoom around the first midpoint, then follow the fingers' movement
    V.zoom = artDrag.zoom; V.pan = {...artDrag.pan};
    zoomAt(artDrag.zoom * ps.d / artDrag.d, artDrag.mx, artDrag.my);
    V.pan = {x: V.pan.x + ps.mx - artDrag.mx, y: V.pan.y + ps.my - artDrag.my};
    artRedraw(); return;
  }
  const p = artPts.get(e.pointerId), dx = p.x - artDrag.p.x, dy = p.y - artDrag.p.y, b = artDrag.box;
  if (artDrag.kind === "pan") V.pan = {x: artDrag.pan.x + dx, y: artDrag.pan.y + dy};
  else if (artDrag.kind === "tl") V.box = [Math.max(0, Math.min(b[2] - 60, b[0] + dx)), Math.max(0, Math.min(b[3] - 60, b[1] + dy)), b[2], b[3]];
  else V.box = [b[0], b[1], Math.min(672, Math.max(b[0] + 60, b[2] + dx)), Math.min(936, Math.max(b[1] + 60, b[3] + dy))];
  artRedraw();
});
const artUp = e => {
  if (!artPts.has(e.pointerId)) return;
  artPts.delete(e.pointerId);
  if (!artPts.size){ artDrag = null; return; }
  // one finger left after a pinch: carry on dragging with it, without a jump
  if (artPts.size === 1){ const [p] = artPts.values(); artDrag = {p, kind: "pan", pan: {...V.pan}, box: [...V.box]}; }
};
$("#detailModal").addEventListener("pointerup", artUp);
$("#detailModal").addEventListener("pointercancel", artUp);
$("#detailModal").addEventListener("wheel", e => {
  if (!V || e.target.id !== "artCanvas" || !V.user || V.rebase) return;
  e.preventDefault();
  const p = canvasPoint(e), f = Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018));   // ctrlKey: trackpad pinch
  zoomAt(V.zoom * f, p.x, p.y); artRedraw();
}, {passive: false});
// drop a picture file anywhere on the card view
$("#detailModal").addEventListener("dragover", e => { if (V && V.editable && [...(e.dataTransfer.items || [])].some(i => i.kind === "file")){ e.preventDefault(); $("#detailModal").classList.add("file-over"); } });
$("#detailModal").addEventListener("dragleave", e => { if (e.target === $("#detailModal")) $("#detailModal").classList.remove("file-over"); });
$("#detailModal").addEventListener("drop", e => {
  $("#detailModal").classList.remove("file-over");
  const f = [...(e.dataTransfer.files || [])].find(f => /^image\//.test(f.type));
  if (!V || !V.editable || !f) return;
  e.preventDefault(); useUserFile(f);
});
