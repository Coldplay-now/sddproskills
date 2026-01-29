import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus,
  addTagToTask,
  removeTagFromTask,
} from '../controllers/task';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/tasks
 * @desc    创建任务
 * @access  Private (需要认证)
 */
router.post('/', authMiddleware, createTask);

/**
 * @route   GET /api/tasks
 * @desc    获取任务列表（支持筛选）
 * @access  Private (需要认证)
 */
router.get('/', authMiddleware, getTasks);

/**
 * @route   PUT /api/tasks/:id/assign
 * @desc    分配任务给成员
 * @access  Private (需要认证，只有创建者可以分配)
 */
router.put('/:id/assign', authMiddleware, assignTask);

/**
 * @route   PUT /api/tasks/:id/status
 * @desc    更新任务状态
 * @access  Private (需要认证，创建者或分配者可以更新)
 */
router.put('/:id/status', authMiddleware, updateTaskStatus);

/**
 * @route   GET /api/tasks/:id
 * @desc    获取任务详情
 * @access  Private (需要认证)
 */
router.get('/:id', authMiddleware, getTaskById);

/**
 * @route   PUT /api/tasks/:id
 * @desc    更新任务
 * @access  Private (需要认证，只有创建者或分配者可以更新)
 */
router.put('/:id', authMiddleware, updateTask);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    删除任务
 * @access  Private (需要认证，只有创建者可以删除)
 */
router.delete('/:id', authMiddleware, deleteTask);

export default router;
