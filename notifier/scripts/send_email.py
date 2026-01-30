#!/usr/bin/env python3
"""邮件发送模块"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header


def send_email(smtp_config: dict, recipients: list, subject: str, body: str, html: str = None) -> bool:
    """
    发送邮件
    
    Args:
        smtp_config: SMTP 配置 {host, port, username, password}
        recipients: 收件人列表
        subject: 邮件主题
        body: 邮件正文（纯文本）
        html: HTML 正文（可选）
    
    Returns:
        bool: 是否发送成功
    """
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = smtp_config['username']
        msg['To'] = ', '.join(recipients)
        msg['Subject'] = Header(subject, 'utf-8')
        
        # 纯文本版本（备用）
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        # HTML 版本（优先显示）
        if html:
            msg.attach(MIMEText(html, 'html', 'utf-8'))
        
        # 根据端口选择加密方式
        port = smtp_config.get('port', 465)
        
        if port == 465:
            server = smtplib.SMTP_SSL(smtp_config['host'], port)
        else:
            server = smtplib.SMTP(smtp_config['host'], port)
            server.starttls()
        
        server.login(smtp_config['username'], smtp_config['password'])
        server.sendmail(smtp_config['username'], recipients, msg.as_string())
        server.quit()
        
        print(f"邮件发送成功: {', '.join(recipients)}")
        return True
        
    except Exception as e:
        print(f"邮件发送失败: {e}")
        return False


def format_email_body(project: str, commit_msg: str, commit_time: str, 
                      changed_files: list, repo_url: str) -> str:
    """格式化纯文本邮件正文"""
    
    files_str = '\n'.join([f"  - {f}" for f in changed_files[:20]])
    if len(changed_files) > 20:
        files_str += f"\n  ... 还有 {len(changed_files) - 20} 个文件"
    
    body = f"""项目：{project}
时间：{commit_time}

提交信息：
{commit_msg}

变更文件：
{files_str}

仓库：{repo_url}
"""
    return body


def format_email_html(project: str, commit_msg: str, commit_time: str,
                      changed_files: list, repo_url: str) -> str:
    """格式化 HTML 邮件正文"""
    
    # 仓库链接
    if repo_url:
        repo_link_html = f'<div><a href="{repo_url}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">查看仓库 →</a></div>'
    else:
        repo_link_html = ''
    
    # 变更文件列表
    files_html = ""
    for f in changed_files[:15]:
        files_html += f'<div style="padding: 6px 12px; margin: 4px 0; background: #f8f9fa; border-radius: 4px; font-family: monospace; font-size: 13px; color: #495057;">{f}</div>'
    
    if len(changed_files) > 15:
        files_html += f'<div style="padding: 6px 12px; color: #6c757d; font-size: 13px;">... 还有 {len(changed_files) - 15} 个文件</div>'
    
    if not changed_files:
        files_html = '<div style="padding: 6px 12px; color: #6c757d; font-size: 13px;">无变更文件</div>'
    
    html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        <!-- 主卡片 -->
        <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            
            <!-- 头部 -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
                <div style="font-size: 28px; margin-bottom: 8px;">📦</div>
                <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">{project}</h1>
                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">代码已提交</p>
            </div>
            
            <!-- 内容区 -->
            <div style="padding: 32px;">
                
                <!-- 提交信息 -->
                <div style="margin-bottom: 28px;">
                    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6c757d; margin-bottom: 10px;">提交信息</div>
                    <div style="font-size: 16px; color: #212529; line-height: 1.6; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #667eea;">
                        {commit_msg or '(无提交信息)'}
                    </div>
                </div>
                
                <!-- 时间 -->
                <div style="margin-bottom: 28px;">
                    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6c757d; margin-bottom: 10px;">提交时间</div>
                    <div style="font-size: 15px; color: #495057;">
                        ⏰ {commit_time}
                    </div>
                </div>
                
                <!-- 变更文件 -->
                <div style="margin-bottom: 28px;">
                    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6c757d; margin-bottom: 10px;">变更文件 ({len(changed_files)})</div>
                    {files_html}
                </div>
                
                <!-- 仓库链接 -->
                {repo_link_html}
                
            </div>
            
        </div>
        
        <!-- 底部 -->
        <div style="text-align: center; padding: 24px; color: #adb5bd; font-size: 12px;">
            由 Notifier Skill 自动发送
        </div>
        
    </div>
</body>
</html>'''
    
    return html
