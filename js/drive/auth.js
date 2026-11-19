"use strict";
/* Google Drive: configuration, sign-in token, file picker, authorized requests. */
/* ---------------- Google Drive: one shared library file ----------------
   The library is a single JSON file ("MTG Deck Builder.json") in the owner's Drive holding every deck and custom image.
   Access is managed only with Drive's Share button: Editor = can create and edit decks, Viewer = can only look.
   Scope drive.file: the app can only touch files it created or that the person picked in the Google file chooser. */
// Public identifiers of the "MTG Deck Builder" Google Cloud project. Safe to publish: the key only works from this site and only for the file chooser.
const GDRIVE = {clientId: "855504134871-ig774jo5lhcedqt2ng4dfqjobmekagcu.apps.googleusercontent.com", apiKey: "AIzaSyBWAuF1yXIKPSONF6YZKedZU3qhNp7Esks", appId: "855504134871"};
const DKEY = "command-zone-drive";
const DS = {me: null, members: {}, perms: null, remote: null, token: null, exp: 0, user: null, file: null, canEdit: false, rev: null, status: "off", msg: "", last: 0, busy: false, again: false, pushT: 0, warnedView: false, link: ""};
try { DS.file = JSON.parse(localStorage.getItem(DKEY) || "null"); } catch {}
if (DS.file && /^command zone/i.test(DS.file.name || "")) DS.file.name = "MTG Deck Builder.json";
const driveConfigured = () => !!(GDRIVE.clientId && GDRIVE.apiKey && GDRIVE.appId);
const driveUsable = () => driveConfigured() && location.protocol === "https:";
function saveDriveFile(){ try { DS.file ? localStorage.setItem(DKEY, JSON.stringify(DS.file)) : localStorage.removeItem(DKEY); } catch {} }
let tokenClient = null, tokWait = null, pickerP = null;
function initGoogle(){
  if (!driveUsable()) return;
  loadScript("https://accounts.google.com/gsi/client").then(() => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE.clientId, scope: "https://www.googleapis.com/auth/drive.file",
      callback: r => { const w = tokWait; tokWait = null; if (r.error){ w && w.rej(new Error(r.error)); return; } DS.token = r.access_token; DS.exp = Date.now() + (+r.expires_in || 3600) * 1000; w && w.res(DS.token); },
      error_callback: e => { const w = tokWait; tokWait = null; w && w.rej(new Error(e && e.type === "popup_closed" ? "Sign-in was closed." : "Couldn’t open Google sign-in. Allow pop-ups for this site.")); }
    });
    renderDrive();
  }).catch(() => { DS.status = "error"; DS.msg = "Couldn’t load Google sign-in."; renderDrive(); });
}
// must run straight from a click, or the browser blocks the sign-in pop-up
function requestToken(){
  return new Promise((res, rej) => {
    if (!tokenClient){ rej(new Error("Google sign-in is still loading. Try again in a second.")); return; }
    tokWait = {res, rej}; tokenClient.requestAccessToken({prompt: ""});
  });
}
function loadPicker(){ return pickerP || (pickerP = loadScript("https://apis.google.com/js/api.js").then(() => new Promise(r => gapi.load("picker", r)))); }
async function dfetch(path, opts = {}){
  if (!DS.token || Date.now() > DS.exp - 30e3){ DS.token = null; setDrive("reconnect"); throw new Error("reconnect"); }
  const r = await fetch("https://www.googleapis.com" + path, {...opts, headers: {...(opts.headers || {}), Authorization: "Bearer " + DS.token}});
  if (r.status === 401){ DS.token = null; setDrive("reconnect"); throw new Error("reconnect"); }
  if (!r.ok){ let m = "Google Drive answered " + r.status; try { m = (await r.json()).error.message || m; } catch {} throw new Error(m); }
  return r;
}
