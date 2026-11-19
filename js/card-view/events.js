"use strict";
/* Card view events: typing a name, keys, file picks, paste, and every button. */
$("#detailModal").addEventListener("input", e => {
  if (!V) return;
  if (e.target.id === "flowScrub"){ setFlow(+e.target.value, true); return; }
  if (e.target.id === "artQ"){
    V.artQ = e.target.value;
    const list = entries(), still = list.some(x => entryKey(x) === V.selKey);
    if (!still){ const first = list.find(x => x.t === "p"); if (first){ V.selKey = entryKey(first); if (V.editable && V.selKey !== V.startKey && !V.rebase) markDirty(); } }
    renderFlow(); renderDetailParts();
    if (!still && V.rebase){ V.box = [...frameOf(V.card).box]; loadBase(); }
    return;
  }
  if (e.target.id === "artZoom"){ V.zoom = +e.target.value; drawArt(); markCust(); }
  if (e.target.id === "artName" || e.target.id === "artName2"){
    const val = e.target.value, id = e.target.id;
    ensureCust();
    V.name = val;
    const self = $("#" + id); if (self && self.value !== val){ self.value = val; self.focus(); }
    const other = $(id === "artName" ? "#artName2" : "#artName"); if (other && other.value !== val) other.value = val;
    updateOverlay(); drawArt(); markCust();
  }
});
$("#detailModal").addEventListener("keydown", e => { if ((e.target.id === "artName" || e.target.id === "artName2") && e.key === "Enter") e.target.blur(); });
$("#detailModal").addEventListener("change", e => { if (V && e.target.id === "artFile" && e.target.files[0]) useUserFile(e.target.files[0]); });
document.addEventListener("paste", e => {
  if (!V || !V.editable || $("#detailScrim").hidden) return;
  const f = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith("image/")); if (f){ e.preventDefault(); useUserFile(f); }
});
$("#detailModal").addEventListener("click", async e => {
  if (!V) return;
  if (e.target.closest("#namePen")){ const n = $("#artName"); n.focus(); n.select(); return; }
  if (e.target.id === "nameClear" || e.target.closest("#nameClear")){ V.name = ""; ["#artName", "#artName2"].forEach(s => { if ($(s)) $(s).value = ""; }); updateOverlay(); drawArt(); markCust(); renderDetailParts(); return; }
  if (e.target.closest("#flow") && !e.target.closest(".name-over") && !(e.target.id === "artCanvas" && V.user)){
    // 3D-tilted cards don't hit-test reliably, so find the front-most card under the pointer by its on-screen box
    if (flowMoved) return;
    let best = null;
    document.querySelectorAll("#flowStage .fl").forEach(el => {
      if (el.style.visibility === "hidden" || el.style.display === "none" || el.classList.contains("hold") || el.classList.contains("gone")) return;
      const r = el.querySelector("img.face").getBoundingClientRect(), i = +el.dataset.fi;
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom && (best == null || Math.abs(i - V.fi) < Math.abs(best - V.fi))) best = i;
    });
    if (best != null) setFlow(best);
    else requestClose();          // empty space around the artworks closes the view, like the dark background
    return;
  }
  // the empty space around the caption and between the artworks and the box closes it too
  if (e.target === $("#detailModal") || e.target.classList.contains("dv-scroll") || e.target.classList.contains("flow-foot")){ if (!flowMoved) requestClose(); return; }
  const b = e.target.closest("button"); if (!b) return;
  if (b.hasAttribute("data-close")){ requestClose(); return; }
  if (b.id === "artSave"){ saveInPlace(); return; }
  if (b.id === "dFlip"){ V.back = !V.back; renderFlow(); return; }
  if (b.id === "artUpload"){ $("#artFile").click(); return; }
  if (b.id === "artReset"){ artReset(); return; }
  if (b.id === "rebaseStart"){ startRebase(); return; }
  if (b.id === "rebaseDone"){ finishRebase(); return; }
  if (b.id === "custRemove"){ removeCust(); return; }
  if (b.id === "custNew"){ newVersion(); return; }
  if (b.dataset.mode){ V.mode = b.dataset.mode; V.pan = {x: 0, y: 0}; drawArt(); markCust(); renderDetailParts(); return; }
  if (b.id === "artDrop"){ V.user = null; V.userKey = null; if (V.legacy){ V.legacy = false; V.base = null; V.baseFor = null; loadBase(); } updateOverlay(); drawArt(); markCust(); renderDetailParts(); return; }
  if (b.id === "artPrompt"){
    const c = V.card;
    const text = `Create a new fantasy illustration for the Magic: The Gathering card "${c.name.split(" // ")[0]}" (${c.type}). `
      + `What the card does: ${String(c.text).replace(/\s+/g, " ").slice(0, 300)} `
      + `If I attached an image, keep its subject and composition but reimagine it with fresh detail. `
      + `Style: detailed painterly fantasy art, dramatic lighting, rich color. No text, no card frame, no border. Landscape format, about 4:3.`;
    try { await navigator.clipboard.writeText(text); toast("Prompt copied. Paste it into your AI image tool."); }
    catch { toast("Couldn’t copy automatically in this browser."); }
    return;
  }
  if (b.id === "artOrig"){
    try {
      const r = await fetch(V.card.art || V.card.large); const blob = await r.blob();
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `${slugify(V.card.name)}-art.jpg`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000); toast("Art downloaded");
    } catch { toast("Couldn’t download the art. Check your connection."); }
    return;
  }
  const a = b.dataset.d; if (!a) return;
  const u = V.uid, d = cur();
  if (a === "toPool" || a === "toDeck"){ requestClose(() => moveZone(u, a === "toDeck" ? "deck" : "options"), {anim: false}); }
  else if (a === "tokMove"){ requestClose(() => moveToken(u), {anim: false}); }
  else if (a === "tokRemove"){ requestClose(() => removeToken(u), {anim: false}); }
  else if (a === "lock"){ toggleLock(u); renderDetailParts(); }
  else if (a === "focus"){ toggleFocus(u); renderDetailParts(); }
  else if (a === "inc" || a === "dec"){ changeQty(u, a === "inc" ? 1 : -1); if (V) renderDetailParts(); }
  else if (a === "copy"){
    const it = findCard(u); if (!it) return;
    if (qOf(it) > 1) it.qty = qOf(it) - 1;
    const copy = {uid: uid(), card: plainPrint(it.card), bucket: it.bucket, zone: it.zone, locked: false, focus: false, qty: 1};
    d.cards.splice(d.cards.indexOf(it) + 1, 0, copy); touch(d); renderAll();
    requestClose(() => { const el = document.querySelector(`#board .cw[data-uid="${copy.uid}"] .ct`); openDetail({kind: "item", uid: copy.uid}, el); }, {anim: false});
    toast(`A separate ${it.card.name} for another artwork: swipe to pick its art`);
  }
  else if (a === "remove"){ const it = findCard(u); if (!it) return; confirmTwice([{title: `Remove ${esc(it.card.name)}?`, text: `It leaves the ${it.zone === "deck" ? "deck" : "card pool"}.`, yes: "Remove card"}], () => { closeDetail(true, {anim: false}); removeCard(u, false); }); }
  else if (a === "changeCmd"){ requestClose(() => openCommanderPicker(), {anim: false}); }
  else if (a === "addPartner" || a === "changePartner"){ requestClose(() => openPartnerPicker(), {anim: false}); }
  else if (a === "removePartner"){ confirmTwice([{title: "Remove the partner?", text: `${esc(d.partner.name)} leaves the command zone. Recommendations go back to ${esc(d.commander.name)} alone.`, yes: "Remove partner"}], () => { closeDetail(true, {anim: false}); d.partner = null; touch(d); render(); toast("Partner removed"); }); }
  else if (a === "pick" || a === "addPool" || a === "addDeck" || a === "addTok"){
    const v = V; b.disabled = true;
    const built = await buildViewCard(v); b.disabled = false;
    if (!built || V !== v) return;
    const card = built.card, nm = v.card.name;
    if (a === "pick"){ setCommander(card, true); return; }
    if (a === "addTok"){ if (addToken(card, A.side, true)){ toast(`${nm} token added`); closeDetail(true); renderAddBody(); } return; }
    if (addCard(card, a === "addDeck" ? "deck" : "options", true)){
      A.addedNow.add(nm); toast(`${nm} added to ${a === "addDeck" ? "deck" : "card pool"}${card.custs ? " with your edits" : ""}`);
      closeDetail(true); renderAddBody();
    }
  }
});
