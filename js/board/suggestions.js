"use strict";
/* EDHREC suggestions per type box, and splitting basic lands by color. */
/* ---------------- EDHREC type suggestions ----------------
   1. Find the EDHREC theme for this commander whose card lists best match your cards.
   2. Use that theme's average type counts (or the commander's overall average), with basics vs other lands.
   3. Adjust lands for your mana curve versus the typical deck's curve.
   4. Keep the total at 100 with your commander(s). */
const SUGG = {};
function suggestKey(d){
  const names = d.cards.filter(c => c.zone === "deck").map(c => c.card.name).sort();
  return cmdKey(d) + "|" + names.length + "|" + names.join(",").length + "|" + names.slice(0, 40).join(",");
}
function curveAvg(curve){
  let n = 0, sum = 0;
  for (const [k, v] of Object.entries(curve || {})){ n += v; sum += (+k) * v; }
  return n ? sum / n : null;
}
async function loadSuggestion(d, key){
  SUGG[key] = {loading: true};
  try {
    const {j: base, path} = await cmdPage(d);
    if (!base) throw new Error(`EDHREC has no data for ${cmdKey(d)} yet.`);
    const totalDecks = base.container?.json_dict?.card?.num_decks || base.num_decks_avg || 0;
    const tags = ((base.panels && base.panels.taglinks) || []).slice(0, 10);
    const ours = new Set(d.cards.map(c => c.card.name));
    let best = null;
    if (ours.size >= 6 && tags.length){
      const pages = await Promise.all(tags.map(t => edh(`${path}/${t.slug}`)));
      pages.forEach((pg, i) => {
        if (!pg) return;
        const seen = new Set(); let score = 0, hits = 0;
        for (const l of edhLists(pg)) for (const cv of l.cardviews || []){
          if (seen.has(cv.name) || !ours.has(cv.name)) continue;
          seen.add(cv.name); hits++; score += Math.max(0, cv.synergy || 0) + 0.03;
        }
        if (hits >= 3 && score >= 0.3 && (!best || score > best.score)) best = {tag: tags[i], page: pg, score, hits};
      });
    }
    const src = best ? best.page : base;
    const counts = {};
    for (const t of TYPES) counts[t] = Math.max(0, Math.round(src[t.toLowerCase()] ?? 0));
    let landNote = "";
    const spells = d.cards.filter(c => c.zone === "deck" && c.bucket !== "Land");
    const avgE = curveAvg(src.panels && src.panels.mana_curve) ?? curveAvg(base.panels && base.panels.mana_curve);
    if (avgE != null && spells.length >= 10){
      const avgO = spells.reduce((a, c) => a + (c.card.cmc || 0), 0) / spells.length;
      const adj = Math.max(-3, Math.min(3, Math.round((avgO - avgE) * 3)));
      if (adj){
        counts.Land += adj;
        landNote = ` ${adj > 0 ? "+" : ""}${adj} land${Math.abs(adj) > 1 ? "s" : ""} because your spells cost ${avgO.toFixed(1)} on average versus ${avgE.toFixed(1)} in those decks.`;
      }
    }
    let diff = (100 - cmdrs(d).length) - Object.values(counts).reduce((a, b) => a + b, 0);
    const nonland = TYPES.filter(t => t !== "Land");
    let guard = 200;
    while (diff !== 0 && guard--){
      const pool = nonland.filter(t => diff > 0 || counts[t] > 0).sort((a, b) => counts[b] - counts[a]);
      const t = pool[0] || "Land";
      counts[t] += Math.sign(diff); diff -= Math.sign(diff);
    }
    // basics vs other lands, scaled to the suggested land count
    const sb = src.basic ?? base.basic, sn = src.nonbasic ?? base.nonbasic;
    let basic = null, nonbasic = null;
    if (sb != null && sn != null && sb + sn > 0){ basic = Math.round(counts.Land * sb / (sb + sn)); nonbasic = counts.Land - basic; }
    const n = best ? best.tag.count : totalDecks;
    const who = d.partner ? cmdKey(d) : d.commander.name.split(",")[0];
    const short = best ? `From ${(+n || 0).toLocaleString()} “${best.tag.value}” decks` : `From ${(+n || 0).toLocaleString()} ${who} decks`;
    const why = best
      ? `Your deck matches EDHREC’s “${best.tag.value}” ${cmdKey(d)} decks best (${best.hits} of your cards are typical there). These are their average type counts.${landNote}`
      : `Average type counts across ${(+n || 0).toLocaleString()} ${cmdKey(d)} decks on EDHREC.${ours.size < 6 ? " Add a few more cards and the suggestion will match your deck’s theme." : ""}${landNote}`;
    SUGG[key] = {counts, basic, nonbasic, short: short + (landNote ? " · lands adjusted" : ""), why};
  } catch (err){
    SUGG[key] = {loading: true, error: err.message || "Couldn’t reach EDHREC."};
    setTimeout(() => { if (SUGG[key] && SUGG[key].error) delete SUGG[key]; }, 15000);
  }
  if (cur() === d) renderStats();
}
/* Split basics by how many colored mana symbols your deck's spells use. */
function basicSplit(d, n){
  const ci = deckCI(d); if (!ci.length) return [{name: "Wastes", count: n}];
  const w = Object.fromEntries(ci.map(x => [x, 0]));
  for (const c of d.cards) if (c.zone === "deck" && c.bucket !== "Land") for (const m of String(c.card.mana).matchAll(/\{([^}]+)\}/g)) for (const x of ci) if (m[1].includes(x)) w[x]++;
  let tot = Object.values(w).reduce((a, b) => a + b, 0);
  if (!tot){ ci.forEach(x => w[x] = 1); tot = ci.length; }
  const raw = ci.map(x => ({x, f: n * w[x] / tot}));
  const out = raw.map(r => ({x: r.x, count: Math.floor(r.f), rem: r.f % 1}));
  let left = n - out.reduce((a, b) => a + b.count, 0);
  out.sort((a, b) => b.rem - a.rem).forEach(o => { if (left > 0){ o.count++; left--; } });
  return out.filter(o => o.count > 0).map(o => ({name: BASIC_OF[o.x], count: o.count}));
}
async function addBasics(n){
  const d = cur(); if (guard(d)) return; const split = basicSplit(d, n);
  confirmTwice([{title: `Add ${n} basic land${n > 1 ? "s" : ""}?`, text: `This adds ${split.map(s => `<b>${s.count} ${esc(s.name)}</b>`).join(" and ")} to the deck, split by the colored mana your spells need. Each land is one card with a count; use “Another artwork” in its card view to mix arts.`, yes: "Add lands", safe: true}], async () => {
    try {
      const added = [];
      for (const s of split){
        let card = cardCache.get("basic:" + s.name);
        if (!card){ const j = await sf(`/cards/named?exact=${encodeURIComponent(s.name)}`); if (!j) continue; card = toCard(j); cardCache.set("basic:" + s.name, card); }
        const item = {uid: uid(), card: {...card}, bucket: "Land", zone: "deck", locked: false, focus: false, qty: s.count}; d.cards.push(item); added.push(item.uid);
      }
      animateBoard(() => { touch(d); renderAll(); }, {added});
      if (added[0]) setTimeout(() => revealCard(added[0]), 80);
      toast(`Added ${n} basic lands`);
    } catch { toast("Couldn’t load the basic lands. Check your connection."); }
  });
}
