"use strict";
/* ---------------- Save / import ---------------- */
function download(name, text, type){
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
/* The backup is one JSON file: every deck plus their custom pictures. "Import decks" reads it back
   (and still reads the older .html files that had the decks inside). */
function fileJSON(){
  const images = {}; for (const k of usedImageKeys()) if (IMG.has(k)) images[k] = IMG.get(k);
  return JSON.stringify({version: 2, savedAt: Date.now(), decks: S.decks, images});
}
function saveFile(){
  download(`mtg-deck-builder-${new Date().toISOString().slice(0, 10)}.json`, fileJSON(), "application/json");
  S.lastFileSave = Date.now(); save(false);
  toast("Saved. Send this one file to your partner.");
}
async function importFile(file){
  const text = await file.text();
  let data = null;
  try {
    if (/^\s*[{[]/.test(text)) data = JSON.parse(text);
    else { const m = text.match(/<script id="embedded-decks" type="application\/json">([\s\S]*?)<\/script>/); if (m) data = JSON.parse(m[1]); }
  } catch {}
  if (!data || !data.decks){ toast("That file has no MTG Deck Builder decks in it"); return; }
  await storeImages(data.images);
  const parts = reportText(mergeDecks(data.decks));
  if (!cur()) S.active = liveDecks()[0]?.id || null;
  save(); render();
  showReport("Import finished", parts.length ? parts : ["You already had everything in this file. Nothing changed."]);
}
