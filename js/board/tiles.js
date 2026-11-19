"use strict";
/* Card tiles and type boxes (HTML). */
/* srcset: normal (488px) for small cards, large (672px) when shown big or on sharp screens */
function tilePx(){ return Math.round(parseFloat($("#board").style.getPropertyValue("--tile")) || 180); }
function srcsetAttr(c){
  if ((c.custom && IMG.get(c.custom.key)) || !c.img || !c.large || c.img === c.large) return "";
  return `srcset="${esc(c.img)} 488w, ${esc(c.large)} 672w" sizes="(max-width:820px) 46vw, ${tilePx()}px"`;
}
function lateHTML(c, d){
  if (c.zone !== "deck" || !CAST || !CAST.ready) return "";
  const ot = castOnTime(d, c.card, CAST); if (!ot || ot.p >= .5) return "";
  return `<div class="st-row late" title="Only ${Math.round(ot.p * 100)}% chance to have the mana, in its colors, to cast it by turn ${ot.turn}. See Color balance in the commander panel.">⚠ ${Math.round(ot.p * 100)}% on time</div>`;
}
function tileStatsHTML(c, d){
  const pricey = isPricey(c.card), late = lateHTML(c, d);
  const m = edhStats(d), price = `<span class="price${pricey ? " pricey" : ""}" title="Cheapest printing (${UI.cur === "usd" ? "TCGplayer" : "Cardmarket"})${pricey ? " · expensive" : ""}">${priceText(c.card)}</span>`;
  if (!m) return `<div class="ct-stats"><div class="st-row faint">EDHREC…</div><div class="st-row">${price}</div>${late}</div>`;
  const s = statFor(m, c.card.name);
  if (!s) return `<div class="ct-stats"><div class="st-row faint" title="Not on ${esc(cmdKey(d))}'s EDHREC page">Not on EDHREC</div><div class="st-row">${price}</div>${late}</div>`;
  const pct = Math.round(s.incl * 100), syn = s.syn != null ? Math.round(s.syn * 100) : null;
  const tip = `In ${pct}% of ${cmdKey(d)} decks on EDHREC${syn != null ? `. Synergy ${syn >= 0 ? "+" : ""}${syn}%: how much more often it's played with this commander than in other decks that could play it` : ""}`;
  return `<div class="ct-stats" title="${esc(tip)}">
    <div class="st-row"><b>${pct}%</b><span class="lg">of decks</span><span class="sh">decks</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="st-row">${syn != null ? `<b class="syn ${syn > 0 ? "pos" : syn < 0 ? "neg" : ""}">${syn > 0 ? "+" : ""}${syn}%</b><span class="lg">synergy</span><span class="sh">syn</span>` : ""}${price}</div>${late}</div>`;
}
function qtyHTML(c){
  return `<div class="qty" title="${qOf(c)} of this artwork"><button data-act="dec" title="One fewer" aria-label="One fewer">−</button><b>${qOf(c)}</b><button data-act="inc" title="One more" aria-label="One more">+</button></div>`;
}
function tileHTML(c, over, d){
  const inDeck = c.zone === "deck";
  const lock = inDeck ? `<button data-act="lock" class="${c.locked ? "on" : ""}" title="${c.locked ? "Unlock" : "Lock as a final pick"}">${c.locked ? I.lock : I.unlock}</button>` : "";
  return `<div class="cw${c.uid === LANDING ? " landing" : ""}${over ? " over" : ""}${c.locked ? " locked" : ""}${isPricey(c.card) ? " pricey" : ""}" data-uid="${c.uid}">
    <div class="ct" data-img="${esc(largeOf(c.card))}" title="${esc(c.card.name)}">
      <span class="ct-name">${esc(c.card.name)}</span>
      ${c.card.custom ? `<span class="custom-tag" title="Custom art or name">${I.brush}</span>` : ""}
      <img src="${esc(imgOf(c.card))}" ${srcsetAttr(c.card)} alt="${esc(c.card.name)}" loading="lazy" draggable="false" onerror="this.remove()">
      ${canMulti(c.card) ? qtyHTML(c) : ""}
      ${isPricey(c.card) ? `<span class="pricey-tag" title="Expensive: ${esc(priceText(c.card))}">💎 ${esc(priceText(c.card))}</span>` : ""}
      <div class="ct-badges">${c.locked ? `<i title="Locked">${I.lock}</i>` : ""}${c.focus ? `<i title="Building around this card">${I.focus}</i>` : ""}</div>
    </div>
    ${tileStatsHTML(c, d)}
    <div class="acts">
      <button data-act="edit" title="Edit: art, name and versions">${I.brush}</button>
      <button data-act="focus" class="${c.focus ? "on" : ""}" title="${c.focus ? "Building around this card: click to stop" : "Build around this card: Add cards also suggests cards that work with it"}">${I.focus}</button>
      ${lock || `<span class="act-slot" aria-hidden="true"></span>`}
      <button class="del" data-act="remove" title="Delete card" ${c.locked ? "disabled" : ""}>${I.trash}</button>
    </div></div>`;
}
function boxHTML(d, zone, t){
  const all = zoneItems(d, zone, t);
  const lim = d.limits[t] ?? 0;
  const overSet = new Set();
  if (zone === "deck"){ let run = 0; for (const c of all){ run += qOf(c); if (run > lim) overSet.add(c.uid); } }
  const filtering = !!(UI.filter.trim() || UI.ctype || UI.role);
  const shown = filtering ? all.filter(matchesFilter) : all;
  if (filtering && !shown.length) return "";
  const lk = sumQ(all.filter(c => c.locked)), total = sumQ(all), shownN = sumQ(shown);
  let count;
  if (zone === "deck"){
    const cls = total > lim ? "over" : (total === lim && lim > 0 ? "met" : "");
    count = `<span class="box-count ${cls}">${filtering ? `${shownN} shown · ` : ""}${total} of ${lim}</span>`;
  } else count = `<span class="box-count">${filtering ? `${shownN} of ` : ""}${total}</span>`;
  let tiles = "", seenUnlocked = false;
  for (const c of shown){
    if (lk && !c.locked && !seenUnlocked){ seenUnlocked = true; if (shown.some(k => k.locked)) tiles += `<div class="lock-sep" aria-hidden="true"></div>`; }
    tiles += tileHTML(c, overSet.has(c.uid), d);
  }
  const folded = !!(UI.collapsed || {})[zone + ":" + t];
  return `<div class="box${folded ? " collapsed" : ""}" data-type="${t}" data-zone="${zone}">
    <div class="box-head" data-fold="${zone}:${t}" title="${folded ? "Show" : "Hide"} ${PLURAL[t].toLowerCase()}"><button class="box-grip" title="Drag to reorder types" aria-label="Reorder ${t}">${I.grip}</button>
      <i class="ms ${MS[t]}"></i><h3>${PLURAL[t]}</h3><span class="box-right">${lk ? `<span class="box-lk" title="${lk} locked">${I.lock}${lk}</span>` : ""}${count}<span class="box-fold" aria-hidden="true">${I.down}</span></span></div>
    <div class="grid">${tiles}<button class="add-tile" data-add="${t}" data-side="${zone}"><span class="card-plus-ico">+</span>Add ${PLURAL[t].toLowerCase()}</button></div></div>`;
}
