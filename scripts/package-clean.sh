#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-spot}"
DRY_RUN="${DRY_RUN:-0}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="${OUTPUT:-$ROOT_DIR/dist/${APP_NAME}-source-$(date '+%Y%m%d-%H%M%S').zip}"
MANIFEST=""
STAGING_DIR=""

log() {
  printf '\033[1;34m[package]\033[0m %s\n' "$1"
}

ok() {
  printf '\033[1;32m[package]\033[0m %s\n' "$1"
}

warn() {
  printf '\033[1;33m[package]\033[0m %s\n' "$1"
}

fail() {
  printf '\033[1;31m[package]\033[0m %s\n' "$1" >&2
  exit 1
}

print_help() {
  cat <<EOF
打包干净的项目源码 zip。

默认会包含：
  - Git 已跟踪文件
  - 未跟踪但没有被 .gitignore 忽略的文件
  - .output 构建产物目录（若存在）

默认会排除：
  - .git
  - .gitignore 命中的内容，例如 node_modules、.nuxt、.env、sqlite.db
    （.output 虽被 .gitignore 忽略，但会额外打包）

用法：
  bun run package:clean
  bun run package:clean -- --output /tmp/spot-source.zip
  OUTPUT=/tmp/spot-source.zip bun run package:clean
  DRY_RUN=1 bun run package:clean

参数：
  -o, --output   输出 zip 路径
  --dry-run      只展示将要打包的文件数量和前 120 个文件，不生成 zip
  -h, --help     显示帮助
EOF
}

cleanup() {
  if [[ -n "$MANIFEST" && -f "$MANIFEST" ]]; then
    rm -f "$MANIFEST"
  fi
  if [[ -n "$STAGING_DIR" && -d "$STAGING_DIR" ]]; then
    rm -rf "$STAGING_DIR"
  fi
}

trap cleanup EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output)
      [[ $# -ge 2 ]] || fail "$1 需要一个路径"
      OUTPUT="$2"
      shift 2
      ;;
    --output=*)
      OUTPUT="${1#*=}"
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      fail "未知参数：$1"
      ;;
  esac
done

need_command() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令：$1"
}

absolute_output_path() {
  local output_path="$1"
  local output_dir
  local output_file

  output_dir="$(dirname "$output_path")"
  output_file="$(basename "$output_path")"
  mkdir -p "$output_dir"
  output_dir="$(cd "$output_dir" && pwd)"
  printf '%s/%s\n' "$output_dir" "$output_file"
}

main() {
  cd "$ROOT_DIR"

  need_command git
  need_command rsync
  need_command zip

  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "当前目录不是 Git 工作区：$ROOT_DIR"

  OUTPUT="$(absolute_output_path "$OUTPUT")"
  MANIFEST="$(mktemp "${TMPDIR:-/tmp}/spot-package-manifest.XXXXXX")"
  STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/spot-package-staging.XXXXXX")"

  log "生成文件清单"
  git ls-files -z --cached --others --exclude-standard > "$MANIFEST"

  local has_output=0
  local output_count=0
  if [[ -d "$ROOT_DIR/.output" ]]; then
    has_output=1
    output_count="$(find "$ROOT_DIR/.output" -type f | wc -l | tr -d ' ')"
  else
    warn ".output 目录不存在，将只打包源码（如需包含构建产物，请先执行 bun run build）"
  fi

  local file_count
  file_count="$(git ls-files --cached --others --exclude-standard | wc -l | tr -d ' ')"
  [[ "$file_count" != "0" ]] || fail "没有可打包文件"

  log "打包配置"
  printf '  ROOT_DIR=%s\n' "$ROOT_DIR"
  printf '  OUTPUT=%s\n' "$OUTPUT"
  printf '  FILES=%s\n' "$file_count"
  printf '  OUTPUT_DIR_FILES=%s\n' "$output_count"
  printf '  DRY_RUN=%s\n' "$DRY_RUN"

  if [[ "$DRY_RUN" == "1" ]]; then
    warn "DRY_RUN=1，仅展示前 120 个将被打包的文件"
    git ls-files --cached --others --exclude-standard | sed -n '1,120p'
    if [[ "$has_output" == "1" ]]; then
      warn ".output/ 整个目录也会被打包（含 $output_count 个文件）"
    fi
    exit 0
  fi

  log "复制干净文件到临时目录"
  rsync -a --files-from="$MANIFEST" --from0 ./ "$STAGING_DIR/"

  if [[ "$has_output" == "1" ]]; then
    log "复制 .output 构建产物"
    rsync -a "$ROOT_DIR/.output" "$STAGING_DIR/"
  fi

  log "生成 zip"
  rm -f "$OUTPUT"
  (
    cd "$STAGING_DIR"
    zip -qr "$OUTPUT" .
  )

  local size
  size="$(du -h "$OUTPUT" | awk '{print $1}')"

  ok "打包完成"
  ok "输出文件：$OUTPUT"
  ok "文件大小：$size"
  if [[ "$has_output" == "1" ]]; then
    ok "已包含：源码 + .output 构建产物（$output_count 个文件）"
  fi
  ok "已排除：.git、.gitignore 命中的文件和目录（.output 除外）"
}

main "$@"
