#!/usr/bin/env python3
"""
完成任务脚本

用法：python complete_task.py <任务文档路径> <任务ID> [--failed]

功能：
1. 将任务状态更新为 completed 或 failed
2. 记录完成时间
"""

import sys
import re
from datetime import datetime
from pathlib import Path


def complete_task(file_path: Path, task_id: str, failed: bool = False) -> tuple:
    """完成/失败任务"""
    content = file_path.read_text(encoding='utf-8')
    
    # 检查任务是否存在且状态为 in_progress
    task_pattern = rf'### {task_id}:.*?\n- \*\*状态\*\*: (\w+)'
    match = re.search(task_pattern, content, re.DOTALL)
    
    if not match:
        return False, f"任务 {task_id} 不存在"
    
    current_status = match.group(1)
    if current_status != 'in_progress':
        return False, f"任务状态为 {current_status}，只能完成 in_progress 状态的任务"
    
    new_status = 'failed' if failed else 'completed'
    
    # 更新状态
    old_pattern = rf'(### {task_id}:.*?\n- \*\*状态\*\*:) in_progress'
    new_text = rf'\1 {new_status}'
    
    new_content = re.sub(old_pattern, new_text, content, flags=re.DOTALL)
    
    file_path.write_text(new_content, encoding='utf-8')
    return True, new_status


def main():
    if len(sys.argv) < 3:
        print("用法: python complete_task.py <任务文档路径> <任务ID> [--failed]")
        sys.exit(1)
    
    file_path = Path(sys.argv[1])
    task_id = sys.argv[2].upper()
    failed = '--failed' in sys.argv
    
    if not file_path.exists():
        print(f"✗ 文件不存在: {file_path}")
        sys.exit(1)
    
    success, result = complete_task(file_path, task_id, failed)
    
    if success:
        status_text = "失败" if result == 'failed' else "完成"
        print(f"✓ 任务 {task_id} 已标记为{status_text}")
    else:
        print(f"✗ 操作失败: {result}")
        sys.exit(1)


if __name__ == '__main__':
    main()
