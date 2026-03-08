#!/usr/bin/env bash
set -euo pipefail

docker run --rm --platform=linux/amd64 \
  -u "$(id -u):$(id -g)" \
  -e CI=1 \
  -e HOME=/tmp/home \
  -e npm_config_cache=/tmp/npm-cache \
  -e XDG_CACHE_HOME=/tmp/.cache \
  -v "$PWD":/workspace \
  -w /workspace \
  node:22-bookworm \
  bash -lc 'mkdir -p /tmp/home /tmp/npm-cache /tmp/.cache /tmp/build && cd /workspace && tar --exclude=.git --exclude=node_modules --exclude=.output --exclude=.nuxt --exclude=.data --exclude=.nitro --exclude=.cache -cf - . | tar -xf - -C /tmp/build && cd /tmp/build && npm config set registry https://registry.npmmirror.com --location=user && npm install --include=optional --no-audit --no-fund && npm run build && rm -rf /workspace/.output && cp -R /tmp/build/.output /workspace/.output'
