#!/usr/bin/env bash
# Fails (exit 1) if any frontend source file outside index.css references a
# deprecated Tactical-OS-era token. Update the DEPRECATED list when retiring
# additional tokens.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/frontend/src"

DEPRECATED=(
  '--color-primary'
  '--color-foreground'
  '--color-background'
  '--color-secondary'
  '--color-accent'
  '--color-card'
  '--color-border'
  '--color-gold'
  '--color-gold-orange'
  '--color-data-surface'
  '--color-data-row'
  '--color-data-divider'
  '--color-data-chip'
  '--color-data-text-muted'
  '--color-neon-pink'
)

bad=0
for pat in "${DEPRECATED[@]}"; do
  hits=$(grep -RIn --include='*.ts' --include='*.tsx' --include='*.css' \
    --exclude='index.css' \
    -- "$pat" "$SRC" 2>/dev/null || true)
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
