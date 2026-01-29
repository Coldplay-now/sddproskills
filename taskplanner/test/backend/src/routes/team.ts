import { Router } from 'express';
import {
  createTeam,
  getMyTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  inviteMember,
  joinTeam,
  leaveTeam,
  updateMemberRole,
  removeMember,
} from '../controllers/team';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/teams
 * @desc    创建团队
 * @access  Private (需要认证)
 */
router.post('/', authMiddleware, createTeam);

/**
 * @route   GET /api/teams
 * @desc    获取我的团队列表
 * @access  Private (需要认证)
 */
router.get('/', authMiddleware, getMyTeams);

/**
 * @route   POST /api/teams/:id/invite
 * @desc    邀请成员（发送邀请或直接添加）
 * @access  Private (需要认证，只有 owner 和 admin 可以邀请)
 */
router.post('/:id/invite', authMiddleware, inviteMember);

/**
 * @route   POST /api/teams/:id/join
 * @desc    加入团队（通过邀请码或链接）
 * @access  Private (需要认证)
 */
router.post('/:id/join', authMiddleware, joinTeam);

/**
 * @route   POST /api/teams/:id/leave
 * @desc    离开团队
 * @access  Private (需要认证)
 */
router.post('/:id/leave', authMiddleware, leaveTeam);

/**
 * @route   PUT /api/teams/:id/members/:userId
 * @desc    更新成员角色
 * @access  Private (需要认证，只有 owner 和 admin 可以更新)
 */
router.put('/:id/members/:userId', authMiddleware, updateMemberRole);

/**
 * @route   DELETE /api/teams/:id/members/:userId
 * @desc    移除成员
 * @access  Private (需要认证，只有 owner 和 admin 可以移除)
 */
router.delete('/:id/members/:userId', authMiddleware, removeMember);

/**
 * @route   GET /api/teams/:id
 * @desc    获取团队详情
 * @access  Private (需要认证)
 */
router.get('/:id', authMiddleware, getTeamById);

/**
 * @route   PUT /api/teams/:id
 * @desc    更新团队信息
 * @access  Private (需要认证，只有团队所有者可以更新)
 */
router.put('/:id', authMiddleware, updateTeam);

/**
 * @route   DELETE /api/teams/:id
 * @desc    删除团队
 * @access  Private (需要认证，只有团队所有者可以删除)
 */
router.delete('/:id', authMiddleware, deleteTeam);

export default router;
