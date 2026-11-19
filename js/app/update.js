"use strict";
/* Always the newest version: compare build numbers, reload into the new one; the Reload button. */
/* Always run the newest version: GitHub Pages lets browsers cache the page for ~10 minutes,
   so ask for the current build number directly and switch when it's newer. */
async function latestBuild(){
  const r = await fetch(location.pathname + "?build-check=" + Date.now(), {cache: "no-store"});
  const m = (await r.text()).match(/<meta name="build" content="([^"]+)">/);
  return m ? m[1] : null;
}
const freshUrl = b => location.pathname + "?v=" + encodeURIComponent(b) + location.hash;
async function checkForUpdate(onStart){
  if (location.protocol !== "https:" || BUILD === "dev") return;
  try {
    const b = await latestBuild();
    if (!b || b === BUILD) return;
    if (onStart && !sessionStorage.getItem("mtg-updated-to-" + b)){ sessionStorage.setItem("mtg-updated-to-" + b, "1"); location.replace(freshUrl(b)); return; }
    $("#updateBar").hidden = false; $("#updateBar").onclick = () => location.replace(freshUrl(b));
  } catch {}
}
checkForUpdate(true);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkForUpdate(false); });
setInterval(() => checkForUpdate(false), 10 * 60 * 1000);
/* Reload button: the installed app has no browser reload, and pulling down only works at the very top.
   Waits while changes are still being saved to Drive, and always loads the newest version. */
$("#reloadBtn").addEventListener("click", async () => {
  if (DS.status === "pending" || (DS.busy && DS.canEdit)){ toast("Saving your changes first… try again in a moment"); return; }
  let b = null; try { if (location.protocol === "https:") b = await latestBuild(); } catch {}
  if (b) location.replace(freshUrl(b)); else location.reload();
});
