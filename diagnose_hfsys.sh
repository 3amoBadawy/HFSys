#!/usr/bin/env bash
set -u  # لو متغير ناقص بس ما نخرجش من السكربت
LOG="diagnose_$(date +%Y%m%d_%H%M%S).log"

say(){ printf "\n===== %s =====\n" "$*" | tee -a "$LOG"; }
run(){ echo "\$ $*" | tee -a "$LOG"; eval "$@" 2>&1 | tee -a "$LOG"; }

API_BASE="${API_BASE:-https://hfsys.onrender.com}"
WEB_BASE="${WEB_BASE:-https://3amobadawy.github.io/HFSys}"

: > "$LOG"
say "Basics"
run 'echo SHELL=$SHELL'
run 'node -v || true'
run 'npm -v || true'
run 'git --version || true'
run 'pwd'
run 'ls -la'

say "Git status / branches / worktrees"
run 'git status'
run 'git branch -vv'
run 'git worktree list || true'
run 'ls -la .gh-pages || true'
run 'test -d .gh-pages/.git && echo ".gh-pages has .git ✅" || echo ".gh-pages/.git MISSING ❌"'

say "Last commits"
run 'git log -3 --oneline --graph --decorate'

say "Vite config (base, server, proxy)"
run "sed -n '1,200p' web/vite.config.js || true"

say "Web presence (version.json existence)"
run 'ls -la web/public || true'
run 'test -f web/public/version.json && echo "web/public/version.json ✅" || echo "web/public/version.json ❌"'
run 'ls -la web/dist || true'
run 'test -f web/dist/version.json && echo "web/dist/version.json ✅" || echo "web/dist/version.json ❌"'

say "API index wiring (imports + app.use)"
run "nl -ba api/index.js | sed -n '1,140p' || true"
run "grep -n \"import .* from './products.js'\" api/index.js || true"
run "grep -n \"app.use('/', auth, productsRouter)\" api/index.js || true"
run "grep -n \"app.use('/', auth, customersRouter)\" api/index.js || true"
run "grep -n \"app.use('/', auth, router)\" api/index.js || true"

say "Products router file exists + key routes"
run 'ls -la api/products.js || true'
run "grep -n \"router.get('/products'\" api/products.js || true"
run "grep -n \"export default router\" api/products.js || true"
run "sed -n '1,160p' api/products.js || true"

say "Customers router quick check"
run 'ls -la api/customers.js || true'
run "grep -n \"router.get('/customers'\" api/customers.js || true"

say "API live checks (no token + token)"
run "curl -sSI $API_BASE/ | head -n 8 || true"
run "curl -sS $API_BASE/health || true"

# token (لو موجود محليًا)
TOKEN=""
if [ -f .hf_token ]; then TOKEN="$(tr -d '\r\n' < .hf_token)"; fi
if [ -n "$TOKEN" ]; then
  say "With token from .hf_token"
  run "curl -si -H 'Authorization: Bearer $TOKEN' $API_BASE/customers | head -n 20 || true"
  run "curl -si -H 'Authorization: Bearer $TOKEN' $API_BASE/products  | head -n 20 || true"
else
  say ".hf_token not found — skipping authenticated curls"
fi

say "GitHub Pages checks"
run "curl -sSI $WEB_BASE/ | head -n 8 || true"
run "curl -sS $WEB_BASE/version.json || echo 'version.json missing'"

say "Package.json (root + web)"
run "sed -n '1,160p' package.json || true"
run "sed -n '1,200p' web/package.json || true"

say "Done. Log file written"
echo "Log path: $LOG" | tee -a "$LOG"
