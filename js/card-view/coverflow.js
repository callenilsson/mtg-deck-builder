"use strict";
/* ---------------- Card view ---------------- */
/* Width of the name area on a card (in % of the card): the frame starts at 7.2% and the mana symbols take ~5.5% each from the right. */
function nameFieldWidth(c){
  const n = ((String(c.mana || "").split(" // ")[0]).match(/\{[^}]+\}/g) || []).length;
  return Math.max(40, Math.min(84, 93 - 7.2 - n * 5.5 - (n ? 2 : 0))).toFixed(1);
}
function renderDetail(){
  const c = V.card;
  $("#detailModal").innerHTML = `<button class="icon-btn dv-close" data-close title="Close">${I.close}</button><div class="dv-scroll">
      <div class="flow" id="flow" tabindex="0" aria-label="Every artwork of this card. Drag, swipe, scroll or use the arrow keys. Click a card to jump to it.">
        <div class="flow-stage" id="flowStage"></div>
        <div class="fl-over" id="flOver"><canvas id="artCanvas" width="1344" height="1872"></canvas>
          ${V.editable ? `<input class="name-over" id="artName" style="width:${nameFieldWidth(c)}%" maxlength="40" autocomplete="off" spellcheck="false" placeholder="${esc(c.name.split(" // ")[0])}" value="${esc(V.name)}" title="Click to rename this card" aria-label="Name on the card"><button class="name-pen" id="namePen" title="Rename this card">${I.pencil}</button>` : ""}</div>
      </div>
      <div class="flow-foot"><div class="flow-cap" id="flowCap"></div>${c.back ? `<button class="btn sm" id="dFlip">${I.flip}Flip</button>` : ""}<input type="range" class="flow-scrub" id="flowScrub" min="0" max="0" value="0" aria-label="Jump to artwork" hidden></div>
      <div class="dv-box">
        <div class="modal-head"><h2>${esc(c.name)} <span class="mana">${manaHTML(c.mana)}</span></h2>
          <label class="art-find" title="Show only artworks whose set name, set code, artist or year match">${I.search}<span class="af-lbl">Find art</span><input id="artQ" type="search" placeholder="set, artist or year" autocomplete="off" value="${esc(V.artQ || "")}"></label></div>
        <div class="dv-body"><div class="dv-info" id="dvInfo"></div><div class="dv-side" id="dvSide"></div></div>
      </div>
    </div>`;
  renderFlow(); renderDetailParts(); drawArt();
}
function renderDetailParts(){
  if (!V) return;
  const d = cur(), c = V.card, item = V.kind === "item" ? findCard(V.uid) : null;
  const s = V.rec && V.rec.incl != null ? {incl: V.rec.incl, syn: V.rec.syn} : statFor(edhStats(d), c.name);
  const pr = priceOf(c), pa = PRICES[c.id];
  const chips = [];
  if (V.kind !== "commander" && V.kind !== "partner" && V.kind !== "token"){
    if (s){
      const pct = Math.round(s.incl * 100), syn = s.syn != null ? Math.round(s.syn * 100) : null;
      chips.push(`<span class="chip-st" title="Played in ${pct}% of ${esc(cmdKey(d))} decks on EDHREC"><b>${pct}%</b> of decks</span>`);
      if (syn != null) chips.push(`<span class="chip-st" title="Synergy: how much more often it's played with this commander than in other decks that could play it"><b class="${syn > 0 ? "pos" : syn < 0 ? "neg" : ""}">${syn > 0 ? "+" : ""}${syn}%</b> synergy</span>`);
    } else chips.push(`<span class="chip-st" title="Not on ${esc(cmdKey(d))}'s EDHREC page">Not on EDHREC</span>`);
  }
  if (item && item.zone === "deck"){
    const ot = castOnTime(d, item.card);
    if (ot) chips.push(`<span class="chip-st ${ot.p >= .8 ? "ok" : ot.p < .5 ? "bad" : ""}" title="Chance to have enough mana, in its colors, to cast it by turn ${ot.turn} (its mana value). From your deck's lands, mana rocks and mana creatures: opening 7 plus one draw a turn from 99 cards, on the play."><b>${Math.round(ot.p * 100)}%</b> on time (turn ${ot.turn})</span>`);
  }
  const ap = printPrice(c);
  chips.push(`<span class="chip-st price${isPricey(c) ? " pricey" : ""}" title="The cheapest printing's price is what counts (expensive marking, totals). This artwork's own price is shown for interest."><b>${pr ? fmtMoney(pr.v, pr.sym) : "–"}</b> cheapest${ap && (!pr || Math.abs(ap.v - pr.v) >= .01) ? ` <span class="sub">· this art ${fmtMoney(ap.v, ap.sym)}</span>` : ""}</span>`);
  if (V.rec && V.rec.pairs && V.rec.pairs.length) chips.push(`<span class="chip-st" title="Also played with ${V.rec.pairs.map(esc).join(", ")}">Combo ×${V.rec.pairs.length}</span>`);
  $("#dvInfo").innerHTML = `<div class="type-line">${esc(c.type)}${centerIsCustom() && V.name.trim() ? ` · printed as “${esc(V.name.trim())}”` : ""}</div>
    <div class="oracle">${manaHTML(c.text)}</div>${c.pt ? `<div class="pt">${esc(c.pt)}</div>` : ""}
    <div class="chip-row">${chips.join("")}</div>
    <div class="dv-links"><a href="https://edhrec.com/cards/${slugify(c.name)}" target="_blank" rel="noopener">EDHREC ↗</a><a href="https://scryfall.com/search?q=${encodeURIComponent(`!"${c.name.split(" // ")[0]}"`)}" target="_blank" rel="noopener">Scryfall ↗</a><a href="https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(c.name.split(" // ")[0])}" target="_blank" rel="noopener">Cardmarket ↗</a></div>`;
  let acts = "";
  if (roDeck(d) && V.kind !== "add"){
    acts = `<span class="note">${esc(ownerName(d))}’s deck · view only</span>`;
  } else if (V.kind === "commander"){
    acts = `<button class="btn" data-d="changeCmd">Change commander</button>${d.partner ? "" : partnerQuery(d.commander) ? `<button class="btn" data-d="addPartner">+ Partner</button>` : ""}`;
  } else if (V.kind === "token"){
    const k = (d.tokens || []).find(x => x.uid === V.uid);
    acts = k ? `<span class="qty-big" title="How many of this token"><button data-d="dec" title="One fewer">−</button><b>${qOf(k)}</b><button data-d="inc" title="One more">+</button></span>` : "";
  } else if (V.kind === "partner"){
    acts = `<button class="btn" data-d="changePartner">Change partner</button><button class="btn danger" data-d="removePartner">${I.trash}Remove</button>`;
  } else if (item){
    acts = canMulti(c) ? `<span class="qty-big" title="How many of this card"><button data-d="dec" title="One fewer">−</button><b>${qOf(item)}</b><button data-d="inc" title="One more">+</button></span>` : "";
  } else if (V.kind === "add"){
    if (A.mode === "token") acts = `<button class="btn primary" data-d="addTok" title="Adds it with the artwork and edits shown above">+ Add to ${A.side === "options" ? "pool" : "deck"}</button>`;
    else if (A.mode === "commander" || A.mode === "partner") acts = `<button class="btn primary" data-d="pick">${A.mode === "partner" ? "Choose as partner" : "Choose as commander"}</button>`;
    else {
      const have = d.cards.find(k => k.card.name === c.name);
      acts = have && !canMulti(c) ? `<span class="btn" style="color:var(--ok);border-color:transparent;background:none">✓ In ${have.zone === "deck" ? "deck" : "card pool"}</span>`
        : `<button class="btn ${A.side === "deck" ? "" : "primary"}" data-d="addPool" title="Adds it with the artwork shown above">+ Card pool</button><button class="btn ${A.side === "deck" ? "primary" : ""}" data-d="addDeck" title="Adds it with the artwork shown above">+ Deck</button>`;
    }
  }
  let edit = "";
  if (V.editable){
    const hint = V.rebase ? "Swipe to pick the card under this version" : V.dirty ? "Unsaved changes" : centerIsCustom() ? `Editing your version${V.custs.length > 1 ? " " + custNumber(V.cid) : ""}` : V.custs.length ? "Swipe to your versions, or edit this one to make a new one" : "Rename or upload art to make your own version";
    edit = `<div class="dv-edit ${V.dirty ? "dirty" : ""}">
      <div class="ed-head"><span class="ed-title">✦ Customize</span><span class="ed-hint">${hint}</span></div>
      <div class="ed-row"><span class="ed-lbl">${I.pencil}Name</span><span class="ed-field"><input id="artName2" maxlength="40" autocomplete="off" spellcheck="false" placeholder="${esc(c.name.split(" // ")[0])}" value="${esc(V.name)}" aria-label="Name on the card">${V.name ? `<button class="x" id="nameClear" title="Use the real name">×</button>` : ""}</span></div>
      <div class="ed-row"><span class="ed-lbl">${I.brush}Art</span><div class="ed-btns">
        <button class="btn sm" id="artUpload" title="Use any picture: AI-made art, a photo, a drawing. You can also paste an image, or drop a picture file on the card.">${I.upload}Upload</button>
        <button class="btn sm" id="artPrompt" title="Copies a ready-made description of this card. Paste it into an AI image tool (ChatGPT, Gemini…) to get new art, then upload the result here.">${I.copy}Copy text for AI art</button>
        <button class="btn sm" id="artOrig" title="Download the current art, for example to attach in your AI image tool">Download</button></div></div>
      ${V.user ? `<div class="ed-row"><span class="ed-lbl">Fit</span><div class="ed-btns" title="${V.mode === "frame" ? "Drag the picture on the card to frame it; drag the gold corners to fit the art window" : "Drag the picture on the card to position it"}">
        <div class="seg"><button data-mode="frame" class="${V.mode === "frame" ? "on" : ""}">In frame</button><button data-mode="whole" class="${V.mode === "whole" ? "on" : ""}">Whole card</button></div>
        <input type="range" id="artZoom" min="1" max="6" step="0.01" value="${V.zoom}" aria-label="Zoom" title="Zoom. On the card: pinch with two fingers, or use the scroll wheel"><button class="btn sm" id="artReset" title="Fit the picture again (or double-tap it)">Reset</button><button class="btn sm" id="artDrop">Remove picture</button></div></div>
      <p class="ed-tip">Drag the picture to move it. Pinch with two fingers or scroll to zoom. Double-tap to reset.</p>` : ""}
      ${V.hasCust ? `<div class="ed-row"><span class="ed-lbl">${I.copy}Base</span><div class="ed-btns">${V.rebase
          ? `<span class="note">Swipe above, then</span><button class="btn sm primary" id="rebaseDone">Done</button>`
          : `<span class="note base-name" title="The official card your version is built on">${esc(V.custBase.set || "This printing")}</span><button class="btn sm" id="rebaseStart" title="Keep your customization and swipe to put it on another printing">Change base card</button>`}</div></div>` : ""}
      <input type="file" id="artFile" accept="image/*" hidden>
      <div class="ed-foot">
        <span class="ed-left">${V.cid ? `<button class="btn sm danger" id="custRemove" title="Delete this customized version">${I.trash}Remove</button>` : ""}
        <button class="btn sm" id="custNew" title="${centerIsCustom() ? "Make another version, starting as a copy of this one" : "Start a new customized version of this printing"}">${I.copy}New version</button></span>
        <span class="ed-save">${V.kind === "add" ? `<span class="note" title="Your edits come along when you add the card">Kept when you add it</span>` : `<button class="btn sm save-btn" id="artSave" ${V.dirty ? "" : "disabled"}>Save changes</button>`}</span></div></div>`;
  }
  $("#dvSide").innerHTML = `<div class="dv-acts">${acts}</div>${edit}`;
}
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
/* the picture the customization is drawn on: the chosen printing (or, for older customizations, their finished image) */
async function loadBase(){
  if (!V || !V.editable || !V.hasCust) return;
  const tok = V.token, cid = V.cid, target = V.rebase ? V.card : V.custBase;
  const useLegacy = V.legacy && V.legacyKey && IMG.get(V.legacyKey) && !V.rebase;
  const key = useLegacy ? "legacy:" + V.legacyKey : target.id;
  if (V.baseFor === key && V.base) return;
  const src = useLegacy ? IMG.get(V.legacyKey) : (target.large || target.img);
  const hi = !useLegacy && /cards\.scryfall\.io\/large\//.test(src) ? pngOf(src) : null;
  try {
    let im; try { im = await corsImage(hi || src); } catch (err){ if (!hi) throw err; im = await corsImage(src); }
    const now = V && V.token === tok && V.cid === cid && V.custBase && (V.rebase ? V.card : V.custBase).id === target.id;
    if (now){ V.base = im; V.baseFor = key; drawArt(); updateOverlay(); }
  } catch (e){ if (V && V.token === tok) toast(e.message); }
}
async function loadUserArt(){
  if (!V || V.user || !V.userKey || !IMG.get(V.userKey)) return;
  const tok = V.token, cid = V.cid;
  try { const im = await loadImage(IMG.get(V.userKey)); if (V && V.token === tok && V.cid === cid){ V.user = im; drawArt(); updateOverlay(); renderDetailParts(); } } catch {}
}
async function loadPrints(){
  const tok = V.token, name = V.card.name.split(" // ")[0];
  try {
    const isTok = V.kind === "token";
    const url = `/cards/search?q=${encodeURIComponent(`!"${name}"${isTok ? " t:token" : ""}`)}&unique=art&order=released&dir=desc&include_extras=true`;
    const j = await sf(url);
    if (!V || V.token !== tok) return;
    // more pages load quietly afterwards (up to ~1,400 artworks)
    if (j && j.has_more) setTimeout(() => loadMorePrints(url, 2, tok, isTok), 0);
    // for tokens, only the same token (same stats and text), in every artwork
    const list = (j ? j.data : []).map(toCard).filter(p => p.img && (!isTok || sameToken(p, V.card)));
    savePrices();
    if (!list.length) throw "none";
    // keep the exact printings this card and its customization use (same art, other set: keep yours)
    for (const keep of [V.card, ...V.custs.map(s => s.custBase)].filter(Boolean)){
      const i = list.findIndex(p => p.id === keep.id || (keep.ill && p.ill === keep.ill));
      if (i < 0) list.unshift(plainPrint(keep)); else if (list[i].id !== keep.id) list[i] = plainPrint(keep);
    }
    V.prints = list;
    const at = Math.max(0, list.findIndex(p => p.id === V.card.id));
    V.pre = list.slice(Math.max(0, at - 9), at + 10).map(p => { const im = new Image(); im.src = p.img; return im; });
  } catch (e){ if (e !== "none" && V && V.token === tok) V.printsFailed = true; }
  if (!V || V.token !== tok) return;
  V.printsDone = true;
  renderFlow(); renderDetailParts();
}
async function loadMorePrints(url, page, tok, isTok){
  if (!V || V.token !== tok || page > 8) return;
  V.morePrints = true; layoutFlow();
  try {
    const j = await sf(url + "&page=" + page);
    if (!V || V.token !== tok) return;
    const have = new Set(V.prints.map(p => p.id));
    const add = (j ? j.data : []).map(toCard).filter(p => p.img && !have.has(p.id) && (!isTok || sameToken(p, V.card)));
    savePrices();
    if (add.length){ V.prints = V.prints.concat(add); if (!flowDrag) renderFlow(); }
    if (j && j.has_more){ loadMorePrints(url, page + 1, tok, isTok); return; }
  } catch {}
  if (V && V.token === tok){ V.morePrints = false; if (!flowDrag) renderFlow(); }
}
let flowT;
/* Clicks and keys switch at once; drags and the wheel settle for a moment first. */
function setFlow(i, settle){
  if (!V) return;
  const list = entries();
  i = Math.max(0, Math.min(list.length - 1, i));
  if (i === V.fi) return;
  V.selKey = entryKey(list[i]); V.back = false;
  syncSel(); layoutFlow();
  if (!V.rebase && V.editable){ const was = V.dirty; V.dirty = isDirty(); if (was !== V.dirty) renderDetailParts(); }
  clearTimeout(flowT);
  const apply = () => { if (!V) return; renderDetailParts(); upgradeCenter(); if (V.rebase){ V.box = [...frameOf(V.card).box]; loadBase(); } else if (centerIsCustom()){ loadBase(); loadUserArt(); } };
  if (settle) flowT = setTimeout(apply, 120); else apply();
}
function markDirty(){ if (V && !V.dirty){ V.dirty = true; const a = document.activeElement, id = a && a.id, pos = a && a.selectionStart; renderDetailParts(); if (id === "artName2"){ const n = $("#artName2"); n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } } }
function markCust(){ V.custChanged = true; markDirty(); }
/* Really changed? A different card in the middle than when it opened, or a new, edited or removed version.
   Swiping around and landing back on the same card is not a change. */
