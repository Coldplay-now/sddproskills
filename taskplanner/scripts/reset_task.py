#!/usr/bin/env python3
"""
重置任务脚本

用法：python reset_task.py <任务文档路径> <任务ID>

功能：
1. 将 in_progress 或 failed 状态的任务重置为 pending
2. 清空执行者和认领时间
"""

import sys
import re
from pathlib import Path


def reset_task(file_path: Path, task_id: str) -> tuple:
    """重置任务"""
    content = file_path.read_text(encoding='utf-8')
    
    # 检查任务状态
    task_pattern = rf'### {task_id}:.*?\n- \*\*状态\*\*: (\w+)'
    match = re.search(task_pattern, content, re.DOTALL)
    
    if not match:
        return False, f"任务 {task_id} 不存在"
    
    current_status = match.group(1)
    if current_status not in ['in_progress', 'failed']:
        return False, f"任务状态为 {current_status}，只能重置 in_progress 或 failed 状态"
    
    # 重置任务
    old_pattern = rf'(### {task_id}:.*?\n- \*\*状态\*\*:) \w+\n- \*\*执行者\*\*: [^\n]+\n- \*\*认领时间\*\*: [^\n]+'
    new_text = rf'\1 pending\n- **执行者**: -\n- **认领时间**: -'
    
    new_content = re.sub(old_pattern, new_text, content, flags=re.DOTALL)
    
    file_path.write_text(new_content, encoding='utf-8')
    return True, "已重置"


def main():
    if len(sys.argv) < 3:
        print("用法: python reset_task.py <任务文档路径> <任务ID>")
        sys.exit(1)
    
    file_path = Path(sys.argv[1])
    task_id = sys.argv[2].upper()
    
    if not file_path.exists():
        print(f"✗ 文件不存在: {file_path}")
        sys.exit(1)
    
    success, result = reset_task(file_path, task_id)
    
    if success:
        print(f"✓ 任务 {task_id} 已重置为 pending")
    else:
        print(f"✗ 重置失败: {result}")
        sys.exit(1)


if __name__ == '__main__':
    main()
