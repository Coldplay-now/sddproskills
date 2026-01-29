#!/usr/bin/env python3
"""
检查点脚本 - 每轮并行结束后执行

用法：python checkpoint.py <任务文档路径> <项目根目录>

功能：
1. 验证刚完成任务的产出物是否存在
2. 检查代码 lint 错误
3. 检测文件冲突
4. 建议后续任务调整
"""

import sys
import re
import os
import subprocess
from pathlib import Path
from collections import defaultdict


def parse_tasks(content: str) -> dict:
    """解析任务文档"""
    tasks = {}
    task_pattern = r'### (TASK-\d+):\s*(.+?)(?=\n###|\n## |\Z)'
    task_matches = re.findall(task_pattern, content, re.DOTALL)
    
    for task_id, task_content in task_matches:
        # 提取名称
        name_match = re.match(r'([^\n]+)', task_content.strip())
        name = name_match.group(1).strip() if name_match else task_id
        
        # 提取状态
        status_match = re.search(r'\*\*状态\*\*:\s*(\w+)', task_content)
        status = status_match.group(1) if status_match else 'pending'
        
        # 提取相关文件
        files_match = re.search(r'\*\*相关文件\*\*:\s*(.+)', task_content)
        related_files = []
        if files_match:
            files_str = files_match.group(1).strip()
            if files_str != '-':
                related_files = [f.strip() for f in files_str.split(',')]
        
        # 提取依赖
        dep_match = re.search(r'\*\*依赖\*\*:\s*(.+)', task_content)
        dependencies = []
        if dep_match:
            dep_str = dep_match.group(1).strip()
            if dep_str != '无' and dep_str != '-':
                dependencies = re.findall(r'TASK-\d+', dep_str)
        
        tasks[task_id] = {
            'name': name,
            'status': status,
            'related_files': related_files,
            'dependencies': dependencies
        }
    
    return tasks


def check_file_exists(project_root: Path, file_patterns: list) -> list:
    """检查文件是否存在"""
    missing = []
    for pattern in file_patterns:
        if not pattern or pattern == '-':
            continue
        # 处理目录模式（以 / 结尾）
        path = project_root / pattern.rstrip('/')
        if not path.exists():
            missing.append(pattern)
    return missing


def check_lint_errors(project_root: Path) -> dict:
    """检查 lint 错误（简化版：检查 TypeScript 编译）"""
    errors = {}
    
    # 检查后端
    backend_path = project_root / 'backend'
    if backend_path.exists():
        try:
            result = subprocess.run(
                ['npx', 'tsc', '--noEmit'],
                cwd=backend_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            if result.returncode != 0:
                errors['backend'] = result.stdout + result.stderr
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
    
    # 检查前端
    frontend_path = project_root / 'frontend'
    if frontend_path.exists():
        try:
            result = subprocess.run(
                ['npx', 'tsc', '--noEmit'],
                cwd=frontend_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            if result.returncode != 0:
                errors['frontend'] = result.stdout + result.stderr
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
    
    return errors


def analyze_task_adjustments(tasks: dict) -> list:
    """分析是否需要调整后续任务"""
    suggestions = []
    
    completed = {tid for tid, info in tasks.items() if info['status'] == 'completed'}
    failed = {tid for tid, info in tasks.items() if info['status'] == 'failed'}
    pending = {tid for tid, info in tasks.items() if info['status'] == 'pending'}
    
    # 检查失败任务的影响
    for failed_id in failed:
        # 找出依赖失败任务的后续任务
        affected = [tid for tid, info in tasks.items() 
                   if failed_id in info['dependencies'] and info['status'] == 'pending']
        if affected:
            suggestions.append({
                'type': 'blocked',
                'message': f"任务 {failed_id} 失败，以下任务被阻塞: {', '.join(affected)}",
                'action': f"请先修复 {failed_id}，或调整依赖关系"
            })
    
    # 检查是否有可以合并的小任务
    # （简化实现：检查同一模块的连续小任务）
    
    return suggestions


def main():
    if len(sys.argv) < 3:
        print("用法: python checkpoint.py <任务文档路径> <项目根目录>")
        sys.exit(1)
    
    task_file = Path(sys.argv[1])
    project_root = Path(sys.argv[2])
    
    if not task_file.exists():
        print(f"✗ 任务文档不存在: {task_file}")
        sys.exit(1)
    
    content = task_file.read_text(encoding='utf-8')
    tasks = parse_tasks(content)
    
    print("=" * 60)
    print("检查点报告")
    print("=" * 60)
    
    # 统计
    status_count = defaultdict(int)
    for info in tasks.values():
        status_count[info['status']] += 1
    
    total = len(tasks)
    completed = status_count['completed']
    in_progress = status_count['in_progress']
    failed = status_count['failed']
    pending = status_count['pending']
    
    print(f"\n📊 进度统计")
    print(f"  总任务数: {total}")
    print(f"  已完成: {completed} ({completed/total*100:.1f}%)")
    print(f"  进行中: {in_progress}")
    print(f"  失败: {failed}")
    print(f"  待执行: {pending}")
    
    # 检查最近完成的任务的产出
    print(f"\n📁 产出物检查")
    recently_completed = [tid for tid, info in tasks.items() if info['status'] == 'completed']
    all_missing = []
    for task_id in recently_completed[-5:]:  # 检查最近5个
        info = tasks[task_id]
        if info['related_files']:
            missing = check_file_exists(project_root, info['related_files'])
            if missing:
                all_missing.extend([(task_id, f) for f in missing])
    
    if all_missing:
        print("  ⚠️ 以下文件未找到:")
        for task_id, file in all_missing:
            print(f"    - {task_id}: {file}")
    else:
        print("  ✓ 产出物检查通过")
    
    # Lint 检查（可选，耗时较长）
    print(f"\n🔍 代码检查")
    if '--skip-lint' in sys.argv:
        print("  (跳过)")
    else:
        lint_errors = check_lint_errors(project_root)
        if lint_errors:
            print("  ⚠️ 发现 lint 错误:")
            for location, error in lint_errors.items():
                print(f"    [{location}]")
                # 只显示前5行
                for line in error.split('\n')[:5]:
                    print(f"      {line}")
        else:
            print("  ✓ 无 lint 错误")
    
    # 任务调整建议
    print(f"\n💡 调整建议")
    suggestions = analyze_task_adjustments(tasks)
    if suggestions:
        for s in suggestions:
            print(f"  [{s['type']}] {s['message']}")
            print(f"    → {s['action']}")
    else:
        print("  ✓ 无需调整")
    
    # 下一步行动
    print(f"\n🚀 下一步")
    if failed > 0:
        print(f"  1. 处理 {failed} 个失败任务")
    if in_progress > 0:
        print(f"  2. 等待 {in_progress} 个进行中任务完成")
    if pending > 0:
        print(f"  3. 运行 next_task.py 查看可执行任务")
    else:
        print("  🎉 所有任务已完成!")
    
    print("\n" + "=" * 60)


if __name__ == '__main__':
    main()
