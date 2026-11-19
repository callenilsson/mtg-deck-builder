"use strict";
/* Google Drive: the shared library file, pulling and pushing decks safely, polling for other people's changes. */
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
