"use strict";
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

const I = {
  lock:'<svg class="i" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock:'<svg class="i" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>',
  focus:'<svg class="i" viewBox="0 0 24 24"><circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/><path d="M12 7.2a6 6 0 0 1 0 9.6a6 6 0 0 1 0-9.6z" fill="currentColor" fill-opacity=".35" stroke="none"/></svg>',
  close:'<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  grip:'<svg class="i" viewBox="0 0 24 24" style="stroke-width:2.6"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg>',
  trash:'<svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  search:'<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  flip:'<svg class="i" viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/></svg>',
  right:'<svg class="i" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  left:'<svg class="i" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  pencil:'<svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  copy:'<svg class="i" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  brush:'<svg class="i" viewBox="0 0 24 24"><path d="M14 4l6 6-9 9H5v-6z"/><path d="M12 6l6 6"/></svg>',
  pin:'<svg class="i" viewBox="0 0 24 24"><path d="M9 4h6l-1 6 4 3v2H6v-2l4-3z"/><path d="M12 15v6"/></svg>',
  down:'<svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  upload:'<svg class="i" viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>',
  foldL:'<svg class="i" viewBox="0 0 24 24"><path d="M11 7l-5 5 5 5M18 7l-5 5 5 5"/></svg>',
  foldR:'<svg class="i" viewBox="0 0 24 24"><path d="M6 7l5 5-5 5M13 7l5 5-5 5"/></svg>',
  foldU:'<svg class="i" viewBox="0 0 24 24"><path d="M7 13l5-5 5 5M7 19l5-5 5 5"/></svg>',
  foldD:'<svg class="i" viewBox="0 0 24 24"><path d="M7 5l5 5 5-5M7 11l5 5 5-5"/></svg>',
  swap:'<svg class="i" viewBox="0 0 24 24"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
  panelL:'<svg class="i" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/><path d="M15.5 9.5L13 12l2.5 2.5"/></svg>',
  panelR:'<svg class="i" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/><path d="M13 9.5l2.5 2.5-2.5 2.5"/></svg>',
  menu:'<svg class="i" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  undo:'<svg class="i" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>'
};

const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const slugify = name => String(name).split(" // ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
  .replace(/[^a-z0-9\s-]/g,"").trim().replace(/[\s-]+/g,"-");
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
let toastT;
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2800); }
/* Basic lands, and cards like Nazgûl or Relentless Rats, may appear more than once. */
function canMulti(card){ return !!(card && (card.basic || /deck can have (any number|up to \w+) cards named/i.test(card.text || ""))); }
/* Stacks: basic lands (and cards like Relentless Rats) are one tile per artwork with a count. */
const qOf = c => Math.max(1, c.qty || 1);
const sumQ = list => list.reduce((a, c) => a + qOf(c), 0);
const cardsQ = list => list.flatMap(c => Array(qOf(c)).fill(c.card));
function subtypes(card){ const t = String(card.type || "").split("//")[0].split("—")[1]; return t ? t.trim().split(/\s+/) : []; }
