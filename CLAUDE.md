# MTG Deck Builder — notes for Claude

Commander (EDH) deck builder. Plain static site, no build step, no framework. Live at
https://callenilsson.github.io/mtg-deck-builder/ (GitHub Pages serves `main` as-is). Only Claude edits this repo.

## How the code is put together
- `index.html`: page markup + the ordered list of `<link>`/`<script>` tags. **Load order matters.**
- `css/*.css`: one cascade split into files, in the order listed in index.html.
- `js/**.js`: classic scripts (not modules). They share one global scope, so any top-level
  function/const in one file is visible to the others. Each starts with `"use strict"`.
- Rule: code that *runs while a file loads* (top-level calls, IIFEs, `setTimeout(fn)`) may only use names
  from that file or earlier ones. Startup calls belong in `js/app/main.js` (loaded last).
  `node dev/check.mjs .` verifies this (deploy runs it).
- Inline handlers in generated HTML (e.g. `onload="flLoaded(this)"`) rely on functions being global.

## Where things are
| Area | Files |
|---|---|
| Helpers, constants, toast, mana symbols | js/core/util.js |
| Ownership / read-only guard; custom images (IndexedDB) | js/core/prefs.js, js/core/images.js |
| Scryfall requests (rate limit), prices, EDHREC | js/data/scryfall.js, prices.js, edhrec.js |
| Deck state, versioned merging, load/save | js/data/decks.js |
| Google Drive library (sign-in, Picker, sync) | js/data/drive.js |
| JSON backup / import | js/data/files.js |
| render(), deck list sidebar + rail | js/app/render.js, js/app/deck-list.js |
| Board: tiles/sort/filter, tokens, drag, clicks, FLIP, touch scroll bars | js/board/* |
| Stats: info bubbles, curve, roles, odds, color balance, types | js/stats/* |
| Test hand + 1,000-game simulation | js/stats/test-hand.js |
| Panels/splitter/resizing, toolbar & zoom, get-the-app (install.js), stats window, scrims | js/layout/* |
| Add-cards window, confirm/report, PDF print | js/modals/* |
| Card view: state (V), open/close flights, cover flow, art editor, save | js/card-view/* |
| Event wiring, update check, startup | js/app/main.js |

Styles follow the same names (card-view.css, test-hand.css, commander-panel.css, …).

## Work loop
- Test headless: `dev/test.sh <outdir> W H [mobile]` runs `<outdir>/steps.json` (steps: js, wait, shot,
  clickjs, dragjs, swipejs, pinchjs — see dev/cdp.mjs). It embeds real decks and turns off price refresh.
  Check phones (360x780, 412x915), sideways (844x390), fold (884x916), desktop 1440/1920, ultrawide.
- Publish: `./deploy.sh "message"` (stamps build number + `?v=` cache busting, commits, pushes).
- The update check compares `<meta name="build">` on the live page with the running one.

## Standing rules from the user
- Website data lives only in the Drive JSON; the browser keeps only UI preferences.
- Access is managed only through Drive sharing. No backups (git is the history).
- Commit as 16915094+callenilsson@users.noreply.github.com (already set in this repo), never a work email.
- The user dictates by speech-to-text: read loosely ("ipod slide" = cover flow, "dick" = deck).
- Must work on phones, Pixel Fold folded/unfolded, sideways phones, desktop and ultrawide, Interface 40–200%.
