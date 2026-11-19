"use strict";
/* Tokens: not part of the 100, no limits, no EDHREC. One tile per artwork with a count, like basic lands. */
const tokZone = k => k.zone || "deck";
/* The same token across printings: same name and power/toughness, and the same rules text once wording
   like "Sacrifice this artifact" vs "this token" is ignored (missing text counts as a match). */
const normTokText = s => String(s || "").toLowerCase().replace(/this (artifact|creature|token|permanent|enchantment)/g, "this").replace(/\s+/g, " ").trim();
const tokKey = c => `${String(c.name).toLowerCase()}|${c.pt || ""}|${normTokText(c.text)}`;
function sameToken(a, b){
  if (String(a.name).toLowerCase() !== String(b.name).toLowerCase() || (a.pt || "") !== (b.pt || "")) return false;
  const x = normTokText(a.text), y = normTokText(b.text);
  return !x || !y || x === y;
}
function tokenBoxHTML(d, zone){
  const toks = (d.tokens || []).filter(k => tokZone(k) === zone);
  const filtering = !!(UI.filter.trim() || UI.ctype || UI.role);
  const shown = filtering ? toks.filter(matchesFilter) : toks;
  if (filtering && !shown.length) return "";
  const fk = zone + ":Token", folded = !!(UI.collapsed || {})[fk];
  const tiles = shown.map(k => `<div class="cw tok" data-tok="${k.uid}">
      <div class="ct" data-img="${esc(largeOf(k.card))}" title="${esc(k.card.custom && k.card.custom.name ? k.card.custom.name + " (" + k.card.name + ")" : k.card.name)}"><span class="ct-name">${esc(k.card.name)}</span>
        ${k.card.custom ? `<span class="custom-tag" title="Custom art or name">${I.brush}</span>` : ""}
        <img src="${esc(imgOf(k.card))}" ${srcsetAttr(k.card)} alt="${esc(k.card.name)}" loading="lazy" draggable="false" onerror="this.remove()">${qtyHTML(k)}</div>
      <div class="ct-stats"><div class="st-row faint">${esc(String(k.card.pt || k.card.type.replace(/^Token\s*/, "")).slice(0, 40))}</div></div>
      <div class="acts"><button data-tact="edit" title="Edit art and name">${I.brush}</button><button class="del" data-tact="remove" title="Remove token">${I.trash}</button></div></div>`).join("");
  return `<div class="box tokens${folded ? " collapsed" : ""}" data-type="Token" data-zone="${zone}">
    <div class="box-head" data-fold="${fk}" title="${folded ? "Show" : "Hide"} tokens"><span class="box-grip" style="visibility:hidden"></span>
      <i class="ms ms-token"></i><h3>Tokens</h3><span class="box-right"><button class="pill-btn" data-tokfind="${zone}" title="Find the tokens your deck's cards make">Find for my deck</button><span class="box-count">${sumQ(toks)}</span><span class="box-fold" aria-hidden="true">${I.down}</span></span></div>
    <div class="grid">${tiles}<button class="add-tile" data-addtoken="${zone}"><span class="card-plus-ico">+</span>Add tokens</button></div></div>`;
}
/* Adding always makes a new token card, so each can get its own art; use its count for copies. */
function addToken(card, zone, keep){
  const d = cur(); if (!d || guard(d)) return null;
  d.tokens = d.tokens || [];
  const k = {uid: uid(), card: keep ? JSON.parse(JSON.stringify(card)) : plainPrint(card), qty: 1, zone: zone || A.side || "deck"};
  d.tokens.push(k); revealAfterAdd = k.uid;
  touch(d); renderBoard(); renderStats();
  return true;
}
function moveToken(u){
  const d = cur(); if (guard(d)) return;
  const k = (d.tokens || []).find(x => x.uid === u); if (!k) return;
  animateBoard(() => { k.zone = tokZone(k) === "deck" ? "options" : "deck"; touch(d); renderBoard(); renderStats(); });
  toast(`${k.card.name} moved to the ${k.zone === "deck" ? "deck" : "card pool"}`);
}
function removeToken(u){
  const d = cur(); if (guard(d)) return;
  const k = (d.tokens || []).find(x => x.uid === u); if (!k) return;
  confirmTwice([{title: `Remove ${esc(k.card.name)}?`, text: "The token leaves this deck’s token list.", yes: "Remove token"}], () => {
    d.tokens = d.tokens.filter(x => x !== k); touch(d); renderBoard(); renderStats(); toast(`${k.card.name} removed`);
  });
}
/* Tokens your deck's cards make, from Scryfall's related cards. */
const tokenCache = {};
async function deckTokens(d){
  const ids = [...new Set([...cmdrs(d), ...d.cards.filter(c => c.zone === "deck").map(c => c.card)].map(c => c.id).filter(Boolean))];
  const key = ids.sort().join(",");
  if (tokenCache[key]) return tokenCache[key];
  const tokIds = new Set(), makers = {};
  for (let i = 0; i < ids.length; i += 75){
    const j = await sf("/cards/collection", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({identifiers: ids.slice(i, i + 75).map(id => ({id}))})});
    for (const c of (j && j.data) || []) for (const part of c.all_parts || []) if (part.component === "token"){ tokIds.add(part.id); (makers[part.id] = makers[part.id] || []).push(c.name); }
  }
  const out = [], list = [...tokIds];
  for (let i = 0; i < list.length; i += 75){
    const j = await sf("/cards/collection", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({identifiers: list.slice(i, i + 75).map(id => ({id}))})});
    for (const c of (j && j.data) || []) out.push({card: toCard(c), pairs: [...new Set(makers[c.id] || [])]});
  }
  const seen = new Set();
  const merged = [];
  for (const r of out){ const g = merged.find(m => sameToken(m.card, r.card)); if (g){ g.pairs = [...new Set([...g.pairs, ...r.pairs])]; g.arts = (g.arts || 1) + 1; } else merged.push({...r, arts: 1}); }
  tokenCache[key] = merged.sort((a, b) => a.card.name.localeCompare(b.card.name));
  return tokenCache[key];
}
let CAST = null;
function renderBoard(){
  const d = cur(); if (!d || !d.commander) return;
  CAST = castCtx(d);      // shared mana counts for the "often late" marks
  $("#optBoxes").innerHTML = (d.typeOrder.map(t => boxHTML(d, "options", t)).join("") || `<div class="empty-note">No cards match the filter.</div>`) + tokenBoxHTML(d, "options");
  $("#deckBoxes").innerHTML = (d.typeOrder.map(t => boxHTML(d, "deck", t)).join("") || `<div class="empty-note">No cards match the filter.</div>`) + tokenBoxHTML(d, "deck");
  const pool = d.cards.filter(c => c.zone === "options"), deck = d.cards.filter(c => c.zone === "deck");
  const pv = sumPrice(cardsQ(pool)), dv = sumPrice([...cmdrs(d), ...cardsQ(deck)]);   // deck value includes the commander, same as the commander panel
  const pc = list => sumQ(list.filter(c => isPricey(c.card))), po = pc(pool), pd = pc(deck);
  const sym = UI.cur === "usd" ? "$" : "€";
  $("#optMeta").innerHTML = `${sumQ(pool)} cards · ${fmtMoney(pv.tot, pv.sym)}${po ? ` · <span class="ph-pricey" title="${po} cards at ${sym}${priceyTh(d)} or more">💎 ${po}</span>` : ""}`;
  $("#deckMeta").innerHTML = `${sumQ(deck)} cards · ${fmtMoney(dv.tot, dv.sym)}${pd ? ` · <span class="ph-pricey" title="${pd} cards at ${sym}${priceyTh(d)} or more">💎 ${pd}</span>` : ""}`;
  renderJump();
  renderTools(d);
}
