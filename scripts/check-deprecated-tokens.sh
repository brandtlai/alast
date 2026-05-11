#!/usr/bin/env bash
# Fails (exit 1) if any frontend source file outside index.css references a
# deprecated Tactical-OS-era token. Update the DEPRECATED list when retiring
# additional tokens.
#
# Patterns are PCRE (grep -P). The (?![-\w]) suffix prevents `--color-gold`
# from matching the new `--color-gold-1/2/3` tokens.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/frontend/src"

DEPRECATED=(
  '--color-primary(?![-\w])'
  '--color-foreground(?![-\w])'
  '--color-background(?![-\w])'
  '--color-secondary(?![-\w])'
  '--color-accent(?![-\w])'
  '--color-card(?![-\w])'
  '--color-border(?![-\w])'
  '--color-gold(?![-\w])'
  '--color-gold-orange(?![-\w])'
  '--color-data-surface(?![-\w])'
  '--color-data-row(?![-\w])'
  '--color-data-divider(?![-\w])'
  '--color-data-chip(?![-\w])'
  '--color-data-text-muted(?![-\w])'
  '--color-neon-pink'
)

bad=0
for pat in "${DEPRECATED[@]}"; do
  hits=$(grep -RIPn --include='*.ts' --include='*.tsx' --include='*.css' \
    --exclude='index.css' \
    -e "$pat" "$SRC" 2>/dev/null || true)
  if [[ -n "$hits" ]]; then
    echo "❌ deprecated token usage: $pat"
    echo "$hits"
    bad=1
  fi
done

if [[ $bad -eq 0 ]]; then
  echo "✅ no deprecated Tactical-OS tokens in frontend/src"
fi
exit $bad
