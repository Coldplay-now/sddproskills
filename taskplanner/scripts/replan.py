#!/usr/bin/env python3
"""
重新规划脚本 - 根据执行情况动态调整任务

用法：python replan.py <任务文档路径> [选项]

选项：
  --insert <新任务JSON>   插入新任务
  --split <任务ID>        拆分任务（交互式）
  --merge <任务ID1,任务ID2>  合并任务
  --reprioritize          重新评估优先级

功能：
1. 插入修复任务
2. 拆分过大的任务
3. 合并过小的任务
4. 重新评估优先级
"""

import sys
import re
import json
from pathlib import Path
from collections import defaultdict


def parse_tasks(content: str) -> dict:
    """解析任务文档"""
    tasks = {}
    task_pattern = r'### (TASK-\d+):\s*(.+?)(?=\n###|\n## |\Z)'
    task_matches = re.findall(task_pattern, content, re.DOTALL)
    
    for task_id, task_content in task_matches:
        name_match = re.match(r'([^\n]+)', task_content.strip())
        name = name_match.group(1).strip() if name_match else task_id
        
        status_match = re.search(r'\*\*状态\*\*:\s*(\w+)', task_content)
        status = status_match.group(1) if status_match else 'pending'
        
        priority_match = re.search(r'\*\*优先级\*\*:\s*(P\d+)', task_content)
        priority = priority_match.group(1) if priority_match else 'P2'
        
        dep_match = re.search(r'\*\*依赖\*\*:\s*(.+)', task_content)
        dependencies = []
        if dep_match:
            dep_str = dep_match.group(1).strip()
            if dep_str != '无' and dep_str != '-':
                dependencies = re.findall(r'TASK-\d+', dep_str)
        
        tasks[task_id] = {
            'name': name,
            'status': status,
            'priority': priority,
            'dependencies': dependencies,
            'full_content': task_content
        }
    
    return tasks


def get_next_task_id(tasks: dict) -> str:
    """获取下一个可用的任务 ID"""
    max_num = 0
    for task_id in tasks:
        match = re.match(r'TASK-(\d+)', task_id)
        if match:
            num = int(match.group(1))
            max_num = max(max_num, num)
    return f"TASK-{max_num + 1:03d}"


def insert_fix_task(file_path: Path, failed_task_id: str, fix_description: str) -> str:
    """为失败任务插入修复任务"""
    content = file_path.read_text(encoding='utf-8')
    tasks = parse_tasks(content)
    
    if failed_task_id not in tasks:
        return f"任务 {failed_task_id} 不存在"
    
    new_task_id = get_next_task_id(tasks)
    failed_task = tasks[failed_task_id]
    
    # 创建修复任务
    new_task = f"""
### {new_task_id}: 修复 {failed_task_id}
- **状态**: pending
- **执行者**: -
- **认领时间**: -
- **优先级**: P0
- **依赖**: 无
- **模块**: 修复
- **描述**: {fix_description}
- **验收标准**: {failed_task_id} 可以重新执行
- **相关文件**: -
"""
    
    # 在任务列表末尾插入
    insert_pos = content.rfind('\n### TASK-')
    if insert_pos == -1:
        return "无法找到插入位置"
    
    # 找到该任务块的末尾
    next_section = content.find('\n## ', insert_pos + 1)
    if next_section == -1:
        next_section = len(content)
    
    new_content = content[:next_section] + new_task + content[next_section:]
    
    # 更新依赖：让失败任务依赖修复任务
    old_deps = failed_task['dependencies']
    if old_deps:
        new_deps = f"[{', '.join(old_deps)}, {new_task_id}]"
    else:
        new_deps = f"[{new_task_id}]"
    
    # 重置失败任务为 pending
    new_content = re.sub(
        rf'(### {failed_task_id}:.*?\n- \*\*状态\*\*:) failed',
        rf'\1 pending',
        new_content,
        flags=re.DOTALL
    )
    
    new_content = re.sub(
        rf'(### {failed_task_id}:.*?\n- \*\*依赖\*\*:) [^\n]+',
        rf'\1 {new_deps}',
        new_content,
        flags=re.DOTALL
    )
    
    file_path.write_text(new_content, encoding='utf-8')
    return f"已插入修复任务 {new_task_id}，{failed_task_id} 已重置并依赖该任务"


