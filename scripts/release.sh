#!/bin/bash
# ClawPond 发布脚本 - 构建并推送 Docker 镜像

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
REGISTRY=${REGISTRY:-"docker.io/dovics1"}
IMAGE_NAME="clawpond"

# 获取版本号
if [ -f "package.json" ]; then
    VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
else
    echo -e "${RED}错误: 未找到 package.json${NC}"
    exit 1
fi

# 获取 git hash
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# 组合版本号
VERSION_WITH_HASH="${VERSION}-${GIT_HASH}"

# Docker Hub 特殊处理
if [[ "$REGISTRY" == "docker.io"* ]]; then
    # 提取用户名 (docker.io/username -> username)
    DOCKERHUB_USER="${REGISTRY#docker.io/}"
    FULL_IMAGE="${DOCKERHUB_USER}/${IMAGE_NAME}:${VERSION_WITH_HASH}"
    LATEST_IMAGE="${DOCKERHUB_USER}/${IMAGE_NAME}:latest"
else
    FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${VERSION_WITH_HASH}"
    LATEST_IMAGE="${REGISTRY}/${IMAGE_NAME}:latest"
fi

echo -e "${BLUE}=== ClawPond 发布脚本 ===${NC}"
echo ""
echo "版本: ${VERSION}"
echo "Git Hash: ${GIT_HASH}"
echo "完整版本: ${VERSION_WITH_HASH}"
echo "仓库: ${REGISTRY}"
echo ""

# 构建镜像
echo -e "${YELLOW}构建镜像 ${FULL_IMAGE}...${NC}"
docker build -t "$FULL_IMAGE" -t "$LATEST_IMAGE" .

if [ $? -ne 0 ]; then
    echo -e "${RED}构建失败${NC}"
    exit 1
fi


# 推送镜像
echo ""
echo -e "${YELLOW}推送镜像...${NC}"
docker push "$FULL_IMAGE"
docker push "$LATEST_IMAGE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ 发布成功!${NC}"
    echo ""
    echo "镜像:"
    echo "  ${FULL_IMAGE}"
    echo "  ${LATEST_IMAGE}"
else
    echo -e "${RED}✗ 发布失败${NC}"
    exit 1
fi
