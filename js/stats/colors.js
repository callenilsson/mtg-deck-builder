"use strict";
/* Color balance: mana sources per color and the chance to cast each card on time. */
function landColors(card, ci){
  const nm = card.name, tx = String(card.text || "").toLowerCase(), out = new Set();
  const BASIC = {Plains: "W", Island: "U", Swamp: "B", Mountain: "R", Forest: "G"};
  for (const [b, c] of Object.entries(BASIC)) if (nm === b || nm === "Snow-Covered " + b || new RegExp(`\\b${b}\\b`).test(String(card.type))) out.add(c);
  for (const m of tx.matchAll(/add ([^.\n]*)/g)) for (const c of ["w","u","b","r","g"]) if (m[1].includes(`{${c}}`)) out.add(c.toUpperCase());
  if (/mana of any (color|type)|any color|search your library for a basic land/.test(tx)) ci.forEach(c => out.add(c));
  return [...out].filter(c => ci.includes(c));
}
/* Mana sources per color: lands, mana rocks and mana creatures that make it (Treasure makers count for any color). */
function sourceColors(card, ci){
  const isLand = /\bLand\b/.test(String(card.type).split("//")[0]);
  if (isLand) return landColors(card, ci);
  if (!rolesOf(card).includes("ramp")) return [];
  const tx = String(card.text || "").toLowerCase(), out = new Set();
  if (/mana of any (color|type)|any color|treasure/.test(tx)) ci.forEach(c => out.add(c));
  for (const m of tx.matchAll(/add ([^.\n]*)/g)) for (const c of ["w","u","b","r","g"]) if (m[1].includes(`{${c}}`)) out.add(c.toUpperCase());
  return [...out].filter(c => ci.includes(c));
}
/* Castability: for every spell, the chance to have enough sources of its color by the turn matching its mana value
   (on the play, no mulligan: 7 cards + 1 per turn after the first, from a 99-card deck). Goal: 90%. */
