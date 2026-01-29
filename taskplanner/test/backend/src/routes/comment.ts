import { Router } from 'express';
import {
  createComment,
  getComments,
  deleteComment,
} from '../controllers/comment';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/tasks/:id/comments
 * @desc    添加评论
 * @access  Private (需要认证)
 */
router.post('/tasks/:id/comments', authMiddleware, createComment);

/**
 * @route   GET /api/tasks/:id/comments
 * @desc    获取评论列表
 * @access  Private (需要认证)
 */
router.get('/tasks/:id/comments', authMiddleware, getComments);

/**
 * @route   DELETE /api/comments/:id
 * @desc    删除评论
 * @access  Private (需要认证，只有评论创建者可以删除)
 */
router.delete('/comments/:id', authMiddleware, deleteComment);

export default router;
