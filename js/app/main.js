"use strict";
/* Startup. Loaded last: every other file is ready. */
applyZoom();
 applySplit();
 applyUiZoom();
initScrollBars();
installNudge();
load();
render();
applyZoom();             // again now that the menus and board have their real sizes
renderDrive();
 initGoogle();
idb.loadAll().then(() => { if (IMG.size) render(); });
