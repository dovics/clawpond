#!/bin/bash

# ZeroClaw 下载和构建脚本（一体化）
# 先下载 ZeroClaw 二进制文件，然后构建 Docker 镜像

set -ex

# 配置
DOWNLOAD_DIR="./build/zeroclaw"
BINARY_NAME="zeroclaw-x86_64-unknown-linux-gnu"
GITHUB_REPO="zeroclaw-labs/zeroclaw"
IMAGE_NAME="dovics1/zeroclaw"

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# 第一部分: 下载 ZeroClaw 二进制文件
# ============================================

echo -e "${BLUE}=== 第一部分: 下载 ZeroClaw ===${NC}"
echo ""

# 获取所有 releases 并过滤稳定版本
get_latest_stable_version() {
    # 获取所有 releases 的 tag
    RAW_RELEASES=$(curl -s "https://api.github.com/repos/${GITHUB_REPO}/releases")
    if [ -z "$RAW_RELEASES" ]; then
        echo -e "${RED}错误: GitHub API 返回空响应${NC}" >&2
        exit 1
    fi

    ALL_RELEASES=$(echo "$RAW_RELEASES" | grep '"tag_name"' | sed 's/.*"tag_name": *"v\([^"]*\)".*/\1/' | sort -V)

    if [ -z "$ALL_RELEASES" ]; then
        echo -e "${RED}错误: 无法解析 release 版本信息${NC}" >&2
        echo -e "${YELLOW}提示: 检查网络连接或 GitHub API 状态${NC}" >&2
        exit 1
    fi

    # 过滤掉预发布版本（包含 alpha、beta、rc 等，或以 a/b/rc 结尾）
    STABLE_VERSIONS=""
    while IFS= read -r version; do
        # 检查版本是否包含预发布标识
        # 匹配: alpha, beta, rc, pre, 或版本号后的 a/b (如 v0.1.9a, v0.1.9b)
        if ! echo "$version" | grep -qE '(alpha|beta|rc|pre|[ab]\d*$|-[a-z])'; then
            # 验证该版本是否有可下载的二进制文件
            DOWNLOAD_URL="https://github.com/${GITHUB_REPO}/releases/download/v${version}/${BINARY_NAME}.tar.gz"
            HTTP_CODE=$(curl -sL -o /dev/null -w "%{http_code}" "${DOWNLOAD_URL}")
            if [ "$HTTP_CODE" = "200" ]; then
                STABLE_VERSIONS="$version\n$STABLE_VERSIONS"
            else
                echo -e "${YELLOW}跳过 v${version} (无可用二进制文件)${NC}" >&2
            fi
        fi
    done <<< "$ALL_RELEASES"

    if [ -z "$STABLE_VERSIONS" ]; then
        echo -e "${RED}错误: 未找到有可用二进制文件的稳定版本${NC}"
        exit 1
    fi

    # 返回最新版本（第一个）
    echo -e "$STABLE_VERSIONS" | head -n 1
}

# 确定版本号（构建时可能包含 beta 等标签）
if [ -n "$1" ] && [ "$1" != "latest" ]; then
    VERSION="$1"
    # 下载时验证稳定版本，但构建时可以使用任何版本
    DOWNLOAD_VERSION=$(echo "$VERSION" | sed 's/-.*//')
    if echo "$DOWNLOAD_VERSION" | grep -qE '(alpha|beta|rc|pre)'; then
        echo -e "${YELLOW}注意: 下载预发布版本 ($VERSION)${NC}"
    fi
    echo "使用指定版本: v${VERSION}"
else
    # 下载时使用最新稳定版，构建时可指定其他版本
    DOWNLOAD_VERSION=$(get_latest_stable_version)
    VERSION="${DOWNLOAD_VERSION}"
    echo "找到最新稳定版本: v${VERSION}"
fi

echo -e "${YELLOW}下载 ZeroClaw v${DOWNLOAD_VERSION}...${NC}"

# 创建下载目录
mkdir -p "${DOWNLOAD_DIR}"

