#!/usr/bin/env bash
API="https://hfsys.onrender.com"
HDR="Authorization: Bearer $(cat .hf_token)"
echo "⏳ مستني /products على $API تبقى 200 ..."
for i in {1..60}; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$HDR" "$API/products")
  if [ "$code" = "200" ]; then
    echo "✅ جاهزة (HTTP $code). رد السيرفر:"
    curl -s -H "$HDR" "$API/products"; echo
    exit 0
  fi
  echo "… لسه ($code). هحاول تاني بعد 3 ثواني"
  sleep 3
done
echo "❌ لسه مش 200 بعد دقيقة. افتح Logs في Render وشوف آخر errors."
exit 1
