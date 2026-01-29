import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { emitTaskEvent } from '../services/socket';

/**
 * 创建任务
 * POST /api/tasks
 * 需要认证
 */
export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { title, description, status, priority, dueDate, assigneeId, teamId } = req.body;

    // 验证必填字段
    if (!title || !title.trim()) {
      res.status(400).json({
        success: false,
        message: '任务标题不能为空',
      });
      return;
    }

    // 验证标题长度
    if (title.length > 255) {
      res.status(400).json({
        success: false,
        message: '任务标题不能超过255个字符',
      });
      return;
    }

    // 验证状态
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `状态必须是以下之一: ${validStatuses.join(', ')}`,
      });
      return;
    }

    // 验证优先级
    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      res.status(400).json({
        success: false,
        message: `优先级必须是以下之一: ${validPriorities.join(', ')}`,
      });
      return;
    }

    // 验证 dueDate 格式
    let dueDateValue: Date | null = null;
    if (dueDate) {
      dueDateValue = new Date(dueDate);
      if (isNaN(dueDateValue.getTime())) {
        res.status(400).json({
          success: false,
          message: '截止日期格式无效',
        });
        return;
      }
    }

    // 如果指定了团队，验证团队是否存在且用户是成员
    if (teamId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(teamId)) {
        res.status(400).json({
          success: false,
          message: '无效的团队ID',
        });
        return;
      }

      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: req.user.id,
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
    }

    // 如果指定了分配人，验证用户是否存在
    if (assigneeId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(assigneeId)) {
        res.status(400).json({
          success: false,
          message: '无效的分配人ID',
        });
        return;
      }

      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
      });

      if (!assignee) {
        res.status(404).json({
          success: false,
          message: '分配人不存在',
        });
        return;
      }
    }

    // 创建任务
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: status || 'pending',
        priority: priority || 'medium',
        dueDate: dueDateValue,
        creatorId: req.user.id,
        assigneeId: assigneeId || null,
        teamId: teamId || null,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 广播任务创建事件
    emitTaskEvent(task.teamId, 'task:created', {
      task,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: '任务创建成功',
      data: {
        task,
      },
    });
  } catch (error) {
    console.error('创建任务错误:', error);
    res.status(500).json({
      success: false,
      message: '创建任务失败，请稍后重试',
    });
  }
};

/**
 * 获取任务列表（支持筛选）
 * GET /api/tasks
 * 需要认证
 */
export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { status, priority, assigneeId, teamId, creatorId } = req.query;

    // 构建查询条件
    const where: any = {};

    // 默认只返回用户创建或分配的任务，或者团队任务
    const userTeamIds = await prisma.teamMember.findMany({
      where: { userId: req.user.id },
      select: { teamId: true },
    });

    where.OR = [
      { creatorId: req.user.id },
      { assigneeId: req.user.id },
      ...(userTeamIds.length > 0
        ? [{ teamId: { in: userTeamIds.map((tm) => tm.teamId) } }]
        : []),
    ];

    // 状态筛选
    if (status) {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (validStatuses.includes(status as string)) {
        where.status = status;
      }
    }

    // 优先级筛选
    if (priority) {
      const validPriorities = ['low', 'medium', 'high'];
      if (validPriorities.includes(priority as string)) {
        where.priority = priority;
      }
    }

    // 分配人筛选
    if (assigneeId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(assigneeId as string)) {
        where.assigneeId = assigneeId;
      }
    }

    // 团队筛选
    if (teamId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(teamId as string)) {
        // 验证用户是否是团队成员
        const teamMember = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: teamId as string,
              userId: req.user.id,
            },
          },
        });

        if (teamMember) {
          where.teamId = teamId;
        }
      }
    }

    // 创建人筛选
    if (creatorId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(creatorId as string)) {
        where.creatorId = creatorId;
      }
    }

    // 查询任务
    const tasks = await prisma.task.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: {
        tasks,
      },
    });
  } catch (error) {
    console.error('获取任务列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败',
    });
  }
};

/**
 * 获取任务详情
 * GET /api/tasks/:id
 * 需要认证
 */
export const getTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: '无效的任务ID',
      });
      return;
    }

    // 查询任务
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
    let isTeamMember = false;

    if (task.teamId) {
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: task.teamId,
            userId: req.user.id,
          },
        },
      });
      isTeamMember = !!teamMember;
    }

    if (!isCreator && !isAssignee && !isTeamMember) {
      res.status(403).json({
        success: false,
        message: '无权访问该任务',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    console.error('获取任务详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取任务详情失败',
    });
  }
};

/**
 * 更新任务
 * PUT /api/tasks/:id
 * 需要认证，只有创建者或分配者可以更新
 */
