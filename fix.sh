# ===== fix products API + publish version.json to Pages, then verify =====
set -euo pipefail

ROOT="$(pwd)"
API="$ROOT/api"
WEB="$ROOT/web"
SRC="$WEB/src"
DIST="$WEB/dist"
WT=".gh-pages"

echo "▶ Ensure products router"
mkdir -p "$API"
cat > "$API/products.js" <<'EOF'
import express from 'express'
import fs from 'fs'
import { nanoid } from 'nanoid'

const DB_PATH = './db.json'

function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({
      invoices:[], products:[], customers:[], roles:[{name:'admin',permissions:['manage_users','view_users']}]
    }, null, 2))
  }
  return JSON.parse(fs.readFileSync(DB_PATH,'utf-8'))
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)) }

const router = express.Router()

router.get('/products', (req,res)=>{
  const db = loadDB()
  res.json(db.products || [])
})

router.post('/products', (req,res)=>{
  const db = loadDB()
  const body = req.body || {}
  const product = {
    id: nanoid(),
    name: String(body.name||'').trim(),
    sku: String(body.sku||'').trim(),
    price: Number(body.price||0),
    createdAt: new Date().toISOString()
  }
  if(!product.name){ return res.status(400).json({error:'الاسم مطلوب'}) }
  db.products = db.products || []
  db.products.push(product)
  saveDB(db)
  res.status(201).json(product)
})

router.delete('/products/:id', (req,res)=>{
  const db = loadDB()
  const before = (db.products||[]).length
  db.products = (db.products||[]).filter(p=>p.id!==req.params.id)
  const after = db.products.length
  saveDB(db)
  res.json({ ok: true, removed: before-after })
})

export default router
EOF

echo "▶ Wire products router into api/index.js (idempotent)"
# أضف import لو مش موجود
grep -q "import productsRouter from './products.js'" "$API/index.js" || \
  sed -i "1 a import productsRouter from './products.js'" "$API/index.js"
# استعمل الراوتر بعد الـrouter الأساسي (وتحت auth)
grep -q "app.use('/', auth, productsRouter)" "$API/index.js" || \
  sed -i "s@app.use('/', auth, router);@app.use('/', auth, router);\napp.use('/', auth, productsRouter);@" "$API/index.js"

echo "▶ Commit & Push API changes (Render سيبني تلقائيًا)"
git add "$API/products.js" "$API/index.js" || true
git commit -m "fix(api): ensure products router and wiring" || true
git push || true

echo "▶ Build web and create version.json for cache-bust"
npm --prefix "$WEB" ci || npm --prefix "$WEB" install
npm --prefix "$WEB" run build
mkdir -p "$DIST"
cp "$DIST/index.html" "$DIST/404.html"
echo "{\"build\":\"$(date +%s)\"}" > "$DIST/version.json"

echo "▶ Publish to gh-pages (stable worktree, no remove)"
git fetch origin || true
if [ ! -d "$WT/.git" ]; then
  rm -rf "$WT"
  git worktree add -B gh-pages "$WT" origin/gh-pages 2>/dev/null || \
  git worktree add -B gh-pages "$WT"
else
  (cd "$WT" && git checkout gh-pages && git pull --ff-only || true)
fi
rsync -a --delete "$DIST/" "$WT/"
touch "$WT/.nojekyll"
( cd "$WT" && git add -A && git -c user.name="deploy" -c user.email="deploy@local" commit -m "deploy: $(date -Iseconds)" || true && git push origin gh-pages )

echo "▶ Wait 20s for Render (API) to roll..."
sleep 20

# ====== verifier (inline) ======
API_BASE="${API_BASE:-https://hfsys.onrender.com}"
WEB_BASE="${WEB_BASE:-https://3amobadawy.github.io/HFSys}"
EMAIL="${HF_EMAIL:-admin@highfurniture.com}"
PASS="${HF_PASS:-Admin@123}"
TOKEN_FILE=".hf_token"

echo "▶ Verify health"
curl -fsS -o /dev/null -w "API /health: %{http_code}\n" "$API_BASE/health"

echo "▶ Ensure token"
TOKEN=""
[ -f "$TOKEN_FILE" ] && TOKEN="$(cat "$TOKEN_FILE" | tr -d '\n\r')"
if [ -z "$TOKEN" ]; then
  LOGIN_RES="$(curl -fsS -X POST "$API_BASE/login" -H 'Content-Type: application/json' --data "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")" || true
  TOKEN="$(echo "$LOGIN_RES" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  [ -n "$TOKEN" ] && printf "%s" "$TOKEN" > "$TOKEN_FILE"
fi

echo "▶ GET /customers"
curl -fsS -H "Authorization: Bearer $TOKEN" "$API_BASE/customers" >/dev/null && echo "OK" || echo "FAIL"

echo "▶ GET /products"
curl -fsS -H "Authorization: Bearer $TOKEN" "$API_BASE/products" >/dev/null && echo "OK" || echo "FAIL"

echo "▶ version.json on Pages"
curl -fsS "$WEB_BASE/version.json" && echo

echo "✅ Done. افتح الموقع واعمل Hard Refresh. لو GET /products لسه FAIL بعد دقيقة، ابعِتلي آخر لوج من Render."