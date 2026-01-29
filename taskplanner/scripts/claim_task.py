#!/usr/bin/env python3
"""
认领任务脚本

用法：python claim_task.py <任务文档路径> <任务ID>

功能：
1. 检查任务是否可认领（状态为 pending，依赖已完成）
2. 生成会话 ID
3. 更新任务状态为 in_progress
"""

import sys
import re
import random
import string
from datetime import datetime
from pathlib import Path


def generate_session_id():
    """生成会话 ID"""
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=3))
    return f"session-{timestamp}-{suffix}"


def parse_tasks(content: str) -> dict:
    """解析任务文档"""
    tasks = {}
    task_pattern = r'### (TASK-\d+):\s*(.+?)(?=\n###|\n## |\Z)'
    task_matches = re.findall(task_pattern, content, re.DOTALL)
    
    for task_id, task_content in task_matches:
        # 提取状态
        status_match = re.search(r'\*\*状态\*\*:\s*(\w+)', task_content)
        status = status_match.group(1) if status_match else 'pending'
        
        # 提取依赖
        dep_match = re.search(r'\*\*依赖\*\*:\s*(.+)', task_content)
        dependencies = []
        if dep_match:
            dep_str = dep_match.group(1).strip()
            if dep_str != '无' and dep_str != '-':
                dependencies = re.findall(r'TASK-\d+', dep_str)
        
        tasks[task_id] = {
            'status': status,
            'dependencies': dependencies
        }
    
    return tasks


def can_claim_task(tasks: dict, task_id: str) -> tuple:
    """检查任务是否可认领"""
    if task_id not in tasks:
        return False, f"任务 {task_id} 不存在"
    
    task = tasks[task_id]
    
    if task['status'] != 'pending':
        return False, f"任务状态为 {task['status']}，不可认领"
    
    # 检查依赖
    completed = {tid for tid, info in tasks.items() if info['status'] == 'completed'}
    unmet_deps = [dep for dep in task['dependencies'] if dep not in completed]
    
    if unmet_deps:
        return False, f"依赖未完成: {', '.join(unmet_deps)}"
    
    return True, "可以认领"


def claim_task(file_path: Path, task_id: str) -> tuple:
    """认领任务"""
    content = file_path.read_text(encoding='utf-8')
    tasks = parse_tasks(content)
    
    can_claim, reason = can_claim_task(tasks, task_id)
    if not can_claim:
        return False, reason
    
    session_id = generate_session_id()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # 更新任务状态
    old_pattern = rf'(### {task_id}:.*?\n- \*\*状态\*\*:) pending\n- \*\*执行者\*\*: -\n- \*\*认领时间\*\*: -'
    new_text = rf'\1 in_progress\n- **执行者**: {session_id}\n- **认领时间**: {now}'
    
    new_content, count = re.subn(old_pattern, new_text, content, flags=re.DOTALL)
    
    if count == 0:
        return False, "无法更新任务状态，请检查文档格式"
    
    file_path.write_text(new_content, encoding='utf-8')
    return True, session_id


def main():
    if len(sys.argv) < 3:
        print("用法: python claim_task.py <任务文档路径> <任务ID>")
        sys.exit(1)
    
    file_path = Path(sys.argv[1])
    task_id = sys.argv[2].upper()
    
    if not file_path.exists():
        print(f"✗ 文件不存在: {file_path}")
        sys.exit(1)
    
    success, result = claim_task(file_path, task_id)
    
    if success:
        print(f"✓ 任务 {task_id} 已认领")
        print(f"  会话 ID: {result}")
    else:
        print(f"✗ 认领失败: {result}")
        sys.exit(1)


if __name__ == '__main__':
    main()
