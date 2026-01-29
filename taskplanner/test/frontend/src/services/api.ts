// API 基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

/**
 * 获取认证 Token
 */
export function getToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * 设置认证 Token
 */
export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

/**
 * 移除认证 Token
 */
export function removeToken(): void {
  localStorage.removeItem('token');
}

/**
 * 创建请求配置
 */
function createRequestConfig(
  method: string,
  body?: any,
  headers?: Record<string, string>
): RequestInit {
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  // 添加认证 Token
  const token = getToken();
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  // 添加请求体
  if (body) {
    config.body = JSON.stringify(body);
  }

  return config;
}

/**
 * 处理 API 响应
 */
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    let errorMessage = `请求失败: ${response.status} ${response.statusText}`;
    
    if (isJson) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // 忽略 JSON 解析错误
      }
    }

    // 401 未授权，清除 token
    if (response.status === 401) {
      removeToken();
    }

    return {
      error: errorMessage,
    };
  }

  if (isJson) {
    try {
      const data = await response.json();
      return { data };
    } catch {
      return {
        error: '响应解析失败',
      };
    }
  }

  return {
    data: null as T,
  };
}

/**
 * API 请求封装
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, options);
    return await handleResponse<T>(response);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '网络请求失败',
    };
  }
}

/**
 * GET 请求
 */
export function get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, createRequestConfig('GET', undefined, headers));
}

/**
 * POST 请求
 */
export function post<T = any>(
  endpoint: string,
  body?: any,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, createRequestConfig('POST', body, headers));
}

/**
 * PUT 请求
 */
export function put<T = any>(
  endpoint: string,
  body?: any,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, createRequestConfig('PUT', body, headers));
}

/**
 * DELETE 请求
 */
export function del<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, createRequestConfig('DELETE', undefined, headers));
}
