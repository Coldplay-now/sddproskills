import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { emitCommentEvent } from '../services/socket';

/**
 * 解析评论内容中的 @提及
 * 提取所有 @username 格式的提及
 */
const parseMentions = (content: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return [...new Set(mentions)]; // 去重
};

/**
 * 添加评论
 * POST /api/tasks/:id/comments
 * 需要认证
 */
export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id: taskId } = req.params;
    const { content } = req.body;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(taskId)) {
      res.status(400).json({
        success: false,
        message: '无效的任务ID',
      });
      return;
    }

    // 验证必填字段
    if (!content || !content.trim()) {
      res.status(400).json({
        success: false,
        message: '评论内容不能为空',
      });
      return;
    }

    // 验证任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        team: {
          include: {
            members: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      res.status(404).json({
        success: false,
        message: '任务不存在',
      });
      return;
    }

    // 检查权限：用户必须是创建者、分配者或团队成员
    const isCreator = task.creatorId === req.user.id;
    const isAssignee = task.assigneeId === req.user.id;
    const isTeamMember = task.teamId
      ? task.team?.members.some((m) => m.userId === req.user!.id)
      : false;

    if (!isCreator && !isAssignee && !isTeamMember) {
      res.status(403).json({
        success: false,
        message: '无权在该任务下评论',
      });
      return;
    }

    // 解析 @提及
    const mentionedUsernames = parseMentions(content);
    const mentionedUsers: { id: string; name: string; email: string }[] = [];

    if (mentionedUsernames.length > 0) {
      // 验证提及的用户是否存在
      // 注意：这里使用 name 字段匹配，因为 User 模型没有 username 字段
      const users = await prisma.user.findMany({
        where: {
          name: {
            in: mentionedUsernames,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      mentionedUsers.push(...users);
    }

    // 创建评论
    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId: req.user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // 广播评论添加事件
    emitCommentEvent(task.teamId, 'comment:added', {
      comment,
      taskId,
      mentions: mentionedUsers.length > 0 ? mentionedUsers : undefined,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: '评论添加成功',
      data: {
        comment,
        mentions: mentionedUsers.length > 0 ? mentionedUsers : undefined,
      },
    });
  } catch (error) {
    console.error('添加评论错误:', error);
    res.status(500).json({
      success: false,
      message: '添加评论失败，请稍后重试',
    });
  }
};

/**
 * 获取评论列表
 * GET /api/tasks/:id/comments
 * 需要认证
 */
export const getComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id: taskId } = req.params;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(taskId)) {
      res.status(400).json({
        success: false,
        message: '无效的任务ID',
      });
      return;
    }

    // 验证任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        team: {
          include: {
            members: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      res.status(404).json({
        success: false,
        message: '任务不存在',
      });
      return;
    }

    // 检查权限：用户必须是创建者、分配者或团队成员
    const isCreator = task.creatorId === req.user.id;
    const isAssignee = task.assigneeId === req.user.id;
    const isTeamMember = task.teamId
      ? task.team?.members.some((m) => m.userId === req.user!.id)
      : false;

    if (!isCreator && !isAssignee && !isTeamMember) {
      res.status(403).json({
        success: false,
        message: '无权查看该任务的评论',
      });
      return;
    }

    // 查询评论列表
    const comments = await prisma.comment.findMany({
      where: {
        taskId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.status(200).json({
      success: true,
      data: {
        comments,
      },
    });
  } catch (error) {
    console.error('获取评论列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取评论列表失败',
    });
  }
};

/**
 * 删除评论
 * DELETE /api/comments/:id
 * 需要认证，只有评论创建者可以删除
 */
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id } = req.params;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: '无效的评论ID',
      });
      return;
    }

    // 查询评论
    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({
        success: false,
        message: '评论不存在',
      });
      return;
    }

    // 检查权限：只有创建者可以删除
    if (comment.userId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: '只有评论创建者可以删除评论',
      });
      return;
    }

    // 删除评论
    await prisma.comment.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: '评论删除成功',
    });
  } catch (error) {
    console.error('删除评论错误:', error);
    res.status(500).json({
      success: false,
      message: '删除评论失败，请稍后重试',
    });
  }
};
