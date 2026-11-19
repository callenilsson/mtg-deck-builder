"use strict";
/* Your customized versions: unsaved state, new version, change base card, remove, use a picture file. */
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
async function useUserFile(file){
  try {
    const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
    const im = await loadImage(url);
    ensureCust();
    V.user = im; V.userKey = null; V.zoom = 1; V.pan = {x: 0, y: 0};
    // a picture now lives on its own, so an older customization's finished image is no longer needed as the base
    if (V.legacy){ V.legacy = false; V.base = null; V.baseFor = null; }
    await loadBase();
    markCust(); updateOverlay(); drawArt(); renderDetailParts();
  } catch { toast("That file isn’t a picture this browser can open."); }
}
function startRebase(){
  if (!V.cid) return;
  V.rebase = true; V.selKey = V.custBase.id;
  renderFlow(); renderDetailParts(); loadBase();
}
function finishRebase(){
  if (!V.rebase) return;
  const changed = V.card.id !== V.custBase.id;
  V.rebase = false;
  if (changed){
    V.custBase = V.card; V.box = [...frameOf(V.custBase).box];
    if (V.legacy){ V.legacy = false; if (!V.user) toast("This customization was made before pictures were kept separately. Upload the picture again if it’s missing."); }
    V.base = null; V.baseFor = null; markCust();
  }
  V.selKey = "c:" + V.cid;
  renderFlow(); renderDetailParts(); loadBase();
}
function removeCust(){
  const n = V.custs.length > 1 ? ` ${custNumber(V.cid)}` : "";
  confirmTwice([{title: `Remove your version${n}?`, text: "This customized version (its name and art) disappears from the cover flow. Your other versions and the official card stay. Press Save to make it final.", yes: "Remove version"}], () => {
    if (!V || !V.cid) return;
    const cid = V.cid, base = V.custBase;
    V.rebase = false; unloadCust();
    V.custs = V.custs.filter(s => s.cid !== cid); V.custsRemoved = true;
    V.selKey = base ? base.id : V.selKey;
    renderFlow(); renderDetailParts(); markCust();
  });
}
