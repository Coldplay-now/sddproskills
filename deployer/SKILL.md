---
name: deployer
description: 根据 Spec 文档生成完整的部署方案，包括 CI/CD 配置、容器化配置、环境管理和部署脚本。支持多种部署目标（容器/云平台/服务器）和 CI/CD 平台。当用户提到部署、CI/CD、Docker、K8s、发布、上线时触发。
---

# Deployer

将技术 Spec 转化为完整的部署方案，生成可执行的配置文件和部署脚本。

## 设计原则

1. **可复现** — 部署过程完全自动化，结果可预测
2. **环境隔离** — 不同环境配置严格分离
3. **安全优先** — 敏感信息不硬编码，使用环境变量
4. **渐进式** — 从简单部署到复杂编排，按需扩展

## 输入要求

### 必需输入
- **Spec 文档** — 技术架构、依赖服务、环境要求

### 可选输入
- **现有部署配置** — 项目已有的 Dockerfile、CI 配置等
- **基础设施信息** — 云平台账号、服务器信息

## 部署目标矩阵

```mermaid
graph TD
    subgraph 部署目标
        A[容器化部署]
        B[云平台部署]
        C[服务器部署]
    end
    
    subgraph 容器化
        A --> A1[Docker Compose<br/>本地/小型]
        A --> A2[Kubernetes<br/>中大型]
        A --> A3[Docker Swarm<br/>中型集群]
    end
    
    subgraph 云平台
        B --> B1[Vercel/Netlify<br/>前端/静态]
        B --> B2[AWS ECS/EKS<br/>容器服务]
        B --> B3[GCP Cloud Run<br/>Serverless]
        B --> B4[Azure Container<br/>容器服务]
    end
    
    subgraph 服务器
        C --> C1[PM2<br/>Node.js]
        C --> C2[Systemd<br/>通用服务]
        C --> C3[Nginx + 反代<br/>Web 服务]
    end
```

## CI/CD 平台支持

| 平台 | 配置文件 | 适用场景 |
|------|----------|----------|
| GitHub Actions | `.github/workflows/*.yml` | GitHub 托管项目 |
| GitLab CI | `.gitlab-ci.yml` | GitLab 托管项目 |
| Jenkins | `Jenkinsfile` | 自建 CI/CD |
| CircleCI | `.circleci/config.yml` | 开源项目 |
| Azure Pipelines | `azure-pipelines.yml` | Azure 生态 |

## 工作流程

### 阶段 1：读取 Spec

1. 读取 Spec 文档，提取技术栈和依赖
2. 识别需要部署的服务（前端、后端、数据库等）
3. 提取环境要求（Node 版本、Python 版本等）

**输出：** 部署需求摘要

### 阶段 2：选择部署目标

与用户讨论确定部署方式：

```
基于您的技术栈分析，有以下部署建议：

项目类型：[全栈 Web 应用]
服务组成：
- 前端：React SPA
- 后端：Node.js API
- 数据库：PostgreSQL
- 缓存：Redis

请选择部署目标：

| 选项 | 部署方式 | 适用场景 | 复杂度 |
|------|----------|----------|--------|
| A | Docker Compose | 小型项目、开发测试 | ⭐ |
| B | Kubernetes | 中大型项目、高可用 | ⭐⭐⭐ |
| C | 云平台托管 | 快速上线、免运维 | ⭐⭐ |
| D | 服务器直接部署 | 传统服务器、VPS | ⭐⭐ |

您的选择：
```

**输出：** 确认的部署目标

### 阶段 3：选择 CI/CD 平台

```
请选择您的 CI/CD 平台：

| 选项 | 平台 | 特点 |
|------|------|------|
| A | GitHub Actions | 免费额度充足，GitHub 原生集成 |
| B | GitLab CI | GitLab 原生，私有部署友好 |
| C | Jenkins | 自托管，高度可定制 |
| D | 其他 | CircleCI / Azure Pipelines 等 |

您的选择：
```

**输出：** 确认的 CI/CD 平台

### 阶段 4：定义部署环境

```
请定义您的部署环境：

常见配置：
| 环境 | 用途 | 触发条件 |
|------|------|----------|
| development | 开发测试 | push to dev branch |
| staging | 预发布验证 | push to staging branch |
| production | 生产环境 | push to main + tag |

您需要哪些环境？（可自定义）
- [ ] Development
- [ ] Staging  
- [ ] Production
- [ ] 其他：___

是否需要手动审批才能部署到生产环境？[Y/N]
```

**输出：** 环境清单和部署策略

### 阶段 5：确定流水线阶段

```
请确认 CI/CD 流水线阶段：

| 阶段 | 说明 | 建议 |
|------|------|------|
| ☑ Lint | 代码检查 | 推荐 |
| ☑ Build | 构建产物 | 必需 |
| ☑ Test | 运行测试 | 推荐 |
| ☐ Security Scan | 安全扫描 | 可选 |
| ☑ Deploy | 部署发布 | 必需 |

请确认或调整：
```

