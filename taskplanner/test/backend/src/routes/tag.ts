import { Router } from 'express';
import {
  createTag,
  getTags,
  updateTag,
  deleteTag,
} from '../controllers/tag';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/tags
 * @desc    创建标签
 * @access  Private (需要认证)
 */
router.post('/', authMiddleware, createTag);

/**
 * @route   GET /api/tags
 * @desc    获取标签列表（按团队）
 * @access  Private (需要认证)
 */
router.get('/', authMiddleware, getTags);

/**
 * @route   PUT /api/tags/:id
 * @desc    更新标签
 * @access  Private (需要认证，只有团队成员可以更新)
 */
router.put('/:id', authMiddleware, updateTag);

/**
 * @route   DELETE /api/tags/:id
 * @desc    删除标签
 * @access  Private (需要认证，只有团队成员可以删除)
 */
router.delete('/:id', authMiddleware, deleteTag);

export default router;
