"use strict";
/* ---------------- Card data (Scryfall) ---------------- */
function toCard(sc){
  const f = sc.card_faces || [];
  const front = sc.image_uris || (f[0] && f[0].image_uris) || {};
  const back = (!sc.image_uris && f[1] && f[1].image_uris) ? f[1].image_uris : null;
  const text = sc.oracle_text != null ? sc.oracle_text
    : f.map(x => `${x.name} — ${x.type_line}\n${x.oracle_text || ""}${x.power != null ? `\n${x.power}/${x.toughness}` : ""}`).join("\n\n");
  const pr = sc.prices || {};
  if (sc.id) PRICES[sc.id] = {e: pr.eur != null ? +pr.eur : null, u: pr.usd != null ? +pr.usd : null, t: Date.now()};
  return {
    id: sc.id, name: sc.name, mana: sc.mana_cost != null ? sc.mana_cost : f.map(x => x.mana_cost).filter(Boolean).join(" // "),
    cmc: sc.cmc || 0, type: sc.type_line || (f[0] && f[0].type_line) || "", text,
    ci: sc.color_identity || [], colors: sc.colors || (f[0] && f[0].colors) || [],
    pt: sc.power != null ? `${sc.power}/${sc.toughness}` : (sc.loyalty ? `Loyalty ${sc.loyalty}` : ""),
    img: front.normal || "", large: front.large || front.normal || "", art: front.art_crop || "",
    back: back ? {img: back.normal, large: back.large || back.normal} : null,
    basic: /Basic/.test(sc.type_line || ""),
    frame: sc.frame || "2015", fullArt: !!(sc.full_art || sc.border_color === "borderless" || (sc.frame_effects || []).includes("extendedart")),
    set: sc.set_name || "", setCode: sc.set || "", year: String(sc.released_at || "").slice(0, 4), artist: sc.artist || "", ill: sc.illustration_id || (f[0] && f[0].illustration_id) || ""
  };
}
let sfLast = 0;
/* Scryfall allows about 10 requests a second. Requests are spaced out, and when Scryfall says "slow down" (429; in a browser
   this can also show up as a failed connection) everything waits a moment and tries again: 1 s, 2 s, 4 s. */
async function sf(path, opts){
  for (let attempt = 0; ; attempt++){
    const wait = Math.max(0, sfLast + 120 - Date.now());
    sfLast = Date.now() + wait;
    if (wait) await sleep(wait);
    let r;
    try { r = await fetch("https://api.scryfall.com" + path, opts); }
    catch (e){ if (attempt >= 3 || navigator.onLine === false) throw e; r = null; }
    if (r && r.status === 404) return null;
    if (r && r.ok) return r.json();
    if (attempt >= 3) throw new Error("Scryfall is busy right now. Try again in a moment.");
    const back = 1000 * 2 ** attempt;
    sfLast = Math.max(sfLast, Date.now() + back);          // everyone backs off together
    await sleep(back);
  }
}
const cardCache = new Map();
async function sfCollection(ids){
  const need = ids.filter(id => !cardCache.has(id));
  for (let i = 0; i < need.length; i += 75){
    const chunk = need.slice(i, i + 75);
    const j = await sf("/cards/collection", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({identifiers: chunk.map(id => ({id}))})});
    for (const c of (j && j.data) || []) cardCache.set(c.id, toCard(c));
  }
  savePrices();
  return ids.map(id => cardCache.get(id)).filter(Boolean);
}
async function sfSearch(q, page = 1, extras = false){
  const j = await sf(`/cards/search?q=${encodeURIComponent(q)}&order=${extras ? "name" : "edhrec"}&unique=cards&page=${page}${extras ? "&include_extras=true" : ""}`);
  if (!j) return {cards: [], more: false};
  const cards = j.data.map(toCard); cards.forEach(c => cardCache.set(c.id, c)); savePrices();
  return {cards, more: !!j.has_more};
}
