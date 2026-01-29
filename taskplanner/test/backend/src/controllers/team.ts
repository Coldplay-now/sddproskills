import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * 创建团队
 * POST /api/teams
 * 需要认证
 */
export const createTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { name } = req.body;

    // 验证必填字段
    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: '团队名称不能为空',
      });
      return;
    }

    // 验证团队名称长度
    if (name.length > 100) {
      res.status(400).json({
        success: false,
        message: '团队名称不能超过100个字符',
      });
      return;
    }

    // 创建团队，同时将创建者添加为成员
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        ownerId: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: 'owner',
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        members: {
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
        },
      },
    });

    res.status(201).json({
      success: true,
      message: '团队创建成功',
      data: {
        team,
      },
    });
  } catch (error) {
    console.error('创建团队错误:', error);
    res.status(500).json({
      success: false,
      message: '创建团队失败，请稍后重试',
    });
  }
};

/**
 * 获取我的团队列表
 * GET /api/teams
 * 需要认证
 */
export const getMyTeams = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    // 查询用户作为成员的所有团队
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        team: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
            members: {
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
            },
          },
        },
      },
      orderBy: {
        team: {
          createdAt: 'desc',
        },
      },
    });

    const teams = teamMembers.map((tm) => ({
      ...tm.team,
      myRole: tm.role,
    }));

    res.status(200).json({
      success: true,
      data: {
        teams,
      },
    });
  } catch (error) {
    console.error('获取团队列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取团队列表失败',
    });
  }
};

/**
 * 获取团队详情
 * GET /api/teams/:id
 * 需要认证
 */
export const getTeamById = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: '无效的团队ID',
      });
      return;
    }

    // 查询团队
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        members: {
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
        },
      },
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: '团队不存在',
      });
      return;
    }

    // 检查用户是否是团队成员
    const isMember = team.members.some((member) => member.userId === req.user!.id);
    if (!isMember) {
      res.status(403).json({
        success: false,
        message: '无权访问该团队',
      });
      return;
    }

    // 获取当前用户在团队中的角色
    const myMember = team.members.find((member) => member.userId === req.user!.id);
    const teamWithRole = {
      ...team,
      myRole: myMember?.role,
    };

    res.status(200).json({
      success: true,
      data: {
        team: teamWithRole,
      },
    });
  } catch (error) {
    console.error('获取团队详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取团队详情失败',
    });
  }
};

/**
 * 更新团队信息
 * PUT /api/teams/:id
 * 需要认证，只有团队所有者可以更新
 */
export const updateTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id } = req.params;
    const { name } = req.body;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: '无效的团队ID',
      });
      return;
    }

    // 验证必填字段
    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: '团队名称不能为空',
      });
      return;
    }

    // 验证团队名称长度
    if (name.length > 100) {
      res.status(400).json({
        success: false,
        message: '团队名称不能超过100个字符',
      });
      return;
    }

    // 查询团队
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: '团队不存在',
      });
      return;
    }

    // 检查用户是否是团队所有者
    if (team.ownerId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: '只有团队所有者可以更新团队信息',
      });
      return;
    }

    // 更新团队
    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        name: name.trim(),
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        members: {
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
        },
      },
    });

    res.status(200).json({
      success: true,
      message: '团队信息更新成功',
      data: {
        team: updatedTeam,
      },
    });
  } catch (error) {
    console.error('更新团队错误:', error);
    res.status(500).json({
      success: false,
      message: '更新团队失败，请稍后重试',
    });
  }
};

/**
 * 删除团队
 * DELETE /api/teams/:id
 * 需要认证，只有团队所有者可以删除
 */
export const deleteTeam = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: '无效的团队ID',
      });
      return;
    }

    // 查询团队
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: '团队不存在',
      });
      return;
    }

    // 检查用户是否是团队所有者
    if (team.ownerId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: '只有团队所有者可以删除团队',
      });
      return;
    }

    // 删除团队（级联删除团队成员）
    await prisma.team.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: '团队删除成功',
    });
  } catch (error) {
    console.error('删除团队错误:', error);
    res.status(500).json({
      success: false,
      message: '删除团队失败，请稍后重试',
    });
  }
};

/**
 * 邀请成员
 * POST /api/teams/:id/invite
 * 需要认证，只有 owner 和 admin 可以邀请
 */
