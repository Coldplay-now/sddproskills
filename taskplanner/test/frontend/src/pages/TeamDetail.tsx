import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getTeamDetail,
  inviteMember,
  removeMember,
  leaveTeam,
  updateMemberRole,
  updateTeam,
  TeamDetail,
  TeamMember,
} from '../services/team';
import { useAuth } from '../store/authStore';
import { Button, Input, Modal, Select, Avatar, Badge, Spinner } from '../components/ui';

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 邀请成员 Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  
  // 编辑团队 Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', description: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  // 成员操作菜单
  const [memberMenuOpen, setMemberMenuOpen] = useState<string | null>(null);
  const [roleChangeMember, setRoleChangeMember] = useState<TeamMember | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 获取当前用户在团队中的角色
  const currentUserRole = team?.members.find((m) => m.id === user?.id)?.role;
  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin' || isOwner;
  const isCurrentUser = (memberId: string) => memberId === user?.id;

  // 加载团队详情
  useEffect(() => {
    if (id) {
      loadTeamDetail();
    }
  }, [id]);

  // 点击外部关闭成员菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (memberMenuOpen) {
        setMemberMenuOpen(null);
      }
    };

    if (memberMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [memberMenuOpen]);

  const loadTeamDetail = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await getTeamDetail(id);
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setTeam(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载团队详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 邀请成员
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!inviteEmail.trim()) {
      setInviteError('请输入邮箱地址');
      return;
    }

    try {
      setInviteLoading(true);
      setInviteError(null);
      const response = await inviteMember(id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      if (response.error) {
        setInviteError(response.error);
      } else {
        setIsInviteModalOpen(false);
        setInviteEmail('');
        setInviteRole('member');
        loadTeamDetail(); // 重新加载团队详情
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : '邀请成员失败');
    } finally {
      setInviteLoading(false);
    }
  };

  // 更新成员角色
  const handleUpdateMemberRole = async (member: TeamMember, newRole: 'admin' | 'member') => {
    if (!id) return;

    try {
      setActionLoading(true);
      const response = await updateMemberRole(id, member.id, newRole);
      if (response.error) {
        alert(response.error);
      } else {
        setRoleChangeMember(null);
        loadTeamDetail();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新角色失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 移除成员
  const handleRemoveMember = async () => {
    if (!id || !removeMemberId) return;

    if (!confirm('确定要移除此成员吗？')) {
      setRemoveMemberId(null);
      return;
    }

    try {
      setActionLoading(true);
      const response = await removeMember(id, removeMemberId);
      if (response.error) {
        alert(response.error);
      } else {
        setRemoveMemberId(null);
        loadTeamDetail();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '移除成员失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 离开团队
  const handleLeaveTeam = async () => {
    if (!id) return;

    if (!confirm('确定要离开此团队吗？')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await leaveTeam(id);
      if (response.error) {
        alert(response.error);
      } else {
        navigate('/teams');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '离开团队失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 更新团队信息
  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!editFormData.name.trim()) {
      setEditError('团队名称不能为空');
      return;
    }

    try {
      setEditLoading(true);
      setEditError(null);
      const response = await updateTeam(id, {
        name: editFormData.name.trim(),
        description: editFormData.description.trim() || undefined,
      });

      if (response.error) {
        setEditError(response.error);
      } else {
        setIsEditModalOpen(false);
        loadTeamDetail();
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '更新团队信息失败');
    } finally {
      setEditLoading(false);
    }
  };

  // 打开编辑 Modal
  const openEditModal = () => {
    if (team) {
      setEditFormData({
        name: team.name,
        description: team.description || '',
      });
      setIsEditModalOpen(true);
    }
  };

  // 获取角色标签
  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: 'success' | 'info' | 'default' }> = {
      owner: { label: '所有者', variant: 'success' },
      admin: { label: '管理员', variant: 'info' },
      member: { label: '成员', variant: 'default' },
    };
    const roleInfo = roleMap[role] || roleMap.member;
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error || '团队不存在'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/teams" className="text-gray-500 hover:text-indigo-600">
          团队
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-800">{team.name}</span>
      </nav>

      {/* 团队头部 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white">{team.name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{team.name}</h1>
              {team.description && <p className="text-gray-600 mt-1">{team.description}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="secondary" onClick={openEditModal}>
                编辑团队
              </Button>
            )}
            {!isOwner && (
              <Button variant="danger" onClick={handleLeaveTeam} loading={actionLoading}>
                离开团队
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">团队成员</h2>
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
            >
              邀请成员
            </Button>
          )}
        </div>
        <div className="divide-y divide-gray-200">
          {team.members.map((member) => (
            <div key={member.id} className="px-6 py-4 flex items-center justify-between group">
              <div className="flex items-center gap-3 flex-1">
                <Avatar src={member.avatar_url} name={member.name} size="md" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800">{member.name}</p>
                    {getRoleBadge(member.role)}
                    {isCurrentUser(member.id) && (
                      <Badge variant="default">我</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>
              {isAdmin && !isCurrentUser(member.id) && member.role !== 'owner' && (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMemberMenuOpen(memberMenuOpen === member.id ? null : member.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  {memberMenuOpen === member.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <div className="py-1">
                        {member.role === 'admin' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleChangeMember(member);
                              setMemberMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            降级为成员
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleChangeMember(member);
                              setMemberMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            升级为管理员
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRemoveMemberId(member.id);
                            setMemberMenuOpen(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          移除成员
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 邀请成员 Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setInviteEmail('');
          setInviteRole('member');
          setInviteError(null);
        }}
        title="邀请成员"
        size="md"
      >
        <form onSubmit={handleInviteMember} className="space-y-4">
          {inviteError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {inviteError}
            </div>
          )}

          <Input
            label="邮箱地址"
            type="email"
            name="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="请输入成员邮箱"
            required
            disabled={inviteLoading}
          />

          <Select
            label="角色"
            name="role"
            value={inviteRole}
            onChange={(value) => setInviteRole(value as 'admin' | 'member')}
            options={[
              { value: 'member', label: '成员' },
              { value: 'admin', label: '管理员' },
            ]}
            disabled={inviteLoading}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsInviteModalOpen(false);
                setInviteEmail('');
                setInviteRole('member');
                setInviteError(null);
              }}
              disabled={inviteLoading}
            >
              取消
            </Button>
            <Button type="submit" loading={inviteLoading}>
              发送邀请
            </Button>
          </div>
        </form>
      </Modal>

      {/* 编辑团队 Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditFormData({ name: '', description: '' });
          setEditError(null);
        }}
        title="编辑团队"
        size="md"
      >
        <form onSubmit={handleUpdateTeam} className="space-y-4">
          {editError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {editError}
            </div>
          )}

          <Input
            label="团队名称"
            name="name"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            placeholder="请输入团队名称"
            required
            disabled={editLoading}
          />

          <Input
            label="团队描述"
            name="description"
            value={editFormData.description}
            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
            placeholder="请输入团队描述（可选）"
            disabled={editLoading}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditFormData({ name: '', description: '' });
                setEditError(null);
              }}
              disabled={editLoading}
            >
              取消
            </Button>
            <Button type="submit" loading={editLoading}>
              保存
            </Button>
          </div>
        </form>
      </Modal>

      {/* 更改角色确认 Modal */}
      {roleChangeMember && (
        <Modal
          isOpen={!!roleChangeMember}
          onClose={() => setRoleChangeMember(null)}
          title="更改成员角色"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              确定要将 <strong>{roleChangeMember.name}</strong> 的角色更改为{' '}
              <strong>{roleChangeMember.role === 'admin' ? '成员' : '管理员'}</strong> 吗？
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setRoleChangeMember(null)}
                disabled={actionLoading}
              >
                取消
              </Button>
              <Button
                onClick={() =>
                  handleUpdateMemberRole(
                    roleChangeMember,
                    roleChangeMember.role === 'admin' ? 'member' : 'admin'
                  )
                }
                loading={actionLoading}
              >
                确认
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 移除成员确认 Modal */}
      {removeMemberId && (
        <Modal
          isOpen={!!removeMemberId}
          onClose={() => setRemoveMemberId(null)}
          title="移除成员"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              确定要移除此成员吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setRemoveMemberId(null)}
                disabled={actionLoading}
              >
                取消
              </Button>
              <Button variant="danger" onClick={handleRemoveMember} loading={actionLoading}>
                确认移除
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
