import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyTeams, createTeam, Team } from '../services/team';
import { Button, Input, Modal, Spinner } from '../components/ui';

export default function Teams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const colors = ['bg-indigo-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-500'];

  // 加载团队列表
  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMyTeams();
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setTeams(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载团队列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建团队
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setFormError('团队名称不能为空');
      return;
    }

    try {
      setCreateLoading(true);
      setFormError(null);
      const response = await createTeam({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      if (response.error) {
        setFormError(response.error);
      } else if (response.data) {
        setIsCreateModalOpen(false);
        setFormData({ name: '', description: '' });
        // 跳转到新创建的团队详情页
        navigate(`/teams/${response.data.id}`);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '创建团队失败');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">团队</h1>
          <p className="text-gray-600 mt-1">管理你的团队和成员</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          创建团队
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 加载状态 */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">还没有团队</h3>
          <p className="text-gray-500 mb-4">创建你的第一个团队，开始协作吧</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>创建团队</Button>
        </div>
      ) : (
        /* 团队卡片 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team, index) => (
            <Link
              key={team.id}
              to={`/teams/${team.id}`}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${colors[index % colors.length]} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <span className="text-xl font-bold text-white">{team.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-800 truncate">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{team.description}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{team.member_count || 0} 成员</span>
                  </div>
                  {team.task_count !== undefined && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{team.task_count} 任务</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 创建团队 Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setFormData({ name: '', description: '' });
          setFormError(null);
        }}
        title="创建团队"
        size="md"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {formError}
            </div>
          )}

          <Input
            label="团队名称"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="请输入团队名称"
            required
            disabled={createLoading}
          />

          <Input
            label="团队描述"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="请输入团队描述（可选）"
            disabled={createLoading}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setFormData({ name: '', description: '' });
                setFormError(null);
              }}
              disabled={createLoading}
            >
              取消
            </Button>
            <Button type="submit" loading={createLoading}>
              创建
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