**输出：** 确认的流水线阶段

### 阶段 6：生成配置文件

根据前面的选择，生成对应的配置文件。

#### Dockerfile 示例（Node.js）

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# 依赖安装阶段
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

#### docker-compose.yml 示例

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=${DB_USER:-postgres}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME:-app}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "${DB_PORT:-5432}:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### GitHub Actions 示例

```yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, staging, dev]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test

  build:
    runs-on: ubuntu-latest
    needs: test
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/staging'
    environment: staging
    steps:
      - name: Deploy to Staging
        run: |
          echo "Deploying to staging..."
          # 添加实际部署命令

  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to Production
        run: |
          echo "Deploying to production..."
          # 添加实际部署命令
```

### 阶段 7：生成环境配置

生成环境变量模板：

```bash
# .env.example
# =================================
# 应用配置
# =================================
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# =================================
# 数据库配置
# =================================
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<your-password>
DB_NAME=app

# =================================
# Redis 配置
# =================================
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# =================================
# 认证配置
# =================================
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRES_IN=7d

# =================================
# 第三方服务（按需配置）
# =================================
# AWS
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=us-east-1

# 邮件服务
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<your-user>
SMTP_PASS=<your-password>
```

### 阶段 8：生成部署脚本

```bash
#!/bin/bash
# deploy/scripts/deploy.sh
# 部署脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置
IMAGE_NAME="${IMAGE_NAME:-app}"
CONTAINER_NAME="${CONTAINER_NAME:-app}"
ENV="${1:-production}"

echo -e "${YELLOW}开始部署到 ${ENV} 环境...${NC}"

# 检查环境变量文件
if [ ! -f ".env.${ENV}" ]; then
    echo -e "${RED}错误: .env.${ENV} 文件不存在${NC}"
    exit 1
fi

# 拉取最新代码
echo -e "${GREEN}拉取最新代码...${NC}"
git pull origin main

# 构建镜像
echo -e "${GREEN}构建 Docker 镜像...${NC}"
docker build -t ${IMAGE_NAME}:latest .

# 停止旧容器
echo -e "${GREEN}停止旧容器...${NC}"
docker stop ${CONTAINER_NAME} 2>/dev/null || true
docker rm ${CONTAINER_NAME} 2>/dev/null || true

# 启动新容器
echo -e "${GREEN}启动新容器...${NC}"
docker run -d \
    --name ${CONTAINER_NAME} \
    --env-file .env.${ENV} \
    -p 3000:3000 \
    --restart unless-stopped \
    ${IMAGE_NAME}:latest

# 健康检查
echo -e "${GREEN}执行健康检查...${NC}"
sleep 5
./deploy/scripts/health-check.sh

echo -e "${GREEN}部署完成！${NC}"
```

```bash
#!/bin/bash
# deploy/scripts/rollback.sh
# 回滚脚本

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

IMAGE_NAME="${IMAGE_NAME:-app}"
CONTAINER_NAME="${CONTAINER_NAME:-app}"
ROLLBACK_TAG="${1:-previous}"

echo -e "${GREEN}开始回滚到 ${ROLLBACK_TAG}...${NC}"

# 停止当前容器
docker stop ${CONTAINER_NAME} 2>/dev/null || true
docker rm ${CONTAINER_NAME} 2>/dev/null || true

# 启动回滚版本
docker run -d \
    --name ${CONTAINER_NAME} \
    --env-file .env.production \
    -p 3000:3000 \
    --restart unless-stopped \
    ${IMAGE_NAME}:${ROLLBACK_TAG}

echo -e "${GREEN}回滚完成！${NC}"
```

```bash
#!/bin/bash
# deploy/scripts/health-check.sh
# 健康检查脚本

set -e

MAX_RETRIES=30
RETRY_INTERVAL=2
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/health}"

echo "检查服务健康状态: ${HEALTH_URL}"

for i in $(seq 1 $MAX_RETRIES); do
    if curl -s -f ${HEALTH_URL} > /dev/null 2>&1; then
        echo "✅ 服务健康检查通过"
        exit 0
    fi
    echo "等待服务启动... ($i/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
done

echo "❌ 健康检查失败"
exit 1
```

### 阶段 9：可选 - 监控和日志配置

如果用户需要，生成监控配置：

```yaml
# deploy/monitoring/docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  prometheus_data:
  grafana_data:
```

### 阶段 10：生成部署文档

汇总所有内容，生成部署目录结构。

## 输出目录结构

