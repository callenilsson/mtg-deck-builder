"use strict";
/* Card view window: layout, details (stats, price, odds) and the action and customize buttons. */
/* Width of the name area on a card (in % of the card): the frame starts at 7.2% and the mana symbols take ~5.5% each from the right. */
function nameFieldWidth(c){
  const n = ((String(c.mana || "").split(" // ")[0]).match(/\{[^}]+\}/g) || []).length;
  return Math.max(40, Math.min(84, 93 - 7.2 - n * 5.5 - (n ? 2 : 0))).toFixed(1);
}
function renderDetail(){
  const c = V.card;
  $("#detailModal").innerHTML = `<button class="icon-btn dv-close" data-close title="Close">${I.close}</button><div class="dv-scroll">
      <div class="flow" id="flow" tabindex="0" aria-label="Every artwork of this card. Drag, swipe, scroll or use the arrow keys. Click a card to jump to it.">
        <div class="flow-stage" id="flowStage"></div>
        <div class="fl-over" id="flOver"><canvas id="artCanvas" width="1344" height="1872"></canvas>
          ${V.editable ? `<input class="name-over" id="artName" style="width:${nameFieldWidth(c)}%" maxlength="40" autocomplete="off" spellcheck="false" placeholder="${esc(c.name.split(" // ")[0])}" value="${esc(V.name)}" title="Click to rename this card" aria-label="Name on the card"><button class="name-pen" id="namePen" title="Rename this card">${I.pencil}</button>` : ""}</div>
      </div>
      <div class="flow-foot"><div class="flow-cap" id="flowCap"></div>${c.back ? `<button class="btn sm" id="dFlip">${I.flip}Flip</button>` : ""}<input type="range" class="flow-scrub" id="flowScrub" min="0" max="0" value="0" aria-label="Jump to artwork" hidden></div>
      <div class="dv-box">
        <div class="modal-head"><h2>${esc(c.name)} <span class="mana">${manaHTML(c.mana)}</span></h2>
          <label class="art-find" title="Show only artworks whose set name, set code, artist or year match">${I.search}<span class="af-lbl">Find art</span><input id="artQ" type="search" placeholder="set, artist or year" autocomplete="off" value="${esc(V.artQ || "")}"></label></div>
        <div class="dv-body"><div class="dv-info" id="dvInfo"></div><div class="dv-side" id="dvSide"></div></div>
      </div>
    </div>`;
  renderFlow(); renderDetailParts(); drawArt();
}
function renderDetailParts(){
  if (!V) return;
  const d = cur(), c = V.card, item = V.kind === "item" ? findCard(V.uid) : null;
  const s = V.rec && V.rec.incl != null ? {incl: V.rec.incl, syn: V.rec.syn} : statFor(edhStats(d), c.name);
  const pr = priceOf(c), pa = PRICES[c.id];
  const chips = [];
  if (V.kind !== "commander" && V.kind !== "partner" && V.kind !== "token"){
    if (s){
      const pct = Math.round(s.incl * 100), syn = s.syn != null ? Math.round(s.syn * 100) : null;
      chips.push(`<span class="chip-st" title="Played in ${pct}% of ${esc(cmdKey(d))} decks on EDHREC"><b>${pct}%</b> of decks</span>`);
      if (syn != null) chips.push(`<span class="chip-st" title="Synergy: how much more often it's played with this commander than in other decks that could play it"><b class="${syn > 0 ? "pos" : syn < 0 ? "neg" : ""}">${syn > 0 ? "+" : ""}${syn}%</b> synergy</span>`);
    } else chips.push(`<span class="chip-st" title="Not on ${esc(cmdKey(d))}'s EDHREC page">Not on EDHREC</span>`);
  }
  if (item && item.zone === "deck"){
    const ot = castOnTime(d, item.card);
    if (ot) chips.push(`<span class="chip-st ${ot.p >= .8 ? "ok" : ot.p < .5 ? "bad" : ""}" title="Chance to have enough mana, in its colors, to cast it by turn ${ot.turn} (its mana value). From your deck's lands, mana rocks and mana creatures: opening 7 plus one draw a turn from 99 cards, on the play."><b>${Math.round(ot.p * 100)}%</b> on time (turn ${ot.turn})</span>`);
  }
  const ap = printPrice(c);
  chips.push(`<span class="chip-st price${isPricey(c) ? " pricey" : ""}" title="The cheapest printing's price is what counts (expensive marking, totals). This artwork's own price is shown for interest."><b>${pr ? fmtMoney(pr.v, pr.sym) : "–"}</b> cheapest${ap && (!pr || Math.abs(ap.v - pr.v) >= .01) ? ` <span class="sub">· this art ${fmtMoney(ap.v, ap.sym)}</span>` : ""}</span>`);
  if (V.rec && V.rec.pairs && V.rec.pairs.length) chips.push(`<span class="chip-st" title="Also played with ${V.rec.pairs.map(esc).join(", ")}">Combo ×${V.rec.pairs.length}</span>`);
  $("#dvInfo").innerHTML = `<div class="type-line">${esc(c.type)}${centerIsCustom() && V.name.trim() ? ` · printed as “${esc(V.name.trim())}”` : ""}</div>
    <div class="oracle">${manaHTML(c.text)}</div>${c.pt ? `<div class="pt">${esc(c.pt)}</div>` : ""}
    <div class="chip-row">${chips.join("")}</div>
    <div class="dv-links"><a href="https://edhrec.com/cards/${slugify(c.name)}" target="_blank" rel="noopener">EDHREC ↗</a><a href="https://scryfall.com/search?q=${encodeURIComponent(`!"${c.name.split(" // ")[0]}"`)}" target="_blank" rel="noopener">Scryfall ↗</a><a href="https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(c.name.split(" // ")[0])}" target="_blank" rel="noopener">Cardmarket ↗</a></div>`;
  let acts = "";
  if (roDeck(d) && V.kind !== "add"){
    acts = `<span class="note">${esc(ownerName(d))}’s deck · view only</span>`;
  } else if (V.kind === "commander"){
    acts = `<button class="btn" data-d="changeCmd">Change commander</button>${d.partner ? "" : partnerQuery(d.commander) ? `<button class="btn" data-d="addPartner">+ Partner</button>` : ""}`;
  } else if (V.kind === "token"){
    const k = (d.tokens || []).find(x => x.uid === V.uid);
    acts = k ? `<span class="qty-big" title="How many of this token"><button data-d="dec" title="One fewer">−</button><b>${qOf(k)}</b><button data-d="inc" title="One more">+</button></span>` : "";
  } else if (V.kind === "partner"){
    acts = `<button class="btn" data-d="changePartner">Change partner</button><button class="btn danger" data-d="removePartner">${I.trash}Remove</button>`;
  } else if (item){
    acts = canMulti(c) ? `<span class="qty-big" title="How many of this card"><button data-d="dec" title="One fewer">−</button><b>${qOf(item)}</b><button data-d="inc" title="One more">+</button></span>` : "";
  } else if (V.kind === "add"){
    if (A.mode === "token") acts = `<button class="btn primary" data-d="addTok" title="Adds it with the artwork and edits shown above">+ Add to ${A.side === "options" ? "pool" : "deck"}</button>`;
    else if (A.mode === "commander" || A.mode === "partner") acts = `<button class="btn primary" data-d="pick">${A.mode === "partner" ? "Choose as partner" : "Choose as commander"}</button>`;
    else {
      const have = d.cards.find(k => k.card.name === c.name);
      acts = have && !canMulti(c) ? `<span class="btn" style="color:var(--ok);border-color:transparent;background:none">✓ In ${have.zone === "deck" ? "deck" : "card pool"}</span>`
        : `<button class="btn ${A.side === "deck" ? "" : "primary"}" data-d="addPool" title="Adds it with the artwork shown above">+ Card pool</button><button class="btn ${A.side === "deck" ? "primary" : ""}" data-d="addDeck" title="Adds it with the artwork shown above">+ Deck</button>`;
    }
  }
  let edit = "";
  if (V.editable){
    const hint = V.rebase ? "Swipe to pick the card under this version" : V.dirty ? "Unsaved changes" : centerIsCustom() ? `Editing your version${V.custs.length > 1 ? " " + custNumber(V.cid) : ""}` : V.custs.length ? "Swipe to your versions, or edit this one to make a new one" : "Rename or upload art to make your own version";
    edit = `<div class="dv-edit ${V.dirty ? "dirty" : ""}">
      <div class="ed-head"><span class="ed-title">✦ Customize</span><span class="ed-hint">${hint}</span></div>
      <div class="ed-row"><span class="ed-lbl">${I.pencil}Name</span><span class="ed-field"><input id="artName2" maxlength="40" autocomplete="off" spellcheck="false" placeholder="${esc(c.name.split(" // ")[0])}" value="${esc(V.name)}" aria-label="Name on the card">${V.name ? `<button class="x" id="nameClear" title="Use the real name">×</button>` : ""}</span></div>
      <div class="ed-row"><span class="ed-lbl">${I.brush}Art</span><div class="ed-btns">
        <button class="btn sm" id="artUpload" title="Use any picture: AI-made art, a photo, a drawing. You can also paste an image, or drop a picture file on the card.">${I.upload}Upload</button>
        <button class="btn sm" id="artPrompt" title="Copies a ready-made description of this card. Paste it into an AI image tool (ChatGPT, Gemini…) to get new art, then upload the result here.">${I.copy}Copy text for AI art</button>
        <button class="btn sm" id="artOrig" title="Download the current art, for example to attach in your AI image tool">Download</button></div></div>
      ${V.user ? `<div class="ed-row"><span class="ed-lbl">Fit</span><div class="ed-btns" title="${V.mode === "frame" ? "Drag the picture on the card to frame it; drag the gold corners to fit the art window" : "Drag the picture on the card to position it"}">
        <div class="seg"><button data-mode="frame" class="${V.mode === "frame" ? "on" : ""}">In frame</button><button data-mode="whole" class="${V.mode === "whole" ? "on" : ""}">Whole card</button></div>
        <input type="range" id="artZoom" min="1" max="6" step="0.01" value="${V.zoom}" aria-label="Zoom" title="Zoom. On the card: pinch with two fingers, or use the scroll wheel"><button class="btn sm" id="artReset" title="Fit the picture again (or double-tap it)">Reset</button><button class="btn sm" id="artDrop">Remove picture</button></div></div>
      <p class="ed-tip">Drag the picture to move it. Pinch with two fingers or scroll to zoom. Double-tap to reset.</p>` : ""}
      ${V.hasCust ? `<div class="ed-row"><span class="ed-lbl">${I.copy}Base</span><div class="ed-btns">${V.rebase
          ? `<span class="note">Swipe above, then</span><button class="btn sm primary" id="rebaseDone">Done</button>`
          : `<span class="note base-name" title="The official card your version is built on">${esc(V.custBase.set || "This printing")}</span><button class="btn sm" id="rebaseStart" title="Keep your customization and swipe to put it on another printing">Change base card</button>`}</div></div>` : ""}
      <input type="file" id="artFile" accept="image/*" hidden>
      <div class="ed-foot">
        <span class="ed-left">${V.cid ? `<button class="btn sm danger" id="custRemove" title="Delete this customized version">${I.trash}Remove</button>` : ""}
        <button class="btn sm" id="custNew" title="${centerIsCustom() ? "Make another version, starting as a copy of this one" : "Start a new customized version of this printing"}">${I.copy}New version</button></span>
        <span class="ed-save">${V.kind === "add" ? `<span class="note" title="Your edits come along when you add the card">Kept when you add it</span>` : `<button class="btn sm save-btn" id="artSave" ${V.dirty ? "" : "disabled"}>Save changes</button>`}</span></div></div>`;
  }
  $("#dvSide").innerHTML = `<div class="dv-acts">${acts}</div>${edit}`;
}
