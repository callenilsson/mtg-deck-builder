"use strict";
/* ---------------- PDF: A4 preview first, cards at exactly 63 × 88 mm ---------------- */
function loadScript(src){ return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn’t load the PDF tools. Check your connection.")); document.head.appendChild(s); }); }
async function toDataURL(url){
  if (url.startsWith("data:")) return url;
  const r = await fetch(url); if (!r.ok) throw new Error("image " + r.status);
  const b = await r.blob();
  return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
}
function pdfFaces(d){
  const list = [...cmdrs(d), ...cardsQ(d.cards.filter(c => c.zone === "deck")), ...cardsQ((d.tokens || []).filter(k => tokZone(k) === "deck"))];
  const faces = [];
  for (const c of list){ faces.push({name: c.name, url: largeOf(c), thumb: imgOf(c)}); if (c.back) faces.push({name: c.name + " (back)", url: c.back.large || c.back.img, thumb: c.back.img}); }
  return faces;
}
let pdfBusy = false;
function openPdf(){
  const d = cur(); if (!d || !d.commander) return;
  const faces = pdfFaces(d), pages = Math.ceil(faces.length / 9), n = inDeckCount(d), nt = sumQ((d.tokens || []).filter(k => tokZone(k) === "deck"));
  const backs = faces.length - n - nt;
  // A4 = 210 × 297 mm; 3 × 3 cards of 63 × 88 mm centered
  const mx = 10.5, my = 16.5, pct = (v, of) => (v / of * 100).toFixed(3) + "%";
  const cuts = [];
  for (let c = 0; c <= 3; c++){ const x = mx + c * 63; cuts.push(`<i class="cut" style="left:${pct(x, 210)};top:0;width:1px;height:${pct(my - 1.5, 297)}"></i><i class="cut" style="left:${pct(x, 210)};bottom:0;width:1px;height:${pct(my - 1.5, 297)}"></i>`); }
  for (let r = 0; r <= 3; r++){ const y = my + r * 88; cuts.push(`<i class="cut" style="top:${pct(y, 297)};left:0;height:1px;width:${pct(mx - 1.5, 210)}"></i><i class="cut" style="top:${pct(y, 297)};right:0;height:1px;width:${pct(mx - 1.5, 210)}"></i>`); }
  let html = "";
  for (let p = 0; p < pages; p++){
    const cards = faces.slice(p * 9, p * 9 + 9).map((f, k) => {
      const st = `left:${pct(mx + (k % 3) * 63, 210)};top:${pct(my + Math.floor(k / 3) * 88, 297)}`;
      return `<img src="${esc(f.thumb)}" alt="${esc(f.name)}" title="${esc(f.name)}" loading="lazy" style="${st}">`;
    }).join("");
    html += `<div><div class="a4" style="animation-delay:${Math.min(p, 8) * 40}ms">${cuts.join("")}${cards}<span class="pg">page ${p + 1} of ${pages}</span><span class="scalebar"><span class="sb-bar"><i></i><i></i><i></i><i></i><i></i></span><span class="sb-num"><b>0</b><b>1</b><b>2</b><b>3</b><b>4</b><b>5 cm</b></span></span><span class="sb-txt"><b>CHECK THE SCALE: this bar must measure exactly 5 cm.</b><br>If it doesn't, print again at 100% / “Actual size”.</span></div><div class="pdf-cap">Page ${p + 1}</div></div>`;
  }
  $("#pdfModal").innerHTML = `<div class="modal-head"><h2>Print preview · ${esc(displayName(d))}</h2><button class="icon-btn" data-close title="Close">${I.close}</button></div>
    <div class="pdf-top"><p><b>${n} cards</b>${nt ? ` + ${nt} token${nt > 1 ? "s" : ""}` : ""}${backs ? ` plus ${backs} back face${backs > 1 ? "s" : ""}` : ""} on <b>${pages} A4 page${pages > 1 ? "s" : ""}</b>, at real card size (6.3 × 8.8 cm) with cut marks. <span class="scale-note">📏 Each page has a black-and-white <b>5 cm check bar</b> at the bottom: measure it after printing.</span> When printing, choose <b>Actual size</b> / <b>100%</b> and turn off “Fit to page”.${n < 100 ? " The deck isn’t at 100 yet, but you can still print it." : ""}</p></div>
    <div class="modal-body" style="padding:0"><div class="pdf-pages">${html}</div></div>
    <div class="pdf-foot"><div class="progress" hidden id="pdfProg"><i></i></div><span id="pdfMsg"></span><button class="btn" data-close>Close</button><button class="btn primary" id="makePdf">Download PDF</button></div>`;
  showScrim("#pdfScrim");
}
async function buildPdf(onProgress){
  const d = cur();
  if (!window.jspdf) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  const faces = pdfFaces(d);
  const doc = new window.jspdf.jsPDF({unit: "mm", format: "a4", orientation: "portrait", compress: true});
  const PW = 210, PH = 297, W = 63, H = 88, mx = (PW - 3 * W) / 2, my = (PH - 3 * H) / 2;
  const cache = new Map(), failed = [];
  for (let i = 0; i < faces.length; i++){
    const f = faces[i], k = i % 9;
    if (k === 0){
      if (i) doc.addPage("a4", "portrait");
      doc.setDrawColor(150); doc.setLineWidth(0.2);
      for (let c = 0; c <= 3; c++){ const x = mx + c * W; doc.line(x, 2, x, my - 1.5); doc.line(x, PH - my + 1.5, x, PH - 2); }
      for (let r = 0; r <= 3; r++){ const y = my + r * H; doc.line(2, y, mx - 1.5, y); doc.line(PW - mx + 1.5, y, PW - 2, y); }
      // scale check bar: 5 blocks of exactly 1 cm, black and white, numbered, with a bold instruction next to it
      const rx = mx, ry = PH - 13, bh = 3;
      doc.setLineWidth(0.25); doc.setDrawColor(0);
      for (let b = 0; b < 5; b++){ doc.setFillColor(b % 2 ? 255 : 0); doc.rect(rx + b * 10, ry, 10, bh, "FD"); }
      doc.setFontSize(6.5); doc.setTextColor(0); doc.setFont("helvetica", "normal");
      for (let b = 0; b <= 5; b++) doc.text(b === 5 ? "5 cm" : String(b), rx + b * 10, ry + bh + 3, {align: b === 0 ? "left" : b === 5 ? "right" : "center"});
      doc.setFillColor(255); doc.rect(rx + 64, ry - 2, PW - mx - (rx + 64) + 1, 8.6, "F");   // keeps the cut lines out of the text
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.text("CHECK THE SCALE: this bar must measure exactly 5 cm.", rx + 66, ry + 1.6);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(60);
      doc.text("If it doesn't, print again at 100% / \"Actual size\" with \"Fit to page\" turned off. Cards are 6.3 x 8.8 cm.", rx + 66, ry + 5.2);
      doc.text(`${displayName(d)}  ·  page ${Math.floor(i / 9) + 1} of ${Math.ceil(faces.length / 9)}`, PW - mx, 6, {align: "right"});
    }
    const x = mx + (k % 3) * W, y = my + Math.floor(k / 3) * H;
    onProgress && onProgress(i, faces.length, f.name);
    try {
      let data = cache.get(f.url);
      if (!data){ data = await toDataURL(f.url); cache.set(f.url, data); }
      doc.addImage(data, "JPEG", x, y, W, H, f.url, "FAST");
    } catch {
      failed.push(f.name);
      doc.setDrawColor(60); doc.rect(x, y, W, H); doc.setFontSize(11); doc.setTextColor(20); doc.text(doc.splitTextToSize(f.name, W - 8), x + 4, y + 10);
    }
  }
  return {doc, faces, failed};
}
async function makePdf(){
  if (pdfBusy) return; pdfBusy = true;
  const d = cur(), btn = $("#makePdf"), prog = $("#pdfProg"), msg = $("#pdfMsg");
  btn.disabled = true; prog.hidden = false; msg.textContent = "Loading PDF tools…";
  try {
    const {doc, faces, failed} = await buildPdf((i, n, name) => { msg.textContent = `Adding ${name} (${i + 1} of ${n})`; prog.firstElementChild.style.width = Math.round((i + 1) / n * 100) + "%"; });
    doc.save(`${displayName(d).replace(/[\\/:*?"<>|]+/g, "")} proxies.pdf`);
    msg.textContent = failed.length ? `Done. ${failed.length} image${failed.length > 1 ? "s" : ""} couldn’t load and became text placeholders: ${failed.join(", ")}.` : `Done. ${faces.length} cards on ${Math.ceil(faces.length / 9)} A4 pages.`;
  } catch (err){ msg.textContent = err.message || "The PDF couldn’t be created."; }
  btn.disabled = false; pdfBusy = false;
}
$("#pdfModal").addEventListener("click", e => {
  if (e.target.closest("[data-close]") && !pdfBusy) hideScrim("#pdfScrim");
  if (e.target.closest("#makePdf")) makePdf();
});
