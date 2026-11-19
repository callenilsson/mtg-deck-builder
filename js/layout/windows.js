"use strict";
/* ---------------- Phones: the stats live in their own window, so the cards keep their room ---------------- */
let statsSpot = null;
function openStats(){
  const st = $("#stats"); if (!st) return;
  if (!statsSpot){ statsSpot = document.createComment("stats"); st.before(statsSpot); }
  $("#statsHost").appendChild(st); showScrim("#statsScrim");
}
function closeStats(){ const st = $("#stats"); if (statsSpot && st && st.parentElement !== statsSpot.parentElement) statsSpot.after(st); $("#statsScrim").hidden = true; hideInfo(); }
$("#statsBtn").onclick = openStats;
$("#statsModal").addEventListener("click", e => { if (e.target.closest("[data-close]")) closeStats(); else if (e.target.closest("[data-open]")) closeStats(); });


/* ---------------- Scrims ---------------- */
function showScrim(sel){ if (sel === "#detailScrim"){ if (detailCloseA){ detailCloseA.cancel(); detailCloseA = null; } $(sel).classList.remove("closing"); } $(sel).hidden = false; }
let revealAfterAdd = null;
function revealCard(u){
  const el = document.querySelector(`#board .cw[data-uid="${u}"], #board .cw[data-tok="${u}"]`); if (!el) return;
  const box = el.closest(".box"); if (box && box.classList.contains("collapsed")) setFolded(`${box.dataset.zone}:${box.dataset.type}`, false);
  el.scrollIntoView({block: "center", behavior: REDUCED.matches ? "auto" : "smooth"});
  setTimeout(() => el.querySelector(".ct")?.animate([{boxShadow: "0 0 0 0 rgba(217,171,79,.9)"}, {boxShadow: "0 0 0 10px rgba(217,171,79,0)"}], {duration: 900, iterations: 2}), 350);
}
function hideScrim(sel){
  if (sel === "#detailScrim"){ if (!$(sel).classList.contains("closing")) requestClose(); return; }
  if (sel === "#statsScrim"){ closeStats(); return; }
  $(sel).hidden = true;
  if (sel === "#addScrim"){ A.token++; if (revealAfterAdd){ const u = revealAfterAdd; revealAfterAdd = null; setTimeout(() => revealCard(u), 60); } }
}
document.querySelectorAll(".scrim").forEach(s => s.addEventListener("click", e => { if (e.target === s && !(s.id === "pdfScrim" && pdfBusy)) hideScrim("#" + s.id); }));
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (document.activeElement && document.activeElement.id === "artName"){ document.activeElement.blur(); return; }
  for (const id of ["#confirmScrim", "#detailScrim", "#statsScrim", "#handScrim", "#pdfScrim", "#addScrim"]) if (!$(id).hidden){ if (id !== "#pdfScrim" || !pdfBusy) hideScrim(id); return; }
});