export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id } = req.params;
    const { title, description, status, priority, dueDate, assigneeId, teamId } = req.body;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: '无效的任务ID',
      });
      return;
    }

    // 查询任务
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      res.status(404).json({
        success: false,
        message: '任务不存在',
      });
      return;
    }

    // 检查权限：只有创建者或分配者可以更新
    const isCreator = task.creatorId === req.user.id;
    const isAssignee = task.assigneeId === req.user.id;

    if (!isCreator && !isAssignee) {
      res.status(403).json({
        success: false,
        message: '只有创建者或分配者可以更新任务',
      });
      return;
    }

    // 构建更新数据对象
    const updateData: any = {};

    if (title !== undefined) {
      if (!title || !title.trim()) {
        res.status(400).json({
          success: false,
          message: '任务标题不能为空',
        });
        return;
      }
      if (title.length > 255) {
        res.status(400).json({
          success: false,
          message: '任务标题不能超过255个字符',
        });
        return;
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description === null || description === '' ? null : description.trim();
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: `状态必须是以下之一: ${validStatuses.join(', ')}`,
        });
        return;
      }
      updateData.status = status;
    }

    if (priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high'];
      if (!validPriorities.includes(priority)) {
        res.status(400).json({
          success: false,
          message: `优先级必须是以下之一: ${validPriorities.join(', ')}`,
        });
        return;
      }
      updateData.priority = priority;
    }

    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') {
        updateData.dueDate = null;
      } else {
        const dueDateValue = new Date(dueDate);
        if (isNaN(dueDateValue.getTime())) {
          res.status(400).json({
            success: false,
            message: '截止日期格式无效',
          });
          return;
        }
        updateData.dueDate = dueDateValue;
      }
    }

    if (assigneeId !== undefined) {
      if (assigneeId === null || assigneeId === '') {
        updateData.assigneeId = null;
      } else {
        if (!uuidRegex.test(assigneeId)) {
          res.status(400).json({
            success: false,
            message: '无效的分配人ID',
          });
          return;
        }

        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId },
        });

        if (!assignee) {
          res.status(404).json({
            success: false,
            message: '分配人不存在',
          });
          return;
        }
        updateData.assigneeId = assigneeId;
      }
    }

    if (teamId !== undefined) {
      if (teamId === null || teamId === '') {
        updateData.teamId = null;
      } else {
        if (!uuidRegex.test(teamId)) {
          res.status(400).json({
            success: false,
            message: '无效的团队ID',
          });
          return;
        }

        // 验证用户是否是团队成员
        const teamMember = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId,
              userId: req.user.id,
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
        updateData.teamId = teamId;
      }
    }

    // 如果没有提供任何可更新的字段
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: '请提供要更新的字段',
      });
      return;
    }

    // 更新任务
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 广播任务更新事件
    emitTaskEvent(updatedTask.teamId, 'task:updated', {
      task: updatedTask,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: '任务更新成功',
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    console.error('更新任务错误:', error);
    res.status(500).json({
      success: false,
      message: '更新任务失败，请稍后重试',
    });
  }
};

/**
 * 删除任务
 * DELETE /api/tasks/:id
 * 需要认证，只有创建者可以删除
 */
export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: '无效的任务ID',
      });
      return;
    }

    // 查询任务
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      res.status(404).json({
        success: false,
        message: '任务不存在',
      });
      return;
    }

    // 检查权限：只有创建者可以删除
    if (task.creatorId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: '只有创建者可以删除任务',
      });
      return;
    }

    // 保存 teamId 用于广播
    const taskTeamId = task.teamId;

    // 删除任务
    await prisma.task.delete({
      where: { id },
    });

    // 广播任务删除事件
    emitTaskEvent(taskTeamId, 'task:deleted', {
      taskId: id,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: '任务删除成功',
    });
  } catch (error) {
    console.error('删除任务错误:', error);
    res.status(500).json({
      success: false,
      message: '删除任务失败，请稍后重试',
    });
  }
};

/**
 * 分配任务给成员
 * PUT /api/tasks/:id/assign
 * 需要认证，只有创建者可以分配任务
 */
export const assignTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id } = req.params;
    const { assigneeId } = req.body;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: '无效的任务ID',
      });
      return;
    }

    // 验证分配人ID
    if (!assigneeId) {
      res.status(400).json({
        success: false,
        message: '请提供分配人ID',
      });
      return;
    }

    if (!uuidRegex.test(assigneeId)) {
      res.status(400).json({
        success: false,
        message: '无效的分配人ID',
      });
      return;
    }

    // 查询任务
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      res.status(404).json({
        success: false,
        message: '任务不存在',
      });
      return;
    }

    // 检查权限：只有创建者可以分配任务
    if (task.creatorId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: '只有创建者可以分配任务',
      });
      return;
    }

    // 验证分配人是否存在
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
    });

    if (!assignee) {
      res.status(404).json({
        success: false,
        message: '分配人不存在',
      });
      return;
    }

    // 如果任务属于团队，验证分配人是否是团队成员
    if (task.teamId) {
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: task.teamId,
            userId: assigneeId,
          },
        },
      });

      if (!teamMember) {
        res.status(403).json({
          success: false,
          message: '分配人必须是该团队的成员',
        });
        return;
      }
    }

    // 更新任务分配人
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { assigneeId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: '任务分配成功',
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    console.error('分配任务错误:', error);
    res.status(500).json({
      success: false,
      message: '分配任务失败，请稍后重试',
    });
  }
};

