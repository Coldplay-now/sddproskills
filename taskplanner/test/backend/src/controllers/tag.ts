import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * 创建标签
 * POST /api/tags
 * 需要认证
 */
export const createTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { name, color, teamId } = req.body;

    // 验证必填字段
    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: '标签名称不能为空',
      });
      return;
    }

    // 验证标签名称长度
    if (name.length > 50) {
      res.status(400).json({
        success: false,
        message: '标签名称不能超过50个字符',
      });
      return;
    }

    // 验证颜色格式（如果提供）
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      res.status(400).json({
        success: false,
        message: '颜色格式无效，应为 #RRGGBB 格式',
      });
      return;
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

      // 检查团队中是否已存在同名标签
      const existingTag = await prisma.tag.findFirst({
        where: {
          teamId,
          name: name.trim(),
        },
      });

      if (existingTag) {
        res.status(400).json({
          success: false,
          message: '该团队中已存在同名标签',
        });
        return;
      }
    }

    // 创建标签
    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || null,
        teamId: teamId || null,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: '标签创建成功',
      data: {
        tag,
      },
    });
  } catch (error) {
    console.error('创建标签错误:', error);
    res.status(500).json({
      success: false,
      message: '创建标签失败，请稍后重试',
    });
  }
};

/**
 * 获取标签列表（按团队）
 * GET /api/tags?teamId=xxx
 * 需要认证
 */
export const getTags = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { teamId } = req.query;

    // 构建查询条件
    const where: any = {};

    // 如果指定了团队ID，验证用户是否是团队成员
    if (teamId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(teamId as string)) {
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
            teamId: teamId as string,
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

      where.teamId = teamId;
    } else {
      // 如果没有指定团队，返回用户所在团队的所有标签
      const userTeamIds = await prisma.teamMember.findMany({
        where: { userId: req.user.id },
        select: { teamId: true },
      });

      if (userTeamIds.length > 0) {
        where.teamId = {
          in: userTeamIds.map((tm) => tm.teamId),
        };
      } else {
        // 用户没有加入任何团队，返回空列表
        res.status(200).json({
          success: true,
          data: {
            tags: [],
          },
        });
        return;
      }
    }

    // 查询标签
    const tags = await prisma.tag.findMany({
      where,
      include: {
        team: {
          select: {
            id: true,
            name: true,
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
        tags,
      },
    });
  } catch (error) {
    console.error('获取标签列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取标签列表失败',
    });
  }
};

/**
 * 更新标签
 * PUT /api/tags/:id
 * 需要认证，只有团队成员可以更新
 */
export const updateTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id } = req.params;
    const { name, color } = req.body;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: '无效的标签ID',
      });
      return;
    }

    // 查询标签
    const tag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      res.status(404).json({
        success: false,
        message: '标签不存在',
      });
      return;
    }

    // 如果标签属于团队，验证用户是否是团队成员
    if (tag.teamId) {
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: tag.teamId,
            userId: req.user.id,
          },
        },
      });

      if (!teamMember) {
        res.status(403).json({
          success: false,
          message: '您不是该团队的成员，无权修改此标签',
        });
        return;
      }
    }

    // 构建更新数据对象
    const updateData: any = {};

    if (name !== undefined) {
      if (!name || !name.trim()) {
        res.status(400).json({
          success: false,
          message: '标签名称不能为空',
        });
        return;
      }
      if (name.length > 50) {
        res.status(400).json({
          success: false,
          message: '标签名称不能超过50个字符',
        });
        return;
      }

      // 如果标签属于团队，检查团队中是否已存在同名标签
      if (tag.teamId && name.trim() !== tag.name) {
        const existingTag = await prisma.tag.findFirst({
          where: {
            teamId: tag.teamId,
            name: name.trim(),
            id: {
              not: id,
            },
          },
        });

        if (existingTag) {
          res.status(400).json({
            success: false,
            message: '该团队中已存在同名标签',
          });
          return;
        }
      }

      updateData.name = name.trim();
    }

    if (color !== undefined) {
      if (color === null || color === '') {
        updateData.color = null;
      } else {
        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
          res.status(400).json({
            success: false,
            message: '颜色格式无效，应为 #RRGGBB 格式',
          });
          return;
        }
        updateData.color = color;
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

    // 更新标签
    const updatedTag = await prisma.tag.update({
      where: { id },
      data: updateData,
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: '标签更新成功',
      data: {
        tag: updatedTag,
      },
    });
  } catch (error) {
    console.error('更新标签错误:', error);
    res.status(500).json({
      success: false,
      message: '更新标签失败，请稍后重试',
    });
  }
};

/**
 * 删除标签
 * DELETE /api/tags/:id
 * 需要认证，只有团队成员可以删除
 */
export const deleteTag = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: '无效的标签ID',
      });
      return;
    }

    // 查询标签
    const tag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      res.status(404).json({
        success: false,
        message: '标签不存在',
      });
      return;
    }

    // 如果标签属于团队，验证用户是否是团队成员
    if (tag.teamId) {
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: tag.teamId,
            userId: req.user.id,
          },
        },
      });

      if (!teamMember) {
        res.status(403).json({
          success: false,
          message: '您不是该团队的成员，无权删除此标签',
        });
        return;
      }
    }

    // 删除标签（级联删除 task_tags 中的关联）
    await prisma.tag.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: '标签删除成功',
    });
  } catch (error) {
    console.error('删除标签错误:', error);
    res.status(500).json({
      success: false,
      message: '删除标签失败，请稍后重试',
    });
  }
};
