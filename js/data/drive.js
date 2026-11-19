"use strict";
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
const DMETA = "id,name,headRevisionId,modifiedTime,webViewLink,capabilities(canEdit,canShare),owners(displayName,me,permissionId,photoLink)";
function libraryPayload(){
  const images = {}; for (const k of usedImageKeys()) if (IMG.has(k)) images[k] = IMG.get(k);
  // never upload other people's decks as this browser has them: always send the library's own copy of those
  const decks = {};
  for (const [id, d] of Object.entries(S.decks)) decks[id] = (!isMine(d) && DS.remote && DS.remote[id]) ? DS.remote[id] : d;
  const members = {...(DS.members || {})};
  if (DS.me) members[DS.me.id] = {name: DS.me.name, photo: DS.me.photo, seen: Date.now()};
  DS.members = members;
  return JSON.stringify({version: 2, savedAt: Date.now(), app: "mtg-deck-builder", decks, images, members});
}
/* Decks made in this browser that the library hasn't seen yet belong to whoever is signed in. */
function claimNewDecks(){
  const me = DS.me; if (!me) return;
  for (const d of Object.values(S.decks)) if (!d.owner && !d.deleted && !(DS.known && DS.known.has(d.ver))) d.owner = {...me};
}
async function loadPerms(){
  try { const j = await (await dfetch(`/drive/v3/files/${DS.file.id}/permissions?fields=permissions(id,type,role,displayName,photoLink)&supportsAllDrives=true`)).json(); DS.perms = j.permissions || []; DS.permErr = ""; }
  catch (e){ DS.perms = DS.perms || null; if (e.message !== "reconnect") DS.permErr = e.message; }
  renderSidebar();
}
const LIB_NAME = "MTG Deck Builder.json";
function useMeta(m){
  DS.canEdit = !!(m.capabilities && m.capabilities.canEdit);
  // libraries made before the rename are called "Command Zone decks.json": rename them once (same file, sharing kept)
  if (/^command zone/i.test(m.name || "") && DS.canEdit && !DS.renaming){
    DS.renaming = true;
    dfetch(`/drive/v3/files/${m.id}?supportsAllDrives=true`, {method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify({name: LIB_NAME})})
      .then(() => { if (DS.file && DS.file.id === m.id){ DS.file.name = LIB_NAME; saveDriveFile(); renderDrive(); } })
      .catch(e => { if (e.message !== "reconnect") toast(`Couldn’t rename the library file in Drive (${e.message}). You can rename it there yourself.`); }).finally(() => { DS.renaming = false; });
    m = {...m, name: LIB_NAME};
  }
  DS.link = m.webViewLink || `https://drive.google.com/file/d/${m.id}/view`;
  DS.owner = (m.owners || [])[0] || null;
  DS.file = {id: m.id, name: m.name}; saveDriveFile();
}
/* Pull: merge the library into this browser. Returns whether this browser has decks the library doesn't know yet. */
async function drivePull(){
  const m = await (await dfetch(`/drive/v3/files/${DS.file.id}?fields=${DMETA}&supportsAllDrives=true`)).json();
  useMeta(m);
  const rev = m.headRevisionId || m.modifiedTime;
  if (rev === DS.rev && DS.known) return {ahead: Object.values(S.decks).some(d => !DS.known.has(d.ver))};
  let data = {};
  try { data = await (await dfetch(`/drive/v3/files/${DS.file.id}?alt=media&supportsAllDrives=true`)).json(); } catch (e){ if (e.message === "reconnect") throw e; }
  await storeImages(data.images);
  const sig = () => Object.values(S.decks).map(d => d.id + d.ver).sort().join();
  const fresh = CLOUD() && !DS.loaded;
  if (fresh){ const keep = S.active; S.decks = {}; S.active = keep; }
  const before = fresh ? "" : sig();
  const prevVer = fresh ? null : Object.fromEntries(Object.values(S.decks).map(d => [d.id, d.ver]));
  mergeDecks(data.decks || {});
  if (prevVer){
    const me = meNow(), news = Object.values(S.decks).filter(d => !d.deleted && prevVer[d.id] !== d.ver && d.owner && (!me || d.owner.id !== me.id));
    if (news.length){
      const who = [...new Set(news.map(d => (d.owner.name || "Someone").split(" ")[0]))];
      toast(news.length === 1 ? `${who[0]} updated ${displayName(news[0])}` : `${who.join(", ")} updated ${news.length} decks`);
      if (V && V.kind === "item" && !findCard(V.uid)) closeDetail(true, {anim: false});
    }
  }
  if (!cur()) S.active = liveDecks()[0]?.id || null;
  DS.known = new Set(); for (const d of Object.values(data.decks || {})){ DS.known.add(d.ver); (d.past || []).forEach(v => DS.known.add(v)); }
  DS.remote = data.decks || {};
  DS.members = data.members || {};
  DS.rev = rev;
  if (fresh){
    DS.loaded = true;
    if (LEGACY && DS.canEdit){
      const rep2 = mergeDecks(LEGACY.decks); LEGACY = null;
      try { localStorage.removeItem(KEY); } catch {}
      if (rep2.added.length || rep2.conflicts.length) setTimeout(() => toast(`Decks that were only in this browser were added to the library: ${[...rep2.added, ...rep2.conflicts].join(", ")}`), 400);
    }
    if (!cur()) S.active = liveDecks()[0]?.id || null;
    if (!LEGACY) setTimeout(() => { try { ["command-zone-me", PKEY, KEY].forEach(k => localStorage.removeItem(k)); } catch {} idb.wipe(); }, 3000);
  }
  claimNewDecks();
  // the library's owner takes over decks made before decks had owners, so everyone sees them in the same folder
  if (DS.owner && DS.owner.me && DS.me) for (const d of Object.values(S.decks)) if (!d.owner && !d.deleted){ d.owner = {...DS.me}; touch(d); }
  if (drag){ DS.renderAfterDrag = true; return {ahead: Object.values(S.decks).some(d => !DS.known.has(d.ver))}; }
  if (fresh || sig() !== before){ save(false); render(); }
  return {ahead: Object.values(S.decks).some(d => !DS.known.has(d.ver))};
}
/* Upload without losing anyone's work when several people save at once:
   1. right before uploading, if the file changed since we last merged it, merge it again;
   2. after uploading, look at the file's version history: if someone else's save landed just before ours,
      merge that version too and upload again. Every deck carries its full version history, so merging is safe. */
