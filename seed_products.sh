#!/usr/bin/env bash
set -e
API="https://hfsys.onrender.com"
HDR="Authorization: Bearer $(cat .hf_token)"
post(){ curl -s -H "$HDR" -H "Content-Type: application/json" -d "$1" "$API/products"; echo; }

post '{"name":"Classic Chair","sku":"CH-001","price":950}'
post '{"name":"Modern Sofa","sku":"SF-002","price":5350}'
post '{"name":"Oak Table","sku":"TB-003","price":2100}'

echo "Current products:"
curl -s -H "$HDR" "$API/products" | jq -r '.'
