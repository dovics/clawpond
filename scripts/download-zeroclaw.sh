#!/bin/bash

# ZeroClaw 二进制文件下载脚本

set -e

VERSION="${1:-v0.1.7-beta.30}"
DOWNLOAD_DIR="./build/zeroclaw"
BINARY_NAME="zeroclaw-x86_64-unknown-linux-gnu"

echo "下载 ZeroClaw ${VERSION}..."

# 创建下载目录
mkdir -p "${DOWNLOAD_DIR}"

# 下载
curl -L -o "${DOWNLOAD_DIR}/zeroclaw.tar.gz" \
    "https://github.com/zeroclaw-labs/zeroclaw/releases/download/${VERSION}/${BINARY_NAME}.tar.gz"

# 解压
cd "${DOWNLOAD_DIR}"
tar -xzf zeroclaw.tar.gz

# 验证
if [ ! -f "zeroclaw" ]; then
    echo "错误: 解压后找不到 zeroclaw 二进制文件"
    exit 1
fi

chmod +x zeroclaw
./zeroclaw --version

echo "✓ ZeroClaw ${VERSION} 下载成功: ${DOWNLOAD_DIR}/zeroclaw"
