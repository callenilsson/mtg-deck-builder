"use strict";
/* Close the card view; with unsaved changes, ask first (save, discard or keep editing). */
function requestClose(after, opts = {}){
  if (!V) return;
  if (V.kind === "add"){
    stashCust();
    if (!V.custs.length || !V.custs.some(s => s.changed)){ closeDetail(true, opts).then(() => after && after()); return; }
    C = {save: true, after, opts};
    $("#confirmModal").innerHTML = `<div class="modal-body"><h2>Throw away your edits?</h2><p>You customized <b>${esc(V.card.name)}</b> but haven’t added it yet.</p>
      <div class="row"><button class="btn" data-c="no">Keep editing</button><button class="btn danger" data-c="discard">Discard</button></div></div>`;
    showScrim("#confirmScrim"); setTimeout(() => $('#confirmModal [data-c="no"]')?.focus(), 30); return;
  }
  if (V.editable) V.dirty = isDirty();
  if (!(V.editable && V.dirty)){ closeDetail(true, opts).then(() => after && after()); return; }
  C = {save: true, after, opts};
  $("#confirmModal").innerHTML = `<div class="modal-body"><h2>Save your changes?</h2><p>You changed the art or name of <b>${esc(V.card.name)}</b>.</p>
    <div class="row"><button class="btn" data-c="no">Keep editing</button><button class="btn danger" data-c="discard">Discard</button><button class="btn primary" data-c="save">Save</button></div></div>`;
  showScrim("#confirmScrim");
  setTimeout(() => $('#confirmModal [data-c="save"]')?.focus(), 30);
}
async function closeDetail(discard, opts = {}){
  const v = V;
  if (v && v.flyAnim) v.flyAnim.cancel();
  if (v && !discard && v.rebase){ V = v; finishRebase(); }
  const f = opts.anim === false ? null : closeFly(v);
  stopGlide(); V = null; flowDrag = null; artDrag = null; clearTimeout(flowT); clearTimeout(snapT);
  fadeOutDetail(v);
  if (v && !discard && v.editable && v.dirty) await commitView(v);
  if (f) landFly(f, v);
}
/* Save without leaving the card view: store it, then carry on from the saved state. */
async function saveInPlace(){
  if (!V || !V.dirty || V.saving) return;
  if (V.rebase) finishRebase();
  const v = V; v.saving = true;
  const btn = $("#artSave"); if (btn){ btn.disabled = true; btn.textContent = "Saving…"; }
  await commitView(v);
  v.saving = false;
  if (V !== v) return;
  v.dirty = false; v.custChanged = false; v.removed = false; v.custsRemoved = false; v.startKey = v.selKey;
  renderDetailParts();
}
/* Save: the card in the middle becomes the one the deck uses; every version is stored with it. */
async function buildCust(v, s){
  let key = s.custKey;
  if (s.changed || !key || !IMG.get(key)){
    let base = v.cid === s.cid && v.base && v.baseFor === (s.legacy && s.legacyKey ? "legacy:" + s.legacyKey : s.custBase.id) ? v.base : null;
    if (!base){
      const src = s.legacy && s.legacyKey && IMG.get(s.legacyKey) ? IMG.get(s.legacyKey) : (s.custBase.large || s.custBase.img);
      try { base = await corsImage(/cards\.scryfall\.io\/large\//.test(src) ? pngOf(src) : src); } catch { base = await corsImage(src); }
    }
    let user = s.user;
    if (!user && s.userKey && IMG.get(s.userKey)) user = await loadImage(IMG.get(s.userKey));
    const cv = document.createElement("canvas"); cv.width = 672 * ART_SCALE; cv.height = 936 * ART_SCALE;
    const keep = V; V = {...v, ...s, user, base, drawCard: s.custBase};
    try { compose(cv.getContext("2d"), false); } finally { V = keep; }
    const data = cv.toDataURL("image/jpeg", 0.93);
    key = "img_" + uid(); IMG.set(key, data); await idb.set(key, data);
  }
  // keep your picture on its own (at most 1600 px), so the version can move to another printing later
  let artKey = s.userKey;
  if (s.user && !artKey){
    const sc = Math.min(1, 1600 / Math.max(s.user.width, s.user.height)), c2 = document.createElement("canvas");
    c2.width = Math.round(s.user.width * sc); c2.height = Math.round(s.user.height * sc);
    const x = c2.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(s.user, 0, 0, c2.width, c2.height);
    try { const art = c2.toDataURL("image/jpeg", .9); artKey = "art_" + uid(); IMG.set(artKey, art); await idb.set(artKey, art); } catch { artKey = null; }
  }
  return {cid: s.cid, key, artKey: s.user || s.userKey ? artKey : null, name: (s.name || "").trim(), mode: s.mode, zoom: s.zoom, pan: {...s.pan}, box: [...s.box],
          base: plainPrint(s.custBase), ...(s.legacy ? {legacy: true} : {})};
}
/* The card exactly as set up in the view: the one in the middle, plus every version. Null if an image couldn't load. */
async function buildViewCard(v){
  const keepV = V; V = v;
  try {
    stashCust();
    const custs = []; for (const s of v.custs) custs.push(await buildCust(v, s));
    const e = entries()[v.fi];
    const chosen = e && e.t === "c" ? custs.find(c => c.cid === e.cid) : null;
    const baseOf = chosen ? v.custs.find(s => s.cid === chosen.cid).custBase : (e && e.t === "p" ? e.p : v.card);
    const ch = (viewTarget(v) || {}).cheap || CHEAP_MEM[baseOf.name];
    return {card: {...plainPrint(baseOf), ...(ch && usesCheapest(baseOf) ? {cheap: ch} : {}), ...(chosen ? {custom: {key: chosen.key, name: chosen.name || null, cid: chosen.cid}} : {}), ...(custs.length ? {custs} : {})}, custs, chosen};
  } catch { toast("Couldn’t build your custom card (an image didn’t load). Try again."); return null; }
  finally { V = keepV; }
}
async function commitView(v){
  if (roDeck(cur())) return;
  const d = cur(), orig = viewTarget(v); if (!d || !orig) return;
  const built = await buildViewCard(v); if (!built) return;
  const keepV = V; V = v;
  try {
    const {card, custs, chosen} = built;
    const before = [orig.custom && orig.custom.key, ...custList(orig).flatMap(c => [c.key, c.artKey])].filter(Boolean);
    if (v.kind === "commander") d.commander = card;
    else if (v.kind === "partner") d.partner = card;
    else if (v.kind === "token"){ const k = (d.tokens || []).find(x => x.uid === v.uid); if (!k) return; k.card = card; }
    else { const it = findCard(v.uid); if (!it) return; it.card = card; }
    // the view now continues from what was saved
    for (const c of custs){ const s = v.custs.find(x => x.cid === c.cid); if (s){ s.custKey = c.key; s.userKey = c.artKey; s.changed = false; s.legacy = !!c.legacy; s.legacyKey = c.legacy ? c.key : null; } }
    if (v.cid){ const s = v.custs.find(x => x.cid === v.cid); if (s){ v.custKey = s.custKey; v.userKey = s.userKey; v.legacy = s.legacy; v.legacyKey = s.legacyKey; } }
    setTimeout(() => { const used = usedImageKeys(); for (const k of before) if (!used.has(k)){ IMG.delete(k); idb.del(k); } }, 0);
    touch(d); renderAll(); refreshPrices(d);
    toast(card.custom ? `Saved · using your version${custs.length > 1 ? " " + (custs.findIndex(c => c.cid === chosen.cid) + 1) : ""}` : custs.length ? `Saved · using the official card (your ${custs.length > 1 ? custs.length + " versions are" : "version is"} kept)` : "Card updated");
  } finally { V = keepV; }
}