/**
 * 更新任务状态
 * PUT /api/tasks/:id/status
 * 需要认证，创建者或分配者可以更新状态
 */
export const updateTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: '无效的任务ID',
      });
      return;
    }

    // 验证状态
    if (!status) {
      res.status(400).json({
        success: false,
        message: '请提供任务状态',
      });
      return;
    }

    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `状态必须是以下之一: ${validStatuses.join(', ')}`,
      });
      return;
    }

    // 查询任务
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      res.status(404).json({
        success: false,
        message: '任务不存在',
      });
      return;
    }

    // 检查权限：创建者或分配者可以更新状态
    const isCreator = task.creatorId === req.user.id;
    const isAssignee = task.assigneeId === req.user.id;

    if (!isCreator && !isAssignee) {
      res.status(403).json({
        success: false,
        message: '只有创建者或分配者可以更新任务状态',
      });
      return;
    }

    // 更新任务状态
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: '任务状态更新成功',
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    console.error('更新任务状态错误:', error);
    res.status(500).json({
      success: false,
      message: '更新任务状态失败，请稍后重试',
    });
  }
};

/**
 * 给任务添加标签
 * POST /api/tasks/:id/tags
 * 需要认证，只有创建者、分配者或团队成员可以添加标签
 */
export const addTagToTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id } = req.params;
    const { tagId } = req.body;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: '无效的任务ID',
      });
      return;
    }

    if (!tagId) {
      res.status(400).json({
        success: false,
        message: '请提供标签ID',
      });
      return;
    }

    if (!uuidRegex.test(tagId)) {
      res.status(400).json({
        success: false,
        message: '无效的标签ID',
      });
      return;
    }

    // 查询任务
    const task = await prisma.task.findUnique({
      where: { id },
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
    let isTeamMember = false;

    if (task.teamId) {
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: task.teamId,
            userId: req.user.id,
          },
        },
      });
      isTeamMember = !!teamMember;
    }

    if (!isCreator && !isAssignee && !isTeamMember) {
      res.status(403).json({
        success: false,
        message: '无权操作该任务',
      });
      return;
    }

    // 验证标签是否存在
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      res.status(404).json({
        success: false,
        message: '标签不存在',
      });
      return;
    }

    // 如果任务属于团队，验证标签是否属于同一团队
    if (task.teamId && tag.teamId && task.teamId !== tag.teamId) {
      res.status(400).json({
        success: false,
        message: '标签和任务必须属于同一团队',
      });
      return;
    }

    // 检查任务是否已经有该标签
    const existingTaskTag = await prisma.taskTag.findUnique({
      where: {
        taskId_tagId: {
          taskId: id,
          tagId: tagId,
        },
      },
    });

    if (existingTaskTag) {
      res.status(400).json({
        success: false,
        message: '任务已经拥有该标签',
      });
      return;
    }

    // 添加标签
    await prisma.taskTag.create({
      data: {
        taskId: id,
        tagId: tagId,
      },
    });

    // 返回更新后的任务（包含标签）
    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: '标签添加成功',
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    console.error('添加标签错误:', error);
    res.status(500).json({
      success: false,
      message: '添加标签失败，请稍后重试',
    });
  }
};

/**
 * 移除任务的标签
 * DELETE /api/tasks/:id/tags/:tagId
 * 需要认证，只有创建者、分配者或团队成员可以移除标签
 */
export const removeTagFromTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id, tagId } = req.params;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: '无效的任务ID',
      });
      return;
    }

    if (!uuidRegex.test(tagId)) {
      res.status(400).json({
        success: false,
        message: '无效的标签ID',
      });
      return;
    }

    // 查询任务
    const task = await prisma.task.findUnique({
      where: { id },
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
    let isTeamMember = false;

    if (task.teamId) {
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: task.teamId,
            userId: req.user.id,
          },
        },
      });
      isTeamMember = !!teamMember;
    }

    if (!isCreator && !isAssignee && !isTeamMember) {
      res.status(403).json({
        success: false,
        message: '无权操作该任务',
      });
      return;
    }

    // 检查任务是否有该标签
    const taskTag = await prisma.taskTag.findUnique({
      where: {
        taskId_tagId: {
          taskId: id,
          tagId: tagId,
        },
      },
    });

    if (!taskTag) {
      res.status(404).json({
        success: false,
        message: '任务没有该标签',
      });
      return;
    }

    // 移除标签
    await prisma.taskTag.delete({
      where: {
        taskId_tagId: {
          taskId: id,
          tagId: tagId,
        },
      },
    });

    // 返回更新后的任务（包含标签）
    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: '标签移除成功',
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    console.error('移除标签错误:', error);
    res.status(500).json({
      success: false,
      message: '移除标签失败，请稍后重试',
    });
  }
};
