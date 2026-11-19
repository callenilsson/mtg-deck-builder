#!/data/data/com.termux/files/usr/bin/bash
# Publish: stamp a new build number (page + every css/js link, so browsers fetch the new files), commit, push.
# GitHub Pages serves main as-is. Usage: ./deploy.sh "commit message"
set -e
cd "$(dirname "$0")"
node dev/check.mjs . >/dev/null || { node dev/check.mjs .; exit 1; }
BUILD=$(date -u +%Y%m%d%H%M%S)
grep -q '"decks":{}}</script>' index.html || { echo "index.html has embedded decks; refusing to publish"; exit 1; }
sed -i -E "s/<meta name=\"build\" content=\"[^\"]*\">/<meta name=\"build\" content=\"$BUILD\">/; s/\.(css|js)\?v=[A-Za-z0-9]+\"/.\1?v=$BUILD\"/g" index.html
git add -A
git commit -q -m "${1:-Update app}

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q
echo "published build $BUILD"
