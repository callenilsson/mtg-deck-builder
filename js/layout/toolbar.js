"use strict";
/* ---------------- Toolbar ---------------- */
/* Resizing cards or the interface: keep the card at the top of each list where it was, so the view doesn't jump. */
function keepAnchors(fn){
  const anchors = [...document.querySelectorAll(".panel-scroll")].map(sc => {
    const r = sc.getBoundingClientRect(); if (!r.height || !sc.scrollTop) return null;
    const el = [...sc.querySelectorAll(".cw[data-uid], .cw[data-tok]")].find(e => e.getBoundingClientRect().bottom > r.top + 8);
    return el && {sc, el, off: el.getBoundingClientRect().top - r.top};
  }).filter(Boolean);
  fn();
  for (const a of anchors){ if (!a.el.isConnected) continue; const r = a.sc.getBoundingClientRect(); a.sc.scrollTop += (a.el.getBoundingClientRect().top - r.top) - a.off; }
}
let CARD_ZMAX = 400;
function applyZoom(){
  const z = (+UI.zoom || 100) / 100, board = $("#board");
  board.style.removeProperty("--tile");
  // phones: 100% = one card filling its column (next to the two folded side rails); elsewhere the screen's normal card size
  const base = isPhone() ? Math.max(80, Math.floor((innerWidth - 140) / 2 - 30)) : (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tile")) || 180);
  board.style.setProperty("--tile", Math.round(base * z) + "px");
  $("#top").style.setProperty("--tile", Math.round(base * z) + "px");
  const sz = `(max-width:820px) 46vw, ${Math.round(base * z)}px`;
  document.querySelectorAll("img[sizes]").forEach(im => im.sizes = sz);
  $("#zoomVal").textContent = Math.round(z * 100) + "%";
  const zr = $("#zoom"); if (zr){ zr.max = CARD_ZMAX; zr.value = UI.zoom; }
  // the biggest useful size: a card as wide as its column (bigger can't show)
  const g = [...document.querySelectorAll("#board .grid")].find(x => x.clientWidth), gw = g ? g.clientWidth - (parseFloat(getComputedStyle(g).paddingLeft) || 0) - (parseFloat(getComputedStyle(g).paddingRight) || 0) : 0;
  CARD_ZMAX = gw ? Math.max(100, Math.min(400, Math.floor(gw / base * 100 / 5) * 5)) : 400;
  if (UI.zoom > CARD_ZMAX && gw){ UI.zoom = CARD_ZMAX; return applyZoom(); }
  if ($("#zoom")) $("#zoom").max = CARD_ZMAX;
  document.querySelectorAll("[data-zstep]").forEach(b => { b.disabled = +b.dataset.zstep < 0 ? UI.zoom <= 20 : UI.zoom >= CARD_ZMAX; b.title = b.disabled && +b.dataset.zstep > 0 ? "Cards already fill their column" : ""; });
}
let zoomRaf = 0;

$("#zoomVal").addEventListener("dblclick", () => { UI.zoom = 100; keepAnchors(applyZoom); saveUI(); });
(() => {
  const board = $("#board"); let pinch = null, raf = 0, saveT = 0;
  const setZoom = z => { UI.zoom = Math.max(20, Math.min(CARD_ZMAX, Math.round(z))); if (!raf) raf = requestAnimationFrame(() => { raf = 0; keepAnchors(applyZoom); }); clearTimeout(saveT); saveT = setTimeout(saveUI, 400); };
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  board.addEventListener("touchstart", e => { if (e.touches.length === 2){ pinch = {d: dist(e.touches), z: +UI.zoom || 100}; cancelTouch(); } }, {passive: true});
  board.addEventListener("touchmove", e => { if (pinch && e.touches.length === 2){ e.preventDefault(); setZoom(pinch.z * dist(e.touches) / pinch.d); } }, {passive: false});
  board.addEventListener("touchend", e => { if (e.touches.length < 2 && pinch){ pinch = null; UI.zoom = Math.round(UI.zoom / 5) * 5; keepAnchors(applyZoom); saveUI(); } });
  board.addEventListener("wheel", e => { if (!e.ctrlKey) return; e.preventDefault(); setZoom((+UI.zoom || 100) * Math.exp(-e.deltaY * .004)); }, {passive: false});
})();

$("#zoom").addEventListener("input", e => {
  UI.zoom = +e.target.value; $("#zoomVal").textContent = UI.zoom + "%";
  if (!zoomRaf) zoomRaf = requestAnimationFrame(() => { zoomRaf = 0; keepAnchors(applyZoom); });
});
$("#zoom").addEventListener("change", () => saveUI());
document.addEventListener("click", e => {
  const z = e.target.closest("[data-zstep]");
  if (z){ UI.zoom = Math.max(20, Math.min(CARD_ZMAX, Math.round(((+UI.zoom || 100) + +z.dataset.zstep) / 5) * 5)); keepAnchors(applyZoom); saveUI(); return; }
  const u = e.target.closest("[data-ustep]");
  if (u){ UI.uiz = Math.max(40, Math.min(200, (+UI.uiz || 100) + +u.dataset.ustep)); keepAnchors(applyUiZoom); saveUI(); }
});
addEventListener("resize", applyZoom);
function applyUiZoom(){
  const z = Math.max(.4, Math.min(2, (+UI.uiz || 100) / 100));
  document.documentElement.style.setProperty("--uiz", z);
  $("#uiZoomVal").textContent = Math.round(z * 100) + "%";
  document.querySelectorAll("[data-ustep]").forEach(b => b.disabled = +b.dataset.ustep < 0 ? z <= .4 : z >= 2);
  if (V) layoutFlow();
}

$("#uiZoomVal").addEventListener("dblclick", () => { UI.uiz = 100; keepAnchors(applyUiZoom); saveUI(); });
$("#sortSel").addEventListener("change", e => { UI.sort = e.target.value; saveUI(); animateBoard(() => renderBoard()); if (UI.sort !== "manual") toast("Dragging a card switches back to “Your order”. Locked cards always come first."); });
let filtT;
$("#filterQ").addEventListener("input", e => { UI.filter = e.target.value; clearTimeout(filtT); filtT = setTimeout(renderBoard, 150); });
$("#ctypeSel").addEventListener("change", e => { UI.ctype = e.target.value; renderBoard(); renderStats(); });
$("#allToDeck").onclick = () => moveAll("deck");
$("#allToPool").onclick = () => moveAll("options");
