"use strict";
/* Inline SVG icons (I.name). */
const I = {
  lock:'<svg class="i" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock:'<svg class="i" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>',
  focus:'<svg class="i" viewBox="0 0 24 24"><circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/><path d="M12 7.2a6 6 0 0 1 0 9.6a6 6 0 0 1 0-9.6z" fill="currentColor" fill-opacity=".35" stroke="none"/></svg>',
  close:'<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  grip:'<svg class="i" viewBox="0 0 24 24" style="stroke-width:2.6"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg>',
  trash:'<svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  search:'<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  flip:'<svg class="i" viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/></svg>',
  right:'<svg class="i" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  left:'<svg class="i" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  pencil:'<svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  copy:'<svg class="i" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  brush:'<svg class="i" viewBox="0 0 24 24"><path d="M14 4l6 6-9 9H5v-6z"/><path d="M12 6l6 6"/></svg>',
  pin:'<svg class="i" viewBox="0 0 24 24"><path d="M9 4h6l-1 6 4 3v2H6v-2l4-3z"/><path d="M12 15v6"/></svg>',
  down:'<svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  upload:'<svg class="i" viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>',
  foldL:'<svg class="i" viewBox="0 0 24 24"><path d="M11 7l-5 5 5 5M18 7l-5 5 5 5"/></svg>',
  foldR:'<svg class="i" viewBox="0 0 24 24"><path d="M6 7l5 5-5 5M13 7l5 5-5 5"/></svg>',
  foldU:'<svg class="i" viewBox="0 0 24 24"><path d="M7 13l5-5 5 5M7 19l5-5 5 5"/></svg>',
  foldD:'<svg class="i" viewBox="0 0 24 24"><path d="M7 5l5 5 5-5M7 11l5 5 5-5"/></svg>',
  swap:'<svg class="i" viewBox="0 0 24 24"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
  panelL:'<svg class="i" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/><path d="M15.5 9.5L13 12l2.5 2.5"/></svg>',
  panelR:'<svg class="i" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/><path d="M13 9.5l2.5 2.5-2.5 2.5"/></svg>',
  menu:'<svg class="i" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  undo:'<svg class="i" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>'
};
