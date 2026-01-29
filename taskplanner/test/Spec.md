# TaskFlow 技术规格文档 (Spec)

## 1. 技术架构

### 1.1 整体架构
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Database   │
│   (React)   │◀────│   (Node.js) │◀────│ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │  (缓存/WS)  │
                    └─────────────┘
```

### 1.2 技术栈
- **前端**: React 18 + TypeScript + TailwindCSS
- **后端**: Node.js + Express + TypeScript
- **数据库**: PostgreSQL 15
- **缓存**: Redis 7
- **实时通信**: Socket.io
- **部署**: Docker + Docker Compose

## 2. 数据模型

### 2.1 用户表 (users)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 团队表 (teams)
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.3 团队成员表 (team_members)
```sql
CREATE TABLE team_members (
    team_id UUID REFERENCES teams(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);
```

### 2.4 任务表 (tasks)
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(10) DEFAULT 'medium',
    due_date TIMESTAMP,
    creator_id UUID REFERENCES users(id),
    assignee_id UUID REFERENCES users(id),
    team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.5 评论表 (comments)
```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.6 标签表 (tags)
```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7),
    team_id UUID REFERENCES teams(id)
);

CREATE TABLE task_tags (
    task_id UUID REFERENCES tasks(id),
    tag_id UUID REFERENCES tags(id),
    PRIMARY KEY (task_id, tag_id)
);
```

## 3. API 设计

### 3.1 认证 API
```
POST /api/auth/register    # 用户注册
POST /api/auth/login       # 用户登录
POST /api/auth/logout      # 用户登出
GET  /api/auth/me          # 获取当前用户信息
```

### 3.2 用户 API
```
GET    /api/users/:id      # 获取用户信息
PUT    /api/users/:id      # 更新用户信息
```

### 3.3 团队 API
```
POST   /api/teams              # 创建团队
GET    /api/teams              # 获取我的团队列表
GET    /api/teams/:id          # 获取团队详情
PUT    /api/teams/:id          # 更新团队信息
DELETE /api/teams/:id          # 删除团队
POST   /api/teams/:id/invite   # 邀请成员
POST   /api/teams/:id/leave    # 离开团队
```

### 3.4 任务 API
```
POST   /api/tasks              # 创建任务
GET    /api/tasks              # 获取任务列表（支持筛选）
GET    /api/tasks/:id          # 获取任务详情
PUT    /api/tasks/:id          # 更新任务
DELETE /api/tasks/:id          # 删除任务
PUT    /api/tasks/:id/assign   # 分配任务
```

### 3.5 评论 API
```
POST   /api/tasks/:id/comments     # 添加评论
GET    /api/tasks/:id/comments     # 获取评论列表
DELETE /api/comments/:id           # 删除评论
```

### 3.6 统计 API
```
GET    /api/stats/tasks        # 任务统计
GET    /api/stats/team/:id     # 团队统计
```

## 4. WebSocket 事件

### 4.1 连接认证
```javascript
socket.emit('auth', { token: 'jwt_token' });
```

### 4.2 事件列表
```
task:created    # 任务创建
task:updated    # 任务更新
task:deleted    # 任务删除
comment:added   # 评论添加
user:online     # 用户上线
user:offline    # 用户下线
```

## 5. 前端页面结构

```
/                   # 首页（未登录跳转登录）
/login              # 登录页
/register           # 注册页
/dashboard          # 仪表盘（任务概览）
/tasks              # 任务列表
/tasks/:id          # 任务详情
/teams              # 团队列表
/teams/:id          # 团队详情
/profile            # 个人设置
```

## 6. 目录结构

### 6.1 后端
```
backend/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── utils/
│   └── app.ts
├── prisma/
│   └── schema.prisma
└── package.json
```

### 6.2 前端
```
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── types/
│   └── App.tsx
└── package.json
```
