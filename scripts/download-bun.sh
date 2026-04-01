#!/bin/bash
# Download platform-specific Bun binary for bundling with the kiosk Electron app.
# The server runs on Bun, so the packaged app needs a Bun binary.

set -e

VERSION="1.3.3"
BASE_URL="https://github.com/oven-sh/bun/releases/download/bun-v${VERSION}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="${SCRIPT_DIR}/../apps/patron/bin"

download_bun() {
    local os=$1
    local arch=$2
    local filename=$3
    local out_dir="${BIN_DIR}/${os}/${arch}"

    mkdir -p "$out_dir"

    if [ -f "${out_dir}/bun" ] || [ -f "${out_dir}/bun.exe" ]; then
        echo "[download-bun] Already exists: ${out_dir}"
        return
    fi

    echo "[download-bun] Downloading Bun ${VERSION} for ${os}/${arch}..."
    local url="${BASE_URL}/${filename}"
    local tmpfile=$(mktemp)

    curl -fsSL "$url" -o "$tmpfile"

    if [[ "$filename" == *.zip ]]; then
        unzip -q -o "$tmpfile" -d "$out_dir"
        # Bun zip contains a folder like bun-linux-x64/bun
        local inner_dir=$(find "$out_dir" -maxdepth 1 -type d -name "bun-*" | head -1)
        if [ -n "$inner_dir" ]; then
            mv "$inner_dir/bun"* "$out_dir/" 2>/dev/null || true
            rm -rf "$inner_dir"
        fi
    fi

    rm -f "$tmpfile"
    chmod +x "${out_dir}/bun" 2>/dev/null || true
    echo "[download-bun] Done: ${out_dir}"
}

# Linux x64
download_bun "linux" "x64" "bun-linux-x64.zip"

# Windows x64
download_bun "win32" "x64" "bun-windows-x64.zip"

echo "[download-bun] All platforms downloaded."
