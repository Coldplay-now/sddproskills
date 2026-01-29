import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../middleware/auth';
import prisma from '../lib/prisma';

let io: SocketIOServer | null = null;

// 扩展 Socket 接口以包含用户信息
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

/**
 * 初始化 Socket.io 服务器
 */
export const initializeSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  // 连接中间件 - 处理认证
  io.use(async (socket: AuthenticatedSocket, next) => {
    // 默认允许连接，认证通过 'auth' 事件完成
    next();
  });

  // 连接事件处理
  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`客户端连接: ${socket.id}`);

    // 监听认证事件
    socket.on('auth', async (data: { token: string }) => {
      try {
        if (!data.token) {
          socket.emit('auth_error', { message: '未提供认证令牌' });
          return;
        }

        // 验证 JWT token
        const decoded = verifyToken(data.token);

        // 保存用户信息到 socket
        socket.userId = decoded.id;
        socket.userEmail = decoded.email;

        // 查询用户所属的所有团队
        const teamMembers = await prisma.teamMember.findMany({
          where: {
            userId: decoded.id,
          },
          select: {
            teamId: true,
          },
        });

        // 加入用户所属的所有团队房间
        const teamRooms: string[] = [];
        teamMembers.forEach((member) => {
          const roomName = `team:${member.teamId}`;
          socket.join(roomName);
          teamRooms.push(roomName);
        });

        console.log(`用户 ${decoded.email} (${decoded.id}) 已认证，加入房间:`, teamRooms);

        // 发送认证成功消息
        socket.emit('auth_success', {
          message: '认证成功',
          userId: decoded.id,
          email: decoded.email,
          rooms: teamRooms,
        });

        // 广播用户上线事件
        await emitUserStatusEvent(decoded.id, true);
      } catch (error: any) {
        console.error('认证错误:', error);
        if (error.name === 'TokenExpiredError') {
          socket.emit('auth_error', { message: '认证令牌已过期' });
        } else if (error.name === 'JsonWebTokenError') {
          socket.emit('auth_error', { message: '无效的认证令牌' });
        } else {
          socket.emit('auth_error', { message: '认证验证失败' });
        }
      }
    });

    // 监听加入团队房间事件（可选，用于动态加入新团队）
    socket.on('join_team', async (data: { teamId: string }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: '请先进行认证' });
          return;
        }

        const { teamId } = data;
        if (!teamId) {
          socket.emit('error', { message: '未提供团队ID' });
          return;
        }

        // 验证用户是否是团队成员
        const teamMember = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId,
              userId: socket.userId,
            },
          },
        });

        if (!teamMember) {
          socket.emit('error', { message: '无权加入该团队房间' });
          return;
        }

        // 加入团队房间
        const roomName = `team:${teamId}`;
        socket.join(roomName);
        console.log(`用户 ${socket.userEmail} 加入房间: ${roomName}`);

        socket.emit('join_team_success', {
          message: '成功加入团队房间',
          teamId,
          room: roomName,
        });
      } catch (error) {
        console.error('加入团队房间错误:', error);
        socket.emit('error', { message: '加入团队房间失败' });
      }
    });

    // 监听离开团队房间事件
    socket.on('leave_team', (data: { teamId: string }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: '请先进行认证' });
          return;
        }

        const { teamId } = data;
        if (!teamId) {
          socket.emit('error', { message: '未提供团队ID' });
          return;
        }

        const roomName = `team:${teamId}`;
        socket.leave(roomName);
        console.log(`用户 ${socket.userEmail} 离开房间: ${roomName}`);

        socket.emit('leave_team_success', {
          message: '成功离开团队房间',
          teamId,
          room: roomName,
        });
      } catch (error) {
        console.error('离开团队房间错误:', error);
        socket.emit('error', { message: '离开团队房间失败' });
      }
    });

    // 断开连接事件
    socket.on('disconnect', async () => {
      console.log(`客户端断开连接: ${socket.id} (用户: ${socket.userEmail || '未认证'})`);
      
      // 如果用户已认证，广播用户下线事件
      if (socket.userId) {
        await emitUserStatusEvent(socket.userId, false);
      }
    });
  });

  return io;
};

/**
 * 获取 Socket.io 实例
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io 尚未初始化，请先调用 initializeSocket');
  }
  return io;
};

/**
 * 广播任务事件到团队房间
 * @param teamId 团队ID（如果为null则不广播）
 * @param event 事件名称 (task:created, task:updated, task:deleted)
 * @param data 事件数据
 */
export const emitTaskEvent = (teamId: string | null, event: 'task:created' | 'task:updated' | 'task:deleted', data: any): void => {
  if (!io) {
    console.warn('Socket.io 尚未初始化，无法广播任务事件');
    return;
  }

  if (!teamId) {
    // 如果任务没有关联团队，则不广播
    return;
  }

  const roomName = `team:${teamId}`;
  io.to(roomName).emit(event, data);
  console.log(`广播任务事件 ${event} 到房间 ${roomName}`);
};

/**
 * 广播评论事件到团队房间
 * @param teamId 团队ID（如果为null则不广播）
 * @param event 事件名称 (comment:added)
 * @param data 事件数据
 */
export const emitCommentEvent = (teamId: string | null, event: 'comment:added', data: any): void => {
  if (!io) {
    console.warn('Socket.io 尚未初始化，无法广播评论事件');
    return;
  }

  if (!teamId) {
    // 如果任务没有关联团队，则不广播
    return;
  }

  const roomName = `team:${teamId}`;
  io.to(roomName).emit(event, data);
  console.log(`广播评论事件 ${event} 到房间 ${roomName}`);
};

/**
 * 广播用户状态事件到用户所属的所有团队房间
 * @param userId 用户ID
 * @param online 是否在线
 */
export const emitUserStatusEvent = async (userId: string, online: boolean): Promise<void> => {
  if (!io) {
    console.warn('Socket.io 尚未初始化，无法广播用户状态事件');
    return;
  }

  try {
    // 查询用户所属的所有团队
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        userId,
      },
      select: {
        teamId: true,
      },
    });

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      console.warn(`用户 ${userId} 不存在，无法广播状态事件`);
      return;
    }

    const event = online ? 'user:online' : 'user:offline';
    const data = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      timestamp: new Date().toISOString(),
    };

    // 向用户所属的所有团队房间广播
    teamMembers.forEach((member) => {
      const roomName = `team:${member.teamId}`;
      io!.to(roomName).emit(event, data);
      console.log(`广播用户状态事件 ${event} 到房间 ${roomName} (用户: ${user.email})`);
    });
  } catch (error) {
    console.error('广播用户状态事件错误:', error);
  }
};

export default io;
