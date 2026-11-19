"use strict";
/* App-wide constants: storage keys, card types, colors, EDHREC list names, motion settings. */
/* ============================================================
   MTG Deck Builder — EDH deck builder on top of EDHREC + Scryfall
   ============================================================ */
const BUILD = document.querySelector('meta[name="build"]').content;   // stamped into index.html by deploy.sh on every publish
const KEY = "commandzone.v1";
const UIKEY = "command-zone-ui";
const PKEY = "command-zone-prices";
const TYPES = ["Creature","Instant","Sorcery","Artifact","Enchantment","Planeswalker","Battle","Land"];
const PLURAL = {Token:"Tokens",Creature:"Creatures",Instant:"Instants",Sorcery:"Sorceries",Artifact:"Artifacts",Enchantment:"Enchantments",Planeswalker:"Planeswalkers",Battle:"Battles",Land:"Lands",Any:"All types"};
const MS = {Token:"ms-token",Creature:"ms-creature",Instant:"ms-instant",Sorcery:"ms-sorcery",Artifact:"ms-artifact",Enchantment:"ms-enchantment",Planeswalker:"ms-planeswalker",Battle:"ms-battle",Land:"ms-land",Any:"ms-multicolor"};
const DEFAULT_LIMITS = {Creature:28,Instant:10,Sorcery:8,Artifact:10,Enchantment:6,Planeswalker:1,Battle:0,Land:36};
const EDH_TAGS = {
  Creature:["creatures"], Instant:["instants"], Sorcery:["sorceries"],
  Artifact:["manaartifacts","utilityartifacts"], Enchantment:["enchantments"],
  Planeswalker:["planeswalkers"], Battle:["battles"], Land:["lands","utilitylands"],
  Any:["topcards","highliftcards","newcards","creatures","instants","sorceries","manaartifacts","utilityartifacts","enchantments","planeswalkers","battles","lands","utilitylands"]
};
const COLORS = ["W","U","B","R","G"];
const COLOR_NAME = {W:"white",U:"blue",B:"black",R:"red",G:"green",C:"colorless"};
const BASIC_OF = {W:"Plains",U:"Island",B:"Swamp",R:"Mountain",G:"Forest",C:"Wastes"};
const HOVER = matchMedia("(hover: hover) and (pointer: fine)");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
const EASE = "cubic-bezier(.2,.8,.2,1)";
