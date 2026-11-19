"use strict";
/* ---------------- Full screen: hides the browser's address bar; press again (or swipe / Esc) to go back ---------------- */
const IOS = /iP(hone|od)/.test(navigator.userAgent);
const FS_ICO = `<svg class="i" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`, FSX_ICO = `<svg class="i" viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`;
const fsSupported = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
async function toggleFull(){
  if (!fsSupported()){
    if (IOS) toast("On iPhone, websites can't go full screen. In Safari, tap aA in the address bar, then Hide Toolbar.");
    return;
  }
  try {
    if (isFull()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else await (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement, {navigationUI: "hide"});
  } catch { toast("This browser didn't allow full screen"); }
}
function syncFull(){
  const on = isFull(), b = $("#fsBtn");
  if (b){ b.hidden = !(fsSupported() || IOS); b.innerHTML = (on ? FSX_ICO : FS_ICO) + `<span class="tl">${on ? "Exit full screen" : "Full screen"}</span>`; b.title = on ? "Leave full screen (you can also press Esc or swipe from the top)" : "Full screen: hide the browser's address bar"; b.classList.toggle("on", on); }
  const d = cur(); if (d && d.commander) renderRail(d);
}
document.addEventListener("fullscreenchange", syncFull); document.addEventListener("webkitfullscreenchange", syncFull);
$("#fsBtn").addEventListener("click", toggleFull);
