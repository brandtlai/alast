#!/usr/bin/env bash
# Build the redesign branch and publish to /opt/alast/frontend/dist-preview.
# Idempotent. Uses flock so cron + manual runs cannot collide.
set -euo pipefail

LOCK=/var/lock/alast-preview.lock
exec 9>"$LOCK"
flock -n 9 || { echo "[$(date -Is)] another deploy is running, skipping"; exit 0; }

REPO=/opt/alast

cd "$REPO"
git fetch -q origin
git checkout redesign 2>/dev/null || git checkout -b redesign origin/redesign
git reset --hard origin/redesign

cd "$REPO/frontend"
npm ci --no-audit --no-fund --silent
npm run build:preview --silent

echo "[$(date -Is)] preview built → $REPO/frontend/dist-preview"
echo "[$(date -Is)] live at https://alast-preview.kaumi.org"
