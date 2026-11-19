"use strict";
/* ---------------- Scroll position bars (touch screens) ----------------
   Phones hide scroll bars (iPhone only flashes a faint one while you scroll), so each side of the board gets a
   thin bar on its right edge that always shows where you are in the list. It only shows; it never catches taps. */
const SBAR_Q = matchMedia("(pointer: coarse)");
function initScrollBars(){
  document.querySelectorAll("#board .panel").forEach(panel => {
    if (panel.querySelector(".sbar")) return;
    const sc = panel.querySelector(".panel-scroll"), bar = document.createElement("div");
    bar.className = "sbar"; bar.setAttribute("aria-hidden", "true"); bar.innerHTML = "<i></i>";
    panel.appendChild(bar);
    let raf = 0, fadeT = 0;
    const update = () => {
      raf = 0;
      if (!SBAR_Q.matches){ bar.hidden = true; return; }
      const head = sc.querySelector(".panel-head"), top = head ? head.offsetHeight : 0;
      const view = sc.clientHeight - top, total = sc.scrollHeight - top, track = view - 12;
      bar.hidden = total <= view + 4 || track < 40;
      if (bar.hidden) return;
      const h = Math.max(28, track * view / total), y = (track - h) * (sc.scrollTop / (sc.scrollHeight - sc.clientHeight));
      bar.style.top = (top + 6) + "px"; bar.style.height = track + "px";
      bar.firstChild.style.height = h + "px"; bar.firstChild.style.transform = `translateY(${y.toFixed(1)}px)`;
    };
    const later = () => { if (!raf) raf = requestAnimationFrame(update); };
    sc.addEventListener("scroll", () => {
      later(); bar.classList.add("on");
      clearTimeout(fadeT); fadeT = setTimeout(() => bar.classList.remove("on"), 900);
    }, {passive: true});
    // the list grows or shrinks (cards added, boxes folded, sizes changed)
    const ro = new ResizeObserver(later); ro.observe(sc); [...sc.children].forEach(c => ro.observe(c));
    SBAR_Q.addEventListener("change", later);
    later();
  });
}
