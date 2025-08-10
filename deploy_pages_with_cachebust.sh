set -euo pipefail

ROOT="$(pwd)"
WEB="$ROOT/web"
DIST="$WEB/dist"
WT=".gh-pages"

echo "▶ Build"
npm --prefix "$WEB" ci || npm --prefix "$WEB" install
npm --prefix "$WEB" run build

# version.json عشان الكلاينت يعرف إن في نسخة جديدة
BUILD_TS=$(date +%s)
mkdir -p "$DIST"
echo "{\"build\":\"$BUILD_TS\"}" > "$DIST/version.json"

# SPA 404
cp "$DIST/index.html" "$DIST/404.html"

echo "▶ Prepare gh-pages worktree (no remove)"
git fetch origin || true
if [ ! -d "$WT" ]; then
  git worktree add -B gh-pages "$WT" origin/gh-pages 2>/dev/null || \
  git worktree add -B gh-pages "$WT"
else
  (cd "$WT" && git checkout gh-pages && git pull --ff-only || true)
fi

echo "▶ Sync dist → $WT"
rsync -a --delete "$DIST/." "$WT/"

echo "▶ Commit & Push"
(
  cd "$WT"
  git add -A
  git commit -m "deploy: $(date -Iseconds)" || true
  git push origin gh-pages
)

echo "✅ Done. افتح: https://3amobadawy.github.io/HFSys/ (والمتصفح هيحدّث نفسه تلقائيًا)."
