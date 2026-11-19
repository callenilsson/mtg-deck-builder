"use strict";
/* Cover flow: the artwork cards, placing them in 3D, dealing new ones in as they load. */
/* ---------------- Cover flow cards ----------------
   Cards are kept, never rebuilt: when the list changes (artworks arrive, "Find art" narrows it, a version is added),
   existing cards stay where they are and glide to new places. A new card stays hidden until its picture is decoded,
   then slides out from behind the card in the middle into its place ("dealt"), one after another. */
function flSrc(e, i){
  if (e.t === "c"){ const s = slotOf(e.cid), live = V.cid === e.cid; return (live ? V.snap : s.snap) || (live ? V.custBase : s.custBase).img; }
  return V.back && e.p.back && i === V.fi ? e.p.back.large : e.p.img;
}
function flMake(e, i, src){
  const el = document.createElement("button");
  if (e.t === "c"){
    const n = custNumber(e.cid);
    el.className = "fl custom-entry"; el.dataset.cid = e.cid; el.setAttribute("aria-label", "Your version " + n);
    el.innerHTML = `<img class="face ld" alt="" draggable="false"><img class="refl ld" alt="" draggable="false"><span class="yours">✦ Yours${V.custs.length > 1 ? " " + n : ""}</span>`;
  } else {
    el.className = "fl"; el.dataset.pid = e.p.id; el.setAttribute("aria-label", e.p.set || "Artwork");
    const lazy = Math.abs(i - V.fi) < 8 ? "eager" : "lazy";
    el.innerHTML = `<img class="face ld" alt="" loading="${lazy}" draggable="false"><img class="refl ld" alt="" loading="${lazy}" draggable="false">`;
  }
  el.dataset.key = entryKey(e);
  el.style.transition = "none";                            // a new card starts right in its place, without sliding there
  flSetSrc(el, src);
  return el;
}
function flSetSrc(el, src){ el.dataset.src = src; el.querySelectorAll("img").forEach(im => { if (im.getAttribute("src") !== src) im.src = src; }); }
/* hold a card back until its picture can be shown whole, then deal it */
function flHold(el){
  el.classList.add("hold");
  const im = el.querySelector(".face"), tok = V.token;
  const ready = () => (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => { if (V && V.token === tok) dealQueue(el); });
  if (im.complete && im.naturalWidth) ready(); else im.addEventListener("load", ready, {once: true});
}
let dealQ = [], dealT = 0, dealLast = 0;
const DEAL_GAP = 55;
function dealQueue(el){ if (!dealQ.includes(el)) dealQ.push(el); dealPump(); }
function dealPump(){
  if (dealT) return;
  dealQ = dealQ.filter(e => e.isConnected && e.classList.contains("hold"));
  if (!dealQ.length || !V) return;
  const wait = dealLast + DEAL_GAP - performance.now();
  if (wait > 0 || V.flying){ dealT = setTimeout(() => { dealT = 0; dealPump(); }, Math.max(wait, 30)); return; }
  const pos = V.pos != null ? V.pos : V.fi, d = e => Math.abs(+e.dataset.fi - pos);
  dealQ.sort((x, y) => d(x) - d(y));                     // of the cards ready, the nearest to the middle goes first
  const el = dealQ.shift();
  dealOne(el); dealLast = performance.now();
  if (dealQ.length) dealPump();
}
function dealOne(el){
  el.classList.remove("hold");
  if (REDUCED.matches || el.style.display === "none" || !el._t || !V || !V.fm) return;
  const pos = V.pos != null ? V.pos : V.fi, o = +el.dataset.fi - pos;
  if (flowDrag || Math.abs(o) > 7 || Math.abs(o) < .5){      // while you swipe (or far away): a quiet fade
    el.animate([{opacity: 0}, {opacity: 1}], {duration: 220, easing: "ease-out"}); return;
  }
  // from tucked behind the middle card, already turned, out to its place. Only the start is given, so the
  // end is wherever the card belongs right now (it keeps up if the cards move meanwhile).
  const {R} = el._t, cw = V.fm.cw;
  el.animate([{transform: `translate3d(${-cw / 2}px,0,-190px) rotateY(${R.toFixed(2)}deg)`, opacity: 0, offset: 0}, {opacity: 1, offset: .18}],
    {duration: 520, easing: "cubic-bezier(.2,.9,.25,1)"});
}
function renderFlow(popCustom){
  const st = $("#flowStage"); if (!st || !V) return;
  syncSel();
  const list = entries(), old = new Map([...st.children].map(el => [el.dataset.key, el])), want = [];
  list.forEach((e, i) => {
    const key = entryKey(e), src = flSrc(e, i);
    let el = old.get(key);
    if (el){ old.delete(key); if (el.dataset.src !== src) flSetSrc(el, src); }
    else { el = flMake(e, i, src); if ((i !== V.fi || V.opened) && !(popCustom && e.t === "c" && e.cid === V.cid)) el._new = true; }
    el.dataset.fi = i; want.push(el);
  });
  // cards no longer in the list fade away where they are
  old.forEach(el => { el.dataset.key = ""; el.classList.add("gone"); if (REDUCED.matches) el.remove(); else { const a = el.animate([{opacity: 1}, {opacity: 0}], {duration: 180, easing: "ease-out", fill: "forwards"}); a.onfinish = () => el.remove(); } });
  // put them in list order, moving as few as possible
  want.forEach((el, i) => { const at = st.children[i]; if (at !== el) st.insertBefore(el, at || null); });
  const sc = $("#flowScrub");
  if (sc){ sc.hidden = list.length < 2; sc.max = list.length - 1; sc.value = V.fi; }
  layoutFlow();
  const fresh = want.filter(el => el.style.transition === "none");
  if (fresh.length){ void st.offsetWidth; fresh.forEach(el => { el.style.transition = ""; }); }
  want.forEach(el => { if (el._new){ el._new = false; flHold(el); } });
  if (V.flying){ const c = st.querySelector(".fl.center"); if (c) c.style.visibility = "hidden"; }
  V.opened = true;
  if (popCustom && !REDUCED.matches){
    const el = st.querySelector(`.custom-entry[data-cid="${V.cid}"]`);
    if (el) el.animate([{opacity: 0, scale: .6}, {opacity: 1, scale: 1.06, offset: .7}, {opacity: 1, scale: 1}], {duration: 380, easing: "cubic-bezier(.2,.8,.2,1)"});
  }
  upgradeCenter();
}
function upgradeCenter(){
  if (!V || V.flying || V.back) return;
  const e = entries()[V.fi]; if (!e || e.t !== "p" || !e.p.large) return;
  const p = e.p, tok = V.token, fi = V.fi, im = new Image(), hi = /cards\.scryfall\.io\/large\//.test(p.large) ? pngOf(p.large) : p.large;
  im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => { if (!V || V.token !== tok || V.fi !== fi) return; setFlImg($("#flowStage") && $("#flowStage").children[fi], im.src); }); };
  im.onerror = () => { if (hi !== p.large){ im.onerror = null; im.src = p.large; } };
  im.src = hi;
}
function flowSize(){
  // same width as the cards on the board (measured, so it also matches stretched cards on phones)
  const ct = document.querySelector("#board .ct"), w = ct && ct.getBoundingClientRect().width;
  const base = w || parseFloat($("#board").style.getPropertyValue("--tile")) || 180;
  const want = Math.max(base * 1.45, isPhone() ? 230 : 270);
  const maxH = LAND_Q.matches ? Math.max(120, (innerHeight - 70) / 1.397 / 1.2) : (innerHeight * .66) / 1.397, maxW = Math.min(innerWidth * .8, 600);
  return Math.round(Math.max(90, Math.min(want, maxH, maxW)));
}
const pngOf = u => String(u || "").replace("/large/", "/png/").replace(/\.jpg(\?|$)/, ".png$1");
/* Only moves the cards (cheap: each card is its own ready-made layer the graphics chip slides around).
   Sizes are measured once per layout, not on every finger move. */
