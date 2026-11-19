"use strict";
/* Opening hand odds, land drops, commander on time, roles by turn 3. */
function openingHTML(d, deck){
  const N = deckN(d), L = deck.filter(c => c.bucket === "Land").reduce((a, c) => a + qOf(c), 0);
  if (!L) return "";
  const dist = Array.from({length: 8}, (_, k) => exactly(N, L, 7, k));
  const keep = dist[2] + dist[3] + dist[4], max = Math.max(...dist);
  const drops = [1, 2, 3, 4, 5, 6].map(tu => atLeast(N, L, 7 + tu - 1, tu));
  let cmdLine = "";
  const cm = d.commander;
  if (cm){
    const ci = deckCI(d), m = Math.max(1, Math.round(cm.cmc || 0)), seen = 7 + m - 1;
    const makers = deck.filter(c => c.bucket === "Land" || sourceColors(c.card, ci).length || rolesOf(c.card).includes("ramp")).reduce((a, c) => a + qOf(c), 0);
    let p = atLeast(N, makers, seen, m);
    const pips = {}; for (const x of String(cm.mana || "").matchAll(/\{([WUBRG])\}/g)) pips[x[1]] = (pips[x[1]] || 0) + 1;
    for (const [col, k] of Object.entries(pips)){
      const s = deck.filter(c => sourceColors(c.card, ci).includes(col)).reduce((a, c) => a + qOf(c), 0);
      p *= atLeast(N, s, seen, k);
    }
    cmdLine = `<div class="op-cmd" title="Chance to have ${m} mana (lands, mana rocks, mana creatures) including ${Object.entries(pips).map(([c, k]) => k + " " + COLOR_NAME[c]).join(" and ")} by turn ${m}. Approximate: ramp cards need mana of their own.">
      <img src="${esc(imgOf(cm))}" alt=""><span>Cast <b>${esc(cm.name.split(",")[0])}</b> on turn ${m}</span><b class="${p >= .6 ? "good" : "bad"}">${Math.round(p * 100)}%</b></div>`;
  }
  return `<div class="viz"><div class="viz-h"><span class="eyebrow">Opening hand ${infoBtn("opening")}</span><small>${L} lands in ${N} cards</small></div>
    <div class="op-chart" title="Chance of each number of lands in your first 7 cards">${dist.map((p, k) => `<div class="op-col ${k >= 2 && k <= 4 ? "keep" : ""}"><span class="cv-n">${p >= .005 ? Math.round(p * 100) + "%" : ""}</span><i style="height:${(p / max * 100).toFixed(1)}%"></i><span class="cv-l">${k}</span></div>`).join("")}</div>
    <div class="op-sum"><span>lands in your first 7</span><span>Keepable (2–4 lands): <b class="${keep >= .75 ? "good" : "bad"}">${Math.round(keep * 100)}%</b></span></div>
    <div class="op-drops" title="Chance you have played a land every turn up to this turn">${drops.map((p, i) => `<span class="op-d ${p >= .8 ? "good" : p >= .6 ? "" : "bad"}"><small>Turn ${i + 1}</small><b>${Math.round(p * 100)}%</b></span>`).join("")}</div>
    <div class="op-drops-l">chance to make your land drop every turn</div>
    ${cmdLine}
    <button class="pill-btn op-btn" data-drawhand><svg class="i" viewBox="0 0 24 24"><rect x="3" y="6" width="9" height="13" rx="1.5" transform="rotate(-12 7.5 12.5)"/><rect x="9" y="4" width="9" height="13" rx="1.5"/><path d="M13.5 8.5v4M11.5 10.5h4"/></svg>Test a sample hand</button></div>`;
}
function rolesHTML(deck){
  const n = {}; ROLES.forEach(x => n[x.k] = 0);
  for (const c of deck) for (const k of rolesOf(c.card)) n[k] += qOf(c);
  return `<div class="viz"><div class="viz-h"><span class="eyebrow">Deck roles ${infoBtn("roles")}</span><small>estimated from card text</small></div>${infoText("roles")}
    ${ROLES.map(x => { const v = n[x.k], ok = v >= x.goal, w = Math.min(100, v / x.goal * 100), pT3 = atLeast(99, v, 9, 1);
      return `<button class="vrow role ${ok ? "ok" : ""} ${UI.role === x.k ? "on" : ""}" data-role="${x.k}" title="${esc(x.tip)}. Goal about ${x.goal}. Click to show only these cards.">
        <span class="vl">${x.label}</span><span class="vbar"><i style="width:${w}%"></i></span><span class="vn"><b>${v}</b>/${x.goal}</span><span class="vt" title="Chance to have at least one by turn 3">${Math.round(pT3 * 100)}%</span></button>`; }).join("")}
    <div class="vt-l">last column: chance to have one by turn 3</div></div>`;
}
