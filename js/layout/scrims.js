"use strict";
/* Windows (scrims): show, close by background tap or Esc. */
function showScrim(sel){ if (sel === "#detailScrim"){ if (detailCloseA){ detailCloseA.cancel(); detailCloseA = null; } $(sel).classList.remove("closing"); } $(sel).hidden = false; }
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
