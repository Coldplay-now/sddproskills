#!/usr/bin/env python3
"""
Notifier 主脚本 - 发送代码提交通知

用法：
    python notify.py              # 使用当前目录的配置
    python notify.py --test       # 测试模式，不实际发送
    python notify.py --email-only # 只发邮件
    python notify.py --tg-only    # 只发 Telegram
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# 导入发送模块
from send_email import send_email, format_email_body, format_email_html
from send_telegram import send_telegram, format_telegram_message


def load_project_config() -> dict:
    """加载项目配置"""
    config_path = Path.cwd() / ".notify-config.json"
    
    if not config_path.exists():
        print(f"错误：找不到项目配置文件 {config_path}")
        print("请先运行 init_config.py 初始化配置")
        sys.exit(1)
    
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_secrets() -> dict:
    """加载敏感信息配置"""
    secrets_path = Path(__file__).parent.parent / "secrets.json"
    
    if not secrets_path.exists():
        print(f"错误：找不到敏感信息配置 {secrets_path}")
        print("请先运行 init_config.py 初始化配置")
        sys.exit(1)
    
    with open(secrets_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_git_info() -> dict:
    """获取 git 信息"""
    info = {
        'project': Path.cwd().name,
        'commit_msg': '',
        'commit_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'changed_files': [],
        'repo_url': ''
    }
    
    try:
        # 获取项目名（从 remote url 或目录名）
        result = subprocess.run(
            ['git', 'remote', 'get-url', 'origin'],
            capture_output=True, text=True, cwd=Path.cwd()
        )
        if result.returncode == 0:
            remote_url = result.stdout.strip()
            # 解析仓库名
            if 'github.com' in remote_url:
                # git@github.com:user/repo.git -> repo
                # https://github.com/user/repo.git -> repo
                info['project'] = remote_url.split('/')[-1].replace('.git', '')
                # 转换为 https 链接
                if remote_url.startswith('git@'):
                    remote_url = remote_url.replace(':', '/').replace('git@', 'https://')
                info['repo_url'] = remote_url.replace('.git', '')
        
        # 获取最近一次 commit 信息
        result = subprocess.run(
            ['git', 'log', '-1', '--pretty=format:%s'],
            capture_output=True, text=True, cwd=Path.cwd()
        )
        if result.returncode == 0:
            info['commit_msg'] = result.stdout.strip()
        
        # 获取 commit 时间
        result = subprocess.run(
            ['git', 'log', '-1', '--pretty=format:%ci'],
            capture_output=True, text=True, cwd=Path.cwd()
        )
        if result.returncode == 0:
            info['commit_time'] = result.stdout.strip()[:19]
        
        # 获取变更文件
        result = subprocess.run(
            ['git', 'diff', '--name-only', 'HEAD~1', 'HEAD'],
            capture_output=True, text=True, cwd=Path.cwd()
        )
        if result.returncode == 0 and result.stdout.strip():
            info['changed_files'] = result.stdout.strip().split('\n')
        
    except Exception as e:
        print(f"获取 git 信息时出错: {e}")
    
    return info


def main():
    # 解析参数
    test_mode = '--test' in sys.argv
    email_only = '--email-only' in sys.argv
    tg_only = '--tg-only' in sys.argv
    
    # 加载配置
    config = load_project_config()
    secrets = load_secrets()
    
    # 检查是否启用
    if not config.get('enabled', True):
        print("通知已禁用（enabled: false）")
        return
    
    # 获取 git 信息
    git_info = get_git_info()
    
    # 使用自定义项目名（如果配置了）
    if config.get('project_name'):
        git_info['project'] = config['project_name']
    
    print(f"项目: {git_info['project']}")
    print(f"提交: {git_info['commit_msg']}")
    print(f"时间: {git_info['commit_time']}")
    print(f"变更: {len(git_info['changed_files'])} 个文件")
    print()
    
    if test_mode:
        print("[测试模式] 不实际发送通知")
        return
    
    channels = config.get('channels', [])
    
    # 发送邮件
    if 'email' in channels and not tg_only:
        email_config = config.get('email', {})
        recipients = email_config.get('recipients', [])
        
        if recipients and secrets.get('smtp'):
            subject_template = email_config.get('subject_template', '[{{project}}] 代码已提交')
            subject = subject_template.replace('{{project}}', git_info['project'])
            
            body = format_email_body(
                project=git_info['project'],
                commit_msg=git_info['commit_msg'],
                commit_time=git_info['commit_time'],
                changed_files=git_info['changed_files'],
                repo_url=git_info['repo_url']
            )
            
            html = format_email_html(
                project=git_info['project'],
                commit_msg=git_info['commit_msg'],
                commit_time=git_info['commit_time'],
                changed_files=git_info['changed_files'],
                repo_url=git_info['repo_url']
            )
            
            send_email(secrets['smtp'], recipients, subject, body, html)
        else:
            print("邮件配置不完整，跳过邮件通知")
    
    # 发送 Telegram
    if 'telegram' in channels and not email_only:
        tg_secrets = secrets.get('telegram', {})
        
        if tg_secrets.get('bot_token') and tg_secrets.get('chat_id'):
            message = format_telegram_message(
                project=git_info['project'],
                commit_msg=git_info['commit_msg'],
                commit_time=git_info['commit_time'],
                changed_files=git_info['changed_files'],
                repo_url=git_info['repo_url']
            )
            
            send_telegram(tg_secrets['bot_token'], tg_secrets['chat_id'], message)
        else:
            print("Telegram 配置不完整，跳过 Telegram 通知")
    
    print("\n通知发送完成")


if __name__ == "__main__":
    main()
