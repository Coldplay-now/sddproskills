import { get, post, setToken, removeToken, ApiResponse } from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * 用户登录
 */
export async function login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
  const response = await post<AuthResponse>('/api/auth/login', credentials);
  
  if (response.data?.token) {
    setToken(response.data.token);
  }
  
  return response;
}

/**
 * 用户注册
 */
export async function register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
  const response = await post<AuthResponse>('/api/auth/register', data);
  
  if (response.data?.token) {
    setToken(response.data.token);
  }
  
  return response;
}

/**
 * 用户登出
 */
export async function logout(): Promise<ApiResponse<void>> {
  const response = await post<void>('/api/auth/logout');
  removeToken();
  return response;
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<ApiResponse<User>> {
  return get<User>('/api/auth/me');
}
