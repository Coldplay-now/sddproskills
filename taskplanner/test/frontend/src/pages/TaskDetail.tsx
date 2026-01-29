import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button, Badge, Modal, Input, Select, Avatar, Spinner } from '../components/ui';
import {
  getTaskDetail,
  updateTask,
  updateTaskStatus,
  Task,
  UpdateTaskRequest,
  getTaskComments,
  createComment,
  deleteComment,
  Comment,
} from '../services/task';
import { useAuth } from '../store/authStore';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // 编辑表单
  const [editForm, setEditForm] = useState<UpdateTaskRequest>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: null,
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

  // 获取任务详情
  const fetchTask = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await getTaskDetail(id);
      if (response.error) {
        console.error('获取任务详情失败:', response.error);
        alert(response.error);
        navigate('/tasks');
        return;
      }
      if (response.data?.task) {
        setTask(response.data.task);
        setEditForm({
          title: response.data.task.title,
          description: response.data.task.description || '',
          status: response.data.task.status,
          priority: response.data.task.priority,
          dueDate: response.data.task.dueDate || null,
        });
      }
    } catch (error) {
      console.error('获取任务详情错误:', error);
      alert('获取任务详情失败');
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  };

  // 获取评论列表
  const fetchComments = async () => {
    if (!id) return;
    try {
      const response = await getTaskComments(id);
      if (response.error) {
        console.error('获取评论列表失败:', response.error);
        return;
      }
      if (response.data?.comments) {
        setComments(response.data.comments);
      }
    } catch (error) {
      console.error('获取评论列表错误:', error);
    }
  };

  useEffect(() => {
    fetchTask();
    fetchComments();
  }, [id]);

  // 更新任务
  const handleUpdateTask = async () => {
    if (!id || !task) return;

    try {
      setUpdating(true);
      const response = await updateTask(id, editForm);
      if (response.error) {
        alert(response.error);
        return;
      }
      if (response.data?.task) {
        setTask(response.data.task);
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error('更新任务错误:', error);
      alert('更新任务失败');
    } finally {
      setUpdating(false);
    }
  };

  // 更新任务状态
  const handleUpdateStatus = async (status: 'pending' | 'in_progress' | 'completed') => {
    if (!id) return;

    try {
      setUpdating(true);
      const response = await updateTaskStatus(id, status);
      if (response.error) {
        alert(response.error);
        return;
      }
      if (response.data?.task) {
        setTask(response.data.task);
      }
    } catch (error) {
      console.error('更新任务状态错误:', error);
      alert('更新任务状态失败');
    } finally {
      setUpdating(false);
    }
  };

  // 提交评论
  const handleSubmitComment = async () => {
    if (!id || !commentContent.trim()) return;

    try {
      setSubmittingComment(true);
      const response = await createComment(id, { content: commentContent });
      if (response.error) {
        alert(response.error);
        return;
      }
      setCommentContent('');
      fetchComments();
    } catch (error) {
      console.error('提交评论错误:', error);
      alert('提交评论失败');
    } finally {
      setSubmittingComment(false);
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      const response = await deleteComment(commentId);
      if (response.error) {
        alert(response.error);
        return;
      }
      fetchComments();
    } catch (error) {
      console.error('删除评论错误:', error);
      alert('删除评论失败');
    }
  };

  // 格式化日期
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 格式化日期（仅日期）
  const formatDateOnly = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  };

  // 检查是否有编辑权限
  const canEdit = task && (task.creatorId === user?.id || task.assigneeId === user?.id);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12 text-gray-500">
        任务不存在
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/tasks" className="text-gray-500 hover:text-indigo-600">
          任务列表
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-800">任务详情</span>
      </nav>

      {/* 任务头部 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant={statusMap[task.status]?.variant || 'default'}>
                {statusMap[task.status]?.label || task.status}
              </Badge>
              <Badge variant={priorityMap[task.priority]?.variant || 'default'}>
                {priorityMap[task.priority]?.label || task.priority}优先级
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">{task.title}</h1>
            {task.description && (
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">{task.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
                编辑
              </Button>
            )}
            {task.status !== 'completed' && canEdit && (
              <Button
                onClick={() => handleUpdateStatus('completed')}
                loading={updating}
              >
                完成任务
              </Button>
            )}
            {task.status === 'pending' && canEdit && (
              <Button
                variant="secondary"
                onClick={() => handleUpdateStatus('in_progress')}
                loading={updating}
              >
                开始任务
              </Button>
            )}
            {task.status === 'in_progress' && canEdit && (
              <Button
                variant="secondary"
                onClick={() => handleUpdateStatus('pending')}
                loading={updating}
              >
                暂停任务
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主内容区 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 评论区 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">评论</h2>
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无评论
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Avatar
                        src={comment.user.avatarUrl || undefined}
                        name={comment.user.name}
                        size="sm"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800">{comment.user.name}</span>
                          <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                      {comment.userId === user?.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <textarea
                rows={3}
                placeholder="添加评论..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <div className="mt-2 flex justify-end">
                <Button onClick={handleSubmitComment} loading={submittingComment} disabled={!commentContent.trim()}>
                  发送
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 侧边信息 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">详细信息</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gray-500">负责人</dt>
                <dd className="mt-1 flex items-center gap-2">
                  {task.assignee ? (
                    <>
                      <Avatar
                        src={task.assignee.avatarUrl || undefined}
                        name={task.assignee.name}
                        size="sm"
                      />
                      <span className="text-gray-800">{task.assignee.name}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">未分配</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">创建者</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <Avatar
                    src={task.creator.avatarUrl || undefined}
                    name={task.creator.name}
                    size="sm"
                  />
                  <span className="text-gray-800">{task.creator.name}</span>
                </dd>
              </div>
              {task.team && (
                <div>
                  <dt className="text-sm text-gray-500">团队</dt>
                  <dd className="mt-1 text-gray-800">{task.team.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">截止日期</dt>
                <dd className="mt-1 text-gray-800">{formatDateOnly(task.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">创建时间</dt>
                <dd className="mt-1 text-gray-800">{formatDate(task.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">更新时间</dt>
                <dd className="mt-1 text-gray-800">{formatDate(task.updatedAt)}</dd>
              </div>
              {task.tags.length > 0 && (
                <div>
                  <dt className="text-sm text-gray-500">标签</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {task.tags.map((taskTag) => (
                      <Badge key={taskTag.tag.id} variant="default">
                        {taskTag.tag.name}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* 编辑任务模态框 */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="编辑任务"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="任务标题"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            placeholder="请输入任务标题"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
            <textarea
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="请输入任务描述（可选）"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="状态"
              value={editForm.status}
              onChange={(value) => setEditForm({ ...editForm, status: value as TaskStatus })}
              options={[
                { value: 'pending', label: '待处理' },
                { value: 'in_progress', label: '进行中' },
                { value: 'completed', label: '已完成' },
                { value: 'cancelled', label: '已取消' },
              ]}
            />
            <Select
              label="优先级"
              value={editForm.priority}
              onChange={(value) => setEditForm({ ...editForm, priority: value as TaskPriority })}
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
            value={editForm.dueDate ? new Date(editForm.dueDate).toISOString().slice(0, 16) : ''}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                dueDate: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateTask} loading={updating}>
              保存
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
