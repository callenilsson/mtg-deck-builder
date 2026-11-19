"use strict";
/* Screen modes: phone, compact (touch sideways / foldables / small tablets), short landscape. */
// compact: phones (any way up), unfolded foldables and small touch tablets: both side menus start folded into thin rails
const COMPACT_Q = matchMedia("(max-width: 820px), (pointer: coarse) and (orientation: landscape) and (max-height: 500px), (pointer: coarse) and (min-width: 821px) and (max-width: 1100px)");
const LAND_Q = matchMedia("(orientation: landscape) and (max-height: 500px)");
const isCompact = () => COMPACT_Q.matches;
const isPhone = () => innerWidth <= 820 && !LAND_Q.matches;
let CMP_OPEN = false;      // compact mode: is the full commander panel open (it starts folded into the rail)
function applyCompact(){ document.body.classList.toggle("compact", isCompact()); }
applyCompact();
for (const q of [COMPACT_Q, LAND_Q]) q.addEventListener("change", () => { applyCompact(); CMP_OPEN = false; if (isCompact() || innerWidth < 1280) S.sidebarOpen = false; render(); applyZoom(); });
