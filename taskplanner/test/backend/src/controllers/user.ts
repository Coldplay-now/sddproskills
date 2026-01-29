import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * 获取用户信息
 * GET /api/users/:id
 */
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 验证 ID 格式（UUID）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: '无效的用户ID格式',
      });
      return;
    }

    // 查询用户
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: '用户不存在',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
    });
  }
};

/**
 * 更新用户信息
 * PUT /api/users/:id
 * 用户只能更新自己的信息
 */
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, avatarUrl } = req.body;

    // 验证用户是否已认证
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    // 权限校验：用户只能更新自己的信息
    if (req.user.id !== id) {
      res.status(403).json({
        success: false,
        message: '无权更新其他用户的信息',
      });
      return;
    }

    // 验证 ID 格式（UUID）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: '无效的用户ID格式',
      });
      return;
    }

    // 构建更新数据对象（只包含提供的字段）
    const updateData: { name?: string; avatarUrl?: string | null } = {};

    if (name !== undefined) {
      // 验证名称长度
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: '用户名不能为空',
        });
        return;
      }
      if (name.length > 100) {
        res.status(400).json({
          success: false,
          message: '用户名长度不能超过100个字符',
        });
        return;
      }
      updateData.name = name.trim();
    }

    if (avatarUrl !== undefined) {
      // 验证 avatarUrl 格式（URL 或 null）
      if (avatarUrl !== null && (typeof avatarUrl !== 'string' || avatarUrl.length > 500)) {
        res.status(400).json({
          success: false,
          message: '头像URL长度不能超过500个字符',
        });
        return;
      }
      updateData.avatarUrl = avatarUrl === null ? null : avatarUrl.trim() || null;
    }

    // 如果没有提供任何可更新的字段
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: '请提供要更新的字段（name 或 avatarUrl）',
      });
      return;
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: '用户不存在',
      });
      return;
    }

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: '用户信息更新成功',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败',
    });
  }
};
