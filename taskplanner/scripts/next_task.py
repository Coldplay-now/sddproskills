#!/usr/bin/env python3
"""
下一任务推荐脚本：获取当前可执行的任务列表

用法：python next_task.py <任务文档路径>

可执行任务条件：
1. 状态为 pending
2. 所有依赖任务已完成（状态为 completed）
"""

import sys
import re
from pathlib import Path


def parse_tasks(content: str) -> dict:
    """解析任务文档，提取任务及其依赖"""
    tasks = {}
    
    # 匹配任务块：### TASK-XXX: 任务名称
    task_pattern = r'### (TASK-\d+):\s*(.+?)(?=\n###|\n## |\Z)'
    task_matches = re.findall(task_pattern, content, re.DOTALL)
    
    for task_id, task_content in task_matches:
        # 提取任务名称（第一行）
        name_match = re.match(r'([^\n]+)', task_content.strip())
        name = name_match.group(1).strip() if name_match else task_id
        
        # 提取依赖
        dep_match = re.search(r'\*\*依赖\*\*:\s*(.+)', task_content)
        dependencies = []
        
        if dep_match:
            dep_str = dep_match.group(1).strip()
            if dep_str != '无' and dep_str != '-':
                dep_ids = re.findall(r'TASK-\d+', dep_str)
                dependencies = dep_ids
        
        # 提取状态
        status_match = re.search(r'\*\*状态\*\*:\s*(\w+)', task_content)
        status = status_match.group(1) if status_match else 'pending'
        
        # 提取优先级
        priority_match = re.search(r'\*\*优先级\*\*:\s*(P\d+)', task_content)
        priority = priority_match.group(1) if priority_match else 'P2'
        
        # 提取描述
        desc_match = re.search(r'\*\*描述\*\*:\s*(.+)', task_content)
        description = desc_match.group(1).strip() if desc_match else ''
        
        tasks[task_id] = {
            'name': name,
            'dependencies': dependencies,
            'status': status,
            'priority': priority,
            'description': description
        }
    
    return tasks


def get_executable_tasks(tasks: dict) -> list:
    """获取可执行的任务列表"""
    completed = {tid for tid, info in tasks.items() if info['status'] == 'completed'}
    
    executable = []
    for task_id, info in tasks.items():
        if info['status'] != 'pending':
            continue
        
        # 检查所有依赖是否已完成
        deps_satisfied = all(dep in completed for dep in info['dependencies'])
        
        if deps_satisfied:
            executable.append({
                'id': task_id,
                'name': info['name'],
                'priority': info['priority'],
                'description': info['description'],
                'dependencies': info['dependencies']
            })
    
    # 按优先级排序（P0 > P1 > P2）
    executable.sort(key=lambda x: x['priority'])
    
    return executable


def main():
    if len(sys.argv) < 2:
        print("用法: python next_task.py <任务文档路径>")
        sys.exit(1)
    
    file_path = Path(sys.argv[1])
    
    if not file_path.exists():
        print(f"✗ 文件不存在: {file_path}")
        sys.exit(1)
    
    content = file_path.read_text(encoding='utf-8')
    tasks = parse_tasks(content)
    
    if not tasks:
        print("✗ 未找到任何任务")
        sys.exit(1)
    
    executable = get_executable_tasks(tasks)
    
    # 统计信息
    total = len(tasks)
    completed = sum(1 for info in tasks.values() if info['status'] == 'completed')
    in_progress = sum(1 for info in tasks.values() if info['status'] == 'in_progress')
    pending = sum(1 for info in tasks.values() if info['status'] == 'pending')
    
    print(f"任务进度: {completed}/{total} 完成, {in_progress} 进行中, {pending} 待执行")
    print()
    
    if not executable:
        if pending > 0:
            print("当前无可执行任务（存在未完成的依赖）")
        else:
            print("所有任务已完成或正在执行中！")
        return
    
    print(f"可执行任务 ({len(executable)} 个):")
    print("-" * 60)
    
    for task in executable:
        deps_str = ', '.join(task['dependencies']) if task['dependencies'] else '无'
        print(f"[{task['priority']}] {task['id']}")
        print(f"    描述: {task['description']}")
        print(f"    依赖: {deps_str}")
        print()


if __name__ == '__main__':
    main()
