#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
API="$ROOT/api"
WEB="$ROOT/web"

echo "▶ 1) كتابة راوتر منتجات نظيف (api/products.js)"
mkdir -p "$API"
cat > "$API/products.js" <<'JS'
import express from 'express';
import fs from 'fs';
import { nanoid } from 'nanoid';

const DB_PATH = './db.json';

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ invoices:[], products:[], customers:[], roles:[] }, null, 2));
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  const db = JSON.parse(raw || '{}');
  if (!Array.isArray(db.products)) db.products = [];
  return db;
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }

const router = express.Router();

// GET /products
router.get('/products', (req,res)=>{
  const db = loadDB();
  res.json(db.products);
});

// POST /products
router.post('/products', express.json(), (req,res)=>{
  const { name, sku, price } = req.body || {};
  if (!name) return res.status(400).json({error:'name required'});
  const db = loadDB();
  const prod = { id: nanoid(8), name, sku: sku || '', price: Number(price)||0, createdAt: Date.now() };
  db.products.push(prod);
  saveDB(db);
  res.status(201).json(prod);
});

// PUT /products/:id
router.put('/products/:id', express.json(), (req,res)=>{
  const { id } = req.params;
  const db = loadDB();
  const i = db.products.findIndex(p=>p.id===id);
  if (i<0) return res.status(404).json({error:'not found'});
  db.products[i] = { ...db.products[i], ...req.body, id };
  saveDB(db);
  res.json(db.products[i]);
});

// DELETE /products/:id
router.delete('/products/:id', (req,res)=>{
  const { id } = req.params;
  const db = loadDB();
  const before = db.products.length;
  db.products = db.products.filter(p=>p.id!==id);
  if (db.products.length === before) return res.status(404).json({error:'not found'});
  saveDB(db);
  res.json({ok:true});
});

export default router;
JS

echo "▶ 2) توصيل الراوتر داخل api/index.js (لو مش متوصل)"
# import
grep -q "from './products.js'" "$API/index.js" || \
sed -i "1 a import productsRouter from './products.js'" "$API/index.js"

# use
grep -q "productsRouter" "$API/index.js" || \
sed -i "s@app.use('/', auth, router);@app.use('/', auth, router);\napp.use('/', auth, productsRouter);@" "$API/index.js"

echo "▶ 3) عمل version.json بعد الـbuild عشان Pages"
mkdir -p "$WEB/public" || true
# هنطلع build id من آخر كومِت
BUILD_ID="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
cat > "$WEB/public/version.json" <<JSON
{ "build": "$BUILD_ID", "time": "$(date -Iseconds)" }
JSON

echo "▶ 4) Build للواجهه (Vite)"
npm --prefix "$WEB" ci || npm --prefix "$WEB" install
npm --prefix "$WEB" run build
cp "$WEB/dist/index.html" "$WEB/dist/404.html" || true

echo "▶ 5) كومِت وبَشّ للكود (هيشغّل Render يعيد الدبلوي تلقائي)"
git add api/products.js api/index.js web/public/version.json
git commit -m "fix(api): wire clean products router + add version.json" || true
git push

echo
echo "✅ خلّصنا. استنى Render دقيقة، وبعدين جرّب:"
echo "   curl -si -H \"Authorization: Bearer \$(cat .hf_token)\" https://hfsys.onrender.com/products"
echo "ولو رجّعت 200، اعمل ريفرش للـPages وخلاص."
