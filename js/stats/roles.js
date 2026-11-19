"use strict";
const ROLES = [
  {k: "ramp", label: "Ramp", goal: 10, tip: "Mana rocks, mana creatures, land search, Treasure, extra land drops"},
  {k: "draw", label: "Card draw", goal: 10, tip: "Cards that draw you cards"},
  {k: "removal", label: "Removal", goal: 8, tip: "Destroy, exile, damage, -X/-X, fight, bounce or counter one target"},
  {k: "wipe", label: "Board wipes", goal: 2, tip: "Destroy, exile or shrink everything (or all creatures)"}
];
const ROLE_CACHE = new Map();
function rolesOf(card){
  if (!card) return [];
  if (ROLE_CACHE.has(card.id + card.name)) return ROLE_CACHE.get(card.id + card.name);
  const isLand = /\bLand\b/.test(String(card.type).split("//")[0]);
  const tx = String(card.text || "").toLowerCase().split(card.name.toLowerCase()).join("this");
  const r = [];
  if (!isLand && (/\{t\}[^.\n]*:\s*add (\{|one|two|three|x)|add (one|two|three) mana|add \{[wubrgc]\}/.test(tx)
      || /search your library for (up to \w+ )?(a |an |two |three )?(basic )?(land|forest|plains|island|swamp|mountain)/.test(tx)
      || /put (a|up to \w+|\w+) land cards? [^.]*onto the battlefield/.test(tx) || /play an additional land|play two additional lands/.test(tx)
      || /create (a|an|one|two|three|x|that many|\w+) (tapped )?treasure/.test(tx))) r.push("ramp");
  if (/\bdraws? (a|an|one|two|three|four|five|x|that many|\w+) cards?|draw cards equal|draws? cards equal|draw that many/.test(tx) && !/^[^.]*if you would draw/.test(tx)) r.push("draw");
  const wipe = /(destroy|exile) (all|each) (other )?(creatures|nonland permanents|permanents|artifacts|enchantments|nontoken|creature)|all (other )?creatures get -|deals? (\d+|x) damage to each (other )?creature|return all (creatures|nonland permanents) to/.test(tx);
  if (wipe) r.push("wipe");
  if (/(destroy|exile) target (?!card)(creature|artifact|enchantment|permanent|nonland|planeswalker|attacking|blocking|tapped|nontoken|creature or|artifact or)(?! you control)|deals? (\d+|x|that much) damage to (target|any target|up to)(?! player)|deals? damage equal to [^.]* to (target|any target|up to one target)(?! player)|target creature (an opponent controls )?gets -\d+\/-\d+|fights? (target|another target|up to one target)|return target (creature|nonland permanent|permanent)(?! you control)[^.]* to its owner's hand|counter target (spell|creature spell|noncreature spell)|(target|each) (player|opponent) sacrifices/.test(tx)) r.push("removal");
  ROLE_CACHE.set(card.id + card.name, r);
  return r;
}
