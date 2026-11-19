"use strict";
/* Who is using this browser (their Drive identity) and who owns a deck; read-only guard for other people's decks. */
/* Who is using this browser: their Google Drive identity (permissionId is stable and matches Drive sharing). */
let LAST_ME = null;
try { LAST_ME = JSON.parse(localStorage.getItem("command-zone-me") || "null"); } catch {}
function meNow(){ return (typeof DS !== "undefined" && DS.me) || (typeof CLOUD === "function" && CLOUD() ? null : LAST_ME); }
function libOwner(){ return typeof DS !== "undefined" && DS.file && DS.owner ? DS.owner : null; }
function isMine(d){
  const me = meNow(); if (!d) return true;
  if (!d.owner){ const lo = libOwner(); return !(typeof CLOUD === "function" && CLOUD() && lo && !lo.me); }   // older decks: the library owner's
  return !!(me && d.owner.id === me.id);
}
function roDeck(d){ return !!d && !isMine(d); }
function ownerName(d){ return d && d.owner ? (d.owner.name || "Someone") : (libOwner() ? libOwner().displayName || "The library owner" : ""); }
/* Stop changes to someone else's deck; returns true when blocked. */
function guard(d = cur()){
  if (!roDeck(d)) return false;
  toast(`This is ${ownerName(d)}’s deck: you can look, not change. Use “Copy to my decks” to make your own version.`);
  return true;
}
