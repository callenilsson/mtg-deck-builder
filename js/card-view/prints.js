"use strict";
/* Loading every artwork (printing) of the card, and the pictures a customization is drawn on. */
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
