import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { sessionService } from './sessionService'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d'

export interface AuthResponseWithSession extends AuthResponse {
  sessionId: string
}

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#FF8C42'
]

function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  displayName?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  user: {
    id: string
    username: string
    email: string
    displayName: string | null
    avatar: string | null
    color: string
  }
  token: string
}

export const userService = {
  async register(request: RegisterRequest): Promise<AuthResponse> {
    const { username, email, password, displayName } = request

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    })

    if (existingUser) {
      throw new Error('用户名或邮箱已存在')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        displayName: displayName || username
      }
    })

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    })

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        color: getUserColor(user.id)
      },
      token
    }
  },

  async login(request: LoginRequest, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const { username, password } = request

    const user = await prisma.user.findFirst({
      where: { username }
    })

    if (!user) {
      throw new Error('用户名或密码错误')
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      throw new Error('用户名或密码错误')
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    })

    await sessionService.createSession(user.id, token, ipAddress, userAgent)

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        color: getUserColor(user.id)
      },
      token
    }
  },

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        createdAt: true
      }
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    return { ...user, color: getUserColor(user.id) }
  },

  async getUserByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        createdAt: true
      }
    })

    if (!user) {
      return null
    }

    return { ...user, color: getUserColor(user.id) }
  },

  async searchUsers(query: string) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query } },
          { email: { contains: query } },
          { displayName: { contains: query } }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        createdAt: true
      },
      take: 20
    })

    return users.map(user => ({ ...user, color: getUserColor(user.id) }))
  },

  verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string; username: string }
    } catch (error) {
      throw new Error('无效的 token')
    }
  }
}
