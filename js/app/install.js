"use strict";
/* ---------------- Get the app: the site installs to the Home Screen and then opens full screen ----------------
   Android/Chrome offers this itself (manifest.webmanifest). iPhone can't prompt, so Safari users get a one-time
   suggestion and a how-to. */
const IOS = /iP(hone|od)/.test(navigator.userAgent);
// opened from the Home Screen
const STANDALONE = !!(navigator.standalone || matchMedia("(display-mode: standalone)").matches);
function iosInstallHelp(){
  C = {report: true};
  $("#confirmModal").innerHTML = `<div class="modal-body"><h2>Get the app on iPhone</h2>
    <p>Put MTG Deck Builder on your Home Screen: opened from there, it fills the whole screen like an app.</p>
    <ol class="report"><li>Open this page in <b>Safari</b>. Chrome, Google and the browsers inside other apps (Messenger, Instagram…) can't add it on older iPhones.</li>
      <li>Tap <b>Share</b>, the square with an arrow: at the bottom of the screen on older iPhones, or under <b>•••</b> on newer ones.</li>
      <li><b>Scroll down</b> the list below the app icons and tap <b>Add to Home Screen</b>, then <b>Add</b>.<br><small class="note">Not in the list? At the very bottom tap <b>Edit Actions…</b> and add it with the green +.</small></li>
      <li>Open <b>Deck Builder</b> from your Home Screen.</li></ol>
    <p class="note">The first time, sign in to Google there once more. Your decks are the same, they live in Google Drive.</p>
    <div class="row"><button class="btn primary" data-c="no">OK</button></div></div>`;
  showScrim("#confirmScrim");
}
/* iPhone has no automatic "install this app" popup like Android, so Safari users get a small one-time
   suggestion instead. Shown once per device (dismissing it is remembered); never inside the Home Screen app. */
const IOS_SAFARI = IOS && /Safari\//.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|GSA\/|FBAN|FBAV|Instagram/.test(navigator.userAgent);
function installNudge(force){
  if (!force && (!IOS_SAFARI || STANDALONE || UI.installNudged)) return;
  setTimeout(() => {
    if (document.getElementById("installBar")) return;
    const bar = document.createElement("div"); bar.id = "installBar"; bar.setAttribute("role", "status");
    bar.innerHTML = `<img src="icon-180.png" alt=""><span><b>Get the app</b><small>Opens full screen</small></span>
      <button class="btn primary sm" data-ib="how">Show me</button><button class="icon-btn" data-ib="no" title="Not now" aria-label="Not now">×</button>`;
    document.body.appendChild(bar);
    const done = () => { UI.installNudged = true; saveUI(); bar.classList.add("out"); setTimeout(() => bar.remove(), 250); };
    bar.addEventListener("click", e => { const b = e.target.closest("[data-ib]"); if (!b) return; done(); if (b.dataset.ib === "how") iosInstallHelp(); });
  }, force ? 0 : 4000);
}
