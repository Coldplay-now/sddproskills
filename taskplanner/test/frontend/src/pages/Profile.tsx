import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();

  // 模拟用户数据
  const [user, setUser] = useState({
    name: '张三',
    email: 'zhangsan@example.com',
    avatar: null as string | null,
    bio: '全栈开发工程师，热爱编程和开源',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: 调用更新 API
    setTimeout(() => {
      setLoading(false);
      alert('保存成功');
    }, 500);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">个人设置</h1>
        <p className="text-gray-600 mt-1">管理你的账号信息和偏好设置</p>
      </div>

      {/* 个人信息表单 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">基本信息</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 头像 */}
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-indigo-600">
                  {user.name.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                更换头像
              </button>
              <p className="text-sm text-gray-500 mt-1">支持 JPG, PNG 格式，最大 2MB</p>
            </div>
          </div>

          {/* 姓名 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              姓名
            </label>
            <input
              id="name"
              type="text"
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* 邮箱 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              邮箱地址
            </label>
            <input
              id="email"
              type="email"
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* 简介 */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
              个人简介
            </label>
            <textarea
              id="bio"
              rows={3}
              value={user.bio}
              onChange={(e) => setUser({ ...user, bio: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-colors"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '保存更改'}
            </button>
          </div>
        </form>
      </div>

      {/* 账号安全 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">账号安全</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-800">修改密码</p>
              <p className="text-sm text-gray-500">定期修改密码可以提高账号安全性</p>
            </div>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
              修改
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-gray-200">
            <div>
              <p className="font-medium text-red-600">退出登录</p>
              <p className="text-sm text-gray-500">退出当前账号</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
