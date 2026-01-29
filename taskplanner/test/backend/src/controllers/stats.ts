import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * 获取当前用户的任务统计
 * GET /api/stats/tasks
 * 需要认证
 */
export const getTaskStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const userId = req.user.id;

    // 获取当前时间
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 按状态分组统计
    const statusStats = await prisma.task.groupBy({
      by: ['status'],
      where: {
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
        ],
      },
      _count: {
        id: true,
      },
    });

    // 转换为对象格式
    const statusCounts: Record<string, number> = {};
    statusStats.forEach((stat) => {
      statusCounts[stat.status] = stat._count.id;
    });

    // 统计最近7天完成的任务数
    const completedLast7Days = await prisma.task.count({
      where: {
        status: 'completed',
        updatedAt: {
          gte: sevenDaysAgo,
        },
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
        ],
      },
    });

    // 统计最近30天完成的任务数
    const completedLast30Days = await prisma.task.count({
      where: {
        status: 'completed',
        updatedAt: {
          gte: thirtyDaysAgo,
        },
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
        ],
      },
    });

    // 统计总任务数
    const totalTasks = await prisma.task.count({
      where: {
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
        ],
      },
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalTasks,
        byStatus: {
          pending: statusCounts.pending || 0,
          in_progress: statusCounts.in_progress || 0,
          completed: statusCounts.completed || 0,
          cancelled: statusCounts.cancelled || 0,
        },
        completedLast7Days,
        completedLast30Days,
      },
    });
  } catch (error) {
    console.error('获取任务统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务统计失败',
    });
  }
};

/**
 * 获取团队统计（成员工作量）
 * GET /api/stats/team/:id
 * 需要认证
 */
export const getTeamStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id: teamId } = req.params;
    const userId = req.user.id;

    // 验证团队ID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId)) {
      res.status(400).json({
        success: false,
        message: '无效的团队ID',
      });
      return;
    }

    // 验证团队是否存在
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: '团队不存在',
      });
      return;
    }

    // 验证用户是否是团队成员
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!teamMember) {
      res.status(403).json({
        success: false,
        message: '您不是该团队的成员',
      });
      return;
    }

    // 获取团队成员列表
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // 统计每个成员的工作量
    const memberStats = await Promise.all(
      members.map(async (member) => {
        const memberId = member.userId;

        // 统计该成员的任务总数
        const totalTasks = await prisma.task.count({
          where: {
            teamId,
            OR: [
              { creatorId: memberId },
              { assigneeId: memberId },
            ],
          },
        });

        // 统计该成员已完成的任务数
        const completedTasks = await prisma.task.count({
          where: {
            teamId,
            status: 'completed',
            OR: [
              { creatorId: memberId },
              { assigneeId: memberId },
            ],
          },
        });

        // 统计该成员进行中的任务数
        const inProgressTasks = await prisma.task.count({
          where: {
            teamId,
            status: 'in_progress',
            OR: [
              { creatorId: memberId },
              { assigneeId: memberId },
            ],
          },
        });

        // 统计该成员待处理的任务数
        const pendingTasks = await prisma.task.count({
          where: {
            teamId,
            status: 'pending',
            OR: [
              { creatorId: memberId },
              { assigneeId: memberId },
            ],
          },
        });

        return {
          userId: member.user.id,
          name: member.user.name,
          email: member.user.email,
          avatarUrl: member.user.avatarUrl,
          role: member.role,
          stats: {
            total: totalTasks,
            completed: completedTasks,
            inProgress: inProgressTasks,
            pending: pendingTasks,
          },
        };
      })
    );

    // 统计团队总任务数
    const teamTotalTasks = await prisma.task.count({
      where: { teamId },
    });

    // 统计团队已完成任务数
    const teamCompletedTasks = await prisma.task.count({
      where: {
        teamId,
        status: 'completed',
      },
    });

    res.status(200).json({
      success: true,
      data: {
        teamId,
        teamName: team.name,
        summary: {
          totalTasks: teamTotalTasks,
          completedTasks: teamCompletedTasks,
          completionRate: teamTotalTasks > 0 ? (teamCompletedTasks / teamTotalTasks) * 100 : 0,
        },
        members: memberStats,
      },
    });
  } catch (error) {
    console.error('获取团队统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取团队统计失败',
    });
  }
};
