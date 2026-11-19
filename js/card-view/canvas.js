"use strict";
/* Drawing a customized card: your art in the frame, the painted name. */
/* ---------------- Card view ----------------
   One view for everything about a card: the cover flow of every artwork on top (the centered card IS the card),
   rules text, EDHREC numbers and price below, then actions and your own art. Rename by clicking the name on the card.
   Changes to art and name are kept when you close the view. */
const FRAMES = {
  "2015": {box: [56, 104, 616, 518], name: [52, 50, 92]},
  "2003": {box: [57, 107, 616, 520], name: [54, 52, 96]},
  "1997": {box: [80, 89, 600, 510], name: [62, 42, 84]},
  "1993": {box: [80, 89, 600, 510], name: [62, 42, 84]}
};
const frameOf = c => FRAMES[c.frame] || FRAMES["2015"];
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
