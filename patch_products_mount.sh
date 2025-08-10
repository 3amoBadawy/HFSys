#!/usr/bin/env bash
set -euo pipefail

IDX="api/index.js"

echo "▶ تأكيد سطر الاستيراد..."
grep -q "import productsRouter from './products.js'" "$IDX" || \
  sed -i "2 a import productsRouter from './products.js'" "$IDX"

echo "▶ توصيل الراوتر تحت الراوترات المحمية..."
if ! grep -q "app.use('/', auth, productsRouter)" "$IDX"; then
  # لو فيه customers متوصلة، حط products قبلها؛ وإلا حطه بعد router
  if grep -q "app.use('/', auth, customersRouter)" "$IDX"; then
    sed -i "s@app.use('/', auth, customersRouter)@app.use('/', auth, productsRouter)\napp.use('/', auth, customersRouter)@" "$IDX"
  else
    sed -i "s@app.use('/', auth, router)@app.use('/', auth, router)\napp.use('/', auth, productsRouter)@" "$IDX"
  fi
fi

echo "▶ عرض الأسطر المهمة للتأكيد:"
nl -ba "$IDX" | sed -n '1,120p' | sed -n '1,200p' | grep -n -E "import productsRouter|app.use..auth, productsRouter|app.use..auth, customersRouter|app.use..auth, router" || true

echo "▶ commit & push (هيشغّل Render يعيد publish تلقائي)"
git add "$IDX"
git commit -m "fix(api): mount productsRouter under auth" || true
git push

echo "✅ تم. بعد ما الـDeploy يخلص على Render، اختبر:"
echo "curl -si -H \"Authorization: Bearer \$(cat .hf_token)\" https://hfsys.onrender.com/products | head -n 20"
