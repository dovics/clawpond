#!/bin/bash

# ZeroClaw 自定义镜像构建脚本（本地版本）
# 使用本地下载的 ZeroClaw 二进制文件构建镜像

set -e

# 配置
IMAGE_NAME="dovics1/zeroclaw"
VERSION="${1:-v0.1.7-beta.30}"

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== ZeroClaw 自定义镜像构建（本地版本）===${NC}"
echo ""

# 1. 检查本地二进制文件
BINARY_PATH="${PROJECT_ROOT}/build/zeroclaw/zeroclaw"
if [ ! -f "${BINARY_PATH}" ]; then
    echo -e "${RED}错误: 找不到 ZeroClaw 二进制文件${NC}"
    echo "请先运行: bash scripts/download-zeroclaw.sh ${VERSION}"
    exit 1
fi

# 2. 获取项目版本
PROJECT_VERSION=$(node -p "require('${PROJECT_ROOT}/package.json').version")
echo "项目版本: ${PROJECT_VERSION}"

# 3. 获取 git hash
GIT_HASH=$(cd "${PROJECT_ROOT}" && git rev-parse --short HEAD)
echo "Git Hash: ${GIT_HASH}"

# 4. 获取 ZeroClaw 版本
ZEROCRAW_VERSION=$("${BINARY_PATH}" --version 2>&1 | grep -oP '\d+\.\d+\.\d+' || echo "0.1.7")
echo "ZeroClaw 版本: ${ZEROCRAW_VERSION}"

# 5. 组合镜像版本号
IMAGE_TAG="${VERSION}-local-${PROJECT_VERSION}-${GIT_HASH}"

echo ""
echo "配置:"
echo "  镜像: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""

# 6. 检查 Docker
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 未运行${NC}"
    exit 1
fi

# 7. 构建镜像
echo -e "${YELLOW}开始构建...${NC}"
if docker build \
    --file Dockerfile.zeroclaw \
    --tag "${IMAGE_NAME}:${IMAGE_TAG}" \
    --tag "${IMAGE_NAME}:local-latest" \
    "${PROJECT_ROOT}"; then
    BUILD_SUCCESS=true
else
    BUILD_SUCCESS=false
fi

# 8. 显示结果
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
