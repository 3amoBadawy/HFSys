#!/usr/bin/env bash
set -euo pipefail

IDX="api/index.js"
API="https://hfsys.onrender.com"
HDR="Authorization: Bearer $(cat .hf_token)"

echo "▶ تأكيد الاستيراد"
grep -q "import productsRouter from './products.js'" "$IDX" || \
  sed -i "2 a import productsRouter from './products.js'" "$IDX"

echo "▶ توصيل الراوتر تحت الـauth (قبل customers لو موجود)"
if ! grep -q "app.use('/', auth, productsRouter)" "$IDX"; then
  if grep -q "app.use('/', auth, customersRouter)" "$IDX"; then
    sed -i "s@app.use('/', auth, customersRouter)@app.use('/', auth, productsRouter)\napp.use('/', auth, customersRouter)@" "$IDX"
  else
    # لو مش لاقي customers، حطّه بعد الراوتر الأساسي
    sed -i "s@app.use('/', auth, router);@app.use('/', auth, router);\napp.use('/', auth, productsRouter);@" "$IDX"
  fi
fi

echo "▶ عرض السطور المهمة:"
nl -ba "$IDX" | sed -n '1,220p' | sed -n '/app.use..auth, router/,+10p' | sed -n '1,40p'

echo "▶ Commit + Push"
git add "$IDX"
git commit -m "fix(api): mount productsRouter under auth" || true
git push || true

echo "▶ Poll /products لحد ما تبقى 200 (بحد أقصى 90 ثانية)"
for i in {1..30}; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$HDR" "$API/products")
  if [ "$code" = "200" ]; then
    echo "✅ /products جاهزة (200). الرد:"
    curl -s -H "$HDR" "$API/products"; echo
    exit 0
  fi
  echo "… لسه ($code). هحاول تاني بعد 3 ثواني"
  sleep 3
done

echo "❌ لسه مش 200. افتح Logs بتاعة Render لو المشكلة استمرت."
exit 1
