"use strict";
/* ---------------- Flights between the board and the cover flow ----------------
   One smooth curve (cubic Bézier with a gentle S), sampled finely so speed and direction never change abruptly.
   The duration follows the distance: close cards arrive quickly, far ones take a little longer. */
function bezierEase(x1, y1, x2, y2){
  const bx = s => 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s;
  const by = s => 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
  return u => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++){ const m = (lo + hi) / 2; if (bx(m) < u) lo = m; else hi = m; } return by((lo + hi) / 2); };
}
const FLY_EASE = bezierEase(.32, 0, .18, 1);
const flightMs = dist => Math.round(Math.max(220, Math.min(520, 200 + dist * .32)));
function sFlight(fly, r0, r1, dur){
  Object.assign(fly.style, {left: r1.left + "px", top: r1.top + "px", width: r1.width + "px", height: r1.height + "px", transformOrigin: "50% 50%"});
  const dx = (r0.left + r0.width / 2) - (r1.left + r1.width / 2), dy = (r0.top + r0.height / 2) - (r1.top + r1.height / 2);
  const dist = Math.hypot(dx, dy) || 1, bend = Math.min(80, dist * .14);
  const nx = -dy / dist * bend, ny = dx / dist * bend;            // sideways, for the S
  // a single gentle arc: both control points bow to the same side, so direction changes smoothly the whole way
  const P0 = [dx, dy], P1 = [dx * .66 + nx * .8, dy * .66 + ny * .8], P2 = [dx * .2 + nx * .5, dy * .2 + ny * .5], P3 = [0, 0];
  const bez = (k, u) => { const m = 1 - u; return m * m * m * P0[k] + 3 * m * m * u * P1[k] + 3 * m * u * u * P2[k] + u * u * u * P3[k]; };
  const s0 = r0.width / r1.width, N = 40, frames = [];
  for (let i = 0; i <= N; i++){
    const u = i / N, e = FLY_EASE(u);
    frames.push({transform: `translate(${bez(0, e).toFixed(2)}px,${bez(1, e).toFixed(2)}px) scale(${(s0 + (1 - s0) * e).toFixed(4)})`, offset: u});
  }
  return fly.animate(frames, {duration: dur || flightMs(dist), easing: "linear"});
}
/* Hand over from the flying copy to the real card without a visible swap: reveal the card underneath, then fade the copy. */
function fadeAway(fly, after){
  const a = fly.animate([{opacity: 1}, {opacity: 0}], {duration: 120, easing: "linear", fill: "forwards"});
  a.onfinish = a.oncancel = () => { fly.remove(); after && after(); };
}
/* The flying card; with refl it carries the same mirrored reflection as the cover flow. */
function makeFly(src, r, refl){
  const fly = document.createElement("div"); fly.className = "fly";
  fly.innerHTML = `<img class="face" src="${esc(src)}" alt="">${refl ? `<img class="refl" src="${esc(src)}" alt="">` : ""}`;
  Object.assign(fly.style, {left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", transformOrigin: "50% 50%"});
  document.body.appendChild(fly); return fly;
}
/* The rest of the cover flow flies in as one pack with the card: every card (or placeholder) starts at the card's spot on
   the board and follows the same arc, turning into its own tilt and depth on the way, so it lands exactly in place. */
function packFly(src, center, dur){
  if (!V || REDUCED.matches || !src || !center || !center.width) return;
  const st = $("#flowStage"), cw = (V.fm && V.fm.cw) || center.width;
  const els = [...st.querySelectorAll(".fl")].filter(el => el.style.display !== "none" && !el.classList.contains("center") && el._t);
  if (!els.length) return;
  const modal = $("#detailModal"); modal.classList.add("packing");
  const sx = (src.left + src.width / 2) - (center.left + center.width / 2), sy = (src.top + src.height / 2) - (center.top + center.height / 2);
  const dist = Math.hypot(sx, sy) || 1, bend = Math.min(80, dist * .14), nx = -sy / dist * bend, ny = sx / dist * bend;
  const P0 = [sx, sy], P1 = [sx * .66 + nx * .8, sy * .66 + ny * .8], P2 = [sx * .2 + nx * .5, sy * .2 + ny * .5];
  const bez = (k, u) => { const m = 1 - u; return m * m * m * P0[k] + 3 * m * m * u * P1[k] + 3 * m * u * u * P2[k]; };
  const s0 = src.width / cw;
  let left = els.length;
  els.forEach(el => {
    const {X, Z, R} = el._t, a = Math.abs(el.dataset.off != null ? +el.dataset.off : +el.dataset.fi - V.fi), N = 30, frames = [];
    for (let i = 0; i <= N; i++){
      const u = i / N, e = FLY_EASE(u), q = e * e * (3 - 2 * e);      // the fan-out happens in the second half
      frames.push({transform: `translate(${bez(0, e).toFixed(2)}px,${bez(1, e).toFixed(2)}px) translate3d(${(-cw / 2 + (X + cw / 2) * q).toFixed(2)}px,0,${(Z * q).toFixed(1)}px) rotateY(${(R * q).toFixed(2)}deg) scale(${(s0 + (1 - s0) * e).toFixed(4)})`, offset: u});
    }
    const an = el.animate(frames, {duration: dur + Math.min(a, 6) * 22, delay: Math.min(a, 6) * 18, easing: "linear", fill: "backwards"});
    an.onfinish = an.oncancel = () => { if (--left === 0) modal.classList.remove("packing"); };
  });
}
function fanOut(){ }
function setFlImg(el, src){ if (!el) return; el.classList.remove("wait"); el.querySelectorAll("img").forEach(im => { if (im.getAttribute("src") !== src){ im.src = src; } im.classList.add("ld"); }); }
function animateOpen(srcEl){
  const img = srcEl && (srcEl.tagName === "IMG" ? srcEl : srcEl.querySelector("img"));
  if (!img || REDUCED.matches || !V) return;
  const tok = V.token, r0 = srcEl.getBoundingClientRect();
  V.srcRect = {left: r0.left, top: r0.top, width: r0.width, height: r0.height};
  const src = img.currentSrc || img.src;
  const fly = makeFly(src, r0, true);
  V.flying = true;

  // the cover flow's card starts with the very same picture, so the hand-over is invisible
  setFlImg($("#flowStage .fl.center"), src);
  const hideTarget = on => { const c = $("#flowStage .fl.center"), o = $("#flOver"); if (c) c.style.visibility = on ? "hidden" : ""; if (o) o.style.visibility = on ? "hidden" : ""; };
  hideTarget(true);
  srcEl.style.visibility = "hidden";
  const handOver = () => {
    srcEl.style.visibility = "";
    if (V && V.token === tok){ fly.querySelector(".refl")?.remove(); V.flying = false; hideTarget(false); fadeAway(fly, () => { if (V && V.token === tok) upgradeCenter(); }); if (V.pendingFlow){ const anims = [...document.querySelectorAll("#flowStage .fl")].flatMap(e => e.getAnimations()); Promise.all(anims.map(x => x.finished.catch(() => {}))).then(() => { if (V && V.token === tok && V.pendingFlow){ V.pendingFlow = false; renderFlow(); renderDetailParts(); } }); } }
    else fly.remove();
  };
  const done = () => {
    const c = V && V.token === tok && $("#flowStage .fl.center");
    const now = fly.getBoundingClientRect(), to = c && c.getBoundingClientRect();
    if (to && to.width && (Math.abs(now.left - to.left) > 1 || Math.abs(now.top - to.top) > 1 || Math.abs(now.width - to.width) > 1)){
      const base = fly.getBoundingClientRect();
      fly.getAnimations().forEach(x => x.cancel());
      const b0 = fly.getBoundingClientRect();
      const cx = r => r.left + r.width / 2, cy = r => r.top + r.height / 2;   // the flying card scales around its centre
      const from = `translate(${cx(base) - cx(b0)}px,${cy(base) - cy(b0)}px) scale(${base.width / b0.width})`;
      const dest = `translate(${cx(to) - cx(b0)}px,${cy(to) - cy(b0)}px) scale(${to.width / b0.width})`;
      const fix = fly.animate([{transform: from}, {transform: dest}], {duration: 140, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards"});
      fix.onfinish = fix.oncancel = handOver;
    } else handOver();
  };
  const target = $("#flowStage .fl.center");
  if (!target){ done(); return; }
  const tr = target.getBoundingClientRect(), dur = flightMs(Math.hypot((r0.left + r0.width / 2) - (tr.left + tr.width / 2), (r0.top + r0.height / 2) - (tr.top + tr.height / 2)));
  const a = sFlight(fly, r0, tr, dur);
  packFly(r0, tr, dur);
  a.onfinish = a.oncancel = done;
  V.flyAnim = a;
}
/* Closing: the card (with its new art or name) flies back to its place. */
function closeFly(v){
  if (!v || REDUCED.matches) return null;
  const c = $("#flowStage .fl.center"); if (!c || c.style.visibility === "hidden" || v.back) return null;
  const r = c.getBoundingClientRect(); if (!r.width) return null;
  let src = c.querySelector("img.face").src;
  if ($("#flOver").classList.contains("custom")) try { src = $("#artCanvas").toDataURL("image/jpeg", .85); } catch {}
  return {fly: makeFly(src, r), r};
}
/* Hide a card's spot with a style rule, so it stays hidden even if the board is redrawn meanwhile. */
function hideSpot(sel){ let st = document.getElementById("flyHide"); if (!st){ st = document.createElement("style"); st.id = "flyHide"; document.head.appendChild(st); } st.textContent = sel ? `${sel}{visibility:hidden!important}` : ""; }
/* Short glide of a flying card from where it is now to a rectangle (it scales around its centre). */
function glideFly(fly, to, ms = 140){
  const base = fly.getBoundingClientRect();
  fly.getAnimations().forEach(x => x.cancel());
  const b0 = fly.getBoundingClientRect(), cx = r => r.left + r.width / 2, cy = r => r.top + r.height / 2;
  return fly.animate([{transform: `translate(${cx(base) - cx(b0)}px,${cy(base) - cy(b0)}px) scale(${base.width / b0.width})`},
                      {transform: `translate(${cx(to) - cx(b0)}px,${cy(to) - cy(b0)}px) scale(${to.width / b0.width})`}], {duration: ms, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards"});
}
function landFly(f, v){
  if (!f) return;
  const sel = v.kind === "item" ? `#board .cw[data-uid="${v.uid}"] .ct` : v.kind === "token" ? `#board .cw[data-tok="${v.uid}"] .ct`
    : v.kind === "commander" || v.kind === "partner" ? `#cmds [data-cmd="${v.kind}"]` : null;
  const find = () => sel ? document.querySelector(sel) : (v.srcEl && v.srcEl.isConnected ? v.srcEl : null);
  const vis = r => r && r.width && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  const dest = find(), r = dest && dest.getBoundingClientRect();
  if (!vis(r)){
    const a = f.fly.animate([{opacity: 1, transform: "none"}, {opacity: 0, transform: "scale(.85) translateY(20px)"}], {duration: 220, easing: "ease-in"});
    a.onfinish = a.oncancel = () => f.fly.remove(); return;
  }
  if (sel) hideSpot(sel); else dest.style.visibility = "hidden";
  const finish = () => { if (sel) hideSpot(null); else if (dest) dest.style.visibility = ""; f.fly.remove(); };
  const a = sFlight(f.fly, f.r, r);
  a.onfinish = a.oncancel = () => {
    // the board may have been redrawn or moved during the flight: land exactly on where the card is now
    const d2 = find(), r2 = d2 && d2.getBoundingClientRect(), now = f.fly.getBoundingClientRect();
    if (vis(r2) && (Math.abs(now.left - r2.left) > 1 || Math.abs(now.top - r2.top) > 1 || Math.abs(now.width - r2.width) > 1)){
      const g = glideFly(f.fly, r2); g.onfinish = g.oncancel = finish;
    } else requestAnimationFrame(finish);
  };
}