```
deploy/
├── README.md                 # 部署说明文档
├── Dockerfile                # 容器镜像定义
├── docker-compose.yml        # 本地开发环境
├── docker-compose.prod.yml   # 生产环境（如需要）
├── .env.example              # 环境变量模板
├── .env.development          # 开发环境配置（gitignore）
├── .env.staging              # 预发布环境配置（gitignore）
├── .env.production           # 生产环境配置（gitignore）
├── scripts/
│   ├── deploy.sh             # 部署脚本
│   ├── rollback.sh           # 回滚脚本
│   └── health-check.sh       # 健康检查脚本
├── ci/
│   ├── github-actions.yml    # GitHub Actions（按需）
│   ├── gitlab-ci.yml         # GitLab CI（按需）
│   └── Jenkinsfile           # Jenkins（按需）
├── k8s/                      # Kubernetes 配置（如选择）
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── secrets.yaml
└── nginx/                    # Nginx 配置（如需要）
    └── nginx.conf
```

## 部署文档模板

```markdown
# [项目名称] 部署指南

## 1. 概述

本文档描述 [项目名称] 的部署流程和配置。

### 1.1 部署架构

​```mermaid
graph LR
    subgraph 外部
        User[用户] --> LB[负载均衡]
    end
    
    subgraph 应用层
        LB --> App1[App Pod 1]
        LB --> App2[App Pod 2]
    end
    
    subgraph 数据层
        App1 --> DB[(PostgreSQL)]
        App2 --> DB
        App1 --> Cache[(Redis)]
        App2 --> Cache
    end
​```

### 1.2 环境清单

| 环境 | URL | 分支 | 部署方式 |
|------|-----|------|----------|
| Development | dev.example.com | dev | 自动 |
| Staging | staging.example.com | staging | 自动 |
| Production | example.com | main | 手动审批 |

## 2. 前置要求

- Docker >= 20.10
- docker-compose >= 2.0
- Node.js >= 20（本地开发）

## 3. 快速开始

### 3.1 本地开发

​```bash
# 复制环境变量
cp .env.example .env.development

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f app
​```

### 3.2 生产部署

​```bash
# 执行部署
./deploy/scripts/deploy.sh production
​```

## 4. 环境变量

| 变量 | 说明 | 必需 | 默认值 |
|------|------|------|--------|
| NODE_ENV | 运行环境 | 是 | development |
| DATABASE_URL | 数据库连接 | 是 | - |
| REDIS_URL | Redis 连接 | 是 | - |
| JWT_SECRET | JWT 密钥 | 是 | - |

## 5. CI/CD 流程

​```mermaid
flowchart LR
    A[Push] --> B[Lint]
    B --> C[Test]
    C --> D[Build]
    D --> E{Branch?}
    E -->|staging| F[Deploy Staging]
    E -->|main| G[Approval]
    G --> H[Deploy Production]
​```

## 6. 运维操作

### 6.1 部署

​```bash
./deploy/scripts/deploy.sh <environment>
​```

### 6.2 回滚

​```bash
./deploy/scripts/rollback.sh <tag>
​```

### 6.3 健康检查

​```bash
./deploy/scripts/health-check.sh
​```

## 7. 故障排查

### 7.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 容器启动失败 | 环境变量缺失 | 检查 .env 文件 |
| 数据库连接失败 | 网络不通 | 检查 Docker 网络 |
| 健康检查失败 | 服务未就绪 | 查看应用日志 |

---

## META（供其他 Skill 解析）

​```yaml
deployment:
  project: "[项目名称]"
  version: "1.0"
  
  target: "docker-compose"  # docker-compose | kubernetes | cloud
  ci_platform: "github-actions"  # github-actions | gitlab-ci | jenkins
  
  environments:
    - name: development
      branch: dev
      auto_deploy: true
    - name: staging
      branch: staging
      auto_deploy: true
    - name: production
      branch: main
      auto_deploy: false
      requires_approval: true
      
  services:
    - name: app
      type: web
      port: 3000
      replicas: 2
    - name: db
      type: database
      image: postgres:15
    - name: redis
      type: cache
      image: redis:7
      
  pipeline:
    stages:
      - lint
      - test
      - build
      - deploy
​```
```

## Kubernetes 配置示例

如果用户选择 Kubernetes 部署：

```yaml
# deploy/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  labels:
    app: app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: ghcr.io/org/app:latest
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secrets
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

```yaml
# deploy/k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: app
spec:
  selector:
    app: app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

```yaml
# deploy/k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app
                port:
                  number: 80
```

## 与其他 Skill 的衔接

| 上游 Skill | 输入数据 |
|------------|----------|
| spec-designer | Spec.META.tech_stack, 依赖服务 |
| test-planner | CI 测试命令集成 |

| 下游 Skill | 输出数据 |
|------------|----------|
| task-planner | 部署相关任务 |

## 注意事项

1. **敏感信息** — 永远不要在配置文件中硬编码密码
2. **环境隔离** — 不同环境使用独立的配置和数据
3. **回滚能力** — 确保任何部署都可以快速回滚
4. **健康检查** — 部署后必须验证服务健康
5. **日志保留** — 配置合适的日志保留策略
6. **资源限制** — 容器要设置资源限制防止资源耗尽