def reprioritize_tasks(file_path: Path) -> str:
    """根据当前状态重新评估优先级"""
    content = file_path.read_text(encoding='utf-8')
    tasks = parse_tasks(content)
    
    # 统计每个任务被依赖的次数
    dep_count = defaultdict(int)
    for info in tasks.values():
        for dep in info['dependencies']:
            dep_count[dep] += 1
    
    changes = []
    for task_id, info in tasks.items():
        if info['status'] != 'pending':
            continue
        
        # 计算新优先级
        # 被依赖越多，优先级越高
        dependents = dep_count[task_id]
        
        if dependents >= 3:
            new_priority = 'P0'
        elif dependents >= 2:
            new_priority = 'P1'
        elif dependents >= 1:
            new_priority = 'P2'
        else:
            new_priority = 'P3'
        
        if new_priority != info['priority']:
            changes.append(f"{task_id}: {info['priority']} → {new_priority}")
            content = re.sub(
                rf'(### {task_id}:.*?\n.*?\n.*?\n.*?\n- \*\*优先级\*\*:) P\d+',
                rf'\1 {new_priority}',
                content,
                flags=re.DOTALL
            )
    
    if changes:
        file_path.write_text(content, encoding='utf-8')
        return "优先级调整:\n" + "\n".join(changes)
    else:
        return "无需调整优先级"


def suggest_task_adjustments(tasks: dict) -> list:
    """分析并建议任务调整"""
    suggestions = []
    
    pending = [tid for tid, info in tasks.items() if info['status'] == 'pending']
    failed = [tid for tid, info in tasks.items() if info['status'] == 'failed']
    
    # 建议：处理失败任务
    for tid in failed:
        suggestions.append({
            'action': 'insert_fix',
            'target': tid,
            'reason': f"任务 {tid} 失败，需要插入修复任务"
        })
    
    # 建议：检查是否有孤立任务（无依赖也不被依赖的 pending 任务）
    all_deps = set()
    for info in tasks.values():
        all_deps.update(info['dependencies'])
    
    orphans = [tid for tid in pending if 
               not tasks[tid]['dependencies'] and tid not in all_deps]
    
    if len(orphans) > 3:
        suggestions.append({
            'action': 'review',
            'target': orphans,
            'reason': f"发现 {len(orphans)} 个孤立任务，考虑是否可以并行执行"
        })
    
    return suggestions


def main():
    if len(sys.argv) < 2:
        print("用法: python replan.py <任务文档路径> [选项]")
        print("选项:")
        print("  --insert-fix <失败任务ID> <修复描述>  为失败任务插入修复任务")
        print("  --reprioritize                        重新评估优先级")
        print("  --suggest                             分析并建议调整")
        sys.exit(1)
    
    file_path = Path(sys.argv[1])
    
    if not file_path.exists():
        print(f"✗ 文件不存在: {file_path}")
        sys.exit(1)
    
    if '--insert-fix' in sys.argv:
        idx = sys.argv.index('--insert-fix')
        if idx + 2 >= len(sys.argv):
            print("✗ 需要指定失败任务ID和修复描述")
            sys.exit(1)
        failed_id = sys.argv[idx + 1].upper()
        fix_desc = sys.argv[idx + 2]
        result = insert_fix_task(file_path, failed_id, fix_desc)
        print(result)
    
    elif '--reprioritize' in sys.argv:
        result = reprioritize_tasks(file_path)
        print(result)
    
    elif '--suggest' in sys.argv:
        content = file_path.read_text(encoding='utf-8')
        tasks = parse_tasks(content)
        suggestions = suggest_task_adjustments(tasks)
        
        if suggestions:
            print("调整建议:")
            for i, s in enumerate(suggestions, 1):
                print(f"\n{i}. [{s['action']}] {s['reason']}")
                if isinstance(s['target'], list):
                    print(f"   涉及: {', '.join(s['target'][:5])}...")
                else:
                    print(f"   目标: {s['target']}")
        else:
            print("✓ 当前任务规划合理，无需调整")
    
    else:
        print("请指定操作选项，运行 --help 查看帮助")


if __name__ == '__main__':
    main()
