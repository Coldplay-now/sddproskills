import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Select, Modal, Input, Badge, Spinner } from '../components/ui';
import { getTasks, createTask, Task, CreateTaskRequest } from '../services/task';
import { useAuth } from '../store/authStore';
import { getMyTeams, Team } from '../services/team';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high';
type SortField = 'createdAt' | 'dueDate' | 'priority' | 'status';
type SortOrder = 'asc' | 'desc';

export default function Tasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  
  // 排序状态
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // 创建任务表单
  const [createForm, setCreateForm] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: '',
    assigneeId: '',
    teamId: '',
  });

  // 状态映射
  const statusMap: Record<string, { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'danger' }> = {
    pending: { label: '待处理', variant: 'default' },
    in_progress: { label: '进行中', variant: 'info' },
    completed: { label: '已完成', variant: 'success' },
    cancelled: { label: '已取消', variant: 'default' },
  };

  // 优先级映射
  const priorityMap: Record<string, { label: string; variant: 'default' | 'warning' | 'danger' }> = {
    low: { label: '低', variant: 'default' },
    medium: { label: '中', variant: 'warning' },
    high: { label: '高', variant: 'danger' },
  };

  // 获取任务列表
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (assigneeFilter) params.assigneeId = assigneeFilter;
      if (teamFilter) params.teamId = teamFilter;
      
      const response = await getTasks(params);
      if (response.error) {
        console.error('获取任务列表失败:', response.error);
        return;
      }
      
      if (response.data?.tasks) {
        // 排序
        const sortedTasks = [...response.data.tasks].sort((a, b) => {
          let aValue: any;
          let bValue: any;
          
          switch (sortField) {
            case 'createdAt':
              aValue = new Date(a.createdAt).getTime();
              bValue = new Date(b.createdAt).getTime();
              break;
            case 'dueDate':
              aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
              bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
              break;
            case 'priority':
              const priorityOrder = { low: 1, medium: 2, high: 3 };
              aValue = priorityOrder[a.priority];
              bValue = priorityOrder[b.priority];
              break;
            case 'status':
              const statusOrder = { pending: 1, in_progress: 2, completed: 3, cancelled: 4 };
              aValue = statusOrder[a.status];
              bValue = statusOrder[b.status];
              break;
            default:
              return 0;
          }
          
          if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });
        
        setTasks(sortedTasks);
      }
    } catch (error) {
      console.error('获取任务列表错误:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取团队列表
  const fetchTeams = async () => {
    try {
      const response = await getMyTeams();
      if (response.data) {
        setTeams(response.data);
      }
    } catch (error) {
      console.error('获取团队列表错误:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchTeams();
  }, [statusFilter, priorityFilter, assigneeFilter, teamFilter, sortField, sortOrder]);

  // 创建任务
  const handleCreateTask = async () => {
    if (!createForm.title.trim()) {
      alert('请输入任务标题');
      return;
    }

    try {
      setCreating(true);
      const response = await createTask({
        ...createForm,
        assigneeId: createForm.assigneeId || undefined,
        teamId: createForm.teamId || undefined,
        dueDate: createForm.dueDate || undefined,
      });

      if (response.error) {
        alert(response.error);
        return;
      }

      // 重置表单并关闭模态框
      setCreateForm({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        dueDate: '',
        assigneeId: '',
        teamId: '',
      });
      setIsCreateModalOpen(false);
      
      // 刷新任务列表
      fetchTasks();
    } catch (error) {
      console.error('创建任务错误:', error);
      alert('创建任务失败，请稍后重试');
    } finally {
      setCreating(false);
    }
  };

  // 获取所有分配人（从任务列表中提取）
  const assignees = Array.from(
    new Map(
      tasks
        .filter((task) => task.assignee)
        .map((task) => [task.assignee!.id, task.assignee!])
    ).values()
  );

  // 格式化日期
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">任务列表</h1>
          <p className="text-gray-600 mt-1">管理和追踪所有任务</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建任务
        </Button>
      </div>

      {/* 筛选和排序栏 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Select
              label="状态"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as TaskStatus | '')}
              options={[
                { value: '', label: '全部状态' },
                { value: 'pending', label: '待处理' },
                { value: 'in_progress', label: '进行中' },
                { value: 'completed', label: '已完成' },
                { value: 'cancelled', label: '已取消' },
              ]}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Select
              label="优先级"
              value={priorityFilter}
              onChange={(value) => setPriorityFilter(value as TaskPriority | '')}
              options={[
                { value: '', label: '全部优先级' },
                { value: 'high', label: '高优先级' },
                { value: 'medium', label: '中优先级' },
                { value: 'low', label: '低优先级' },
              ]}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Select
              label="分配人"
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              options={[
                { value: '', label: '全部分配人' },
                ...assignees.map((assignee) => ({
                  value: assignee.id,
                  label: assignee.name,
                })),
              ]}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Select
              label="团队"
              value={teamFilter}
              onChange={setTeamFilter}
              options={[
                { value: '', label: '全部团队' },
                ...teams.map((team) => ({
                  value: team.id,
                  label: team.name,
                })),
              ]}
            />
          </div>
          <div className="flex gap-2">
            <Select
              label="排序字段"
              value={sortField}
              onChange={(value) => setSortField(value as SortField)}
              options={[
                { value: 'createdAt', label: '创建时间' },
                { value: 'dueDate', label: '截止日期' },
                { value: 'priority', label: '优先级' },
                { value: 'status', label: '状态' },
              ]}
            />
            <Select
              label="排序方式"
              value={sortOrder}
              onChange={(value) => setSortOrder(value as SortOrder)}
              options={[
                { value: 'desc', label: '降序' },
                { value: 'asc', label: '升序' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无任务
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">任务</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">优先级</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">负责人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">截止日期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
                    <td className="px-6 py-4">
                      <Link to={`/tasks/${task.id}`} className="font-medium text-gray-800 hover:text-indigo-600" onClick={(e) => e.stopPropagation()}>
                        {task.title}
                      </Link>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusMap[task.status]?.variant || 'default'}>
                        {statusMap[task.status]?.label || task.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={priorityMap[task.priority]?.variant || 'default'}>
                        {priorityMap[task.priority]?.label || task.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {task.assignee ? task.assignee.name : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(task.dueDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 创建任务模态框 */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="创建任务"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="任务标题"
            value={createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            placeholder="请输入任务标题"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="请输入任务描述（可选）"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="状态"
              value={createForm.status}
              onChange={(value) => setCreateForm({ ...createForm, status: value as TaskStatus })}
              options={[
                { value: 'pending', label: '待处理' },
                { value: 'in_progress', label: '进行中' },
                { value: 'completed', label: '已完成' },
              ]}
            />
            <Select
              label="优先级"
              value={createForm.priority}
              onChange={(value) => setCreateForm({ ...createForm, priority: value as TaskPriority })}
              options={[
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' },
              ]}
            />
          </div>
          <Input
            label="截止日期"
            type="datetime-local"
            value={createForm.dueDate}
            onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
          />
          <Select
            label="团队（可选）"
            value={createForm.teamId}
            onChange={(value) => setCreateForm({ ...createForm, teamId: value })}
            options={[
              { value: '', label: '不指定团队' },
              ...teams.map((team) => ({
                value: team.id,
                label: team.name,
              })),
            ]}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateTask} loading={creating}>
              创建
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
