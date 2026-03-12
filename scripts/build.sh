#!/bin/bash
# ClawPond Docker 镜像构建脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认配置
IMAGE_NAME="clawpond"
IMAGE_TAG="latest"
REGISTRY=""
PUSH=false

# 帮助信息
show_help() {
    echo "ClawPond Docker 镜像构建脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -n, --name NAME       镜像名称 (默认: clawpond)"
    echo "  -t, --tag TAG         镜像标签 (默认: latest)"
    echo "  -r, --registry REG    Docker 仓库地址"
    echo "  -p, --push            构建后推送到仓库"
    echo "  -h, --help            显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                          # 构建本地镜像 clawpond:latest"
    echo "  $0 -t v1.0.0                # 构建镜像 clawpond:v1.0.0"
    echo "  $0 -r ghcr.io/user -p       # 构建并推送到 ghcr.io/user/clawpond"
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -p|--push)
            PUSH=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 构建完整镜像名称
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="${REGISTRY}/${FULL_IMAGE_NAME}"
fi

echo -e "${GREEN}=== ClawPond Docker 镜像构建 ===${NC}"
echo ""
echo "配置:"
echo "  镜像名称: ${FULL_IMAGE_NAME}"
echo "  推送仓库: $( [ "$PUSH" = true ] && echo '是' || echo '否' )"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装或不在 PATH 中${NC}"
    exit 1
fi

# 检查 Dockerfile
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}错误: 当前目录中未找到 Dockerfile${NC}"
    exit 1
fi

# 构建镜像
echo -e "${YELLOW}开始构建镜像...${NC}"
docker build \
    --tag "$FULL_IMAGE_NAME" \
    --file Dockerfile \
    --progress=plain \
    .

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ 镜像构建成功: ${FULL_IMAGE_NAME}${NC}"

    # 显示镜像信息
    IMAGE_ID=$(docker images --format "{{.ID}}" "$FULL_IMAGE_NAME" | head -n1)
    IMAGE_SIZE=$(docker images --format "{{.Size}}" "$FULL_IMAGE_NAME" | head -n1)
    echo "  镜像 ID: ${IMAGE_ID}"
    echo "  镜像大小: ${IMAGE_SIZE}"

    # 推送到仓库
    if [ "$PUSH" = true ]; then
        echo ""
        echo -e "${YELLOW}推送镜像到仓库...${NC}"
        docker push "$FULL_IMAGE_NAME"

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ 镜像推送成功${NC}"
        else
            echo -e "${RED}✗ 镜像推送失败${NC}"
            exit 1
        fi
    fi

    echo ""
    echo "运行容器:"
    echo "  docker run -d --name clawpond -p 3000:3000 ${FULL_IMAGE_NAME}"
    echo ""
    echo "或使用 docker-compose:"
    echo "  docker-compose up -d"
else
    echo ""
    echo -e "${RED}✗ 镜像构建失败${NC}"
    exit 1
fi
