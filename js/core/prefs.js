"use strict";
/* Per-screen preferences (UI): sort, sizes, panel widths. Kept in this browser only. */
const UI = {sort: "manual", filter: "", ctype: "", split: .5, zoom: 100, cur: "eur", pin: false, addSort: "best", pricey: 20, collapsed: {}, uiz: 100};
try { Object.assign(UI, JSON.parse(localStorage.getItem(UIKEY) || "{}")); } catch {}
try { const z = localStorage.getItem("command-zone-card-size"); if (z && !localStorage.getItem(UIKEY)) UI.zoom = +z; } catch {}
UI.filter = "";
 UI.ctype = "";
 UI.role = "";
function saveUI(){ try { const {filter, ctype, ...keep} = UI; localStorage.setItem(UIKEY, JSON.stringify(keep)); } catch {} }
