import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // 加载中时显示加载状态（可选：可以添加一个加载组件）
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 未登录，重定向到登录页，并保存原始访问路径
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
