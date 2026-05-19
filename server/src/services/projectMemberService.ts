import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export type ProjectRole = 'owner' | 'editor' | 'viewer'

const MAX_PERSONAL_PROJECT_MEMBERS = 5

export interface AddMemberResult {
  success: boolean
  data?: ProjectMemberInfo
  error?: string
}

export interface ProjectMemberInfo {
  id: string
  projectId: string
  userId: string
  userName: string
  role: ProjectRole
  joinedAt: Date
}

export interface AddMemberRequest {
  projectId: string
  userId: string
  userName: string
  role?: ProjectRole
}

export interface UpdateMemberRoleRequest {
  role: ProjectRole
}

export const projectMemberService = {
  async isPersonalProject(projectId: string): Promise<boolean> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { createdBy: true }
      })
      if (!project) return false
      return !project.createdBy.startsWith('team_')
    } catch (error) {
      console.error('检查项目类型失败:', error)
      return false
    }
  },

  async getMemberCount(projectId: string): Promise<number> {
    try {
      return await prisma.projectMember.count({
        where: { projectId }
      })
    } catch (error) {
      console.error('获取成员数量失败:', error)
      return 0
    }
  },

  async hasReachedPersonalLimit(projectId: string): Promise<boolean> {
    const isPersonal = await this.isPersonalProject(projectId)
    if (!isPersonal) return false
    const count = await this.getMemberCount(projectId)
    return count >= MAX_PERSONAL_PROJECT_MEMBERS
  },

  async addMember(request: AddMemberRequest): Promise<AddMemberResult> {
    try {
      const existingMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: request.projectId, userId: request.userId } }
      })

      if (existingMember) {
        const member = await this.getMember(request.projectId, request.userId)
        return { success: true, data: member! }
      }

      const isPersonal = await this.isPersonalProject(request.projectId)
      if (isPersonal) {
        const memberCount = await this.getMemberCount(request.projectId)
        if (memberCount >= MAX_PERSONAL_PROJECT_MEMBERS) {
          return { 
            success: false, 
            error: `个人项目成员已达上限 (最多${MAX_PERSONAL_PROJECT_MEMBERS}人)，请升级为团队项目` 
          }
        }
      }

      const member = await prisma.projectMember.create({
        data: {
          projectId: request.projectId,
          userId: request.userId,
          role: request.role || 'viewer'
        },
        include: {
          user: true
        }
      })

      const result: ProjectMemberInfo = {
        id: member.id,
        projectId: member.projectId,
        userId: member.userId,
        userName: member.user.displayName || member.user.username,
        role: member.role as ProjectRole,
        joinedAt: member.joinedAt
      }

      return { success: true, data: result }
    } catch (error) {
      console.error('添加项目成员失败:', error)
      return { success: false, error: '添加成员失败' }
    }
  },

  async removeMember(projectId: string, userId: string): Promise<boolean> {
    try {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } }
      })

      if (!member) {
        return false
      }

      await prisma.projectMember.delete({
        where: { projectId_userId: { projectId, userId } }
      })

      return true
    } catch (error) {
      console.error('移除项目成员失败:', error)
      return false
    }
  },

  async updateMemberRole(projectId: string, userId: string, request: UpdateMemberRoleRequest): Promise<ProjectMemberInfo | null> {
    try {
      const member = await prisma.projectMember.update({
        where: { projectId_userId: { projectId, userId } },
        data: { role: request.role },
        include: { user: true }
      })

      return {
        id: member.id,
        projectId: member.projectId,
        userId: member.userId,
        userName: member.user.displayName || member.user.username,
        role: member.role as ProjectRole,
        joinedAt: member.joinedAt
      }
    } catch (error) {
      console.error('更新成员角色失败:', error)
      return null
    }
  },

  async getMember(projectId: string, userId: string): Promise<ProjectMemberInfo | null> {
    try {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
        include: { user: true }
      })

      if (!member) {
        return null
      }

      return {
        id: member.id,
        projectId: member.projectId,
        userId: member.userId,
        userName: member.user.displayName || member.user.username,
        role: member.role as ProjectRole,
        joinedAt: member.joinedAt
      }
    } catch (error) {
      console.error('获取项目成员失败:', error)
      return null
    }
  },

  async getProjectMembers(projectId: string): Promise<ProjectMemberInfo[]> {
    try {
      const members = await prisma.projectMember.findMany({
        where: { projectId },
        include: { user: true },
        orderBy: { joinedAt: 'desc' }
      })

      return members.map(member => ({
        id: member.id,
        projectId: member.projectId,
        userId: member.userId,
        userName: member.user.displayName || member.user.username,
        role: member.role as ProjectRole,
        joinedAt: member.joinedAt
      }))
    } catch (error) {
      console.error('获取项目成员列表失败:', error)
      return []
    }
  },

  async getUserProjects(userId: string): Promise<Array<{
    projectId: string
    projectName: string
    role: ProjectRole
    joinedAt: Date
  }>> {
    try {
      const memberships = await prisma.projectMember.findMany({
        where: { userId },
        include: { project: true },
        orderBy: { joinedAt: 'desc' }
      })

      return memberships
        .filter(member => member.project)
        .map(member => ({
          projectId: member.projectId,
          projectName: member.project.name,
          role: member.role as ProjectRole,
          joinedAt: member.joinedAt
        }))
    } catch (error) {
      console.error('获取用户项目列表失败:', error)
      return []
    }
  },

  async isMember(projectId: string, userId: string): Promise<boolean> {
    try {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } }
      })
      return !!member
    } catch (error) {
      console.error('检查成员权限失败:', error)
      return false
    }
  },

  async isOwner(projectId: string, userId: string): Promise<boolean> {
    try {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } }
      })
      return member ? member.role === 'owner' : false
    } catch (error) {
      console.error('检查所有者权限失败:', error)
      return false
    }
  },

  async isEditor(projectId: string, userId: string): Promise<boolean> {
    try {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } }
      })
      return member ? (member.role === 'owner' || member.role === 'editor') : false
    } catch (error) {
      console.error('检查编辑权限失败:', error)
      return false
    }
  },

  async canView(projectId: string, userId: string): Promise<boolean> {
    try {
      return this.isMember(projectId, userId)
    } catch (error) {
      console.error('检查查看权限失败:', error)
      return false
    }
  },

  async canEdit(projectId: string, userId: string): Promise<boolean> {
    try {
      return this.isEditor(projectId, userId)
    } catch (error) {
      console.error('检查编辑权限失败:', error)
      return false
    }
  },

  async canManage(projectId: string, userId: string): Promise<boolean> {
    try {
      return this.isOwner(projectId, userId)
    } catch (error) {
      console.error('检查管理权限失败:', error)
      return false
    }
  },

  async setOwner(projectId: string, userId: string): Promise<boolean> {
    try {
      await prisma.projectMember.update({
        where: { projectId_userId: { projectId, userId } },
        data: { role: 'owner' }
      })
      return true
    } catch (error) {
      console.error('设置所有者失败:', error)
      return false
    }
  },

  async removeAllMembers(projectId: string): Promise<void> {
    try {
      await prisma.projectMember.deleteMany({
        where: { projectId }
      })
    } catch (error) {
      console.error('移除所有成员失败:', error)
    }
  }
}