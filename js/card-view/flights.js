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
const flightMs = dist => Math.round(Math.max(240, Math.min(440, 210 + dist * .26)));
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
/* The flying card, with the same shadow and mirrored reflection as the cover flow's cards. */
function makeFly(src, r, refl){
  const fly = document.createElement("div"); fly.className = "fly";
  fly.innerHTML = `<img class="face" src="${esc(src)}" alt="">${refl ? `<img class="refl" src="${esc(src)}" alt="">` : ""}`;
  Object.assign(fly.style, {left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", transformOrigin: "50% 50%"});
  document.body.appendChild(fly); return fly;
}
function setFlImg(el, src){ if (!el) return; el.querySelectorAll("img").forEach(im => { if (im.getAttribute("src") !== src) im.src = src; im.classList.add("ld"); }); }
/* Opening: the card lifts off the board and glides along one smooth arc into the middle of the cover flow while the
   window fades in around it. It lands exactly on the real card, which takes over in the same frame (same picture,
   shadow and reflection, so the swap can't be seen). Then the other artworks are dealt out from behind it. */
function animateOpen(srcEl){
  const img = srcEl && (srcEl.tagName === "IMG" ? srcEl : srcEl.querySelector("img"));
  const target = $("#flowStage .fl.center");
  if (!img || !target || REDUCED.matches || !V) return;
  const tok = V.token, r0 = srcEl.getBoundingClientRect(), src = img.currentSrc || img.src;
  setFlImg(target, src);
  const face = target.querySelector(".face"), decoded = face.decode ? face.decode().catch(() => {}) : Promise.resolve();
  const fly = makeFly(src, r0, true);
  V.flying = true;
  const show = on => { const c = $("#flowStage .fl.center"), o = $("#flOver"); [c, o].forEach(x => { if (x) x.style.visibility = on ? "" : "hidden"; }); };
  show(false); srcEl.style.visibility = "hidden";
  const land = () => decoded.then(() => {
    srcEl.style.visibility = "";
    if (!V || V.token !== tok){ fly.remove(); return; }
    V.flying = false; V.flyAnim = null;
    show(true); fly.remove();                               // same frame: the real card replaces its identical copy
    upgradeCenter(); dealPump();
  });
  const tr = target.getBoundingClientRect();
  const a = sFlight(fly, r0, tr);
  V.flyAnim = a;
  a.onfinish = () => {
    a.oncancel = null;
    // the window may have settled a little during the flight: finish exactly on the card
    const c = V && V.token === tok && $("#flowStage .fl.center"), to = c && c.getBoundingClientRect(), now = fly.getBoundingClientRect();
    if (to && to.width && (Math.abs(now.left - to.left) > 1 || Math.abs(now.top - to.top) > 1 || Math.abs(now.width - to.width) > 1)){
      const g = glideFly(fly, to); g.onfinish = land; g.oncancel = () => { srcEl.style.visibility = ""; fly.remove(); };
    } else land();
  };
  a.oncancel = () => { srcEl.style.visibility = ""; fly.remove(); };
}
/* Closing: the card (with its new art or name) flies back to its place. */
function closeFly(v){
  if (!v || REDUCED.matches) return null;
  const c = $("#flowStage .fl.center"); if (!c || c.style.visibility === "hidden" || v.back) return null;
  const r = c.getBoundingClientRect(); if (!r.width) return null;
  let src = c.querySelector("img.face").src;
  if ($("#flOver").classList.contains("custom")) try { src = $("#artCanvas").toDataURL("image/jpeg", .85); } catch {}
  const f = {fly: makeFly(src, r, true), r};
  c.style.visibility = "hidden"; $("#flOver").style.visibility = "hidden";   // the copy takes the card's place
  return f;
}
/* Closing the window: it fades while the other artworks tuck back in behind the middle card. */
let detailCloseA = null;
function fadeOutDetail(v){
  const sc = $("#detailScrim");
  if (REDUCED.matches){ sc.hidden = true; return; }
  const st = $("#flowStage"), cw = v && v.fm ? v.fm.cw : 0;
  if (st && cw) [...st.children].forEach(el => {
    if (el.classList.contains("center") || el.style.display === "none" || !el._t) return;
    el.animate([{transform: `translate3d(${-cw / 2}px,0,-190px) rotateY(${el._t.R.toFixed(2)}deg)`, opacity: 0}], {duration: 240, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards"});
  });
  sc.classList.add("closing");
  if (detailCloseA) detailCloseA.cancel();
  const a = detailCloseA = sc.animate([{opacity: 1}, {opacity: 0}], {duration: 240, easing: "ease-out", fill: "forwards"});
  a.onfinish = () => { if (detailCloseA !== a) return; detailCloseA = null; sc.hidden = true; sc.classList.remove("closing"); a.cancel(); };
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
  f.fly.querySelector(".refl")?.animate([{opacity: .22}, {opacity: 0}], {duration: 160, easing: "ease-out", fill: "forwards"});
  a.onfinish = a.oncancel = () => {
    // the board may have been redrawn or moved during the flight: land exactly on where the card is now
    const d2 = find(), r2 = d2 && d2.getBoundingClientRect(), now = f.fly.getBoundingClientRect();
    if (vis(r2) && (Math.abs(now.left - r2.left) > 1 || Math.abs(now.top - r2.top) > 1 || Math.abs(now.width - r2.width) > 1)){
      const g = glideFly(f.fly, r2); g.onfinish = g.oncancel = finish;
    } else requestAnimationFrame(finish);
  };
}