export const inviteMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id } = req.params;
    const { email, role = 'member' } = req.body;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: '无效的团队ID',
      });
      return;
    }

    // 验证必填字段
    if (!email || !email.trim()) {
      res.status(400).json({
        success: false,
        message: '邮箱不能为空',
      });
      return;
    }

    // 验证角色
    if (!['owner', 'admin', 'member'].includes(role)) {
      res.status(400).json({
        success: false,
        message: '无效的角色，角色必须是 owner、admin 或 member',
      });
      return;
    }

    // 查询团队
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: req.user.id,
          },
        },
      },
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: '团队不存在',
      });
      return;
    }

    // 检查用户是否是团队成员
    const currentMember = team.members[0];
    if (!currentMember) {
      res.status(403).json({
        success: false,
        message: '无权访问该团队',
      });
      return;
    }

    // 检查权限：只有 owner 和 admin 可以邀请
    if (currentMember.role !== 'owner' && currentMember.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: '只有团队所有者和管理员可以邀请成员',
      });
      return;
    }

    // 查找要邀请的用户
    const targetUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: '用户不存在',
      });
      return;
    }

    // 检查用户是否已经是团队成员
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      res.status(400).json({
        success: false,
        message: '该用户已经是团队成员',
      });
      return;
    }

    // 不能邀请自己
    if (targetUser.id === req.user.id) {
      res.status(400).json({
        success: false,
        message: '不能邀请自己',
      });
      return;
    }

    // 添加成员（注意：不能直接添加 owner 角色，owner 只能通过转移所有权获得）
    const memberRole = role === 'owner' ? 'member' : role;
    const newMember = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId: targetUser.id,
        role: memberRole,
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

    res.status(201).json({
      success: true,
      message: '成员邀请成功',
      data: {
        member: newMember,
      },
    });
  } catch (error) {
    console.error('邀请成员错误:', error);
    res.status(500).json({
      success: false,
      message: '邀请成员失败，请稍后重试',
    });
  }
};

/**
 * 加入团队
 * POST /api/teams/:id/join
 * 需要认证
 */
export const joinTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id } = req.params;
    const { inviteCode } = req.body;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: '无效的团队ID',
      });
      return;
    }

    // 查询团队
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: '团队不存在',
      });
      return;
    }

    // 检查用户是否已经是团队成员
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: req.user.id,
        },
      },
    });

    if (existingMember) {
      res.status(400).json({
        success: false,
        message: '您已经是该团队的成员',
      });
      return;
    }

    // 如果提供了邀请码，可以验证（这里简化处理，实际项目中可以添加邀请码验证逻辑）
    // 目前允许直接加入（可以通过团队ID加入）

    // 添加成员
    const newMember = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId: req.user.id,
        role: 'member',
      },
      include: {
        team: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
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

    res.status(201).json({
      success: true,
      message: '成功加入团队',
      data: {
        member: newMember,
      },
    });
  } catch (error) {
    console.error('加入团队错误:', error);
    res.status(500).json({
      success: false,
      message: '加入团队失败，请稍后重试',
    });
  }
};

/**
 * 离开团队
 * POST /api/teams/:id/leave
 * 需要认证
 */
export const leaveTeam = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: '无效的团队ID',
      });
      return;
    }

    // 查询团队
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: '团队不存在',
      });
      return;
    }

    // 检查用户是否是团队成员
    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: req.user.id,
        },
      },
    });

    if (!member) {
      res.status(403).json({
        success: false,
        message: '您不是该团队的成员',
      });
      return;
    }

    // 检查是否是团队所有者
    if (team.ownerId === req.user.id) {
      res.status(400).json({
        success: false,
        message: '团队所有者不能离开团队，请先转移所有权或删除团队',
      });
      return;
    }

    // 移除成员
    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId: id,
          userId: req.user.id,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: '成功离开团队',
    });
  } catch (error) {
    console.error('离开团队错误:', error);
    res.status(500).json({
      success: false,
      message: '离开团队失败，请稍后重试',
    });
  }
};

/**
 * 更新成员角色
 * PUT /api/teams/:id/members/:userId
 * 需要认证，只有 owner 和 admin 可以更新
 */
