#!/usr/bin/env python3
"""Telegram 发送模块"""

import urllib.request
import urllib.parse
import json


def send_telegram(bot_token: str, chat_id: str, message: str) -> bool:
    """
    发送 Telegram 消息
    
    Args:
        bot_token: Bot token
        chat_id: Chat ID
        message: 消息内容
    
    Returns:
        bool: 是否发送成功
    """
    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        
        data = {
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'HTML'
        }
        
        data_encoded = urllib.parse.urlencode(data).encode('utf-8')
        
        req = urllib.request.Request(url, data=data_encoded, method='POST')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if result.get('ok'):
                print("Telegram 消息发送成功")
                return True
            else:
                print(f"Telegram 发送失败: {result}")
                return False
                
    except Exception as e:
        print(f"Telegram 发送失败: {e}")
        return False


def format_telegram_message(project: str, commit_msg: str, commit_time: str,
                            changed_files: list, repo_url: str) -> str:
    """格式化 Telegram 消息"""
    
    files_str = '\n'.join([f"  - {f}" for f in changed_files[:10]])
    if len(changed_files) > 10:
        files_str += f"\n  ... 还有 {len(changed_files) - 10} 个文件"
    
    message = f"""📦 <b>{project}</b> 代码已提交

⏰ {commit_time}

📝 {commit_msg}

📁 变更 {len(changed_files)} 个文件
{files_str}

🔗 {repo_url}
"""
    return message
