#!/usr/bin/env bash
# Polls origin/redesign every minute (called by cron) and rebuilds when it advances.
set -euo pipefail

REPO=/opt/alast
cd "$REPO"
git fetch -q origin redesign

LOCAL_REF=$(git rev-parse refs/heads/redesign 2>/dev/null || echo none)
REMOTE_REF=$(git rev-parse refs/remotes/origin/redesign)

if [ "$LOCAL_REF" != "$REMOTE_REF" ]; then
  echo "[$(date -Is)] watcher: redesign advanced ${LOCAL_REF:0:8} → ${REMOTE_REF:0:8}"
  /opt/alast/scripts/deploy-preview.sh
fi
