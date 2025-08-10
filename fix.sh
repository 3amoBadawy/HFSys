set -euo pipefail

ROOT="$(pwd)"
WEB="$ROOT/web/src"
APP="$WEB/App.jsx"
VITECFG="$ROOT/web/vite.config.js"

echo "▶️ Backups"
mkdir -p "$ROOT/.backups"
cp -f "$APP" "$ROOT/.backups/App.jsx.$(date +%s)" 2>/dev/null || true
cp -f "$VITECFG" "$ROOT/.backups/vite.config.js.$(date +%s)" 2>/dev/null || true

echo "▶️ Ensure imports (Products/Customers/AdminDashboard)"
node - <<'JS'
const fs = require('fs'), p = require('path');
const APP = p.resolve('web/src/App.jsx');
let s = fs.readFileSync(APP,'utf8');
function ensureImport(code, what, fromPath){
  const rx = new RegExp(`^\\s*import\\s+${what}\\s+from\\s+['"]${fromPath}['"];?`, 'm');
  if(!rx.test(code)) code = code.replace(/(^\s*import[^\n]+\n)/, `$1import ${what} from '${fromPath}';\n`);
  return code;
}
s = ensureImport(s,'Products','./Products');
s = ensureImport(s,'Customers','./Customers');
if(!/import\s+AdminDashboard\s+from\s+['"]\.\/(AdminDashboard|Admin)['"]/.test(s)){
  s = ensureImport(s,'AdminDashboard','./Admin');
}
// أصلّح أي بقايا كسر في بلوك المنتجات اللي كان عامل خطأ
if(/\{tab===['"]products['"]\s*\{/.test(s)){
  s = s.replace(/\{tab===['"]products['"][\s\S]*?(?=(\{tab===['"](customers|admin)['"]))/, `
{tab==='products' && (
  <div className="card">
    <h3 className="h2">المنتجات</h3>
    <Products/>
  </div>
)}
$1`);
}
// لو مفيش بلوك منتجات بعد الإصلاح، أضفه قبل نهاية return
if(!/\{tab===['"]products['"]\s*&&/.test(s)){
  s = s.replace(/(\n\s*\)\s*;\s*\n\s*\})\s*$/, `
{tab==='products' && (
  <div className="card">
    <h3 className="h2">المنتجات</h3>
    <Products/>
  </div>
)}
$1`);
}
// تأكيد بلوك العملاء/الإدارة (لو مش موجودين)
if(!/\{tab===['"]customers['"]\s*&&/.test(s)){
  s = s.replace(/(\{tab===['"]products['"].*?\}\)\s*)/s, `$1
{tab==='customers' && (
  <div className="card">
    <h3 className="h2">العملاء</h3>
    <Customers/>
  </div>
)}
`);
}
if(!/\{tab===['"]admin['"]\s*&&\s*isAdmin/.test(s)){
  s = s.replace(/(\{tab===['"]customers['"].*?\}\)\s*)/s, `$1
{tab==='admin' && isAdmin && <AdminDashboard/>}
`);
}
s = s.replace(/\n{3,}/g,'\n\n');
fs.writeFileSync(APP,s,'utf8');
console.log('App.jsx patched ✅');
JS

echo "▶️ Vite base => /HFSys/"
cat > "$VITECFG" <<'CFG'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  base: '/HFSys/',
  plugins: [react()],
})
CFG

echo "▶️ Install & build"
npm --prefix web ci || npm --prefix web install
npm --prefix web run build

echo "▶️ SPA 404"
cp web/dist/index.html web/dist/404.html

echo "▶️ Deploy gh-pages"
git worktree remove .gh-pages --force 2>/dev/null || true
git fetch origin || true
if git rev-parse --verify origin/gh-pages >/dev/null 2>&1; then
  git worktree add -B gh-pages .gh-pages origin/gh-pages
else
  git worktree add -B gh-pages .gh-pages
fi
rm -rf .gh-pages/*
cp -r web/dist/* .gh-pages/
touch .gh-pages/.nojekyll
( cd .gh-pages
  git add .
  git -c user.name="deploy-bot" -c user.email="deploy@local" commit -m "deploy $(date -Iseconds)" || true
  git push origin gh-pages
)
echo "✅ Done. افتح: https://3amobadawy.github.io/HFSys/ واعمِل Hard Refresh."
