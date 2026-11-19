"use strict";
/* The "?" buttons: explanation bubbles for every stat. */
/* Mana curve of the spells in the deck (lands not counted): how many cost 0, 1, 2 … 7 or more. */
/* A small "?" beside each stats title: tap to read how that part works (works on phones, unlike hover text). */
const INFO_OPEN = new Set();
const INFO = {
  types: sg => `<p>How many cards of each type you have, and how many you're aiming for.</p>
    <ul><li><b>Deck</b> cards of this type in your deck</li>
    <li><b>🔒</b> locked final picks</li>
    <li><b>Limit</b> your goal; with your commander, the limits add up to 100</li>
    <li><b>EDHREC</b> what similar decks run; <span class="up">+1</span> / <span class="dn">−1</span> is the difference from your limit</li></ul>
    <p class="tip">The EDHREC numbers come from the EDHREC theme that best matches your cards${sg ? ` (now: ${esc(sg.short)})` : ""}, with lands adjusted to your mana curve. <b>Use EDHREC numbers</b> copies them into your limits.</p>`,
  power: () => `<ul><li><b>Colored numbers</b> how many cards have each color</li>
    <li><b>◆ Game Changers</b> cards on the official list of the strongest Commander cards. Even one makes a deck play at a higher power level.</li></ul>
    <p class="tip">Click Game Changers to see which cards.</p>`,
  curve: () => `<p>Your spells grouped by how much mana they cost (lands not counted).</p>
    <ul><li><b>Bars</b> how many spells cost 0, 1, 2 … 7+ mana</li>
    <li><b>Big number</b> the average cost</li></ul>
    <p class="tip">Most Commander decks average about 3. Lower means a faster deck.</p>`,
  roles: () => `<p>What your cards do, read from their rules text (an estimate).</p>
    <ul><li><b>Ramp</b> makes extra mana or gets lands out: mana rocks, mana creatures, land search, Treasure</li>
    <li><b>Card draw</b> draws you more cards</li>
    <li><b>Removal</b> gets rid of one thing: destroy, exile, damage, fight, bounce, counter</li>
    <li><b>Board wipes</b> get rid of everything at once</li></ul>
    <p class="tip"><b>The /10, /8 and /2 are goals</b>, not counts: a common Commander rule of thumb (about 10 ramp, 10 card draw, 8 removal and 2 board wipes, like the well-known Command Zone template). A bar turns green when you reach its goal. The last column is your chance to have at least one by turn 3. Click a row to see those cards.</p>`,
  balance: () => `<p>For every spell: how likely you are to have the colored mana it needs by the turn you'd want to cast it.</p>
    <ul><li><b>Sources</b> lands, mana rocks and mana creatures that make this color (a dual land counts for both colors)</li>
    <li><b>On time</b> by the turn equal to its mana value: a {3}{B}{B} card needs 2 black sources by turn 5</li>
    <li><b>The math</b> your opening 7 plus one draw per turn, from 99 cards, on the play without a mulligan</li></ul>
    <p class="tip">The usual goal is 9 of 10 games (90%). Hover a color to see each card's chance.</p>`,
  opening: () => `<p>What your first turns will look like, from your land count. Exact odds, no guessing.</p>
    <ul><li><b>Chart</b> the chance of 0, 1, 2 … 7 lands in your first 7 cards; green bars are keepable hands (2–4 lands)</li>
    <li><b>Turns 1–6</b> the chance you've been able to play a land every turn so far</li>
    <li><b>Commander</b> the chance to have enough mana, in its colors, to cast it on its turn (approximate)</li></ul>
    <p class="tip">From 99 cards, on the play, no mulligan. <b>Test a sample hand</b> lets you try it for real.</p>`,
  sim: () => `<p>Your deck played 1,000 times in a split second, with the same simple rules as the test hand, to show what usually happens.</p>
    <ul><li><b>Each game</b> one free mulligan if the 7 has fewer than 2 or more than 4 lands; then every turn: draw, play a land, play mana rocks and mana creatures (cheapest first), and cast the commander as soon as there's enough mana</li>
    <li><b>Commander on turn X</b> how often it was cast on its own mana value or earlier</li>
    <li><b>Mana on turn 4 / 6</b> the average mana available that turn, lands plus mana makers</li></ul>
    <p class="tip">Unlike the exact odds in Opening hand, this lets your ramp actually make mana. Colors and other card effects are not simulated. Each run is a new random sample, so numbers move a little.</p>`,
  hand: () => `<p>A quick, simplified game to feel how your deck starts. Every hand is a fresh random shuffle of your deck.</p>
    <ul><li><b>Mulligan</b> shuffle and draw 7 again; the first one is free, after that you put 1 card per mulligan on the bottom (London rules)</li>
    <li><b>Tap a card</b> to play it: one land a turn, other cards if you have that much mana left</li>
    <li><b>Mana</b> each land gives 1; mana rocks and creatures (green outline) give 1 from your next turn</li>
    <li><b>Next turn</b> draws a card and refreshes your mana</li>
    <li><b>Command zone</b> cast your commander when you have the mana; the top bar shows the turn you did</li>
    <li><b>Free play</b> turns the rules off, for cards the simple rules don't cover</li></ul>
    <p class="tip">Simplified on purpose: colors, cost reductions, X costs, what spells do (like searching for lands) and opponents are not simulated. Tap or drag cards to play them. Try a few hands to see how often the deck gets going; the exact odds are in Opening hand.</p>`,
  pricey: () => `<p>Marks cards that cost a lot, as a hint they may be too strong for a casual table.</p>
    <ul><li><b>Price</b> the card's cheapest printing (Cardmarket €, TCGplayer $), not the artwork you picked</li>
    <li><b>Marked</b> purple outline and price tag, here and in Add cards</li>
    <li><b>Number on the right</b> how many in this deck and pool</li></ul>
    <p class="tip">Each deck has its own limit.</p>`,
  build: () => `<p>Get suggestions for cards that work with a card you like, not only with your commander.</p>
    <ul><li><b>Add a card</b> press the two circles under it</li>
    <li><b>Add cards</b> then also suggests cards that EDHREC players run together with it</li>
    <li><b>Remove</b> with its ×, here or in Add cards</li></ul>`,
  ctypes: () => `<p>Your most common creature types. Only shown when 8 or more creatures share a type.</p>
    <ul><li><b>Changelings</b> are every type, so they count for each</li></ul>
    <p class="tip">Click a type to see those cards.</p>`
};
function infoBtn(k){ return `<button class="info-q" data-info="${k}" aria-label="How is this worked out?">?</button>`; }
function infoText(){ return ""; }
/* the explanation floats in a bubble above everything (nothing below moves) */
let infoPin = false, infoFor = null;
function infoArg(k){ if (k !== "types") return undefined; const d = cur(); const key = d && suggestKey(d); return key && SUGG[key] && !SUGG[key].loading ? SUGG[key] : null; }
function showInfo(btn, pin){
  const k = btn.dataset.info; let pop = document.getElementById("infoPop");
  if (!pop){ pop = document.createElement("div"); pop.id = "infoPop"; pop.setAttribute("role", "tooltip"); document.body.appendChild(pop); }
  pop.innerHTML = INFO[k](infoArg(k)); pop.hidden = false; infoFor = btn; infoPin = !!pin;
  document.querySelectorAll(".info-q.on").forEach(b => b.classList.remove("on")); btn.classList.add("on");
  const r = btn.getBoundingClientRect(), w = Math.min(300, innerWidth - 16);
  pop.style.width = w + "px";
  const left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  pop.style.maxHeight = (innerHeight - 16) + "px";
  const h = pop.offsetHeight, below = r.bottom + 8 + h <= innerHeight - 8, above = r.top - 8 - h >= 8;
  pop.style.left = left + "px";
  pop.style.top = (below ? r.bottom + 8 : above ? r.top - 8 - h : Math.max(8, innerHeight - 8 - h)) + "px";
  pop.style.setProperty("--ax", (r.left + r.width / 2 - left) + "px"); pop.classList.toggle("above", !below);
}
function hideInfo(){ const pop = document.getElementById("infoPop"); if (pop) pop.hidden = true; infoPin = false; infoFor = null; document.querySelectorAll(".info-q.on").forEach(b => b.classList.remove("on")); }
document.addEventListener("click", e => {
  const b = e.target.closest("[data-info]");
  if (b){ e.preventDefault(); e.stopPropagation(); if (infoFor === b && infoPin) hideInfo(); else showInfo(b, true); return; }
  if (!e.target.closest("#infoPop")) hideInfo();
}, true);
document.addEventListener("pointerover", e => { if (e.pointerType !== "mouse") return; const b = e.target.closest("[data-info]"); if (b && !infoPin) showInfo(b, false); });
document.addEventListener("pointerout", e => { if (e.pointerType !== "mouse") return; const b = e.target.closest("[data-info]"); if (b && !infoPin && !(e.relatedTarget && b.contains(e.relatedTarget))) hideInfo(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") hideInfo(); });
document.addEventListener("scroll", () => { if (infoFor) hideInfo(); }, true);
addEventListener("resize", hideInfo);
