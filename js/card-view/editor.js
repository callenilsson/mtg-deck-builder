"use strict";
/* canvas: your own art and the painted name */
const ART_SCALE = 2; // custom cards are built at 1344×1872 so uploaded art stays sharp
function coverDraw(ctx, im, x, y, w, h, zoom, pan){
  const s = Math.max(w / im.width, h / im.height) * zoom;
  const dw = im.width * s, dh = im.height * s;
  const maxX = Math.max(0, (dw - w) / 2), maxY = Math.max(0, (dh - h) / 2);
  pan.x = Math.max(-maxX, Math.min(maxX, pan.x)); pan.y = Math.max(-maxY, Math.min(maxY, pan.y));
  ctx.drawImage(im, x + (w - dw) / 2 + pan.x, y + (h - dh) / 2 + pan.y, dw, dh);
}
function paintName(ctx){
  const nm = V.name.trim(), card = V.drawCard || V.card; if (!nm || !V.base) return;
  const f = frameOf(card), [nx, ny1, ny2] = f.name;
  const front = String(card.mana || "").split(" // ")[0];
  const pips = (front.match(/\{[^}]+\}/g) || []).length;
  const right = 616 - pips * 33 - 10;
  const S = ctx.getTransform().a || 1;
  const px = ctx.getImageData(Math.round((nx + 2) * S), Math.round((ny1 + 4) * S), Math.round(6 * S), Math.round((ny2 - ny1 - 8) * S)).data;
  let r = 0, g = 0, b = 0, n = px.length / 4;
  for (let i = 0; i < px.length; i += 4){ r += px[i]; g += px[i + 1]; b += px[i + 2]; }
  r /= n; g /= n; b /= n;
  ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
  ctx.fillRect(nx, ny1, right - nx, ny2 - ny1);
  const light = r * .3 + g * .59 + b * .11 > 140;
  ctx.fillStyle = light ? "#111" : "#f4f1e6";
  let size = 31;
  ctx.font = `700 ${size}px Georgia, "Times New Roman", serif`;
  while (ctx.measureText(nm).width > right - nx - 12 && size > 14){ size--; ctx.font = `700 ${size}px Georgia, "Times New Roman", serif`; }
  ctx.textBaseline = "middle";
  ctx.fillText(nm, nx + 6, (ny1 + ny2) / 2 + 1);
  // keep the real name visible on the card (and on printed proxies): a small label at the top of the art
  const real = card.name.split(" // ")[0];
  if (nm.toLowerCase() !== real.toLowerCase()){
    const [bx, by] = frameOf(card).box;
    let fs = 21; ctx.font = `italic 600 ${fs}px Georgia, "Times New Roman", serif`;
    while (ctx.measureText(real).width > 500 && fs > 13){ fs--; ctx.font = `italic 600 ${fs}px Georgia, "Times New Roman", serif`; }
    const tw = ctx.measureText(real).width, x = bx + 8, y = by + 7, w = tw + 22, h = fs + 12;
    ctx.fillStyle = "rgba(10,10,14,.68)";
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, h / 2); else ctx.rect(x, y, w, h); ctx.fill();
    ctx.fillStyle = "#f4efe0"; ctx.textBaseline = "middle";
    ctx.fillText(real, x + 11, y + h / 2 + 1);
  }
}
function compose(ctx, overlay){
  const S = ctx.canvas.width / 672;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, 672, 936);
  ctx.fillStyle = "#1c1f2d"; ctx.fillRect(0, 0, 672, 936);
  if (V.base) ctx.drawImage(V.base, 0, 0, 672, 936);
  if (V.user){
    if (V.mode === "whole") coverDraw(ctx, V.user, 0, 0, 672, 936, V.zoom, V.pan);
    else {
      const [x1, y1, x2, y2] = V.box;
      ctx.save(); ctx.beginPath(); ctx.rect(x1, y1, x2 - x1, y2 - y1); ctx.clip();
      coverDraw(ctx, V.user, x1, y1, x2 - x1, y2 - y1, V.zoom, V.pan); ctx.restore();
    }
  }
  if (V.mode !== "whole") paintName(ctx);
  if (overlay && V.user && V.mode === "frame"){
    const [x1, y1, x2, y2] = V.box;
    ctx.strokeStyle = "rgba(217,171,79,.9)"; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.strokeRect(x1, y1, x2 - x1, y2 - y1); ctx.setLineDash([]);
    ctx.fillStyle = "#d9ab4f";
    for (const [hx, hy] of [[x1, y1], [x2, y2]]){ ctx.beginPath(); ctx.arc(hx, hy, 16, 0, Math.PI * 2); ctx.fill(); }
  }
}
let snapT;
function drawArt(){
  const cv = $("#artCanvas"); if (!cv || !V || !V.base || !V.hasCust) return;
  if (V.userKey && !V.user) return;            // its picture isn't loaded yet: don't draw (or snapshot) an incomplete version
  compose(cv.getContext("2d"), true);
  // a small picture of your version for its card in the flow (and its reflection)
  if (V.rebase) return;
  const cid = V.cid;
  clearTimeout(snapT); snapT = setTimeout(() => {
    if (!V || !V.base || V.cid !== cid || (V.userKey && !V.user)) return;
    const sm = document.createElement("canvas"); sm.width = 488; sm.height = 680;
    compose(sm.getContext("2d"), false);
    try { V.snap = sm.toDataURL("image/jpeg", .86); } catch { return; }
    const s = slotOf(V.cid); if (s) s.snap = V.snap;
    setFlImg($(`#flowStage .custom-entry[data-cid="${V.cid}"]`), V.snap);
  }, 160);
}
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
$("#detailModal").addEventListener("input", e => {
  if (!V) return;
  if (e.target.id === "flowScrub"){ setFlow(+e.target.value, true); return; }
  if (e.target.id === "artQ"){
    V.artQ = e.target.value;
    const list = entries(), still = list.some(x => entryKey(x) === V.selKey);
    if (!still){ const first = list.find(x => x.t === "p"); if (first){ V.selKey = entryKey(first); if (V.editable && V.selKey !== V.startKey && !V.rebase) markDirty(); } }
    renderFlow(); renderDetailParts();
    if (!still && V.rebase){ V.box = [...frameOf(V.card).box]; loadBase(); }
    return;
  }
  if (e.target.id === "artZoom"){ V.zoom = +e.target.value; drawArt(); markCust(); }
  if (e.target.id === "artName" || e.target.id === "artName2"){
    const val = e.target.value, id = e.target.id;
    ensureCust();
    V.name = val;
    const self = $("#" + id); if (self && self.value !== val){ self.value = val; self.focus(); }
    const other = $(id === "artName" ? "#artName2" : "#artName"); if (other && other.value !== val) other.value = val;
    updateOverlay(); drawArt(); markCust();
  }
});
$("#detailModal").addEventListener("keydown", e => { if ((e.target.id === "artName" || e.target.id === "artName2") && e.key === "Enter") e.target.blur(); });
$("#detailModal").addEventListener("change", e => { if (V && e.target.id === "artFile" && e.target.files[0]) useUserFile(e.target.files[0]); });
document.addEventListener("paste", e => {
  if (!V || !V.editable || $("#detailScrim").hidden) return;
  const f = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith("image/")); if (f){ e.preventDefault(); useUserFile(f); }
});
async function useUserFile(file){
  try {
    const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
    const im = await loadImage(url);
    ensureCust();
    V.user = im; V.userKey = null; V.zoom = 1; V.pan = {x: 0, y: 0};
    // a picture now lives on its own, so an older customization's finished image is no longer needed as the base
    if (V.legacy){ V.legacy = false; V.base = null; V.baseFor = null; }
    await loadBase();
    markCust(); updateOverlay(); drawArt(); renderDetailParts();
  } catch { toast("That file isn’t a picture this browser can open."); }
}
function startRebase(){
  if (!V.cid) return;
  V.rebase = true; V.selKey = V.custBase.id;
  renderFlow(); renderDetailParts(); loadBase();
}
function finishRebase(){
  if (!V.rebase) return;
  const changed = V.card.id !== V.custBase.id;
  V.rebase = false;
  if (changed){
    V.custBase = V.card; V.box = [...frameOf(V.custBase).box];
    if (V.legacy){ V.legacy = false; if (!V.user) toast("This customization was made before pictures were kept separately. Upload the picture again if it’s missing."); }
    V.base = null; V.baseFor = null; markCust();
  }
  V.selKey = "c:" + V.cid;
  renderFlow(); renderDetailParts(); loadBase();
}
function removeCust(){
  const n = V.custs.length > 1 ? ` ${custNumber(V.cid)}` : "";
  confirmTwice([{title: `Remove your version${n}?`, text: "This customized version (its name and art) disappears from the cover flow. Your other versions and the official card stay. Press Save to make it final.", yes: "Remove version"}], () => {
    if (!V || !V.cid) return;
    const cid = V.cid, base = V.custBase;
    V.rebase = false; unloadCust();
    V.custs = V.custs.filter(s => s.cid !== cid); V.custsRemoved = true;
    V.selKey = base ? base.id : V.selKey;
    renderFlow(); renderDetailParts(); markCust();
  });
}
$("#detailModal").addEventListener("click", async e => {
  if (!V) return;
  if (e.target.closest("#namePen")){ const n = $("#artName"); n.focus(); n.select(); return; }
  if (e.target.id === "nameClear" || e.target.closest("#nameClear")){ V.name = ""; ["#artName", "#artName2"].forEach(s => { if ($(s)) $(s).value = ""; }); updateOverlay(); drawArt(); markCust(); renderDetailParts(); return; }
  if (e.target.closest("#flow") && !e.target.closest(".name-over") && !(e.target.id === "artCanvas" && V.user)){
    // 3D-tilted cards don't hit-test reliably, so find the front-most card under the pointer by its on-screen box
    if (flowMoved) return;
    let best = null;
    document.querySelectorAll("#flowStage .fl").forEach(el => {
      if (el.style.visibility === "hidden" || el.style.display === "none" || el.classList.contains("hold") || el.classList.contains("gone")) return;
      const r = el.querySelector("img.face").getBoundingClientRect(), i = +el.dataset.fi;
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom && (best == null || Math.abs(i - V.fi) < Math.abs(best - V.fi))) best = i;
    });
    if (best != null) setFlow(best);
    else requestClose();          // empty space around the artworks closes the view, like the dark background
    return;
  }
  // the empty space around the caption and between the artworks and the box closes it too
  if (e.target === $("#detailModal") || e.target.classList.contains("dv-scroll") || e.target.classList.contains("flow-foot")){ if (!flowMoved) requestClose(); return; }
  const b = e.target.closest("button"); if (!b) return;
  if (b.hasAttribute("data-close")){ requestClose(); return; }
  if (b.id === "artSave"){ saveInPlace(); return; }
  if (b.id === "dFlip"){ V.back = !V.back; renderFlow(); return; }
  if (b.id === "artUpload"){ $("#artFile").click(); return; }
  if (b.id === "artReset"){ artReset(); return; }
  if (b.id === "rebaseStart"){ startRebase(); return; }
  if (b.id === "rebaseDone"){ finishRebase(); return; }
  if (b.id === "custRemove"){ removeCust(); return; }
  if (b.id === "custNew"){ newVersion(); return; }
  if (b.dataset.mode){ V.mode = b.dataset.mode; V.pan = {x: 0, y: 0}; drawArt(); markCust(); renderDetailParts(); return; }
  if (b.id === "artDrop"){ V.user = null; V.userKey = null; if (V.legacy){ V.legacy = false; V.base = null; V.baseFor = null; loadBase(); } updateOverlay(); drawArt(); markCust(); renderDetailParts(); return; }
  if (b.id === "artPrompt"){
    const c = V.card;
    const text = `Create a new fantasy illustration for the Magic: The Gathering card "${c.name.split(" // ")[0]}" (${c.type}). `
      + `What the card does: ${String(c.text).replace(/\s+/g, " ").slice(0, 300)} `
      + `If I attached an image, keep its subject and composition but reimagine it with fresh detail. `
      + `Style: detailed painterly fantasy art, dramatic lighting, rich color. No text, no card frame, no border. Landscape format, about 4:3.`;
    try { await navigator.clipboard.writeText(text); toast("Prompt copied. Paste it into your AI image tool."); }
    catch { toast("Couldn’t copy automatically in this browser."); }
    return;
  }
  if (b.id === "artOrig"){
    try {
      const r = await fetch(V.card.art || V.card.large); const blob = await r.blob();
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `${slugify(V.card.name)}-art.jpg`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000); toast("Art downloaded");
    } catch { toast("Couldn’t download the art. Check your connection."); }
    return;
  }
  const a = b.dataset.d; if (!a) return;
  const u = V.uid, d = cur();
  if (a === "toPool" || a === "toDeck"){ requestClose(() => moveZone(u, a === "toDeck" ? "deck" : "options"), {anim: false}); }
  else if (a === "tokMove"){ requestClose(() => moveToken(u), {anim: false}); }
  else if (a === "tokRemove"){ requestClose(() => removeToken(u), {anim: false}); }
  else if (a === "lock"){ toggleLock(u); renderDetailParts(); }
  else if (a === "focus"){ toggleFocus(u); renderDetailParts(); }
  else if (a === "inc" || a === "dec"){ changeQty(u, a === "inc" ? 1 : -1); if (V) renderDetailParts(); }
  else if (a === "copy"){
    const it = findCard(u); if (!it) return;
    if (qOf(it) > 1) it.qty = qOf(it) - 1;
    const copy = {uid: uid(), card: plainPrint(it.card), bucket: it.bucket, zone: it.zone, locked: false, focus: false, qty: 1};
    d.cards.splice(d.cards.indexOf(it) + 1, 0, copy); touch(d); renderAll();
    requestClose(() => { const el = document.querySelector(`#board .cw[data-uid="${copy.uid}"] .ct`); openDetail({kind: "item", uid: copy.uid}, el); }, {anim: false});
    toast(`A separate ${it.card.name} for another artwork: swipe to pick its art`);
  }
  else if (a === "remove"){ const it = findCard(u); if (!it) return; confirmTwice([{title: `Remove ${esc(it.card.name)}?`, text: `It leaves the ${it.zone === "deck" ? "deck" : "card pool"}.`, yes: "Remove card"}], () => { closeDetail(true, {anim: false}); removeCard(u, false); }); }
  else if (a === "changeCmd"){ requestClose(() => openCommanderPicker(), {anim: false}); }
  else if (a === "addPartner" || a === "changePartner"){ requestClose(() => openPartnerPicker(), {anim: false}); }
  else if (a === "removePartner"){ confirmTwice([{title: "Remove the partner?", text: `${esc(d.partner.name)} leaves the command zone. Recommendations go back to ${esc(d.commander.name)} alone.`, yes: "Remove partner"}], () => { closeDetail(true, {anim: false}); d.partner = null; touch(d); render(); toast("Partner removed"); }); }
  else if (a === "pick" || a === "addPool" || a === "addDeck" || a === "addTok"){
    const v = V; b.disabled = true;
    const built = await buildViewCard(v); b.disabled = false;
    if (!built || V !== v) return;
    const card = built.card, nm = v.card.name;
    if (a === "pick"){ setCommander(card, true); return; }
    if (a === "addTok"){ if (addToken(card, A.side, true)){ toast(`${nm} token added`); closeDetail(true); renderAddBody(); } return; }
    if (addCard(card, a === "addDeck" ? "deck" : "options", true)){
      A.addedNow.add(nm); toast(`${nm} added to ${a === "addDeck" ? "deck" : "card pool"}${card.custs ? " with your edits" : ""}`);
      closeDetail(true); renderAddBody();
    }
  }
});
