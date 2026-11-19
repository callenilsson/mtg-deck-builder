"use strict";
/* Quick jump: type icons in each panel heading scroll that side to the type's section. */
function renderJump(){
  for (const [zone, nav] of [["options", "#optJump"], ["deck", "#deckJump"]]){
    const boxes = [...document.querySelectorAll(`.panel[data-zone="${zone}"] .box`)];
    $(nav).innerHTML = boxes.map(b => {
      const t = b.dataset.type, n = b.querySelectorAll(".cw").length;
      return n ? `<button data-jump="${t}" class="${b.classList.contains("collapsed") ? "folded" : ""}" title="${PLURAL[t]} · ${n}${b.classList.contains("collapsed") ? " (hidden)" : ""}"><i class="ms ${MS[t]}"></i></button>` : "";
    }).join("");
  }
  markJump();
}
function markJump(){
  document.querySelectorAll(".panel").forEach(panel => {
    const sc = panel.querySelector(".panel-scroll"), head = panel.querySelector(".panel-head");
    const line = head.getBoundingClientRect().bottom + 50;
    let curT = null;
    panel.querySelectorAll(".box").forEach(b => { if (b.getBoundingClientRect().top <= line) curT = b.dataset.type; });
    if (sc.scrollTop < 4) curT = panel.querySelector(".box")?.dataset.type || null;
    panel.querySelectorAll(".jump button").forEach(btn => { btn.classList.toggle("on", btn.dataset.jump === curT); const bx = panel.querySelector(`.box[data-type="${btn.dataset.jump}"]`); btn.classList.toggle("folded", !!(bx && bx.classList.contains("collapsed"))); });
  });
}
document.querySelectorAll(".panel").forEach(panel => {
  const sc = panel.querySelector(".panel-scroll");
  let raf = 0;
  sc.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; markJump(); }); }, {passive: true});
  panel.querySelector(".jump").addEventListener("click", e => {
    const b = e.target.closest("[data-jump]"); if (!b) return;
    const box = panel.querySelector(`.box[data-type="${b.dataset.jump}"]`); if (!box) return;
    if (box.classList.contains("collapsed")) setFolded(`${panel.dataset.zone}:${b.dataset.jump}`, false);
    const head = panel.querySelector(".panel-head").offsetHeight;
    const y = box.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - head - 8;
    sc.scrollTo({top: Math.max(0, y), behavior: REDUCED.matches ? "auto" : "smooth"});
  });
});
function renderTools(d){
  const counts = new Map();
  for (const c of d.cards) if (/Creature/.test(c.card.type.split("//")[0])) for (const s of subtypes(c.card)) counts.set(s, (counts.get(s) || 0) + 1);
  const opts = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const html = `<option value="">All creature types</option>` + opts.map(([s, n]) => `<option value="${esc(s)}" ${UI.ctype === s ? "selected" : ""}>${esc(s)} (${n})</option>`).join("");
  if ($("#ctypeSel").dataset.h !== html){ $("#ctypeSel").innerHTML = html; $("#ctypeSel").dataset.h = html; }
  $("#ctypeSel").value = UI.ctype;
  $("#sortSel").value = UI.sort;
  $("#filterBox").classList.toggle("on", !!(UI.filter.trim() || UI.ctype || UI.role));
}
