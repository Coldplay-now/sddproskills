import { get, post, put, del, ApiResponse } from './api';

// 用户信息（简化版）
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

// 团队信息（简化版）
export interface TeamInfo {
  id: string;
  name: string;
}

// 标签信息
export interface TagInfo {
  id: string;
  name: string;
  color?: string | null;
  team?: TeamInfo | null;
}

// 任务标签关联
export interface TaskTag {
  tag: TagInfo;
}

// 评论信息
export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: UserInfo;
}

// 任务信息
export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  creatorId: string;
  assigneeId?: string | null;
  teamId?: string | null;
  createdAt: string;
  updatedAt: string;
  creator: UserInfo;
  assignee?: UserInfo | null;
  team?: TeamInfo | null;
  tags: TaskTag[];
}

// 创建任务请求
export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  assigneeId?: string;
  teamId?: string;
}

// 更新任务请求
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  assigneeId?: string | null;
  teamId?: string | null;
}

// 获取任务列表查询参数
export interface GetTasksParams {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  teamId?: string;
  creatorId?: string;
}

// 创建评论请求
export interface CreateCommentRequest {
  content: string;
}

/**
 * 创建任务
 */
export async function createTask(data: CreateTaskRequest): Promise<ApiResponse<{ task: Task }>> {
  return post<{ task: Task }>('/api/tasks', data);
}

/**
 * 获取任务列表
 */
export async function getTasks(params?: GetTasksParams): Promise<ApiResponse<{ tasks: Task[] }>> {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
  }
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/api/tasks?${queryString}` : '/api/tasks';
  return get<{ tasks: Task[] }>(endpoint);
}

/**
 * 获取任务详情
 */
export async function getTaskDetail(taskId: string): Promise<ApiResponse<{ task: Task }>> {
  return get<{ task: Task }>(`/api/tasks/${taskId}`);
}

/**
 * 更新任务
 */
export async function updateTask(
  taskId: string,
  data: UpdateTaskRequest
): Promise<ApiResponse<{ task: Task }>> {
  return put<{ task: Task }>(`/api/tasks/${taskId}`, data);
}

/**
 * 删除任务
 */
export async function deleteTask(taskId: string): Promise<ApiResponse<void>> {
  return del<void>(`/api/tasks/${taskId}`);
}

/**
 * 更新任务状态
 */
export async function updateTaskStatus(
  taskId: string,
  status: 'pending' | 'in_progress' | 'completed'
): Promise<ApiResponse<{ task: Task }>> {
  return put<{ task: Task }>(`/api/tasks/${taskId}/status`, { status });
}

/**
 * 分配任务
 */
export async function assignTask(
  taskId: string,
  assigneeId: string
): Promise<ApiResponse<{ task: Task }>> {
  return put<{ task: Task }>(`/api/tasks/${taskId}/assign`, { assigneeId });
}

/**
 * 添加标签到任务
 */
export async function addTagToTask(
  taskId: string,
  tagId: string
): Promise<ApiResponse<{ task: Task }>> {
  return post<{ task: Task }>(`/api/tasks/${taskId}/tags`, { tagId });
}

/**
 * 从任务移除标签
 */
export async function removeTagFromTask(
  taskId: string,
  tagId: string
): Promise<ApiResponse<{ task: Task }>> {
  return del<{ task: Task }>(`/api/tasks/${taskId}/tags/${tagId}`);
}

/**
 * 获取任务评论列表
 */
export async function getTaskComments(taskId: string): Promise<ApiResponse<{ comments: Comment[] }>> {
  return get<{ comments: Comment[] }>(`/api/tasks/${taskId}/comments`);
}

/**
 * 创建评论
 */
export async function createComment(
  taskId: string,
  data: CreateCommentRequest
): Promise<ApiResponse<{ comment: Comment }>> {
  return post<{ comment: Comment }>(`/api/tasks/${taskId}/comments`, data);
}

/**
 * 删除评论
 */
export async function deleteComment(commentId: string): Promise<ApiResponse<void>> {
  return del<void>(`/api/comments/${commentId}`);
}
