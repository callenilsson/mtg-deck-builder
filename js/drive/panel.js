"use strict";
/* Google Drive box in the deck list: connect, create or open a library, sign out, status. */
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
