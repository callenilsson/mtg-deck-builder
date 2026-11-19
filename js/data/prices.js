"use strict";
/* Prices: cheapest printing per card (cached 3 days), this-artwork price, expensive threshold, deck value. */
let PRICES = {};
try { PRICES = JSON.parse(localStorage.getItem(PKEY) || "{}"); } catch {}
let pricesT;
function savePrices(){ clearTimeout(pricesT); pricesT = setTimeout(() => { try { if (CLOUD()) localStorage.removeItem(PKEY); else localStorage.setItem(PKEY, JSON.stringify(PRICES)); } catch {} }, 400); }
/* The price shown for a card is its cheapest paper printing (not the artwork you picked): a steady "how strong / how
   sought-after is this card" signal. Stored on the card in the library (card.cheap), refreshed weekly by the deck's owner.
   Basic lands and tokens use their own printing's price. */
const CHEAP_MEM = {};
const usesCheapest = c => c && !c.basic && !/\bToken\b/.test(c.type || "");
function priceOf(card){
  if (!card) return null;
  const ch = usesCheapest(card) ? (card.cheap || CHEAP_MEM[card.name]) : null;
  const p = ch || PRICES[card.id]; if (!p) return null;
  const want = UI.cur === "usd" ? "u" : "e", other = want === "u" ? "e" : "u";
  if (p[want] != null) return {v: p[want], sym: want === "u" ? "$" : "€"};
  if (p[other] != null) return {v: p[other], sym: other === "u" ? "$" : "€", alt: true};
  return null;
}
async function fetchCheapest(name){
  if (CHEAP_MEM[name]) return CHEAP_MEM[name];
  const j = await sf(`/cards/search?q=${encodeURIComponent(`!"${name.split(" // ")[0]}" game:paper`)}&unique=prints&order=eur&dir=asc`);
  let e = null, u = null;
  for (const c of (j && j.data) || []){
    const pe = c.prices && c.prices.eur != null ? +c.prices.eur : null, pu = c.prices && c.prices.usd != null ? +c.prices.usd : null;
    if (pe != null && (e == null || pe < e)) e = pe;
    if (pu != null && (u == null || pu < u)) u = pu;
  }
  return CHEAP_MEM[name] = {e, u, t: Date.now()};
}
let cheapBusy = false;
async function refreshCheap(d){
  if (!d || cheapBusy) return;
  cheapBusy = true;
  try {
    await refreshPrices(d);             // printing prices first: cheap cards don't need a lookup at all
    const mine = !roDeck(d), week = 7 * 864e5;
    const cards = [...cmdrs(d), ...d.cards.map(c => c.card)].filter(usesCheapest);
    let wrote = false, got = 0;
    for (const c of cards){
      if (c.cheap && Date.now() - c.cheap.t < week){ CHEAP_MEM[c.name] = CHEAP_MEM[c.name] || c.cheap; continue; }
      if (cur() !== d) break;
      // background work: wait while a card view or the add window is open, so artworks and search load first
      while ((V || !$("#addScrim").hidden) && cur() === d) await sleep(500);
      if (cur() !== d) break;
      const own = PRICES[c.id];
      if (!CHEAP_MEM[c.name] && own && (own.e != null || own.u != null) && (own.e ?? Infinity) < 1 && (own.u ?? Infinity) < 1.2){
        CHEAP_MEM[c.name] = {e: own.e, u: own.u, t: Date.now()};
        if (mine && (!c.cheap || c.cheap.t !== CHEAP_MEM[c.name].t)){ c.cheap = CHEAP_MEM[c.name]; wrote = true; }
        continue;
      }
      const had = !!CHEAP_MEM[c.name];
      if (!had) await sleep(380);            // background lookups go gently (about 2 a second)
      const r = await fetchCheapest(c.name);
      if (mine && (!c.cheap || c.cheap.t !== r.t)){ c.cheap = r; wrote = true; }
      if (!had && ++got % 12 === 0 && cur() === d){ renderBoard(); renderHeader(); }
    }
    if (wrote && cur() === d) touch(d);
    if (cur() === d){ renderBoard(); renderHeader(); }
  } catch {}
  cheapBusy = false;
}
function fmtMoney(v, sym){ return sym + (v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2)); }
function printPrice(card){            // this exact printing, ignoring the cheapest-printing rule
  const p = card && PRICES[card.id]; if (!p) return null;
  const want = UI.cur === "usd" ? "u" : "e", other = want === "u" ? "e" : "u";
  return p[want] != null ? {v: p[want], sym: want === "u" ? "$" : "€"} : p[other] != null ? {v: p[other], sym: other === "u" ? "$" : "€"} : null;
}
function priceText(card){ const p = priceOf(card); return p ? fmtMoney(p.v, p.sym) : "–"; }
function priceyTh(d = cur()){ return d && d.pricey != null ? +d.pricey : 20; }
function isPricey(card){ const p = priceOf(card), th = priceyTh(); return !!(p && th > 0 && p.v >= th); }
function sumPrice(cards){
  let tot = 0, sym = UI.cur === "usd" ? "$" : "€", n = 0;
  for (const c of cards){ const p = priceOf(c); if (p){ tot += p.v; n++; } }
  return {tot, sym, n};
}
const priceAsked = new Set();
async function refreshPrices(d){
  if (!d) return;
  const now = Date.now();
  const ids = [...new Set([d.commander, d.partner, ...d.cards.map(c => c.card)].filter(Boolean).map(c => c.id))]
    .filter(id => id && !priceAsked.has(id) && (!PRICES[id] || now - PRICES[id].t > 3 * 864e5));
  if (!ids.length) return;
  ids.forEach(id => priceAsked.add(id));
  try {
    for (let i = 0; i < ids.length; i += 75){
      const j = await sf("/cards/collection", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({identifiers: ids.slice(i, i + 75).map(id => ({id}))})});
      for (const sc of (j && j.data) || []){ const pr = sc.prices || {}; PRICES[sc.id] = {e: pr.eur != null ? +pr.eur : null, u: pr.usd != null ? +pr.usd : null, t: Date.now()}; }
    }
    savePrices();
    if (cur() === d){ renderBoard(); renderHeader(); }
  } catch { ids.forEach(id => priceAsked.delete(id)); }
}
