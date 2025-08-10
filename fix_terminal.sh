#!/usr/bin/env bash
set -euo pipefail

echo "▶ Back up current shell dotfiles (if any)…"
for f in ~/.bashrc ~/.bash_profile ~/.profile; do
  [ -f "$f" ] && mv -v "$f" "${f}.bak.$(date +%s)" || true
done

echo "▶ Write a clean ~/.bashrc …"
cat > ~/.bashrc <<'EOF'
# Clean, safe bashrc for Codespaces
export SHELL="/bin/bash"
export PS1='\u@\h:\w\$ '
export PATH="$HOME/.local/bin:$PATH"

# avoid Node auto-debug attaching or shell integration weirdness
unset NODE_OPTIONS
unset VSCODE_INSPECTOR_OPTIONS
unset PROMPT_COMMAND

# small aliases
alias ll='ls -alF'
EOF

echo "▶ Write ~/.bash_profile and ~/.profile to source ~/.bashrc …"
cat > ~/.bash_profile <<'EOF'
# login shell: source bashrc
[ -f ~/.bashrc ] && . ~/.bashrc
EOF

cat > ~/.profile <<'EOF'
# POSIX login: source bashrc if present
[ -f ~/.bashrc ] && . ~/.bashrc
EOF

echo "▶ Fix VS Code/Codespaces terminal settings …"
CFG_DIR="$HOME/.vscode-remote/data"
USER_SET="$CFG_DIR/User/settings.json"
MACH_SET="$CFG_DIR/Machine/settings.json"
WS_DIR="$(pwd)/.vscode"
WS_SET="$WS_DIR/settings.json"

mkdir -p "$(dirname "$USER_SET")" "$(dirname "$MACH_SET")" "$WS_DIR"

# function to merge minimal settings
write_settings () {
  local target="$1"
  tmp="$(mktemp)"
  cat > "$tmp" <<'JSON'
{
  "terminal.integrated.defaultProfile.linux": "bash",
  "terminal.integrated.profiles.linux": {
    "bash": { "path": "/bin/bash", "args": ["-l"] }
  },
  "terminal.integrated.shellIntegration.enabled": false
}
JSON
  if [ -s "$target" ]; then
    # naive merge: prefer new keys, keep others
    python3 - "$target" "$tmp" <<'PY' || cp "$tmp" "$target"
import json, sys
a=json.load(open(sys.argv[1]))
b=json.load(open(sys.argv[2]))
a.update(b)
json.dump(a, open(sys.argv[1],'w'), ensure_ascii=False, indent=2)
PY
  else
    cp "$tmp" "$target"
  fi
  rm -f "$tmp"
}

write_settings "$USER_SET"   || true
write_settings "$MACH_SET"   || true
write_settings "$WS_SET"     || true

echo "▶ Test opening a login shell…"
bash -lc 'echo "[OK] login shell works. Bash version: $(bash --version | head -1)"'

echo
echo "✅ All set."
echo "🔁 إما اكتب:  source ~/.bashrc  ، أو اقفل التبويب وافتح Terminal جديد."
echo "لو لسه بتشوف رسالة: /bin/bash \"--noprofile\" \"--norc\" — افتح Command Palette واكتب:"
echo "Preferences: Open Remote Settings  ➜ دور على terminal.integrated.* وتأكد defaultProfile= bash"
