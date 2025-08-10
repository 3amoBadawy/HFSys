#!/usr/bin/env bash
set -euo pipefail

WEB="web"
WT=".gh-pages"

echo "▶ prune + تنظيف أي ميتاداتا قديمة"
git worktree prune || true
rm -rf .git/worktrees/gh-pages || true
rm -rf "$WT" || true

echo "▶ إعادة إنشاء worktree على gh-pages"
git fetch origin || true
if git rev-parse --verify origin/gh-pages >/dev/null 2>&1; then
  git worktree add -B gh-pages "$WT" origin/gh-pages
else
  git worktree add -B gh-pages "$WT"
fi

echo "▶ مزامنة build إلى gh-pages"
rsync -a --delete "$WEB/dist/" "$WT/"

echo "▶ commit & push داخل worktree"
( cd "$WT"
  git add -A
  git -c user.name="deployer" -c user.email="deployer@local" \
      commit -m "pages: $(date -Iseconds)" || true
  git push origin gh-pages
)

echo "✅ Pages done: https://3amobadawy.github.io/HFSys/  — اعمل Hard Refresh (Cmd/Ctrl+Shift+R)"
