"use strict";
/* Welcome and sign-in screens shown when there is no deck yet. */
function renderGate(){
  const signed = !!DS.token;
  let body;
  if (!signed) body = `<h1>Sign in to see your decks</h1>
      <p class="gate-note">Decks are kept in your group’s Google Drive file and only load after you sign in. Nothing is stored on this device.</p>
      <button class="btn primary gate-btn" id="gateSignIn">Sign in with Google</button>`;
  else if (!DS.file) body = `<h1>Choose your deck library</h1>
      <p class="gate-note">Open the “MTG Deck Builder.json” file someone shared with you, or start a new library in your own Drive.</p>
      <div class="gate-row"><button class="btn primary gate-btn" id="gateOpen">Open shared library</button><button class="btn gate-btn" id="gateCreate">Create a new library</button></div>`;
  else if (DS.status === "error") body = `<h1>Couldn’t load your decks</h1><p class="gate-note">${esc(DS.msg)}</p><button class="btn primary gate-btn" id="gateRetry">Try again</button>`;
  else body = `<h1>Loading your decks…</h1><p class="gate-note">From ${esc(DS.file.name)}</p><div class="gate-spin"></div>`;
  $("#welcome").innerHTML = `<div class="welcome-card gate"><span class="gate-logo"><i class="ms ms-commander"></i></span>${body}</div>`;
}
function renderWelcome(){
  if (gated()){ renderGate(); return; }
  const d = cur();
  $("#welcome").innerHTML = `<div class="welcome-card">
    <button class="big-slot" id="welcomeSlot"><span class="card-plus-ico">+</span>${d ? "Choose commander" : "New deck"}</button>
    <h1>${d ? "Who leads this deck?" : "Build your next Commander deck"}</h1>
    <ol class="steps">
      <li>Pick a commander, and a partner if it has one. EDHREC’s data for them powers every recommendation.</li>
      <li>Tap a card-with-plus tile in any type box to see EDHREC’s top picks for that type, or search any card.</li>
      <li>Double-click a card, drag it, or press its arrow to move it between your card pool and your deck.</li>
      <li>Click a card to read it, swipe through every artwork, rename it or give it your own art.</li>
      <li>Lock final picks and preview a print-ready PDF of proxies when you reach 100.</li>
    </ol></div>`;
}
$("#welcome").addEventListener("click", e => {
  if (e.target.closest("#gateSignIn")){ driveConnect(); return; }
  if (e.target.closest("#gateOpen")){ driveOpen(); return; }
  if (e.target.closest("#gateCreate")){ driveCreate(); return; }
  if (e.target.closest("#gateRetry")){ DS.rev = null; driveSync(false); return; }
  if (e.target.closest("#welcomeSlot")) cur() ? openCommanderPicker(true) : newDeck();
});
