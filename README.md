# SDDPRO Skills

个人开发的 Cursor/Claude Agent Skills 集合，用于扩展 AI 编程助手的能力。

## 什么是 Skill？

Skill 是模块化的知识包，可以让 AI Agent 掌握特定领域的工作流程和专业知识。每个 Skill 包含：
- **SKILL.md** — 主文件，定义触发条件和工作流程
- **scripts/** — 辅助脚本，提供确定性的自动化能力
- **test/** — 示例和测试用例（可选）

## 已有 Skills

### task-planner

**项目规划和任务编排工具**

根据 PRD 和技术 Spec 文档，通过引导式问答帮助制定开发计划：
- 分析项目模块依赖
- 拆解研发任务
- 生成任务 DAG
- 支持多 Agent 并行开发
- 检查点机制和动态任务调整

```
taskplanner/
├── SKILL.md              # 主文件
├── scripts/
│   ├── validate_dag.py   # DAG 验证
│   ├── next_task.py      # 获取可执行任务
│   ├── claim_task.py     # 认领任务
│   ├── complete_task.py  # 完成任务
│   ├── reset_task.py     # 重置任务
│   ├── checkpoint.py     # 检查点验证
│   └── replan.py         # 动态调整
└── test/                 # 示例项目
    ├── PRD.md            # 示例产品文档
    ├── Spec.md           # 示例技术规格
    ├── TASKS.md          # 生成的任务计划
    ├── backend/          # 生成的后端代码
    └── frontend/         # 生成的前端代码
```

**触发词**：项目规划、任务拆解、开发计划、PRD 分析、模块依赖

## 安装使用

### 方式一：个人 Skill（推荐）

将 skill 复制到 Cursor 个人 skills 目录：

```bash
# 复制 task-planner skill
cp -r taskplanner ~/.cursor/skills/task-planner
```

### 方式二：项目 Skill

将 skill 复制到项目 `.cursor/skills/` 目录：

```bash
mkdir -p .cursor/skills
cp -r taskplanner .cursor/skills/task-planner
```

## Skill 开发规范

### 目录结构

```
skill-name/
├── SKILL.md              # 必需：主文件
├── scripts/              # 可选：辅助脚本
├── references/           # 可选：参考文档
├── assets/               # 可选：资源文件
└── test/                 # 可选：测试用例
```

### SKILL.md 格式

```markdown
---
name: skill-name
description: 描述这个 skill 做什么，以及什么时候应该使用它
---

# Skill Name

## 工作流程
...

## 辅助脚本
...
```

### 最佳实践

1. **保持简洁** — SKILL.md 控制在 500 行以内
2. **渐进式披露** — 核心内容在 SKILL.md，详细参考放 references/
3. **脚本优于生成** — 重复性操作用脚本，减少 token 消耗
4. **明确触发条件** — description 要包含清晰的触发词

## 贡献

欢迎提交新的 Skill 或改进现有 Skill：

1. Fork 本仓库
2. 创建新 skill 目录
3. 编写 SKILL.md 和辅助脚本
4. 添加测试用例（推荐）
5. 提交 Pull Request

## License

MIT
