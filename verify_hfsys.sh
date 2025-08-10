#!/usr/bin/env bash
set -euo pipefail

# =========[ Config ]=========
API_BASE="${API_BASE:-https://hfsys.onrender.com}"
WEB_BASE="${WEB_BASE:-https://3amobadawy.github.io/HFSys}"
EMAIL="${HF_EMAIL:-admin@highfurniture.com}"
PASS="${HF_PASS:-Admin@123}"
TOKEN_FILE="${TOKEN_FILE:-.hf_token}"
VERBOSE="${VERBOSE:-0}"   # 1 عشان لوج زيادة

# =========[ Helpers ]=========
log(){ printf "%b\n" "$*"; }
ok(){  printf "✅ %s\n" "$*"; }
bad(){ printf "❌ %s\n" "$*" >&2; }

need(){
  command -v "$1" >/dev/null 2>&1 || { bad "مطلوب $1"; exit 1; }
}

curlj(){
  # curl JSON with optional Bearer token
  local url="$1"; shift
  local hdr=()
  [[ -n "${TOKEN:-}" ]] && hdr+=(-H "Authorization: Bearer $TOKEN")
  curl -fsSL "${hdr[@]}" -H 'Accept: application/json' "$url" "$@"
}

# =========[ Pre-flight ]=========
need curl
need jq
[[ "$VERBOSE" = 1 ]] && set -x

PASS_COUNT=0
FAIL_COUNT=0

pass(){ ok "$1"; PASS_COUNT=$((PASS_COUNT+1)); }
fail(){ bad "$1"; FAIL_COUNT=$((FAIL_COUNT+1)); }

# =========[ 1) API health ]=========
if curl -fsS -o /dev/null -w '%{http_code}' "$API_BASE/health" | grep -q '^200$'; then
  pass "API /health = 200  ($API_BASE)"
else
  fail "API /health مش 200  ($API_BASE/health)"
fi

# =========[ 2) Token: استخدم المحفوظ أو Login ]=========
TOKEN=""
if [[ -f "$TOKEN_FILE" ]]; then
  TOKEN="$(cat "$TOKEN_FILE" | tr -d '\n\r')"
fi

if [[ -z "$TOKEN" ]]; then
  log "🔐 محاولة تسجيل دخول لاستخراج توكن..."
  LOGIN_RES="$(curl -fsS -X POST "$API_BASE/login" \
      -H 'Content-Type: application/json' \
      --data "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" || true)"
  TOKEN="$(jq -r '.token // empty' <<<"$LOGIN_RES" 2>/dev/null || true)"
  if [[ -z "$TOKEN" ]]; then
    fail "فشل استخراج التوكن من /login (تحقق من الكريدنشالز أو السيرفر)"
  else
    pass "تم الحصول على التوكن من /login"
    printf "%s" "$TOKEN" > "$TOKEN_FILE"
  fi
else
  pass "استخدمنا التوكن المخزّن في $TOKEN_FILE"
fi

# =========[ 3) /meta/permissions بالتوكن ]=========
if [[ -n "$TOKEN" ]]; then
  if PERM_JSON="$(curlj "$API_BASE/meta/permissions" 2>/dev/null)" && [[ -n "$PERM_JSON" ]]; then
    CNT="$(jq 'length' <<<"$PERM_JSON" 2>/dev/null || echo 0)"
    pass "/meta/permissions رجّعت $CNT صلاحية"
  else
    fail "/meta/permissions فشل — غالبًا توكن غير صالح أو CORS"
  fi
fi

# =========[ 4) customers & products GET ]=========
check_array(){
  local name="$1" url="$2"
  if RES="$(curlj "$url" 2>/dev/null)"; then
    if jq -e 'type=="array"' >/dev/null 2>&1 <<<"$RES"; then
      LEN="$(jq 'length' <<<"$RES")"
      pass "$name Array ✅ (عدد العناصر: $LEN)"
    else
      fail "$name مش Array ❌ (ردّ سيرفر: $(jq -r 'if type=="object" then (.error//"object") else type end' <<<\"$RES\"))"
    fi
  else
    fail "$name فشل الاتصال"
  fi
}

[[ -n "$TOKEN" ]] && check_array "GET /customers" "$API_BASE/customers"
[[ -n "$TOKEN" ]] && check_array "GET /products"  "$API_BASE/products"

# =========[ 5) CORS preflight سريع ]=========
if CODE="$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS \
  -H "Origin: $WEB_BASE" -H 'Access-Control-Request-Method: GET' \
  "$API_BASE/customers")"; then
  [[ "$CODE" == "204" || "$CODE" == "200" ]] \
    && pass "CORS preflight customers OK ($CODE)" \
    || fail  "CORS preflight customers = $CODE"
fi

# =========[ 6) GitHub Pages ]=========
if curl -fsS -o /dev/null -w '%{http_code}' "$WEB_BASE/" | grep -q '^200$'; then
  pass "GitHub Pages شغال: $WEB_BASE"
else
  fail "مشكلة في GitHub Pages ($WEB_BASE)"
fi

if VJ="$(curl -fsS "$WEB_BASE/version.json" 2>/dev/null || true)"; then
  BUILD="$(jq -r '.build // empty' <<<"$VJ" 2>/dev/null || true)"
  [[ -n "$BUILD" ]] && pass "version.json موجود (build=$BUILD)" || fail "version.json ناقص أو بدون build"
else
  fail "version.json غير متاح على Pages"
fi

# =========[ 7) ملخص ]=========
echo
log "=============================="
log "   ✅ Passed: $PASS_COUNT   ❌ Failed: $FAIL_COUNT"
log "=============================="
[[ "$FAIL_COUNT" -eq 0 ]] && exit 0 || exit 1