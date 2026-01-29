import { get, post, put, del, ApiResponse } from './api';

export interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
  task_count?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface TeamDetail extends Team {
  members: TeamMember[];
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
}

export interface InviteMemberRequest {
  email: string;
  role?: 'admin' | 'member';
}

/**
 * 创建团队
 */
export async function createTeam(data: CreateTeamRequest): Promise<ApiResponse<Team>> {
  return post<Team>('/api/teams', data);
}

/**
 * 获取我的团队列表
 */
export async function getMyTeams(): Promise<ApiResponse<Team[]>> {
  return get<Team[]>('/api/teams');
}

/**
 * 获取团队详情
 */
export async function getTeamDetail(teamId: string): Promise<ApiResponse<TeamDetail>> {
  return get<TeamDetail>(`/api/teams/${teamId}`);
}

/**
 * 更新团队信息
 */
export async function updateTeam(
  teamId: string,
  data: UpdateTeamRequest
): Promise<ApiResponse<Team>> {
  return put<Team>(`/api/teams/${teamId}`, data);
}

/**
 * 删除团队
 */
export async function deleteTeam(teamId: string): Promise<ApiResponse<void>> {
  return del<void>(`/api/teams/${teamId}`);
}

/**
 * 邀请成员
 */
export async function inviteMember(
  teamId: string,
  data: InviteMemberRequest
): Promise<ApiResponse<void>> {
  return post<void>(`/api/teams/${teamId}/invite`, data);
}

/**
 * 离开团队
 */
export async function leaveTeam(teamId: string): Promise<ApiResponse<void>> {
  return post<void>(`/api/teams/${teamId}/leave`);
}

/**
 * 移除成员
 */
export async function removeMember(
  teamId: string,
  userId: string
): Promise<ApiResponse<void>> {
  return del<void>(`/api/teams/${teamId}/members/${userId}`);
}

/**
 * 更新成员角色
 */
export async function updateMemberRole(
  teamId: string,
  userId: string,
  role: 'admin' | 'member'
): Promise<ApiResponse<void>> {
  return put<void>(`/api/teams/${teamId}/members/${userId}/role`, { role });
}
