#!/usr/bin/env bash
set -euo pipefail

FILE="api/index.js"
[ -f "$FILE" ] || { echo "❌ $FILE not found"; exit 1; }

# نسخة احتياطية
cp "$FILE" "${FILE}.bak"

# لو الراوت موجود خلاص نخرج
if grep -q 'HF API is live' "$FILE"; then
  echo "ℹ️ Root route already exists. Nothing to do."
  exit 0
fi

# أدخل الراوت قبل سطر app.use('/', auth, router);
awk '
  BEGIN{added=0}
  {
    if (!added && $0 ~ /app\.use\(.*auth.*router.*\);/) {
      print "app.get(\"/\", (req,res)=> res.send(\"HF API is live ✅\"));"
      added=1
    }
    print
  }
' "$FILE" > "${FILE}.tmp" && mv "${FILE}.tmp" "$FILE"

echo "✅ Root route inserted."
