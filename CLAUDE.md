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
- Each feature file holds its own state, drawing and event wiring; `app/main.js` only starts the app.
  Every file starts with a one-line comment saying what it is.
- `node dev/inventory.mjs .` lists every top-level function/const/statement per file (find where a name lives).
- Listeners on the same element+event run in registration (= load) order: card-view/swipe.js must stay
  before card-view/art-gestures.js and card-view/events.js.

## Where things are (js/, in load order)
| Folder | Files |
|---|---|
| core/ (no app state) | constants, icons (`I`), dom (`$`, esc, toast), cards (mana, qty helpers), prefs (`UI`), identity (who/owner, `guard`), screen (`isPhone`, compact), images (IndexedDB art, image loading) |
| data/ | scryfall (`sf`, rate limit), prices, edhrec, game-changers, decks (`S`, merge, load/save, `cur`), deck-actions (lock, move, qty, remove), files (JSON backup/import) |
| app/ | render (`render()`), deck-list (left menu + rail), header (commander panel + its rail), welcome (no deck / sign-in), install (Home Screen), update (new version, Reload), main (startup) |
| stats/ | info-bubbles (`?`), roles, math (hypergeometric), opening, colors (castability), panel (types table, curve, creature types, phone stats window) |
| board/ | flip, scroll-bars, suggestions, sorting, tiles, tokens, board (`renderBoard`), jump, hover, drag, clicks |
| layout/ | panels (divider, menu widths), toolbar (card/interface size, sort, filter), scrims (windows open/close) |
| modals/ | add-cards (open/render), add-cards-search (load/events/commander), confirm, pdf |
| card-view/ | state (`V`), flights (open/close animation), panel (window + details), coverflow (3D cards, dealing), prints (artworks), versions (customizations), swipe, canvas (drawing), art-gestures, events (buttons/keys), save |
| drive/ | auth (token, Picker, `dfetch`), sync (pull/push/poll), panel (Drive box) |
| test-hand/ | simulate (rules, 1,000 games), window |

Styles: css/ files named by area (card-view.css, test-hand.css, commander-panel.css, toolbar.css, …).

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
