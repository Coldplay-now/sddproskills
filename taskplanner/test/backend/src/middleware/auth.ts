import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// 扩展 Request 类型以包含用户信息
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// JWT Payload 类型
interface JwtPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * 生成 JWT Token
 */
export const generateToken = (payload: { id: string; email: string }): string => {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, options);
};

/**
 * 验证 JWT Token
 */
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

/**
 * JWT 验证中间件
 * 从 Authorization header 提取并验证 token
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // 获取 Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: '未提供认证令牌',
      });
      return;
    }

    // 检查 Bearer token 格式
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: '认证令牌格式错误',
      });
      return;
    }

    // 提取 token
    const token = authHeader.substring(7);

    // 验证 token
    const decoded = verifyToken(token);

    // 将用户信息附加到请求对象
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: '认证令牌已过期',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: '无效的认证令牌',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: '认证验证失败',
    });
  }
};

/**
 * 可选的认证中间件
 * 如果提供了 token 则验证，否则继续
 */
export const optionalAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
  } catch {
    // 忽略无效 token，继续处理请求
  }

  next();
};

export { JWT_SECRET, JWT_EXPIRES_IN };
