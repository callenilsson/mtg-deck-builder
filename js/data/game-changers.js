"use strict";
/* The official Commander "Game Changers" list. */
/* Game Changers: the official Commander list of the strongest cards (they push a deck into a higher bracket).
   One small request per visit, kept in memory only. */
let GC = null, gcBusy = false;
async function loadGameChangers(){
  if (GC || gcBusy) return; gcBusy = true;
  try {
    const names = new Set(); let url = `/cards/search?q=${encodeURIComponent("is:gamechanger")}&unique=oracle`;
    while (url){ const j = await sf(url); (j && j.data || []).forEach(c => names.add(c.name)); url = j && j.has_more ? j.next_page.replace("https://api.scryfall.com", "") : null; }
    GC = names; renderStats(); if (!$("#addScrim").hidden && A.mode === "cards") renderAddBody();
  } catch {} gcBusy = false;
}
const isGC = c => !!(GC && c && (GC.has(c.name) || GC.has(String(c.name).split(" // ")[0])));
