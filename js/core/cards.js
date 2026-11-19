"use strict";
/* Card helpers: type bucket, mana symbols, copies and quantities. */
function bucketOf(typeLine){
  const t = String(typeLine || "").split("//")[0];
  for (const k of ["Creature","Land","Planeswalker","Battle","Instant","Sorcery","Artifact","Enchantment"]) if (t.includes(k)) return k;
  return "Artifact";
}
function manaHTML(str){
  return esc(str).replace(/\{([^}]+)\}/g, (_, s) => {
    let k = s.toLowerCase().replace(/\//g, "");
    if (k === "t") k = "tap"; else if (k === "q") k = "untap";
    return `<i class="ms ms-${k} ms-cost ms-shadow"></i>`;
  });
}
function pipsHTML(ci){
  if (!ci || !ci.length) return '<i class="ms ms-c ms-cost"></i>';
  return ci.map(c => `<i class="ms ms-${c.toLowerCase()} ms-cost"></i>`).join("");
}
/* Basic lands, and cards like Nazgûl or Relentless Rats, may appear more than once. */
function canMulti(card){ return !!(card && (card.basic || /deck can have (any number|up to \w+) cards named/i.test(card.text || ""))); }
/* Stacks: basic lands (and cards like Relentless Rats) are one tile per artwork with a count. */
const qOf = c => Math.max(1, c.qty || 1);
const sumQ = list => list.reduce((a, c) => a + qOf(c), 0);
const cardsQ = list => list.flatMap(c => Array(qOf(c)).fill(c.card));
function subtypes(card){ const t = String(card.type || "").split("//")[0].split("—")[1]; return t ? t.trim().split(/\s+/) : []; }
