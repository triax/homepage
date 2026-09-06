#!/bin/bash
# =============================================================================
# format.sh - 編集直後のファイルを Prettier で整形する
# =============================================================================
#
# Claude Code の PostToolUse hook から呼ばれる。hook は stdin に JSON を渡し、
# 編集対象は tool_input.file_path に入っている。引数で直接パスを渡してもよい。
#
# hook の失敗が編集作業を止めてはならないので、どの経路でも必ず exit 0 で終わる。
# Prettier が未インストール・対象が不明・対象が Prettier の管轄外、いずれの場合も
# 何もせずに正常終了する。
#
# =============================================================================

set -u

target="${1:-}"

# 引数が無ければ stdin の hook JSON から file_path を取り出す。
if [ -z "$target" ] && [ ! -t 0 ] && command -v node >/dev/null 2>&1; then
  target=$(
    node -e 'let d="";process.stdin.on("data",c=>{d+=c}).on("end",()=>{try{const j=JSON.parse(d);const t=j.tool_input||{};process.stdout.write(String(t.file_path||t.notebook_path||""))}catch(e){}})' 2>/dev/null
  ) || target=""
fi

[ -n "$target" ] || exit 0
[ -f "$target" ] || exit 0

repo_root=$(cd "$(dirname "$0")/.." 2>/dev/null && pwd) || exit 0
prettier="$repo_root/node_modules/.bin/prettier"
[ -x "$prettier" ] || exit 0

# --ignore-unknown: パーサを持たない拡張子は黙って読み飛ばす。
# .prettierignore と .gitignore は Prettier が既定で尊重する。
"$prettier" --write --ignore-unknown "$target" >/dev/null 2>&1 || true

exit 0
