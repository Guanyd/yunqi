#!/usr/bin/env bash
# 一键部署到 GitHub Pages：构建 dist → 生成 gh-pages 提交 → 推送。
#
# 用法：
#   GH_TOKEN=ghp_xxx bash scripts/deploy-gh-pages.sh
#
# GH_TOKEN 是 GitHub Personal Access Token（classic，勾选 repo 即可）。
#
# 为什么用 gh-pages 分支而不是 GitHub Actions：
# Actions 的 workflow 文件需要 token 额外具备 workflow scope 才能推送；
# gh-pages 分支方式只要 repo 权限，且部署产物与本机构建完全一致。
#
# 若本机 git 的 TLS 后端不可用（Windows 上表现为
# `schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`），
# 先另开一个终端跑 `GH_TOKEN=... node scripts/push-proxy.mjs`，
# 然后 GIT_PUSH_URL=http://127.0.0.1:5299/ 重跑本脚本。
set -euo pipefail

OWNER="${GIT_OWNER:-Guanyd}"
REPO="${GIT_REPO:-yunqi}"
BRANCH="${GIT_BRANCH:-gh-pages}"
PUSH_URL="${GIT_PUSH_URL:-https://github.com/${OWNER}/${REPO}.git}"

if [ -z "${GH_TOKEN:-}" ]; then
  echo "缺少 GH_TOKEN 环境变量（GitHub Personal Access Token，需要 repo 权限）" >&2
  exit 1
fi

step() { printf '\n▶ %s\n' "$1"; }

step "构建生产产物"
npx vite build --configLoader native

step "生成 ${BRANCH} 提交"
TMPDIR_LOCAL="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT
touch dist/.nojekyll

export GIT_INDEX_FILE="$TMPDIR_LOCAL/index"
git --work-tree=dist add -A .
TREE="$(git write-tree)"
COMMIT="$(
  GIT_AUTHOR_NAME="$OWNER" \
  GIT_AUTHOR_EMAIL="${OWNER}@users.noreply.github.com" \
  GIT_COMMITTER_NAME="$OWNER" \
  GIT_COMMITTER_EMAIL="${OWNER}@users.noreply.github.com" \
  git commit-tree "$TREE" -m "build: 部署 $(date -u +%Y-%m-%dT%H:%M:%SZ)"
)"
unset GIT_INDEX_FILE
echo "  commit $COMMIT"

step "推送 $COMMIT → $BRANCH"
AUTH="$(printf '%s:%s' "$OWNER" "$GH_TOKEN" | base64 | tr -d '\n')"
# gh-pages 只存放构建产物，每次都是全新提交，因此强制覆盖。
git -c credential.helper= -c "http.extraheader=Authorization: Basic $AUTH" \
  push "$PUSH_URL" "+$COMMIT:refs/heads/$BRANCH"

step "完成"
echo "  https://$(echo "$OWNER" | tr '[:upper:]' '[:lower:]').github.io/${REPO}/"
echo "  GitHub 通常需要 30–90 秒完成 Pages 构建，稍后刷新即可。"
