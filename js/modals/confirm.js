"use strict";
let C = null;
function confirmTwice(steps, onYes){ C = {steps, i: 0, onYes}; showScrim("#confirmScrim"); renderConfirm(); }
function renderConfirm(){
  const s = C.steps[C.i];
  $("#confirmModal").innerHTML = `<div class="modal-body">
    ${C.steps.length > 1 ? `<div class="step-dots">${C.steps.map((_, i) => `<i class="${i <= C.i ? "on" : ""}"></i>`).join("")}</div>` : ""}
    <h2>${s.title}</h2><p>${s.text}</p>
    <div class="row"><button class="btn" data-c="no">Cancel</button><button class="btn ${s.safe ? "primary" : `danger ${C.i === C.steps.length - 1 ? "solid" : ""}`}" data-c="yes">${s.yes}</button></div></div>`;
  setTimeout(() => $('#confirmModal [data-c="no"]')?.focus(), 30);
}
function showReport(title, parts){
  C = {report: true};
  $("#confirmModal").innerHTML = `<div class="modal-body"><h2>${esc(title)}</h2><ul class="report">${parts.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
    <div class="row"><button class="btn primary" data-c="no">OK</button></div></div>`;
  showScrim("#confirmScrim");
}
$("#confirmModal").addEventListener("click", async e => {
  const b = e.target.closest("[data-c]"); if (!b) return;
  if (b.dataset.c === "no"){ hideScrim("#confirmScrim"); return; }
  if (C && C.save){
    const {after, opts} = C; hideScrim("#confirmScrim");
    await closeDetail(b.dataset.c === "discard", opts);
    if (after) after();
    return;
  }
  if (C.i < C.steps.length - 1){ C.i++; renderConfirm(); return; }
  hideScrim("#confirmScrim"); C.onYes();
});
function wipeDeck(){
  const d = cur(); if (!d || guard(d)) return;
  const n = d.cards.length;
  if (!n){ toast("This deck has no cards to delete"); return; }
  confirmTwice([
    {title: "Delete all cards?", text: `This deletes all ${n} cards from <b>${esc(displayName(d))}</b>, in both the card pool and the deck. Your commander and type limits stay.`, yes: "Yes, delete them"},
    {title: "Are you really, really sure?", text: "Locked cards go too. This can’t be undone.", yes: `Delete all ${n} cards`}
  ], () => { d.cards = []; touch(d); render(); toast("All cards deleted"); });
}
function deleteDeck(id){
  const d = S.decks[id]; if (!d || guard(d)) return;
  confirmTwice([
    {title: "Delete this deck?", text: `<b>${esc(displayName(d))}</b> and all its cards will be removed from your deck list.`, yes: "Yes, delete it"},
    {title: "Are you really, really sure?", text: "This can’t be undone unless you still have a saved file with it.", yes: "Delete deck"}
  ], () => {
    ensureVer(d);
    S.decks[id] = {id, deleted: true, updated: Date.now(), past: [...d.past, d.ver].slice(-1500), ver: uid(), name: d.name};
    if (S.active === id) S.active = liveDecks()[0]?.id || null;
    save(); render(); toast("Deck deleted");
  });
}
