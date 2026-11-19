#!/data/data/com.termux/files/usr/bin/bash
# Headless test run: copies the site to $OUT with real decks embedded and background price refresh off,
# then drives Chromium with $OUT/steps.json (see cdp.mjs). Usage: dev/test.sh OUT W H [mobile]
set -e
REPO=$(cd "$(dirname "$0")/.." && pwd); OUT=$1; shift
DECKS='/data/data/com.termux/files/home/storage/shared/Download/command-zone-2026-11-14 (2).html'
mkdir -p "$OUT"; rm -rf "$OUT/site"; mkdir "$OUT/site"; cp -r "$REPO/index.html" "$REPO/css" "$REPO/js" "$OUT/site/"
python -I - "$DECKS" "$OUT/site/index.html" <<'PY'
import re, sys
pat = re.compile(r'(<script id="embedded-decks" type="application/json">)(.*?)(</script>)', re.S)
data = pat.search(open(sys.argv[1], encoding='utf-8').read()).group(2)
t = open(sys.argv[2], encoding='utf-8').read(); m = pat.search(t)
open(sys.argv[2], 'w', encoding='utf-8').write(t[:m.start(2)] + data + t[m.end(2):])
PY
sed -i 's/^async function refreshCheap(d){/async function refreshCheap(d){ return;/' "$OUT/site/js/data/prices.js"
cd "$OUT"; rm -rf prof
chromium-browser --headless=new --no-sandbox --disable-gpu --user-data-dir=prof --remote-debugging-port=9333 about:blank >/dev/null 2>&1 &
CH=$!; sleep 4
timeout 150 node "$REPO/dev/cdp.mjs" 9333 "file://$OUT/site/index.html" "$OUT" "$@" || true
kill $CH 2>/dev/null; wait $CH 2>/dev/null || true
