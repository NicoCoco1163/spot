#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-spot}"
PORT="${PORT:-8066}"
DATABASE_URL="${DATABASE_URL:-/home/suijiwudao/sqlite.db}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$DATABASE_URL")/backups}"
SKIP_INSTALL="${SKIP_INSTALL:-0}"
SKIP_DB_CHECK="${SKIP_DB_CHECK:-0}"
DRY_RUN="${DRY_RUN:-0}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STARTED_AT="$(date '+%Y-%m-%d %H:%M:%S')"

log() {
  printf '\033[1;34m[deploy]\033[0m %s\n' "$1"
}

ok() {
  printf '\033[1;32m[deploy]\033[0m %s\n' "$1"
}

warn() {
  printf '\033[1;33m[deploy]\033[0m %s\n' "$1"
}

fail() {
  printf '\033[1;31m[deploy]\033[0m %s\n' "$1" >&2
  exit 1
}

run() {
  log "$1"
  shift
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '  DRY_RUN:'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi
  "$@"
}

need_command() {
  if [[ "$DRY_RUN" == "1" ]]; then
    warn "DRY_RUN=1，跳过命令检查：$1"
    return 0
  fi
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令：$1"
}

show_config() {
  log "部署配置"
  printf '  APP_NAME=%s\n' "$APP_NAME"
  printf '  PORT=%s\n' "$PORT"
  printf '  DATABASE_URL=%s\n' "$DATABASE_URL"
  printf '  BACKUP_DIR=%s\n' "$BACKUP_DIR"
  printf '  ROOT_DIR=%s\n' "$ROOT_DIR"
  printf '  DRY_RUN=%s\n' "$DRY_RUN"
}

prepare_database() {
  local db_dir
  db_dir="$(dirname "$DATABASE_URL")"

  run "创建数据库目录：$db_dir" mkdir -p "$db_dir"

  if [[ -f "$DATABASE_URL" ]]; then
    run "创建数据库备份目录：$BACKUP_DIR" mkdir -p "$BACKUP_DIR"
    local backup_file="$BACKUP_DIR/sqlite-$(date '+%Y%m%d-%H%M%S').db"
    run "数据库已存在，发布前备份到：$backup_file" cp "$DATABASE_URL" "$backup_file"
  else
    warn "数据库不存在，将在迁移阶段初始化：$DATABASE_URL"
  fi
}

start_or_reload_pm2() {
  if [[ "$DRY_RUN" == "1" ]]; then
    run "DRY_RUN：跳过 PM2 状态探测，预演 start 命令" pm2 start ecosystem.config.js --only "$APP_NAME" --update-env
    return 0
  fi

  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    run "PM2 应用已存在，执行 reload：$APP_NAME" pm2 reload ecosystem.config.js --only "$APP_NAME" --update-env
  else
    run "PM2 应用不存在，执行 start：$APP_NAME" pm2 start ecosystem.config.js --only "$APP_NAME" --update-env
  fi
}

validate_build_output() {
  if [[ "$DRY_RUN" == "1" ]]; then
    warn "DRY_RUN=1，跳过构建产物检查"
    return 0
  fi

  [[ -f ".output/server/index.mjs" ]] || fail "构建产物不存在：.output/server/index.mjs"
}

main() {
  cd "$ROOT_DIR"

  log "开始部署：$STARTED_AT"
  show_config

  need_command bun
  need_command pm2

  export NODE_ENV=production
  export PORT
  export DATABASE_URL

  run "确认 Bun 版本" bun --version
  run "确认 PM2 版本" pm2 --version

  if [[ "$SKIP_INSTALL" == "1" ]]; then
    warn "跳过依赖安装：SKIP_INSTALL=1"
  else
    run "安装依赖" bun install
  fi

  if [[ "$SKIP_DB_CHECK" == "1" ]]; then
    warn "跳过迁移一致性检查：SKIP_DB_CHECK=1"
  else
    run "检查 Drizzle 迁移文件" bun run db:check
  fi

  prepare_database

  run "执行数据库迁移/初始化" bun run db:migrate
  run "构建生产产物" bun run build
  validate_build_output
  run "创建 PM2 日志目录" mkdir -p logs

  start_or_reload_pm2

  run "保存 PM2 进程列表" pm2 save
  run "显示 PM2 状态" pm2 status "$APP_NAME"

  ok "部署完成：$APP_NAME"
  ok "访问端口：$PORT"
  ok "数据库：$DATABASE_URL"
}

main "$@"
