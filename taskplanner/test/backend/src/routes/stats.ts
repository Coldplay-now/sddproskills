import { Router } from 'express';
import { getTaskStats, getTeamStats } from '../controllers/stats';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/stats/tasks
 * @desc    获取当前用户的任务统计
 * @access  Private (需要认证)
 */
router.get('/tasks', authMiddleware, getTaskStats);

/**
 * @route   GET /api/stats/team/:id
 * @desc    获取团队统计（成员工作量）
 * @access  Private (需要认证，必须是团队成员)
 */
router.get('/team/:id', authMiddleware, getTeamStats);

export default router;
