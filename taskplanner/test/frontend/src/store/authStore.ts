import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, getCurrentUser, login as loginApi, register as registerApi, logout as logoutApi, LoginRequest, RegisterRequest } from '../services/auth';
import { getToken, removeToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  /**
   * 初始化时检查 token 并获取用户信息
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const response = await getCurrentUser();
          if (response.data) {
            setUser(response.data);
          } else {
            // Token 无效，清除
            removeToken();
          }
        } catch (error) {
          console.error('获取用户信息失败:', error);
          removeToken();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  /**
   * 登录
   */
  const login = async (credentials: LoginRequest) => {
    const response = await loginApi(credentials);
    if (response.error) {
      throw new Error(response.error);
    }
    if (response.data) {
      setUser(response.data.user);
    }
  };

  /**
   * 注册
   */
  const register = async (data: RegisterRequest) => {
    const response = await registerApi(data);
    if (response.error) {
      throw new Error(response.error);
    }
    if (response.data) {
      setUser(response.data.user);
    }
  };

  /**
   * 登出
   */
  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      setUser(null);
      removeToken();
    }
  };

  /**
   * 刷新用户信息
   */
  const refreshUser = async () => {
    const response = await getCurrentUser();
    if (response.data) {
      setUser(response.data);
    } else {
      setUser(null);
      removeToken();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 使用认证上下文
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
