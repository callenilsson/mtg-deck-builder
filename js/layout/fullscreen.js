"use strict";
/* ---------------- Full screen: hides the browser's address bar; press again (or swipe / Esc) to go back ---------------- */
const IOS = /iP(hone|od)/.test(navigator.userAgent);
// opened from the Home Screen: already without browser bars, so no full screen button
const STANDALONE = !!(navigator.standalone || matchMedia("(display-mode: standalone)").matches);
const FS_ICO = `<svg class="i" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`, FSX_ICO = `<svg class="i" viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`;
const fsSupported = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
async function toggleFull(){
  if (!fsSupported()){
    if (IOS) iosFullHelp();
    return;
  }
  try {
    if (isFull()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else await (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement, {navigationUI: "hide"});
  } catch { toast("This browser didn't allow full screen"); }
}
/* iPhone: Safari can't hide its bars for a website, but the Home Screen version opens full screen. */
function iosFullHelp(){
  C = {report: true};
  $("#confirmModal").innerHTML = `<div class="modal-body"><h2>Full screen on iPhone</h2>
    <p>iPhone doesn't let websites go full screen in Safari. Put MTG Deck Builder on your Home Screen instead: opened from there, it fills the whole screen like an app.</p>
    <ol class="report"><li>Open this page in <b>Safari</b>. Chrome, Google and the browsers inside other apps (Messenger, Instagram…) can't add it on older iPhones.</li>
      <li>Tap <b>Share</b>, the square with an arrow: at the bottom of the screen on older iPhones, or under <b>•••</b> on newer ones.</li>
      <li><b>Scroll down</b> the list below the app icons and tap <b>Add to Home Screen</b>, then <b>Add</b>.<br><small class="note">Not in the list? At the very bottom tap <b>Edit Actions…</b> and add it with the green +.</small></li>
      <li>Open <b>Deck Builder</b> from your Home Screen.</li></ol>
    <p class="note">The first time, sign in to Google there once more. Your decks are the same, they live in Google Drive.</p>
    <div class="row"><button class="btn primary" data-c="no">OK</button></div></div>`;
  showScrim("#confirmScrim");
}
function syncFull(){
  const on = isFull(), b = $("#fsBtn");
  if (b){ b.hidden = (STANDALONE && IOS) || !(fsSupported() || IOS); b.innerHTML = (on ? FSX_ICO : FS_ICO) + `<span class="tl">${on ? "Exit full screen" : "Full screen"}</span>`; b.title = on ? "Leave full screen (you can also press Esc or swipe from the top)" : "Full screen: hide the browser's address bar"; b.classList.toggle("on", on); }
  const d = cur(); if (d && d.commander) renderRail(d);
}
document.addEventListener("fullscreenchange", syncFull); document.addEventListener("webkitfullscreenchange", syncFull);
$("#fsBtn").addEventListener("click", toggleFull);
