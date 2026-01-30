#!/usr/bin/env python3
"""初始化 notifier 配置文件"""

import json
import os
from pathlib import Path

# 项目配置模板
PROJECT_CONFIG_TEMPLATE = {
    "enabled": True,
    "trigger": "manual",
    "channels": ["email"],
    "email": {
        "recipients": ["your-email@example.com"],
        "subject_template": "[{{project}}] 代码已提交",
        "body_template": "default"
    },
    "telegram": {
        "enabled": False
    }
}

# 敏感信息配置模板
SECRETS_TEMPLATE = {
    "smtp": {
        "host": "smtp.qq.com",
        "port": 465,
        "username": "your-email@qq.com",
        "password": "your-smtp-auth-code"
    },
    "telegram": {
        "bot_token": "your-bot-token-from-botfather",
        "chat_id": "your-chat-id"
    }
}

def init_project_config():
    """在当前目录创建项目配置文件"""
    config_path = Path.cwd() / ".notify-config.json"
    
    if config_path.exists():
        print(f"配置文件已存在: {config_path}")
        overwrite = input("是否覆盖？(y/N): ").strip().lower()
        if overwrite != 'y':
            print("跳过项目配置")
            return
    
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(PROJECT_CONFIG_TEMPLATE, f, ensure_ascii=False, indent=2)
    
    print(f"已创建项目配置: {config_path}")
    print("请编辑配置文件，填入收件人邮箱等信息")

def init_secrets_config():
    """在 Skill 目录创建敏感信息配置"""
    skill_dir = Path(__file__).parent.parent
    secrets_path = skill_dir / "secrets.json"
    
    if secrets_path.exists():
        print(f"敏感信息配置已存在: {secrets_path}")
        return
    
    with open(secrets_path, 'w', encoding='utf-8') as f:
        json.dump(SECRETS_TEMPLATE, f, ensure_ascii=False, indent=2)
    
    print(f"已创建敏感信息配置: {secrets_path}")
    print("请编辑配置文件，填入 SMTP 密码和 Telegram token")
    print("注意：此文件包含敏感信息，请勿提交到 git")

def main():
    print("=== Notifier 配置初始化 ===\n")
    
    # 初始化敏感信息配置
    init_secrets_config()
    print()
    
    # 初始化项目配置
    init_project_config()
    print()
    
    print("初始化完成！")
    print("\n下一步：")
    print("1. 编辑 secrets.json 填入 SMTP 密码和 Telegram token")
    print("2. 编辑 .notify-config.json 填入收件人邮箱")
    print("3. 运行 notify.py 测试通知")

if __name__ == "__main__":
    main()
