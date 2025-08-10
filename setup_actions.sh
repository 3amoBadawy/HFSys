# setup_actions.sh
#!/usr/bin/env bash
set -euo pipefail

mkdir -p .github/workflows

# ========= 1) Workflow: Deploy Web to GitHub Pages =========
cat > .github/workflows/deploy-pages.yml <<'YML'
name: Deploy Web to GitHub Pages

on:
  push:
    branches: [ main ]
    paths:
      - "web/**"
      - ".github/workflows/deploy-pages.yml"
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

concurrency:
  group: pages-deploy
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: web/package-lock.json

      - name: Install deps (web)
        working-directory: web
        run: npm ci

      - name: Build
        working-directory: web
        run: |
          npm run build
          cp dist/index.html dist/404.html
          # اضمن وجود version.json داخل dist
          test -f public/version.json || echo '{ "build":"${{ github.sha }}", "time":"${{ github.event.head_commit.timestamp || github.run_started_at }}"}' > public/version.json
          cp public/version.json dist/version.json

      - name: List dist
        run: ls -la web/dist && test -f web/dist/index.html

      - name: Deploy to gh-pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: web/dist
          publish_branch: gh-pages
          keep_files: false
YML

# ========= 2) Workflow: Verify after deploy / on push =========
cat > .github/workflows/verify-hfsys.yml <<'YML'
name: Verify HFSys

on:
  workflow_run:
    workflows: ["Deploy Web to GitHub Pages"]
    types: [completed]
  push:
    branches: [ main ]
    paths:
      - "api/**"
      - "web/**"
      - "verify_hfsys.sh"
      - ".github/workflows/verify-hfsys.yml"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      API_BASE: https://hfsys.onrender.com
      WEB_BASE: https://3amobadawy.github.io/HFSys
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Provide API token from secret
        env:
          HF_TOKEN: ${{ secrets.HF_TOKEN }}
        run: |
          if [ -z "${HF_TOKEN:-}" ]; then
            echo "::warning::HF_TOKEN secret is missing. Some API checks may fail."
          else
            echo "$HF_TOKEN" > .hf_token
          fi

      - name: Make verify script executable
        run: chmod +x ./verify_hfsys.sh || true

      - name: Run verify
        id: verify
        run: |
          set +e
          ./verify_hfsys.sh | tee verify_output.txt
          # استخرج أرقام ال Pass/Fail لو موجودة
          PASSED=$(grep -Eo 'Passed:\s*[0-9]+' verify_output.txt | awk '{print $2}' | tail -n1)
          FAILED=$(grep -Eo 'Failed:\s*[0-9]+' verify_output.txt | awk '{print $2}' | tail -n1)
          echo "passed=${PASSED:-0}" >> $GITHUB_OUTPUT
          echo "failed=${FAILED:-0}" >> $GITHUB_OUTPUT
          # لو فيه فشل نخلي الجوب فاشل علشان يبان
          if grep -q "❌" verify_output.txt; then
            EXIT_CODE=1
          else
            EXIT_CODE=0
          fi
          exit $EXIT_CODE

      - name: Upload logs (artifact)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: verify-hfsys-logs
          path: |
            verify_output.txt
            diagnose_*.log
          if-no-files-found: ignore

      - name: Summarize
        if: always()
        run: |
          echo "## HFSys Verify" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**API:** $API_BASE" >> $GITHUB_STEP_SUMMARY
          echo "**Web:** $WEB_BASE" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Passed:** ${{ steps.verify.outputs.passed || '0' }}    **Failed:** ${{ steps.verify.outputs.failed || '0' }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Logs attached as artifact." >> $GITHUB_STEP_SUMMARY
YML

echo "✅ Files written:"
echo "  - .github/workflows/deploy-pages.yml"
echo "  - .github/workflows/verify-hfsys.yml"
echo
echo "📌 مهم: أضف Secret باسم HF_TOKEN في Settings → Secrets → Actions"
echo "   ده هو نفس المحتوى بتاع ملف .hf_token اللي بتستخدمه محلياً."
echo
echo "لو حابب أكمّت وأبوش دلوقتي:"
echo "  git add .github/workflows && git commit -m 'chore(ci): add deploy & verify workflows' && git push"