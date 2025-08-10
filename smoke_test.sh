#!/usr/bin/env bash
set -e
API="https://hfsys.onrender.com"
HDR="Authorization: Bearer $(cat .hf_token)"
ok(){ printf "✅ %s\n" "$1"; }
fail(){ printf "❌ %s\n" "$1"; exit 1; }

# health
curl -fsS "$API/health" >/dev/null && ok "health"

# customers (GET empty OK)
curl -fsS -H "$HDR" "$API/customers" >/dev/null && ok "GET /customers"

# products CRUD
ID=$(curl -fsS -H "$HDR" -H "Content-Type: application/json" \
  -d '{"name":"Test Lamp","sku":"LP-T","price":199}' "$API/products" | jq -r '.id')
[ -n "$ID" ] || fail "POST /products gave no id"

curl -fsS -H "$HDR" "$API/products" >/dev/null && ok "GET /products"
curl -fsS -X PUT -H "$HDR" -H "Content-Type: application/json" \
  -d '{"price":249}' "$API/products/$ID" >/dev/null && ok "PUT /products/:id"
curl -fsS -X DELETE -H "$HDR" "$API/products/$ID" >/dev/null && ok "DELETE /products/:id"

echo "All good 🎉"
