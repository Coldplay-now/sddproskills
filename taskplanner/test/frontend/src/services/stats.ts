import { get, ApiResponse } from './api';

// 任务统计响应
export interface TaskStats {
  total: number;
  byStatus: {
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  completedLast7Days: number;
  completedLast30Days: number;
}

// 团队成员统计
export interface MemberStats {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: 'owner' | 'admin' | 'member';
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
}

// 团队统计响应
export interface TeamStats {
  teamId: string;
  teamName: string;
  summary: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
  members: MemberStats[];
}

/**
 * 获取任务统计
 */
export async function getTaskStats(): Promise<ApiResponse<TaskStats>> {
  const response = await get<any>('/api/stats/tasks');
  if (response.data) {
    // 处理后端返回格式 { success: true, data: {...} }
    if (response.data.success && response.data.data) {
      return { data: response.data.data };
    }
    // 如果直接返回数据
    if (!response.data.success) {
      return { data: response.data };
    }
  }
  return response;
}

/**
 * 获取团队统计
 */
export async function getTeamStats(teamId: string): Promise<ApiResponse<TeamStats>> {
  const response = await get<any>(`/api/stats/team/${teamId}`);
  if (response.data) {
    // 处理后端返回格式 { success: true, data: {...} }
    if (response.data.success && response.data.data) {
      return { data: response.data.data };
    }
    // 如果直接返回数据
    if (!response.data.success) {
      return { data: response.data };
    }
  }
  return response;
}
