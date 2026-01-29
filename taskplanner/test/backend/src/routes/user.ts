import { Router } from 'express';
import { getUserById, updateUser } from '../controllers/user';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/users/:id
 * @desc    获取用户信息
 * @access  Private (需要认证)
 */
router.get('/:id', authMiddleware, getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    更新用户信息（name, avatarUrl）
 * @access  Private (需要认证，只能更新自己的信息)
 */
router.put('/:id', authMiddleware, updateUser);

export default router;