# 检查是否已存在
BINARY_PATH="${DOWNLOAD_DIR}/zeroclaw"
if [ -f "${BINARY_PATH}" ]; then
    EXISTING_VERSION=$("${BINARY_PATH}" --version 2>&1 || echo "unknown")
    echo -e "${YELLOW}发现已存在的二进制文件 (版本: ${EXISTING_VERSION})${NC}"
fi

# 下载
if [ ! -f "${BINARY_PATH}" ] || [ "$FORCE_DOWNLOAD" = true ]; then
    DOWNLOAD_URL="https://github.com/${GITHUB_REPO}/releases/download/v${DOWNLOAD_VERSION}/${BINARY_NAME}.tar.gz"
    echo "下载地址: ${DOWNLOAD_URL}"

    HTTP_CODE=$(curl -L -o "${DOWNLOAD_DIR}/zeroclaw.tar.gz" -w "%{http_code}" "${DOWNLOAD_URL}")

    if [ "$HTTP_CODE" != "200" ]; then
        echo -e "${RED}错误: 下载失败 (HTTP ${HTTP_CODE})${NC}"
        rm -f "${DOWNLOAD_DIR}/zeroclaw.tar.gz"
        exit 1
    fi

    # 解压
    cd "${DOWNLOAD_DIR}"
    tar -xzf zeroclaw.tar.gz

    # 验证
    if [ ! -f "zeroclaw" ]; then
        echo -e "${RED}错误: 解压后找不到 zeroclaw 二进制文件${NC}"
        exit 1
    fi

    chmod +x zeroclaw
fi

VERSION_OUTPUT=$("${BINARY_PATH}" --version 2>&1 || echo "unknown")

echo ""
echo -e "${GREEN}✓ ZeroClaw 就绪${NC}"
echo "  位置: ${BINARY_PATH}"
echo "  版本: ${VERSION_OUTPUT}"
echo ""

# ============================================
# 第二部分: 构建 Docker 镜像
# ============================================

echo -e "${BLUE}=== 第二部分: 构建 Docker 镜像 ===${NC}"
echo ""

# 获取项目版本
PROJECT_VERSION=$(node -p "require('${PROJECT_ROOT}/package.json').version")
echo "项目版本: ${PROJECT_VERSION}"

# 获取 git hash
GIT_HASH=$(cd "${PROJECT_ROOT}" && git rev-parse --short HEAD)
echo "Git Hash: ${GIT_HASH}"

# 获取 ZeroClaw 版本
ZEROCRAW_VERSION=$("${BINARY_PATH}" --version 2>&1 | grep -oP '\d+\.\d+\.\d+' || echo "${DOWNLOAD_VERSION}")
echo "ZeroClaw 版本: ${ZEROCRAW_VERSION}"

# 组合镜像版本号
IMAGE_TAG="${VERSION}-${PROJECT_VERSION}-${GIT_HASH}"

echo ""
echo "配置:"
echo "  镜像: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""

# 检查 Docker
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 未运行${NC}"
    exit 1
fi

# 构建镜像
echo -e "${YELLOW}开始构建...${NC}"
cd "${PROJECT_ROOT}"
if docker build \
    --file Dockerfile.zeroclaw \
    --tag "${IMAGE_NAME}:${IMAGE_TAG}" \
    --tag "${IMAGE_NAME}:local-latest" \
    "${PROJECT_ROOT}"; then
    BUILD_SUCCESS=true
else
    BUILD_SUCCESS=false
fi

# 显示结果
if [ "${BUILD_SUCCESS}" = true ]; then
    echo ""
    echo -e "${GREEN}✓ 构建成功: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"

    IMAGE_SIZE=$(docker images "${IMAGE_NAME}:${IMAGE_TAG}" --format "{{.Size}}")
    echo "  大小: ${IMAGE_SIZE}"
    echo ""
    echo "运行容器:"
    echo "  docker run -d --name zeroclaw -p 42617:42617 ${IMAGE_NAME}:${IMAGE_TAG}"
    echo ""
    echo "交互式测试:"
    echo "  docker run -it --rm ${IMAGE_NAME}:${IMAGE_TAG} /bin/sh"
else
    echo ""
    echo -e "${RED}错误: 构建失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== 全部完成! ===${NC}"
