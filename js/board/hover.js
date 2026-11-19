"use strict";
/* ---------------- Hover preview (mouse only; not on the board, where the size slider does the job) ---------------- */
const prev = $("#hoverPrev");
let prevSrc = null;
document.addEventListener("pointermove", e => {
  if (e.pointerType !== "mouse" || drag){ if (!prev.hidden) prev.hidden = true; return; }
  const el = e.target.closest("[data-img]");
  if (!el || !el.dataset.img || el.closest("#detailScrim") || el.closest("#board")){ if (!prev.hidden) prev.hidden = true; return; }
  if (prevSrc !== el.dataset.img){ prevSrc = el.dataset.img; prev.src = prevSrc; }
  prev.hidden = false;
  const W = 300, H = W * 88 / 63, pad = 18;
  let x = e.clientX + pad; if (x + W > innerWidth - 8) x = e.clientX - pad - W;
  let y = e.clientY - H / 2; y = Math.max(8, Math.min(innerHeight - H - 8, y));
  prev.style.transform = `translate(${x}px, ${y}px)`;
});
document.addEventListener("pointerdown", () => { prev.hidden = true; });
document.addEventListener("scroll", () => { prev.hidden = true; }, true);
