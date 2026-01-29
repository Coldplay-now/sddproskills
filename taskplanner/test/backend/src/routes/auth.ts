import { Router } from 'express';
import { register, login, logout, getCurrentUser } from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Public
 */
router.post('/logout', logout);

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private (需要认证)
 */
router.get('/me', authMiddleware, getCurrentUser);

export default router;
