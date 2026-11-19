"use strict";
/* ---- Creature types: only shown when the deck is clearly about a type ---- */
function typesHTML(deck){
  const cnt = new Map(); let ch = 0;
  for (const c of deck){
    if (!/Creature/.test(String(c.card.type).split("//")[0])) continue;
    if (/\bchangeling\b/i.test(c.card.text || "")){ ch += qOf(c); continue; }
    for (const s of subtypes(c.card)) cnt.set(s, (cnt.get(s) || 0) + qOf(c));
  }
  const top = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
  if (!top.length || top[0][1] + ch < 8) return "";
  const show = top.slice(0, 3), max = show[0][1] + ch, more = top.length - show.length;
  return `<div class="viz"><div class="viz-h"><span class="eyebrow">Creature types ${infoBtn("ctypes")}</span>${ch ? `<small title="Changelings are every creature type, so they count for each">✦ incl. ${ch} changeling${ch > 1 ? "s" : ""}</small>` : ""}</div>
    ${infoText("ctypes")}${show.map(([s, n]) => `<button class="vrow ctype ${UI.ctype === s ? "on" : ""}" data-ctype="${esc(s)}" title="${n + ch} ${esc(s)}${ch ? ` (with ${ch} changeling${ch > 1 ? "s" : ""})` : ""}. Click to show only these.">
      <span class="vl">${esc(s)}</span><span class="vbar"><i style="width:${(n + ch) / max * 100}%"></i></span><span class="vn"><b>${n + ch}</b></span></button>`).join("")}
    ${more ? `<small class="viz-more">+ ${more} more type${more > 1 ? "s" : ""}</small>` : ""}</div>`;
}
function renderStats(){
  const d = cur(); if (!d || !d.commander){ $("#stats").innerHTML = ""; return; }
  const deck = d.cards.filter(c => c.zone === "deck");
  const key = suggestKey(d), sg = SUGG[key] && !SUGG[key].loading ? SUGG[key] : null;
  if (!SUGG[key]) loadSuggestion(d, key);
  const err = SUGG[key] && SUGG[key].error;
  const edhCell = (want, lim) => {
    if (want == null && sg) return `<td class="edh">–</td>`;
    if (want == null) return `<td class="edh" title="${err ? esc(err) : "Loading EDHREC…"}">${err ? "–" : "…"}</td>`;
    const delta = lim == null ? null : want - lim;
    return `<td class="edh"><b>${want}</b>${delta == null ? "" : `<i class="delta ${delta > 0 ? "up" : delta < 0 ? "down" : ""}">${delta ? (delta > 0 ? "+" : "−") + Math.abs(delta) : ""}</i>`}</td>`;
  };
  const rows = d.typeOrder.map(t => {
    const items = deck.filter(c => c.bucket === t), k = sumQ(items), lk = sumQ(items.filter(c => c.locked)), lim = d.limits[t] ?? 0;
    const cls = k > lim ? "over" : (k === lim && lim > 0 ? "met" : "");
    let r = `<tr class="${cls}" title="${PLURAL[t]}: ${k} in deck, ${lk} locked, your limit is ${lim}${sg ? `, EDHREC suggests ${sg.counts[t]}` : ""}"><td class="ic"><i class="ms ${MS[t]}"></i></td><td class="sname">${PLURAL[t]}</td><td class="num dn">${k}</td><td class="num lk">${lk || ""}</td>
      <td><input type="number" min="0" max="99" inputmode="numeric" value="${lim}" data-lim="${t}" aria-label="${t} limit"></td>${edhCell(sg ? sg.counts[t] : null, lim)}</tr>`;
    if (t === "Land"){
      const basics = sumQ(items.filter(c => c.card.basic));
      r += `<tr class="sub"><td></td><td class="sname">Basic</td><td class="num">${basics}</td><td></td><td></td>${edhCell(sg ? sg.basic : null, null)}</tr>
        <tr class="sub"><td></td><td class="sname">Other lands</td><td class="num">${k - basics}</td><td></td><td></td>${edhCell(sg ? sg.nonbasic : null, null)}</tr>`;
    }
    return r;
  }).join("");
  const cnt = {W:0,U:0,B:0,R:0,G:0,C:0};
  for (const c of deck){ const n = qOf(c); if (!c.card.ci.length) cnt.C += n; else c.card.ci.forEach(x => cnt[x] = (cnt[x] || 0) + n); }
  const ci = deckCI(d);
  const show = [...COLORS.filter(x => ci.includes(x) || cnt[x]), "C"];
  const colors = show.map(x => `<span title="${cnt[x]} cards with ${COLOR_NAME[x]} in their color identity"><i class="ms ms-${x.toLowerCase()} ms-cost"></i>${cnt[x]}</span>`).join("");
  const sum = Object.values(d.limits).reduce((a, b) => a + (+b || 0), 0) + cmdrs(d).length;
  const sumTxt = sum === 100 ? "Limits = 100 ✓" : `Limits = ${sum} (${sum > 100 ? `${sum - 100} over` : `${100 - sum} short`})`;
  const same = sg && d.typeOrder.every(t => (sg.counts[t] ?? 0) === (d.limits[t] ?? 0));
  const basicsHave = sumQ(deck.filter(c => c.card.basic));
  const needBasics = sg && sg.basic ? Math.max(0, Math.min(sg.basic, (d.limits.Land ?? 0) - sumQ(deck.filter(c => c.bucket === "Land" && !c.card.basic))) - basicsHave) : 0;
  const nTok = sumQ((d.tokens || []).filter(k => tokZone(k) === "deck"));
  if (!GC) loadGameChangers();
  const spellsQ = deck.filter(c => c.bucket !== "Land").reduce((a, c) => a + qOf(c), 0);
  const avgMV = spellsQ ? deck.filter(c => c.bucket !== "Land").reduce((a, c) => a + (c.card.cmc || 0) * qOf(c), 0) / spellsQ : 0;
  const tokRow = `<tr class="tokrow" title="Tokens in the deck: not part of the 100"><td class="ic"><i class="ms ms-token"></i></td><td class="sname">Tokens</td><td class="num">${nTok}</td><td></td><td></td><td class="edh">–</td></tr>`;
  const gcBtn = GC ? (() => { const g = [...cmdrs(d), ...deck.map(c => c.card)].filter(isGC).map(c => c.name); return `<button class="gc ${g.length ? "has" : ""}" id="gcBtn" title="${g.length ? `Game Changers in this deck: ${esc(g.join(", "))}` : "No Game Changers in this deck"}. Game Changers are the official list of the strongest Commander cards. Even one moves a deck up a power bracket.">◆ Game Changers <b>${g.length}</b></button>`; })() : "";
  const limitBtns = (sum === 100 ? "" : `<span class="sumline bad">${sumTxt}</span>`)
    + (sg && !same ? `<button class="pill-btn" id="useSugg" title="Set your limits to EDHREC's numbers">Use EDHREC numbers</button>` : "")
    + (needBasics > 0 ? `<button class="pill-btn" id="addBasics" title="Add basic lands, split by the colors your spells need">+ ${needBasics} basic land${needBasics > 1 ? "s" : ""}</button>` : "");
  $("#stats").innerHTML = `<div class="viz first"><div class="viz-h"><span class="eyebrow">Card types ${infoBtn("types")}</span></div>${infoText("types", sg)}
    <table class="stbl"><thead><tr><th></th><th class="l sname">Type</th><th title="Cards in your deck">Deck</th><th title="Locked final picks">${I.lock.replace('class="i"', 'class="i" style="width:11px;height:11px"')}</th><th title="Your limit">Limit</th><th class="l" title="EDHREC's average for decks like yours${sg ? `. ${esc(sg.short)}${sg.why ? `. ${esc(sg.why)}` : ""}` : ""}">EDHREC</th></tr></thead><tbody>${rows}${tokRow}</tbody></table>
    ${limitBtns ? `<div class="stats-foot">${limitBtns}</div>` : ""}</div>
    <div class="viz"><div class="viz-h"><span class="eyebrow">Colors & power ${infoBtn("power")}</span></div>${infoText("power")}<div class="stats-foot"><div class="colors">${colors}</div>${gcBtn}</div></div>
    ${spellsQ ? curveHTML(deck, avgMV) : ""}
    ${deck.length ? openingHTML(d, deck) : ""}
    ${deck.length ? rolesHTML(deck) + colorBalanceHTML(d, deck) + typesHTML(deck) : ""}`;
}