function placeCards(measure){
  const st = $("#flowStage"); if (!st || !V) return;
  if (measure || !V.fm){
    const w = $("#flow").clientWidth, cw = parseFloat(getComputedStyle($("#flow")).getPropertyValue("--flw")) || 236;
    V.fm = {cw, gap: Math.min(52, w / 14), first: Math.min(cw * .62, w / 4.6)};
  }
  const {cw, gap, first} = V.fm, pos = V.pos != null ? V.pos : V.fi, kids = st.children;
  for (let i = 0; i < kids.length; i++){
    const el = kids[i], o = i - pos, a = Math.abs(o), sg = Math.sign(o);
    if (el.classList.contains("gone")) continue;            // leaving: fades out where it is
    if (a > 9.5){ if (el.style.display !== "none") el.style.display = "none"; continue; }   // far away: not rendered, images not downloaded
    if (el.style.display) el.style.display = "";
    if (el.style.visibility && !V.flying) el.style.visibility = "";
    const k = Math.min(1, a);                               // 0 in the middle, 1 from the first side place on
    const x = a <= 1 ? sg * first * a : sg * (first + (a - 1) * gap);
    el._t = {X: x - cw / 2, Z: -140 * k, R: -sg * 62 * k};
    el.style.transform = `translate3d(${(x - cw / 2).toFixed(2)}px,0,${(-140 * k).toFixed(1)}px) rotateY(${(-sg * 62 * k).toFixed(2)}deg)`;
    const z = String(Math.round(1000 - a * 100)); if (el.style.zIndex !== z) el.style.zIndex = z;
    const c = i === V.fi; if (el.classList.contains("center") !== c) el.classList.toggle("center", c);
  }
}
function layoutFlow(){
  const fw = $("#flow"), sz = flowSize() + "px";
  if (fw && fw.style.getPropertyValue("--flw") !== sz) fw.style.setProperty("--flw", sz);
  const st = $("#flowStage"); if (!st || !V) return;
  placeCards(true);
  const list = entries(), sc = $("#flowScrub"); if (sc && +sc.value !== V.fi) sc.value = V.fi;
  const e = list[V.fi], cap = $("#flowCap");
  if (cap && !e) cap.innerHTML = `No artworks match “${esc(V.artQ || "")}”`;
  if (cap && e){
    const p = e.t === "c" ? slotOf(e.cid).custBase : e.p, pr = priceOf(p);
    const what = e.t === "c" ? `<b>✦ Your version${V.custs.length > 1 ? " " + custNumber(e.cid) : ""}</b> · based on ${esc(p.set || "this printing")}`
      : `${V.rebase ? `<b class="rebase-cap">New base:</b> ` : ""}<b>${esc(p.set || "This version")}</b>${p.artist ? ` · art by ${esc(p.artist)}` : ""}`;
    const yr = e.t === "p" && p.year ? ` (${p.year})` : "";
    const ap = printPrice(p);
    cap.innerHTML = `${what}${yr}${ap ? ` · <span class="art-price" title="Price of this exact artwork. The cheapest printing is what counts for the deck.">this art ${fmtMoney(ap.v, ap.sym)}</span>` : ""} · ${V.fi + 1} of ${list.length}${V.artQ && V.artQ.trim() ? ` matching “${esc(V.artQ.trim())}”` : ""}${V.morePrints ? " (loading more artworks…)" : !V.printsDone ? " (loading other artworks…)" : V.printsFailed ? " (couldn’t load other artworks right now)" : ""}`;
  }
  updateOverlay();
}
function updateOverlay(){
  const o = $("#flOver"); if (!o || !V) return;
  const show = !V.back && (V.rebase || centerIsCustom());
  o.classList.toggle("stale", !!V.back);
  o.classList.toggle("custom", show && !!V.base && !(V.userKey && !V.user));
  o.classList.toggle("user", show && !!V.user && !V.rebase);
  o.classList.toggle("rebasing", !!V.rebase);
}
