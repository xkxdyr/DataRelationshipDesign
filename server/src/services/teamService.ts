import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface ConvertToTeamResult {
  success: boolean
  data?: any
  error?: string
}

export interface TeamWithMembers {
  id: string
  name: string
  description?: string | null
  avatar?: string | null
  ownerId: string
  createdAt: Date
  updatedAt: Date
  members: TeamMemberWithUser[]
}

export interface TeamMemberWithUser {
  id: string
  userId: string
  userName: string
  role: string
  joinedAt: Date
}

export interface CreateTeamRequest {
  name: string
  description?: string
  avatar?: string
  ownerId: string
}

export interface UpdateTeamRequest {
  name?: string
  description?: string
  avatar?: string
}

export interface AddMemberRequest {
  userId: string
  userName: string
  role?: 'admin' | 'member'
}

export interface UpdateMemberRoleRequest {
  role: 'admin' | 'member'
}

export const teamService = {
  async createTeam(request: CreateTeamRequest): Promise<TeamWithMembers> {
    const team = await prisma.team.create({
      data: {
        name: request.name,
        description: request.description,
        avatar: request.avatar,
        ownerId: request.ownerId,
        members: {
          create: {
            userId: request.ownerId,
            role: 'owner'
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        }
      }
    })

    return {
      ...team,
      members: team.members.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.displayName || m.user.username,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    }
  },

  async getTeamById(teamId: string): Promise<TeamWithMembers | null> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        }
      }
    })

    if (!team) return null

    return {
      ...team,
      members: team.members.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.displayName || m.user.username,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    }
  },

  async getAllTeams(): Promise<TeamWithMembers[]> {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return teams.map(team => ({
      ...team,
      members: team.members.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.displayName || m.user.username,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    }))
  },

  async getTeamsByUserId(userId: string): Promise<TeamWithMembers[]> {
    const teamMembers = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { team: { createdAt: 'desc' } }
    })

    return teamMembers.map(tm => ({
      ...tm.team,
      members: tm.team.members.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.displayName || m.user.username,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    }))
  },

  async updateTeam(teamId: string, request: UpdateTeamRequest): Promise<TeamWithMembers | null> {
    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: request.name,
        description: request.description,
        avatar: request.avatar
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        }
      }
    })

    if (!team) return null

    return {
      ...team,
      members: team.members.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.displayName || m.user.username,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    }
  },

  async deleteTeam(teamId: string): Promise<boolean> {
    try {
      await prisma.team.delete({ where: { id: teamId } })
      return true
    } catch {
      return false
    }
  },

  async addMember(teamId: string, request: AddMemberRequest): Promise<TeamWithMembers | null> {
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: request.userId } }
    })

    if (existingMember) {
      return this.getTeamById(teamId)
    }

    await prisma.teamMember.create({
      data: {
        teamId,
        userId: request.userId,
        role: request.role || 'member'
      }
    })

    return this.getTeamById(teamId)
  },

  async removeMember(teamId: string, userId: string): Promise<TeamWithMembers | null> {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    })

    if (member && member.role === 'owner') {
      return null
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } }
    })

    return this.getTeamById(teamId)
  },

  async updateMemberRole(teamId: string, userId: string, request: UpdateMemberRoleRequest): Promise<TeamWithMembers | null> {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    })

    if (!member || member.role === 'owner') {
      return this.getTeamById(teamId)
    }

    await prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId } },
      data: { role: request.role }
    })

    return this.getTeamById(teamId)
  },

  async isMember(teamId: string, userId: string): Promise<boolean> {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    })
    return !!member
  },

  async isAdmin(teamId: string, userId: string): Promise<boolean> {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    })
    return member ? (member.role === 'owner' || member.role === 'admin') : false
  },

  async isOwner(teamId: string, userId: string): Promise<boolean> {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    })
    return member ? member.role === 'owner' : false
  },

  async canManageTeam(teamId: string, userId: string): Promise<boolean> {
    return this.isAdmin(teamId, userId)
  },

  async canManageMembers(teamId: string, userId: string): Promise<boolean> {
    return this.isAdmin(teamId, userId)
  },

  async canManageProjects(teamId: string, userId: string): Promise<boolean> {
    return this.isAdmin(teamId, userId)
  },

  async addProjectToTeam(teamId: string, projectId: string): Promise<void> {
    await prisma.teamProject.upsert({
      where: { teamId_projectId: { teamId, projectId } },
      update: {},
      create: { teamId, projectId }
    })
  },

  async removeProjectFromTeam(teamId: string, projectId: string): Promise<void> {
    await prisma.teamProject.delete({
      where: { teamId_projectId: { teamId, projectId } }
    })
  },

  async getTeamProjects(teamId: string) {
    const teamProjects = await prisma.teamProject.findMany({
      where: { teamId },
      include: { project: true }
    })
    return teamProjects.map(tp => tp.project)
  },

  async convertPersonalToTeamProject(
    projectId: string,
    targetTeamId: string,
    performingUserId: string
  ): Promise<ConvertToTeamResult> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { 
          projectMembers: true,
          teamProjects: true
        }
      })

      if (!project) {
        return { success: false, error: '项目不存在' }
      }

      if (project.createdBy.startsWith('team_')) {
        return { success: false, error: '该项目已经是团队项目' }
      }

      if (project.createdBy !== performingUserId) {
        const isProjectOwner = project.projectMembers.some(
          m => m.userId === performingUserId && m.role === 'owner'
        )
        if (!isProjectOwner) {
          return { success: false, error: '只有项目所有者可以转换项目类型' }
        }
      }

      const team = await prisma.team.findUnique({
        where: { id: targetTeamId },
        include: { members: true }
      })

      if (!team) {
        return { success: false, error: '目标团队不存在' }
      }

      const isTeamOwner = team.ownerId === performingUserId
      const isTeamAdmin = team.members.some(
        m => m.userId === performingUserId && (m.role === 'admin' || m.role === 'owner')
      )
      if (!isTeamOwner && !isTeamAdmin) {
        return { success: false, error: '只有团队管理员可以将项目加入团队' }
      }

      if (project.teamProjects.length > 0) {
        return { success: false, error: '该项目已关联到其他团队' }
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.teamProject.create({
          data: {
            teamId: targetTeamId,
            projectId
          }
        })

        const updatedProject = await tx.project.update({
          where: { id: projectId },
          data: {
            createdBy: `team_${targetTeamId}`,
            collaborationEnabled: true
          }
        })

        // 自动添加团队成员为项目成员
        const teamMembers = await tx.teamMember.findMany({
          where: { teamId: targetTeamId },
          select: { userId: true, role: true }
        })
        for (const member of teamMembers) {
          await tx.projectMember.upsert({
            where: {
              projectId_userId: { projectId, userId: member.userId }
            },
            create: {
              projectId,
              userId: member.userId,
              role: member.role === 'owner' || member.role === 'admin' ? 'admin' : 'editor'
            },
            update: {}
          })
        }

        return updatedProject
      })

      return { 
        success: true, 
        data: {
          ...result,
          teamName: team.name,
          teamId: targetTeamId
        }
      }
    } catch (error) {
      console.error('转换个人项目为团队项目失败:', error)
      return { success: false, error: '转换失败: ' + (error as Error).message }
    }
  }
}