async function drivePushNow(){
  for (let attempt = 0; attempt < 4; attempt++){
    const m0 = await (await dfetch(`/drive/v3/files/${DS.file.id}?fields=headRevisionId,modifiedTime&supportsAllDrives=true`)).json();
    if ((m0.headRevisionId || m0.modifiedTime) !== DS.rev){ DS.rev = null; await drivePull(); }
    const basedOn = DS.rev;
    const body = libraryPayload();
    const r = await dfetch(`/upload/drive/v3/files/${DS.file.id}?uploadType=media&fields=${DMETA}&supportsAllDrives=true`, {method: "PATCH", headers: {"Content-Type": "application/json"}, body});
    try { DS.remote = JSON.parse(body).decks; } catch {}
    const m = await r.json(); useMeta(m);
    DS.rev = m.headRevisionId || m.modifiedTime;
    DS.known = new Set(); for (const d of Object.values(S.decks)){ DS.known.add(d.ver); (d.past || []).forEach(v => DS.known.add(v)); }
    // did anyone else save between our check and our upload?
    let slipped = null;
    try {
      const revs = ((await (await dfetch(`/drive/v3/files/${DS.file.id}/revisions?fields=revisions(id)&pageSize=1000`)).json()).revisions || []).map(x => x.id);
      const i = revs.indexOf(m.headRevisionId);
      if (i > 0 && basedOn && revs[i - 1] !== basedOn && revs.indexOf(basedOn) < i - 1) slipped = revs.slice(Math.max(0, revs.indexOf(basedOn) + 1), i);
    } catch (e){ if (e.message === "reconnect") throw e; }      // version history unavailable: the 40-second sync still repairs it
    if (!slipped || !slipped.length) return;
    let changed = false;
    for (const rid of slipped){
      try {
        const data = await (await dfetch(`/drive/v3/files/${DS.file.id}/revisions/${rid}?alt=media`)).json();
        await storeImages(data.images);
        const rep = mergeDecks(data.decks || {});
        if (rep.added.length || rep.updated.length || rep.conflicts.length || rep.restored.length) changed = true;
        for (const [id, mm] of Object.entries(data.members || {})) if (!DS.members[id]) DS.members[id] = mm;
      } catch (e){ if (e.message === "reconnect") throw e; }
    }
    if (!changed) return;
    save(false); render();
  }
}
async function driveSync(push){
  if (!DS.token || !DS.file) return;
  if (DS.busy){ DS.again = DS.again || push || "pull"; return; }
  DS.busy = true; setDrive("syncing");
  try {
    const {ahead} = await drivePull();
    if (!DS.permsAt || Date.now() - DS.permsAt > 120000){ DS.permsAt = Date.now(); loadPerms(); }
    if (!DS.permsAt || Date.now() - DS.permsAt > 120000){ DS.permsAt = Date.now(); loadPerms(); }
    if ((push || ahead) && DS.canEdit) await drivePushNow();
    DS.last = Date.now(); setDrive("ok");
  } catch (e){ if (e.message !== "reconnect") setDrive("error", e.message); }
  DS.busy = false;
  if (DS.again){ const p = DS.again === true; DS.again = false; driveSync(p); }
}
function driveSchedule(){
  if (typeof DS === "undefined" || !DS.token || !DS.file) return;
  if (!DS.canEdit){ if (!DS.warnedView){ DS.warnedView = true; toast("View only: your changes stay on this device and aren’t shared"); } return; }
  setDrive("pending");
  clearTimeout(DS.pushT); DS.pushT = setTimeout(() => driveSync(true), 800);
}
/* Checking for other people's changes: a tiny "has the file changed?" request (about 1 KB); the decks are only downloaded
   when something did change. Every 5 s while you use the app (10 s on mobile data or with data saver on: about 0.36 MB an hour),
   every minute after 2 minutes without activity, paused while the tab is hidden. */