function isDirty(){
  if (!V) return false;
  if (V.selKey !== V.startKey || V.custsRemoved) return true;
  if (V.cid && V.custChanged) return true;
  return V.custs.some(s => s.changed);
}
/* Editing an official printing starts a new version of it, shown as its own card next to it. */
function newCustFrom(base, copy){
  const s = copy ? {...copy, cid: uid(), pan: {...copy.pan}, box: [...copy.box], custKey: null, changed: true}
                 : {cid: uid(), name: "", userKey: null, user: null, mode: "frame", zoom: 1, pan: {x: 0, y: 0}, box: [...frameOf(base).box], custBase: base, legacy: false, legacyKey: null, custKey: null, snap: "", changed: true};
  const at = copy ? V.custs.findIndex(x => x.cid === copy.cid) + 1 : V.custs.length;
  V.custs.splice(at, 0, s);
  V.selKey = "c:" + s.cid;
  renderFlow(true); renderDetailParts(); markCust(); loadBase(); loadUserArt();
  return s;
}
function ensureCust(){
  if (centerIsCustom() || V.rebase) return;
  const e = entries()[V.fi];
  newCustFrom(e && e.t === "p" ? e.p : V.card);
}
/* New version: copies the version in the middle (same art, name and framing), or starts fresh on an official printing. */
function newVersion(){
  if (centerIsCustom()){ stashCust(); newCustFrom(null, slotOf(V.cid)); toast("New version made from this one. Change it as you like."); }
  else { ensureCust(); setTimeout(() => $("#artName2")?.focus(), 50); }
}
let flowDrag = null, flowWheel = 0, flowMoved = false;
/* one card per ~half a card width of finger or mouse movement; a quick flick glides on a little */
function flowStep(){ const w = parseFloat(getComputedStyle($("#flow")).getPropertyValue("--flw")) || 240; return Math.max(60, Math.min(120, w * .45)); }
let flowGlide = 0;
function stopGlide(){ if (flowGlide){ cancelAnimationFrame(flowGlide); flowGlide = 0; } }
function setPos(p){
  if (!V) return;
  V.pos = p;
  const n = V.n || entries().length, i = Math.max(0, Math.min(n - 1, Math.round(p)));
  if (i !== V.fi) setFlow(i, true); else placeCards(false);
}
/* glide to a whole card, easing out (a little longer for longer trips) */
function glideTo(target, v0 = 0){
  stopGlide(); if (!V) return;
  const from = V.pos != null ? V.pos : V.fi, dist = target - from; V.n = entries().length;
  if (Math.abs(dist) < .002){ endGlide(target); return; }
  const dur = Math.min(650, 260 + Math.abs(dist) * 70), t0 = performance.now();
  $("#flow").classList.add("live");
  const step = now => {
    if (!V){ flowGlide = 0; return; }
    const u = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 3);   // ease-out cubic: quick start, soft landing
    setPos(from + dist * e);
    if (u < 1) flowGlide = requestAnimationFrame(step); else endGlide(target);
  };
  flowGlide = requestAnimationFrame(step);
}
function endGlide(target){
  flowGlide = 0; if (!V) return;
  V.pos = null; $("#flow").classList.remove("live");
  setFlow(target, true); layoutFlow();
}
$("#detailModal").addEventListener("pointerdown", e => {
  const f = e.target.closest("#flow"); if (!f || !V || e.target.closest(".name-over,.name-pen") || (e.target.id === "artCanvas" && V.user && !V.rebase)) return;
  const start = V.pos != null ? V.pos : V.fi; stopGlide(); V.n = entries().length;
  flowDrag = {x: e.clientX, y: e.clientY, start, step: flowStep(), pts: [[performance.now(), e.clientX]]}; flowMoved = false;
  if (V.pos != null) flowMoved = true;                   // caught a gliding flow: hold it right there
});
window.addEventListener("pointermove", e => {
  if (!flowDrag || !V) return;
  const dx = e.clientX - flowDrag.x;
  if (!flowMoved && Math.abs(dx) > 8){ flowMoved = true; flowDrag.x += Math.sign(dx) * 8; $("#flow").classList.add("live"); }
  flowDrag.pts.push([performance.now(), e.clientX]); if (flowDrag.pts.length > 6) flowDrag.pts.shift();
  if (!flowMoved) return;
  flowDrag.cx = e.clientX;
  if (flowDrag.raf) return;                               // at most one update per screen frame
  flowDrag.raf = requestAnimationFrame(() => { const fd = flowDrag; if (!fd || !V) return; fd.raf = 0; dragTo(fd); });
});
function dragTo(fd){
  const n = V.n || entries().length;
  let p = fd.start - (fd.cx - fd.x) / fd.step;
  // past the first or last artwork it stretches like a rubber band
  if (p < 0) p = -(1 - 1 / (1 - p * .9)) * .55; else if (p > n - 1){ const over = p - (n - 1); p = n - 1 + (1 - 1 / (1 + over * .9)) * .55; }
  setPos(p);
}
window.addEventListener("pointerup", () => {
  const fd = flowDrag; flowDrag = null;
  if (!fd || !V) return;
  if (fd.raf){ cancelAnimationFrame(fd.raf); fd.raf = 0; if (flowMoved && fd.cx != null) dragTo(fd); }
  if (!flowMoved){ if (V.pos != null) glideTo(Math.round(V.pos)); return; }
  const now = performance.now(), recent = fd.pts.filter(([t]) => now - t < 120);
  const pts = recent.length >= 2 ? recent : fd.pts.slice(-2);
  const [t0, x0] = pts[0], [t1, x1] = pts[pts.length - 1], v = pts.length >= 2 ? (x1 - x0) / Math.max(8, t1 - t0) : 0;   // px per ms
  const n = entries().length, p = V.pos != null ? V.pos : V.fi;
  // keep going with the finger's speed, then settle on the nearest artwork
  const throwCards = -v * 260 / fd.step;
  glideTo(Math.max(0, Math.min(n - 1, Math.round(p + Math.max(-12, Math.min(12, throwCards))))));
});
window.addEventListener("pointercancel", () => { if (flowDrag && V && V.pos != null) glideTo(Math.round(V.pos)); flowDrag = null; });
$("#detailModal").addEventListener("wheel", e => {
  if (!e.target.closest("#flow") || !V || entries().length < 2) return;
  if (e.target.id === "artCanvas" && V.user && !V.rebase) return;     // the wheel zooms your picture there
  // sideways wheel / trackpad swipe (or shift + wheel) flips artworks; normal wheel scrolls the view
  if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) && !e.shiftKey) return;
  e.preventDefault();
  flowWheel += e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
  while (Math.abs(flowWheel) >= 60){ setFlow(V.fi + Math.sign(flowWheel), true); flowWheel -= 60 * Math.sign(flowWheel); }
}, {passive: false});
$("#detailModal").addEventListener("keydown", e => {
  if (e.target.id !== "flow" || !V) return;
  if (e.key === "ArrowLeft"){ e.preventDefault(); setFlow(V.fi - 1); }
  if (e.key === "ArrowRight"){ e.preventDefault(); setFlow(V.fi + 1); }
});
window.addEventListener("resize", () => { if (V) layoutFlow(); });