export const updateMemberRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id, userId } = req.params;
    const { role } = req.body;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id) || !uuidRegex.test(userId)) {
      res.status(400).json({
        success: false,
        message: '无效的团队ID或用户ID',
      });
      return;
    }

    // 验证必填字段
    if (!role) {
      res.status(400).json({
        success: false,
        message: '角色不能为空',
      });
      return;
    }

    // 验证角色
    if (!['owner', 'admin', 'member'].includes(role)) {
      res.status(400).json({
        success: false,
        message: '无效的角色，角色必须是 owner、admin 或 member',
      });
      return;
    }

    // 查询团队
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: req.user.id,
          },
        },
      },
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: '团队不存在',
      });
      return;
    }

    // 检查当前用户是否是团队成员
    const currentMember = team.members[0];
    if (!currentMember) {
      res.status(403).json({
        success: false,
        message: '无权访问该团队',
      });
      return;
    }

    // 检查权限：只有 owner 和 admin 可以更新成员角色
    if (currentMember.role !== 'owner' && currentMember.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: '只有团队所有者和管理员可以更新成员角色',
      });
      return;
    }

    // 查找要更新的成员
    const targetMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: userId,
        },
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

    if (!targetMember) {
      res.status(404).json({
        success: false,
        message: '成员不存在',
      });
      return;
    }

    // 如果要将角色设置为 owner，需要特殊处理（转移所有权）
    if (role === 'owner') {
      // 只有当前 owner 可以转移所有权
      if (team.ownerId !== req.user.id) {
        res.status(403).json({
          success: false,
          message: '只有团队所有者可以转移所有权',
        });
        return;
      }

      // 不能转移给自己
      if (userId === req.user.id) {
        res.status(400).json({
          success: false,
          message: '您已经是团队所有者',
        });
        return;
      }

      // 更新团队所有者
      await prisma.team.update({
        where: { id },
        data: {
          ownerId: userId,
        },
      });

      // 更新成员角色
      const updatedMember = await prisma.teamMember.update({
        where: {
          teamId_userId: {
            teamId: id,
            userId: userId,
          },
        },
        data: {
          role: 'owner',
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

      // 将原 owner 的角色改为 admin
      await prisma.teamMember.update({
        where: {
          teamId_userId: {
            teamId: id,
            userId: req.user.id,
          },
        },
        data: {
          role: 'admin',
        },
      });

      res.status(200).json({
        success: true,
        message: '所有权转移成功',
        data: {
          member: updatedMember,
        },
      });
      return;
    }

    // 不能修改自己的角色（除非是转移所有权）
    if (userId === req.user.id) {
      res.status(400).json({
        success: false,
        message: '不能修改自己的角色',
      });
      return;
    }

    // 不能将 owner 的角色改为其他角色（只能通过转移所有权）
    if (team.ownerId === userId) {
      res.status(400).json({
        success: false,
        message: '不能修改团队所有者的角色，请先转移所有权',
      });
      return;
    }

    // 更新成员角色
    const updatedMember = await prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId: id,
          userId: userId,
        },
      },
      data: {
        role: role,
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

    res.status(200).json({
      success: true,
      message: '成员角色更新成功',
      data: {
        member: updatedMember,
      },
    });
  } catch (error) {
    console.error('更新成员角色错误:', error);
    res.status(500).json({
      success: false,
      message: '更新成员角色失败，请稍后重试',
    });
  }
};

/**
 * 移除成员
 * DELETE /api/teams/:id/members/:userId
 * 需要认证，只有 owner 和 admin 可以移除
 */
export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    const { id, userId } = req.params;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id) || !uuidRegex.test(userId)) {
      res.status(400).json({
        success: false,
        message: '无效的团队ID或用户ID',
      });
      return;
    }

    // 查询团队
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: req.user.id,
          },
        },
      },
    });

    if (!team) {
      res.status(404).json({
        success: false,
        message: '团队不存在',
      });
      return;
    }

    // 检查当前用户是否是团队成员
    const currentMember = team.members[0];
    if (!currentMember) {
      res.status(403).json({
        success: false,
        message: '无权访问该团队',
      });
      return;
    }

    // 检查权限：只有 owner 和 admin 可以移除成员
    if (currentMember.role !== 'owner' && currentMember.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: '只有团队所有者和管理员可以移除成员',
      });
      return;
    }

    // 查找要移除的成员
    const targetMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: userId,
        },
      },
    });

    if (!targetMember) {
      res.status(404).json({
        success: false,
        message: '成员不存在',
      });
      return;
    }

    // 不能移除自己
    if (userId === req.user.id) {
      res.status(400).json({
        success: false,
        message: '不能移除自己，请使用离开团队功能',
      });
      return;
    }

    // 不能移除团队所有者
    if (team.ownerId === userId) {
      res.status(400).json({
        success: false,
        message: '不能移除团队所有者，请先转移所有权',
      });
      return;
    }

    // 移除成员
    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId: id,
          userId: userId,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: '成员移除成功',
    });
  } catch (error) {
    console.error('移除成员错误:', error);
    res.status(500).json({
      success: false,
      message: '移除成员失败，请稍后重试',
    });
  }
};
