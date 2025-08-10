#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
API="$ROOT/api"
WEB="$ROOT/web"
BACK="$ROOT/.backups/$(date +%s)"
WT="$ROOT/.gh-pages"

echo "▶️ Backups -> $BACK"
mkdir -p "$BACK"
cp -rf "$API" "$BACK/" 2>/dev/null || true
cp -rf "$WEB" "$BACK/" 2>/dev/null || true

echo "▶️ Write/ensure api/products.js"
mkdir -p "$API"
cat > "$API/products.js" <<'JS'
import express from 'express';
import fs from 'fs';
import { nanoid } from 'nanoid';

const DB_PATH = './db.json';
function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({ invoices:[], products:[], customers:[], roles:[], users:[], lastSeq:0 }, null, 2));
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH,'utf-8')||'{}');
  if(!Array.isArray(db.products)) db.products = [];
  return db;
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db,null,2)); }

const router = express.Router();

router.get('/products', (_req,res)=>{
  const db = loadDB();
  res.json(db.products || []);
});

router.post('/products', express.json(), (req,res)=>{
  const { name, sku='', price=0 } = req.body || {};
  if(!name) return res.status(400).json({error:'name required'});
  const db = loadDB();
  const item = { id: nanoid(8), name, sku, price: Number(price)||0, createdAt: Date.now() };
  db.products.push(item); saveDB(db);
  res.status(201).json(item);
});

router.put('/products/:id', express.json(), (req,res)=>{
  const { id } = req.params;
  const db = loadDB();
  const i = db.products.findIndex(p=>p.id===id);
  if(i<0) return res.status(404).json({error:'not found'});
  db.products[i] = { ...db.products[i], ...req.body, id };
  saveDB(db);
  res.json(db.products[i]);
});

router.delete('/products/:id', (req,res)=>{
  const { id } = req.params;
  const db = loadDB();
  const before = db.products.length;
  db.products = db.products.filter(p=>p.id!==id);
  if(db.products.length===before) return res.status(404).json({error:'not found'});
  saveDB(db);
  res.json({ok:true});
});

export default router;
JS

echo "▶️ Wire products router into api/index.js (import + app.use)"
IDX="$API/index.js"
# import (ensure one line only)
grep -q "import productsRouter from './products.js'" "$IDX" || \
  sed -i "3 i import productsRouter from './products.js'" "$IDX"

# mount before customers if present; otherwise after main router
if ! grep -q "app.use('/', auth, productsRouter)" "$IDX"; then
  if grep -q "app.use('/', auth, customersRouter)" "$IDX"; then
    sed -i "s|app.use('/', auth, customersRouter)|app.use('/', auth, productsRouter)\napp.use('/', auth, customersRouter)|" "$IDX"
  elif grep -q "app.use('/', auth, router)" "$IDX"; then
    sed -i "s|app.use('/', auth, router)|app.use('/', auth, router)\napp.use('/', auth, productsRouter)|" "$IDX"
  else
    # أخيراً لو مش لاقي ولا واحدة، ضيف في آخر الملف
    printf "\napp.use('/', auth, productsRouter)\n" >> "$IDX"
  fi
fi

echo "▶️ Patch frontend for safe lists (fallback empty arrays)"
# بدّل أي استخدام مباشر .map على متغيرات شائعة
find "$WEB/src" -type f \( -name "*.jsx" -o -name "*.js" \) -print0 | while IFS= read -r -d '' f; do
  sed -i \
    -e "s/\bitems\.map(/(items||[]).map(/g" \
    -e "s/\bproducts\.map(/(products||[]).map(/g" \
    -e "s/\bcustomers\.map(/(customers||[]).map(/g" \
    "$f" || true
done

echo "▶️ Ensure version.json (web/public + copy to dist after build)"
mkdir -p "$WEB/public"
BUILD_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo dev)"
date -Iseconds > /tmp/_now.txt
NOW="$(cat /tmp/_now.txt)"
echo "{ \"build\": \"$BUILD_SHA\", \"time\": \"$NOW\" }" > "$WEB/public/version.json"

echo "▶️ Frontend build"
npm --prefix "$WEB" ci || npm --prefix "$WEB" install
npm --prefix "$WEB" run build
cp "$WEB/dist/index.html" "$WEB/dist/404.html" || true
cp "$WEB/public/version.json" "$WEB/dist/version.json" || true

echo "▶️ Commit & push (trigger Render deploy)"
git add -A
git commit -m "fix(api+web): products router + safe maps + version.json" || true
git push || true

echo "▶️ Deploy to GitHub Pages (no worktree remove)"
# جهّز worktree إن مش موجود؛ متعملش remove خالص
if ! test -d "$WT"; then
  git fetch origin || true
  git worktree add -B gh-pages "$WT" origin/gh-pages 2>/dev/null || \
  git worktree add -B gh-pages "$WT"
fi
rsync -a --delete "$WEB/dist/" "$WT/"
( cd "$WT"
  git add -A
  git -c user.name="deployer" -c user.email="deployer@local" commit -m "deploy: $(date -Iseconds)" || true
  git push origin gh-pages || true
)

echo "✅ Done."
echo "⏳ استنى ~1-2 دقيقة على Render. بعدين جرّب:"
echo "   TOKEN=\$(cat .hf_token)"
echo "   curl -si -H \"Authorization: Bearer \$TOKEN\" https://hfsys.onrender.com/products | head -n 20"
echo "   وافتح Pages: https://3amobadawy.github.io/HFSys (اعمل Hard Refresh)."
