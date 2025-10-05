#!/usr/bin/env bash
set -euo pipefail

# build-and-deploy.sh
# Builds locally with pnpm, zips runtime bundle, and POSTs to the broker /deploy endpoint.

# ---- Defaults (override via flags) ----
APP_NAME="$(basename "$PWD")"
SERVICE="$APP_NAME"
REGION="asia-south1"
REPO="app-images"
BROKER_URL="https://broker-service-95057172923.asia-south1.run.app"
ZIP_FILE=""
TOKEN=""             # optional: bearer token for authenticated brokers
SKIP_BUILD="false"   # set with --skip-build to skip local build

usage() {
  cat <<EOF
Usage: $(basename "$0") -u <broker_url> [options]

Required:
  -u, --url <broker_url>        Broker base URL (e.g. https://broker-xxxxx.run.app)

Optional:
  -s, --service <name>          Cloud Run service name (default: current folder name)
  -g, --region <region>         Region (default: ${REGION})
  -r, --repo <repo>             Artifact Registry repo (default: ${REPO})
  -z, --zip <file>              Use existing zip instead of creating one
  -t, --token <bearer>          Bearer token for Authorization header (optional)
      --skip-build              Skip local build (useful if dist/ is already ready)
  -h, --help                    Show this help

What gets zipped (when creating a zip):
  package.json, pnpm-lock.yaml (if present), .env (if present), dist/
EOF
}

# ---- Parse args ----
while [[ $# -gt 0 ]]; do
  case "$1" in
    -u|--url) BROKER_URL="$2"; shift 2 ;;
    -s|--service) SERVICE="$2"; shift 2 ;;
    -g|--region) REGION="$2"; shift 2 ;;
    -r|--repo) REPO="$2"; shift 2 ;;
    -z|--zip) ZIP_FILE="$2"; shift 2 ;;
    -t|--token) TOKEN="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "${BROKER_URL}" ]]; then
  echo "❌ Missing --url <broker_url>"
  usage
  exit 1
fi

# ---- Ensure tools ----
need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ Missing dependency: $1"; exit 1; }; }
need curl
need zip

# ---- Build (unless skipped or using existing zip) ----
if [[ -z "${ZIP_FILE}" ]]; then
  if [[ "${SKIP_BUILD}" != "true" ]]; then
    if ! command -v pnpm >/dev/null 2>&1; then
      echo "ℹ️  pnpm not found; enabling via corepack..."
      need corepack
      corepack enable
      corepack prepare pnpm@latest --activate
    fi
    echo "▶️  Installing deps & building…"
    pnpm install --frozen-lockfile
    pnpm run build
  else
    echo "⏭️  Skipping local build (using existing dist/)"
  fi

  # Verify dist
  if [[ ! -d "dist" ]]; then
    echo "❌ dist/ not found. Ensure your build outputs to dist/."
    exit 1
  fi

  # Stage and zip runtime
  TMP_DIR=".deploy"
  rm -rf "${TMP_DIR}"
  mkdir -p "${TMP_DIR}"

  cp package.json "${TMP_DIR}/" || { echo "❌ package.json is required"; exit 1; }
  [[ -f pnpm-lock.yaml ]] && cp pnpm-lock.yaml "${TMP_DIR}/"
  [[ -f .env ]] && cp .env "${TMP_DIR}/"
  cp -r dist "${TMP_DIR}/dist"

  ZIP_FILE="${SERVICE}.zip"
  echo "🗜️  Creating ${ZIP_FILE}…"
  (cd "${TMP_DIR}" && zip -r "../${ZIP_FILE}" . >/dev/null)
  rm -rf "${TMP_DIR}"
else
  echo "📦 Using existing zip: ${ZIP_FILE}"
fi

# ---- Upload to broker ----
echo "☁️  Uploading to broker and triggering deploy…"

set +e
if [[ -n "${TOKEN}" ]]; then
  RESP=$(
    curl -sS -X POST \
      -H "Authorization: Bearer ${TOKEN}" \
      -F "source=@${ZIP_FILE}" \
      -F "service=${SERVICE}" \
      -F "region=${REGION}" \
      -F "repo=${REPO}" \
      "${BROKER_URL%/}/deploy"
  )
else
  RESP=$(
    curl -sS -X POST \
      -F "source=@${ZIP_FILE}" \
      -F "service=${SERVICE}" \
      -F "region=${REGION}" \
      -F "repo=${REPO}" \
      "${BROKER_URL%/}/deploy"
  )
fi
CURL_EXIT=$?
set -e

if [[ ${CURL_EXIT} -ne 0 ]]; then
  echo "❌ Upload failed (curl exit ${CURL_EXIT})"
  exit ${CURL_EXIT}
fi

# ---- Pretty print response if jq is available ----
if command -v jq >/dev/null 2>&1; then
  echo "$RESP" | jq .
else
  echo "$RESP"
fi

echo "✅ Submitted. Service: ${SERVICE}, Region: ${REGION}"
