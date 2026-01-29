#!/usr/bin/env python3
"""
DAG 验证脚本：检查任务依赖图的正确性

用法：python validate_dag.py <任务文档路径>

检查项：
1. 是否存在循环依赖
2. 是否有引用不存在的任务
3. 是否有孤立任务（无依赖也不被依赖）
"""

import sys
import re
from pathlib import Path
from collections import defaultdict


def parse_tasks(content: str) -> dict:
    """解析任务文档，提取任务及其依赖"""
    tasks = {}
    
    # 匹配任务块：### TASK-XXX: 任务名称
    task_pattern = r'### (TASK-\d+):\s*(.+?)(?=\n###|\n## |\Z)'
    task_matches = re.findall(task_pattern, content, re.DOTALL)
    
    for task_id, task_content in task_matches:
        # 提取依赖
        dep_match = re.search(r'\*\*依赖\*\*:\s*(.+)', task_content)
        dependencies = []
        
        if dep_match:
            dep_str = dep_match.group(1).strip()
            if dep_str != '无' and dep_str != '-':
                # 匹配 [TASK-001, TASK-002] 或 TASK-001, TASK-002 格式
                dep_ids = re.findall(r'TASK-\d+', dep_str)
                dependencies = dep_ids
        
        # 提取状态
        status_match = re.search(r'\*\*状态\*\*:\s*(\w+)', task_content)
        status = status_match.group(1) if status_match else 'pending'
        
        tasks[task_id] = {
            'dependencies': dependencies,
            'status': status
        }
    
    return tasks


def detect_cycle(tasks: dict) -> list:
    """检测循环依赖，返回循环路径"""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {task_id: WHITE for task_id in tasks}
    parent = {}
    
    def dfs(node, path):
        color[node] = GRAY
        for dep in tasks[node]['dependencies']:
            if dep not in tasks:
                continue
            if color[dep] == GRAY:
                # 找到循环，构建路径
                cycle_start = dep
                cycle = [dep]
                curr = node
                while curr != dep:
                    cycle.append(curr)
                    curr = parent.get(curr)
                    if curr is None:
                        break
                cycle.append(dep)
                return cycle[::-1]
            if color[dep] == WHITE:
                parent[dep] = node
                result = dfs(dep, path + [dep])
                if result:
                    return result
        color[node] = BLACK
        return None
    
    for task_id in tasks:
        if color[task_id] == WHITE:
            cycle = dfs(task_id, [task_id])
            if cycle:
                return cycle
    return []


def find_missing_dependencies(tasks: dict) -> list:
    """查找引用了不存在任务的依赖"""
    missing = []
    task_ids = set(tasks.keys())
    
    for task_id, info in tasks.items():
        for dep in info['dependencies']:
            if dep not in task_ids:
                missing.append((task_id, dep))
    
    return missing


def find_orphan_tasks(tasks: dict) -> list:
    """查找孤立任务（无依赖也不被依赖，且不是入口任务）"""
    if len(tasks) <= 1:
        return []
    
    # 统计每个任务被依赖的次数
    depended_by = defaultdict(list)
    for task_id, info in tasks.items():
        for dep in info['dependencies']:
            depended_by[dep].append(task_id)
    
    orphans = []
    for task_id, info in tasks.items():
        has_deps = len(info['dependencies']) > 0
        is_depended = len(depended_by[task_id]) > 0
        
        # 完全孤立：既没有依赖，也没有被依赖
        if not has_deps and not is_depended:
            orphans.append(task_id)
    
    return orphans


def main():
    if len(sys.argv) < 2:
        print("用法: python validate_dag.py <任务文档路径>")
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
    
    errors = []
    warnings = []
    
    # 检查循环依赖
    cycle = detect_cycle(tasks)
    if cycle:
        errors.append(f"循环依赖: {' -> '.join(cycle)}")
    
    # 检查缺失依赖
    missing = find_missing_dependencies(tasks)
    for task_id, dep in missing:
        errors.append(f"{task_id} 依赖了不存在的任务 {dep}")
    
    # 检查孤立任务（仅作为警告）
    orphans = find_orphan_tasks(tasks)
    if orphans:
        warnings.append(f"孤立任务（无依赖也不被依赖）: {', '.join(orphans)}")
    
    # 输出结果
    if errors:
        print("✗ DAG 验证失败:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    
    print(f"✓ DAG 验证通过，共 {len(tasks)} 个任务")
    
    if warnings:
        print("警告:")
        for warn in warnings:
            print(f"  - {warn}")
    
    # 输出统计
    status_count = defaultdict(int)
    for info in tasks.values():
        status_count[info['status']] += 1
    
    print(f"状态统计: {dict(status_count)}")


if __name__ == '__main__':
    main()