function pollDelay(){
  if (Date.now() - lastInput > 120000) return 60000;
  const c = navigator.connection;
  const mobile = c && (c.saveData || c.type === "cellular" || /^(slow-2g|2g|3g)$/.test(c.effectiveType || ""));
  return mobile ? 10000 : 5000;
}
let lastInput = Date.now();
["pointerdown", "keydown", "wheel", "touchstart"].forEach(ev => addEventListener(ev, () => { lastInput = Date.now(); }, {passive: true, capture: true}));
async function pollLoop(){
  try { if (DS.token && DS.file && document.visibilityState === "visible" && !DS.busy && DS.status !== "pending") await driveSync(false); } catch {}
  setTimeout(pollLoop, pollDelay());
}
setTimeout(pollLoop, 5000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && DS.token && DS.file) driveSync(false); });
addEventListener("beforeunload", e => { if (DS.status === "pending" || (DS.busy && DS.canEdit)){ e.preventDefault(); e.returnValue = ""; } });
function setDrive(status, msg){ DS.status = status; DS.msg = msg || ""; renderDrive(); }
async function driveConnect(){
  const p = requestToken();                          // opened straight from the click
  try {
    await p;
    const j = await (await dfetch("/drive/v3/about?fields=user(displayName,emailAddress,permissionId,photoLink)")).json();
    DS.user = j.user || null;
    if (DS.user && DS.user.permissionId){
      DS.me = {id: DS.user.permissionId, name: DS.user.displayName, photo: DS.user.photoLink || ""};
      LAST_ME = DS.me; try { if (CLOUD()) localStorage.removeItem("command-zone-me"); else localStorage.setItem("command-zone-me", JSON.stringify(DS.me)); } catch {}
    }
    render();
    setDrive("ok");
    if (DS.file){ DS.rev = null; await driveSync(false); toast(`Synced with ${DS.file.name}`); }
  } catch (e){ if (e.message !== "reconnect") toast(e.message); renderDrive(); }
}
async function driveCreate(){
  if (!DS.token) return;
  setDrive("syncing");
  try {
    if (LEGACY){ mergeDecks(LEGACY.decks); LEGACY = null; try { localStorage.removeItem(KEY); } catch {} }
    if (DS.me) for (const d of Object.values(S.decks)) if (!d.owner && !d.deleted) d.owner = {...DS.me};
    DS.loaded = true; if (!cur()) S.active = liveDecks()[0]?.id || null;
    save(false);
    const bd = "cz" + uid(), meta = {name: LIB_NAME, mimeType: "application/json", description: "Decks for MTG Deck Builder. Share this file to give friends access: Editor can edit decks, Viewer can only look."};
    const body = `--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${bd}\r\nContent-Type: application/json\r\n\r\n${libraryPayload()}\r\n--${bd}--`;
    const m = await (await dfetch(`/upload/drive/v3/files?uploadType=multipart&fields=${DMETA}`, {method: "POST", headers: {"Content-Type": `multipart/related; boundary=${bd}`}, body})).json();
    useMeta(m); DS.rev = m.headRevisionId || m.modifiedTime; DS.known = null; DS.remote = {...S.decks}; render(); loadPerms();
    DS.last = Date.now(); setDrive("ok");
    showReport("Your shared deck library is ready", [
      `It's a file called “${m.name}” in your Google Drive, and all your decks are in it.`,
      "To invite friends: open it in Drive (the link under Google Drive in the sidebar), press Share and add their email. Editor = can create and edit decks. Viewer = can only look.",
      "Friends then open this website, press “Connect Google Drive” and “Open shared library”, and pick the file."]);
  } catch (e){ if (e.message !== "reconnect") setDrive("error", e.message); }
}
async function driveOpen(){
  if (!DS.token) return;
  try {
    await loadPicker();
    const shared = new google.picker.DocsView(google.picker.ViewId.DOCS).setMimeTypes("application/json").setOwnedByMe(false);
    const own = new google.picker.DocsView(google.picker.ViewId.DOCS).setMimeTypes("application/json").setOwnedByMe(true);
    const picker = new google.picker.PickerBuilder()
      .addView(shared).addView(own)
      .setOAuthToken(DS.token).setDeveloperKey(GDRIVE.apiKey).setAppId(GDRIVE.appId)
      .setTitle("Pick the “MTG Deck Builder” file")
      .setCallback(async d => {
        if (d.action !== google.picker.Action.PICKED || !d.docs || !d.docs[0]) return;
        DS.file = {id: d.docs[0].id, name: d.docs[0].name}; DS.rev = null; DS.known = null; DS.remote = null; DS.members = {}; DS.perms = null; DS.permsAt = 0; saveDriveFile();
        await driveSync(false);
        if (DS.status === "ok") toast(`Connected to ${DS.file.name}${DS.canEdit ? "" : " (view only)"}`);
      }).build();
    picker.setVisible(true);
  } catch (e){ toast("Couldn’t open the Google file chooser. " + (e.message || "")); }
}
function driveSignOut(){
  try { if (DS.token && window.google) google.accounts.oauth2.revoke(DS.token, () => {}); } catch {}
  DS.token = null; DS.user = null;
  if (CLOUD()){ S.decks = {}; DS.loaded = false; DS.known = null; DS.rev = null; DS.remote = null; closeAllViews(); }
  setDrive("off"); render(); toast("Signed out");
}
function driveForget(){
  confirmTwice([{title: "Stop syncing this library?", text: "Your decks stay in the Drive file. You can open the library again anytime.", yes: "Stop syncing", safe: true}], () => { DS.file = null; DS.rev = null; DS.known = null; saveDriveFile(); if (CLOUD()){ S.decks = {}; DS.loaded = false; closeAllViews(); } setDrive(DS.token ? "ok" : "off"); render(); });
}
function closeAllViews(){ ["#addScrim", "#pdfScrim", "#confirmScrim"].forEach(s => { if (!$(s).hidden) $(s).hidden = true; }); if (V) closeDetail(true, {anim: false}); }
function agoText(t){ const s = Math.round((Date.now() - t) / 1000); return s < 10 ? "just now" : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`; }
function renderDrive(){
  renderProfile();
  if (gated() && !$("#welcome").hidden) renderGate();
  const box = $("#driveBox"); if (!box) return;
  const cloud = '<svg class="i" viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.1 4.5 4.5 0 0 0 7 18z"/></svg>';
  let h = `<div class="drv-title">${cloud}Google Drive</div>`;
  if (!driveConfigured()) h += `<div class="drv-note">Sync isn’t set up yet.</div>`;
  else if (location.protocol !== "https:") h += `<div class="drv-note">Drive sync works on the website: <a href="https://callenilsson.github.io/mtg-deck-builder/" target="_blank" rel="noopener">open it</a>.</div>`;
  else if (!DS.token){
    h += DS.file ? `<div class="drv-note">Library: <b>${esc(DS.file.name)}</b>${DS.status === "reconnect" ? " · signed out" : ""}</div>` : `<div class="drv-note">Share decks with friends through one file in Google Drive.</div>`;
    h += `<button class="btn drv-main" id="drvConnect">${DS.file ? "Sync with Google Drive" : "Connect Google Drive"}</button>`;
  } else if (!DS.file){
    h += `<div class="drv-note">Signed in as <b>${esc(DS.user ? DS.user.displayName : "you")}</b></div>
      <button class="btn drv-main" id="drvCreate" title="Make a new library file in your Drive with all your decks">Create shared library</button>
      <button class="btn" id="drvOpen" title="Pick a library file someone shared with you">Open shared library</button>
      <button class="link-btn" id="drvOut">Sign out</button>`;
  } else {
    const st = DS.status === "syncing" ? "Syncing…" : DS.status === "pending" ? "Saving…" : DS.status === "error" ? "Sync problem" : DS.last ? `Synced ${agoText(DS.last)}` : "Connected";
    h += `<div class="drv-status ${DS.status}" title="${esc(DS.msg)}"><i></i>${st}${DS.status === "error" ? `: ${esc(DS.msg).slice(0, 80)}` : ""}</div>
      <div class="drv-note"><a href="${esc(DS.link || "#")}" target="_blank" rel="noopener" title="Open in Google Drive to share it">${esc(DS.file.name)} ↗</a>
        <span class="drv-role ${DS.canEdit ? "ed" : "vw"}">${DS.canEdit ? "Editor" : "View only"}</span></div>
      <div class="drv-row"><button class="btn sm" id="drvSync">Sync now</button><button class="btn sm" id="drvOpen" title="Open a different library file">Switch</button><button class="link-btn" id="drvForget">Stop</button><button class="link-btn" id="drvOut">Sign out</button></div>`;
  }
  box.innerHTML = h;
}
setInterval(() => { if (DS.status === "ok" && DS.file) renderDrive(); }, 30000);
$("#driveBox").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "drvConnect") driveConnect();
  else if (b.id === "drvCreate") driveCreate();
  else if (b.id === "drvOpen") driveOpen();
  else if (b.id === "drvSync"){ DS.rev = null; driveSync(false); }
  else if (b.id === "drvOut") driveSignOut();
  else if (b.id === "drvForget") driveForget();
});
