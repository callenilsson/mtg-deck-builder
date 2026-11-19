"use strict";
/* Test hand rules and the 1,000-game simulation (no drawing to the screen). */
const H = {lib: [], hand: [], bf: [], gy: [], turn: 0, mull: 0, bottom: 0, landPlayed: false, used: 0, drew: null, free: false, cmdTurn: null};
function shuffle(a){ for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const isLandC = c => /\bLand\b/.test(String(c.card.type).split("//")[0]);
const isPermC = c => !/\b(Instant|Sorcery)\b/.test(String(c.card.type).split("//")[0]);
function makesMana(c){ const d = cur(); return !isLandC(c) && isPermC(c) && (sourceColors(c.card, deckCI(d)).length > 0 || /\{t\}[^.\n]*:\s*add/i.test(c.card.text || "")); }
function manaNow(){ return H.bf.filter(x => isLandC(x.c) || (makesMana(x.c) && x.since < H.turn)).length; }
function newHand(keepMull){
  const d = cur(); if (!d) return;
  const lib = [];
  for (const c of d.cards.filter(c => c.zone === "deck")) for (let i = 0; i < qOf(c); i++) lib.push(c);
  Object.assign(H, {lib: shuffle(lib), bf: [], gy: [], turn: 1, landPlayed: false, used: 0, drew: null, cmdTurn: null});
  H.hand = H.lib.splice(0, 7);
  if (!keepMull) H.mull = 0;
  H.bottom = Math.max(0, H.mull - 1);       // the first mulligan is free in Commander
  renderHand();
}
/* Play many quick games automatically with the same simple rules: a land each turn, mana makers first, the commander as soon as possible. */
function simulate(games = 1000){
  const d = cur(), lib0 = [];
  for (const c of d.cards.filter(c => c.zone === "deck")) for (let i = 0; i < qOf(c); i++) lib0.push(c);
  const cm = d.commander, cmc = cm ? Math.max(1, Math.round(cm.cmc || 0)) : 0, T = 10;
  const isMk = new Map(lib0.map(c => [c, makesMana(c)]));
  let keep = 0, cmdBy = 0, cmdSum = 0, cmdN = 0, m4 = 0, m6 = 0, stuck = 0;
  for (let g = 0; g < games; g++){
    const lib = shuffle(lib0.slice());
    let hand = lib.splice(0, 7);
    const ln = hand.filter(isLandC).length;
    if (ln >= 2 && ln <= 4) keep++;
    else { const lib2 = shuffle(lib0.slice()); hand = lib2.splice(0, 7); lib.length = 0; lib.push(...lib2); }   // one free mulligan
    let lands = 0, rocks = 0, newRocks = 0, cast = 0;
    for (let tu = 1; tu <= T; tu++){
      if (tu > 1 && lib.length) hand.push(lib.shift());
      rocks += newRocks; newRocks = 0;
      const li = hand.findIndex(isLandC); if (li >= 0){ hand.splice(li, 1); lands++; }
      let mana = lands + rocks;
      if (tu === 4) m4 += mana; if (tu === 6) m6 += mana;
      if (tu === 3 && lands < 3) stuck++;
      if (cm && !cast && mana >= cmc){ cast = tu; mana -= cmc; }
      // mana makers, cheapest first
      hand.sort((a, b) => (a.card.cmc || 0) - (b.card.cmc || 0));
      for (let i = 0; i < hand.length; i++){ const c = hand[i], k = Math.round(c.card.cmc || 0); if (isMk.get(c) && k <= mana){ mana -= k; newRocks++; hand.splice(i--, 1); } }
      if (cm && !cast && mana >= cmc){ cast = tu; mana -= cmc; }
    }
    if (cast){ cmdSum += cast; cmdN++; if (cast <= cmc) cmdBy++; }
  }
  return {games, keep: keep / games, cmdBy: cmdBy / games, cmdAvg: cmdN ? cmdSum / cmdN : null, cmdNever: 1 - cmdN / games, m4: m4 / games, m6: m6 / games, stuck: stuck / games, cmc, cm};
}
function simHTML(r){
  const pc = v => Math.round(v * 100) + "%";
  return `<div class="sim"><div class="sim-h"><b>${r.games.toLocaleString()} games</b> played automatically ${infoBtn("sim")}<button class="icon-btn sm" id="hSimX" title="Hide">${I.close}</button></div>
    <div class="sim-grid">
      ${r.cm ? `<div><b class="${r.cmdBy >= .5 ? "good" : "bad"}">${pc(r.cmdBy)}</b><span>commander on turn ${r.cmc}${r.cmdAvg ? ` · average turn ${r.cmdAvg.toFixed(1)}` : ""}</span></div>` : ""}
      <div><b>${r.m4.toFixed(1)}</b><span>mana on turn 4</span></div>
      <div><b>${r.m6.toFixed(1)}</b><span>mana on turn 6</span></div>
      <div><b class="${r.keep >= .75 ? "good" : "bad"}">${pc(r.keep)}</b><span>keepable 7 (2–4 lands)</span></div>
      <div><b class="${r.stuck <= .25 ? "good" : "bad"}">${pc(r.stuck)}</b><span>missed a land drop by turn 3</span></div>
    </div></div>`;
}
