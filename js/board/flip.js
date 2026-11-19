"use strict";
/* Board animation: cards glide to their new places (FLIP). */
function snapshot(){
  const m = new Map(), vh = innerHeight;
  document.querySelectorAll("#board .cw[data-uid]").forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.bottom > -40 && r.top < vh + 40) m.set(el.dataset.uid, {r, zone: el.closest(".panel").dataset.zone, src: el.querySelector(".ct img")?.src});
  });
  return m;
}
function animateBoard(fn, opts = {}){
  if (REDUCED.matches || $("#board").hidden){ fn(); return; }
  const before = snapshot();
  fn();
  const vh = innerHeight; let n = 0;
  document.querySelectorAll("#board .cw[data-uid]").forEach(el => {
    if (n > 140) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < -40 || r.top > vh + 40) return;
    const u = el.dataset.uid, b = before.get(u);
    if (b){
      const dx = b.r.left - r.left, dy = b.r.top - r.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      n++;
      if (b.zone !== el.closest(".panel").dataset.zone && b.src){
        // across the divider: fly a copy above both panels so it isn't clipped
        const ct = el.querySelector(".ct"), cr = ct.getBoundingClientRect();
        const fly = document.createElement("img"); fly.src = b.src; fly.className = "fly";
        Object.assign(fly.style, {left: cr.left + "px", top: cr.top + "px", width: cr.width + "px", height: cr.height + "px"});
        document.body.appendChild(fly); el.style.visibility = "hidden";
        const sx = b.r.width / r.width;
        const a = fly.animate([{transform: `translate(${b.r.left - cr.left}px,${b.r.top - cr.top}px) scale(${sx})`}, {transform: "none"}], {duration: 360, easing: EASE});
        a.onfinish = a.oncancel = () => { fly.remove(); el.style.visibility = ""; };
      } else el.animate([{transform: `translate(${dx}px,${dy}px)`}, {transform: "none"}], {duration: 300, easing: EASE});
    } else if (opts.added && opts.added.includes(u)){
      n++; el.animate([{opacity: 0, transform: "scale(.9) translateY(8px)"}, {opacity: 1, transform: "none"}], {duration: 260, easing: EASE});
    }
  });
}