/* Chance to cast one card by the turn equal to its mana value: enough mana makers in total, and enough of each of its colors. */
function castCtx(d){
  const deck = d.cards.filter(c => c.zone === "deck"), ci = deckCI(d), src = {};
  ci.forEach(c => src[c] = 0);
  let makers = 0;
  for (const c of deck){ const cols = sourceColors(c.card, ci), q = qOf(c); if (c.bucket === "Land" || cols.length) makers += q; cols.forEach(x => src[x] += q); }
  const lands = deck.filter(c => c.bucket === "Land").reduce((a, c) => a + qOf(c), 0);
  return {N: deckN(d), src, makers, ready: !(d.limits.Land) || lands >= d.limits.Land - 2};
}
function castOnTime(d, card, ctx = castCtx(d)){
  if (!card || /\bLand\b/.test(String(card.type).split("//")[0])) return null;
  const turn = Math.max(1, Math.round(card.cmc || 0)), seen = 7 + turn - 1;
  let p = atLeast(ctx.N, ctx.makers, seen, turn);
  const pips = {}; for (const m of String(card.mana || "").split(" // ")[0].matchAll(/\{([WUBRG])\}/g)) pips[m[1]] = (pips[m[1]] || 0) + 1;
  for (const [col, k] of Object.entries(pips)) p *= atLeast(ctx.N, ctx.src[col] || 0, seen, k);
  return {p, turn};
}
let CB_ALL = false;
function colorBalanceHTML(d, deck){
  const ci = deckCI(d); if (!ci.length) return "";
  const N = Math.max(60, 100 - cmdrs(d).length), GOAL = .9;
  const src = {}, srcLand = {}; ci.forEach(c => { src[c] = 0; srcLand[c] = 0; });
  for (const c of deck){ const cols = sourceColors(c.card, ci), land = /\bLand\b/.test(String(c.card.type).split("//")[0]); cols.forEach(x => { src[x] += qOf(c); if (land) srcLand[x] += qOf(c); }); }
  const per = {}; ci.forEach(c => per[c] = []);
  for (const c of deck){
    if (/\bLand\b/.test(String(c.card.type).split("//")[0])) continue;
    const cost = String(c.card.mana || "").split(" // ")[0], pips = {};
    for (const m of cost.matchAll(/\{([WUBRG])\}/g)) pips[m[1]] = (pips[m[1]] || 0) + 1;
    const turn = Math.max(1, Math.round(c.card.cmc || 0)), seen = 7 + turn - 1;
    for (const [col, k] of Object.entries(pips)) if (per[col]) per[col].push({name: c.card.name, cost, k, turn, p: atLeast(N, src[col], seen, k)});
  }
  const pct = p => Math.round(p * 100) + "%";
  const needFor = it => { for (let K = src[it.col] || 0; K <= 60; K++) if (atLeast(N, K, 7 + it.turn - 1, it.k) >= GOAL) return K; return null; };
  let worst = null;
  const rows = [...ci].filter(c => per[c].length).sort((a, b) => Math.min(...per[a].map(x => x.p)) - Math.min(...per[b].map(x => x.p))).map(c => {
    const list = per[c].sort((a, b) => a.p - b.p), ok = list.filter(x => x.p >= GOAL).length, hard = list[0];
    hard.col = c; const need = hard.p < GOAL ? needFor(hard) : null, more = need != null ? need - src[c] : 0;
    if (hard.p < GOAL && (!worst || hard.p < worst.p)) worst = {...hard, more};
    const share = ok / list.length * 100, stuck = list.length - ok;
    return `<div class="cb3 ${stuck ? "short" : ""}" title="${list.slice(0, 8).map(x => `${x.name}: ${pct(x.p)} by turn ${x.turn}`).join("\n")}${list.length > 8 ? "\n…" : ""}">
      <span class="cb3-name"><i class="ms ms-${c.toLowerCase()} ms-cost"></i>${COLOR_NAME[c][0].toUpperCase() + COLOR_NAME[c].slice(1)} <small class="cb3-src">${src[c]} source${src[c] === 1 ? "" : "s"}${src[c] !== srcLand[c] ? ` (${srcLand[c]} lands)` : ""}</small></span>
      <span class="cb3-v ${stuck ? "bad" : "good"}">${stuck ? `⚠ ${stuck} often late` : "✓ all on time"}</span>
      <span class="cb3-l">On time</span><span class="cb3-bar"><i class="mc-${c}" style="width:${share.toFixed(1)}%"></i></span><span class="cb3-n"><b>${ok}</b> of ${list.length} cards</span>
      <span class="cb3-hard">Hardest: <b>${esc(hard.name)}</b> <span class="mana">${manaHTML(hard.cost)}</span> by turn ${hard.turn}: <b class="${hard.p >= GOAL ? "good" : "bad"}">${pct(hard.p)}</b>${more > 0 && more <= 8 ? ` · ${more} more source${more > 1 ? "s" : ""} would fix it` : ""}</span></div>`;
  }).join("");
  const short = (d.limits.Land || 0) && deck.filter(c => c.bucket === "Land").reduce((a, c) => a + qOf(c), 0) < (d.limits.Land || 0) - 2;
  const hint = short ? "" : worst ? `<p class="cb2-hint">⚠ ${esc(worst.name)} is castable on time only ${pct(worst.p)} of games. ${worst.more > 0 && worst.more <= 8 ? `About <b>${worst.more} more ${COLOR_NAME[worst.col]} source${worst.more > 1 ? "s" : ""}</b> (e.g. ${BASIC_OF[worst.col]}s) would fix that.` : "That's hard to fix with lands alone: consider a card with fewer colored symbols."}</p>`
    : `<p class="cb2-hint ok">✓ You can cast your spells on time in at least 9 of 10 games.</p>`;
  const landsNow = deck.filter(c => c.bucket === "Land").reduce((a, c) => a + qOf(c), 0), landsGoal = d.limits.Land || 0;
  const early = landsGoal && landsNow < landsGoal - 2
    ? `<p class="cb3-note">Your deck has <b>${landsNow} of ${landsGoal} lands</b> so far, so these chances are low for now. They go up as you add lands.</p>` : "";
  const ctx = castCtx(d), all = deck.map(c => ({c, ot: castOnTime(d, c.card, ctx)})).filter(x => x.ot).sort((a, b) => a.ot.p - b.ot.p);
  const list = CB_ALL ? `<div class="cb-all">${all.map(x => `<button class="cb-item" data-open="${x.c.uid}" title="Open ${esc(x.c.card.name)}"><span class="cb-nm">${esc(x.c.card.name)}</span><span class="mana">${manaHTML(String(x.c.card.mana || "").split(" // ")[0])}</span><span class="cb-t">turn ${x.ot.turn}</span><b class="${x.ot.p >= .8 ? "good" : x.ot.p < .5 ? "bad" : ""}">${Math.round(x.ot.p * 100)}%</b></button>`).join("")}</div>` : "";
  return `<div class="viz"><div class="viz-h"><span class="eyebrow">Color balance ${infoBtn("balance")}</span><small>chance to cast on time</small></div>
    <p class="cb3-q">Can you cast your spells on time, with the colors your mana makes?</p>
    ${early}${rows}${hint}
    <button class="cb-toggle" id="cbAll">${CB_ALL ? "Hide the card list" : `Show every card (${all.length})`}</button>${list}</div>`;
}
