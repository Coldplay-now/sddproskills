---
name: notifier
description: 代码提交后自动发送通知，支持邮件和 Telegram。可配置触发时机、通知渠道、收件人和模板。当用户提到提交通知、完成通知、邮件通知、Telegram 通知时触发。
---

# Notifier - 代码提交通知

代码提交后自动发送通知，支持邮件（SMTP）和 Telegram 私聊机器人。

---

## 快速开始

### 1. 初始化配置

首次使用时，在项目根目录创建 `.notify-config.json`：

```bash
python ~/.cursor/skills/notifier/scripts/init_config.py
```

### 2. 配置敏感信息

编辑 `~/.cursor/skills/notifier/secrets.json`（首次运行 init 脚本会自动创建模板）：

```json
{
  "smtp": {
    "host": "smtp.qq.com",
    "port": 465,
    "username": "your-email@qq.com",
    "password": "your-auth-code"
  },
  "telegram": {
    "bot_token": "your-bot-token",
    "chat_id": "your-chat-id"
  }
}
```

### 3. 发送通知

```bash
python ~/.cursor/skills/notifier/scripts/notify.py
```

---

## 配置说明

### 项目级配置 `.notify-config.json`

放在项目根目录，每个项目可以不同：

```json
{
  "enabled": true,
  "trigger": "manual",
  "channels": ["email"],
  "email": {
    "recipients": ["recipient@example.com"],
    "subject_template": "[{{project}}] 代码已提交",
    "body_template": "default"
  },
  "telegram": {
    "enabled": false
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| enabled | boolean | 总开关，false 则不发送任何通知 |
| trigger | string | 触发时机：`manual` / `on_push` / `on_task_complete` |
| channels | array | 通知渠道：`["email"]` / `["telegram"]` / `["email", "telegram"]` |

**trigger 选项：**

| 值 | 说明 |
|----|------|
| manual | 用户手动触发（执行脚本或说「通知我」） |
| on_push | git push 成功后自动触发 |
| on_task_complete | Agent 完成一轮任务后自动触发 |

### 敏感信息配置 `secrets.json`

放在 Skill 目录 `~/.cursor/skills/notifier/secrets.json`，全局通用：

```json
{
  "smtp": {
    "host": "smtp.qq.com",
    "port": 465,
    "username": "your-email@qq.com",
    "password": "授权码（不是登录密码）"
  },
  "telegram": {
    "bot_token": "从 @BotFather 获取",
    "chat_id": "你的 chat_id"
  }
}
```

**获取 Telegram chat_id：**

1. 向你的 bot 发送任意消息
2. 访问 `https://api.telegram.org/bot<token>/getUpdates`
3. 找到 `chat.id` 字段

---

## 通知内容

通知会包含以下信息：

| 信息 | 来源 |
|------|------|
| 项目名称 | 从 git remote 或目录名获取 |
| Commit 信息 | 最近一次 commit 的 message |
| 提交时间 | commit 时间戳 |
| 变更文件 | git diff 获取的文件列表 |
| 仓库链接 | 从 git remote 解析 |

### 邮件模板示例

```
主题：[MyProject] 代码已提交

项目：MyProject
时间：2026-01-29 15:30:00

提交信息：
feat: add user authentication

变更文件：
- src/auth/login.ts
- src/auth/logout.ts
- src/api/user.ts

仓库：https://github.com/user/myproject
```

### Telegram 消息示例

```
📦 MyProject 代码已提交

⏰ 2026-01-29 15:30:00

📝 feat: add user authentication

📁 变更 3 个文件
- src/auth/login.ts
- src/auth/logout.ts
- src/api/user.ts

🔗 https://github.com/user/myproject
```

---

## 使用方式

### 方式一：手动触发

直接执行脚本：

```bash
python ~/.cursor/skills/notifier/scripts/notify.py
```

或在对话中说：

> 代码提交完了，通知我一下

### 方式二：git push 后自动触发

配置 `trigger: "on_push"` 后，Agent 执行 git push 成功后会自动发送通知。

### 方式三：任务完成后自动触发

配置 `trigger: "on_task_complete"` 后，Agent 完成一轮任务会自动发送通知。

---

## 脚本说明

| 脚本 | 功能 |
|------|------|
| init_config.py | 初始化配置文件 |
| notify.py | 发送通知（主脚本） |
| send_email.py | 邮件发送模块 |
| send_telegram.py | Telegram 发送模块 |

---

## 启停控制

### 临时禁用

编辑项目根目录的 `.notify-config.json`：

```json
{
  "enabled": false
}
```

### 只禁用某个渠道

```json
{
  "enabled": true,
  "channels": ["telegram"]
}
```

这样只发 Telegram，不发邮件。

---

## 触发词

`提交通知` · `完成通知` · `通知我` · `发邮件` · `发 Telegram`
