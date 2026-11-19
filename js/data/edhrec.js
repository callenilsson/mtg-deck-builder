"use strict";
/* ---------------- Commanders (one, or two partners) ---------------- */
function cmdrs(d){ return [d.commander, d.partner].filter(Boolean); }
function deckCI(d){ const s = new Set(); cmdrs(d).forEach(c => (c.ci || []).forEach(x => s.add(x))); return COLORS.filter(x => s.has(x)); }
function cmdKey(d){ return cmdrs(d).map(c => c.name).join(" + "); }
function partnerQuery(cmd){
  if (!cmd) return null;
  const t = cmd.text || "", ty = cmd.type || "";
  const m = t.match(/Partner with ([^\n(]+?)\s*(?:\(|\n|$)/);
  if (m) return `!"${m[1].trim()}"`;
  if (/Choose a Background/i.test(t)) return `t:background`;
  if (/\bBackground\b/.test(ty)) return `is:commander o:"choose a background"`;
  if (/Friends forever/i.test(t)) return `is:commander o:"friends forever"`;
  if (/Doctor's companion/i.test(t)) return `is:commander t:"time lord" t:doctor`;
  if (/Time Lord Doctor/.test(ty)) return `is:commander o:"doctor's companion"`;
  if (/\bPartner\b/.test(t)) return `is:commander keyword:partner -o:"partner with"`;
  return null;
}

/* ---------------- EDHREC ---------------- */
const edhCache = {}, recCache = {};
function edh(path){
  if (!edhCache[path]) edhCache[path] = fetch(`https://json.edhrec.com/pages/${path}.json`)
    .then(r => r.ok ? r.json() : null).catch(() => { delete edhCache[path]; return null; });
  return edhCache[path];
}
function edhLists(json){ return (json && json.container && json.container.json_dict && json.container.json_dict.cardlists) || []; }
/* Partners have their own EDHREC page (names sorted alphabetically); fall back to the main commander. */
async function cmdPage(d){
  const single = `commanders/${slugify(d.commander.name)}`;
  const paths = d.partner ? [`commanders/${[slugify(d.commander.name), slugify(d.partner.name)].sort().join("-")}`, single] : [single];
  for (const p of paths){ const j = await edh(p); if (j) return {j, path: p, pair: p !== single}; }
  return {j: null, path: single, pair: false};
}
/* Inclusion % and synergy for every card on the commander's EDHREC page */
const edhStatCache = {};
function edhStats(d){
  if (!d || !d.commander) return null;
  const k = cmdKey(d);
  if (!(k in edhStatCache)){
    edhStatCache[k] = null;
    cmdPage(d).then(({j}) => {
      const m = new Map();
      for (const list of edhLists(j)) for (const cv of list.cardviews || []){
        const v = {incl: cv.potential_decks ? cv.num_decks / cv.potential_decks : 0, syn: cv.synergy ?? null};
        if (!m.has(cv.name)) m.set(cv.name, v);
        const front = cv.name.split(" // ")[0]; if (!m.has(front)) m.set(front, v);
      }
      edhStatCache[k] = m;
      if (cur() && cmdKey(cur()) === k){ renderBoard(); }
    });
  }
  return edhStatCache[k];
}
function statFor(m, name){ return m && (m.get(name) || m.get(String(name).split(" // ")[0])) || null; }
function recommend(d, bucket){
  const focus = d.cards.filter(c => c.focus).map(c => c.card.name);
  const key = [cmdKey(d), bucket, ...focus].join("|");
  if (!recCache[key]) recCache[key] = buildRecs(d, bucket, focus).catch(e => { delete recCache[key]; throw e; });
  return recCache[key];
}
async function buildRecs(d, bucket, focus){
  const page = await cmdPage(d);
  if (!page.j) throw new Error(`EDHREC has no page for ${cmdKey(d)} yet. You can still search for cards above.`);
  const sources = [{kind:"cmd", name: cmdKey(d), json: page.j}];
  const fj = await Promise.all(focus.map(n => edh(`cards/${slugify(n)}`)));
  focus.forEach((n, i) => sources.push({kind:"card", name: n, json: fj[i]}));
  const tags = EDH_TAGS[bucket];
  const skip = new Set(cmdrs(d).map(c => c.name));
  const map = new Map();
  for (const src of sources){
    if (!src.json) continue;
    const seen = new Set();
    for (const list of edhLists(src.json)){
      if (!tags.includes(list.tag)) continue;
      for (const cv of list.cardviews || []){
        if (seen.has(cv.name) || skip.has(cv.name)) continue; seen.add(cv.name);
        let e = map.get(cv.name);
        if (!e){ e = {name: cv.name, id: cv.id, score: 0, incl: null, syn: null, pairs: [], lists: []}; map.set(cv.name, e); }
        if (src.kind === "cmd" && !e.lists.includes(list.tag)) e.lists.push(list.tag);
        const incl = cv.potential_decks ? cv.num_decks / cv.potential_decks : 0;
        if (src.kind === "cmd"){ e.incl = incl; e.syn = cv.synergy ?? null; e.score += incl + Math.max(0, cv.synergy || 0) * 1.2 + 0.25; }
        else { e.pairs.push(src.name); e.score += 0.35 + incl * 0.6; }
      }
    }
  }
  const ranked = [...map.values()].sort((a, b) => b.score - a.score).slice(0, 140);
  const cards = await sfCollection(ranked.map(e => e.id));
  const byId = new Map(cards.map(c => [c.id, c]));
  const ci = new Set(deckCI(d));
  return ranked.map(e => ({...e, card: byId.get(e.id)}))
    .filter(e => e.card && e.card.ci.every(x => ci.has(x)) && (bucket === "Any" || bucketOf(e.card.type) === bucket));
}
