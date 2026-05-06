import * as fs from 'fs'
import * as path from 'path'

export interface Team {
  id: string
  name: string
  description?: string
  avatar?: string
  ownerId: string
  members: TeamMember[]
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  userId: string
  userName: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
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

const TEAMS_DIR = path.join(__dirname, '../../data/teams')

export const teamService = {
  async init() {
    if (!fs.existsSync(TEAMS_DIR)) {
      fs.mkdirSync(TEAMS_DIR, { recursive: true })
    }
  },

  async createTeam(request: CreateTeamRequest): Promise<Team> {
    await this.init()

    const team: Team = {
      id: `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: request.name,
      description: request.description,
      avatar: request.avatar,
      ownerId: request.ownerId,
      members: [{
        userId: request.ownerId,
        userName: request.ownerId,
        role: 'owner',
        joinedAt: new Date().toISOString()
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const filePath = path.join(TEAMS_DIR, `${team.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(team, null, 2), 'utf-8')

    return team
  },

  async getTeamById(teamId: string): Promise<Team | null> {
    await this.init()

    const filePath = path.join(TEAMS_DIR, `${teamId}.json`)
    if (!fs.existsSync(filePath)) {
      return null
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as Team
  },

  async getAllTeams(): Promise<Team[]> {
    await this.init()

    const files = fs.readdirSync(TEAMS_DIR)
    const teams: Team[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(TEAMS_DIR, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        teams.push(JSON.parse(content) as Team)
      }
    }

    return teams.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  async getTeamsByUserId(userId: string): Promise<Team[]> {
    await this.init()

    const allTeams = await this.getAllTeams()
    return allTeams.filter(team => 
      team.members.some(member => member.userId === userId)
    )
  },

  async updateTeam(teamId: string, request: UpdateTeamRequest): Promise<Team | null> {
    await this.init()

    const team = await this.getTeamById(teamId)
    if (!team) {
      return null
    }

    if (request.name !== undefined) team.name = request.name
    if (request.description !== undefined) team.description = request.description
    if (request.avatar !== undefined) team.avatar = request.avatar
    team.updatedAt = new Date().toISOString()

    const filePath = path.join(TEAMS_DIR, `${teamId}.json`)
    fs.writeFileSync(filePath, JSON.stringify(team, null, 2), 'utf-8')

    return team
  },

  async deleteTeam(teamId: string): Promise<boolean> {
    await this.init()

    const filePath = path.join(TEAMS_DIR, `${teamId}.json`)
    if (!fs.existsSync(filePath)) {
      return false
    }

    fs.unlinkSync(filePath)
    return true
  },

  async addMember(teamId: string, request: AddMemberRequest): Promise<Team | null> {
    await this.init()

    const team = await this.getTeamById(teamId)
    if (!team) {
      return null
    }

    if (team.members.some(member => member.userId === request.userId)) {
      return team
    }

    team.members.push({
      userId: request.userId,
      userName: request.userName,
      role: request.role || 'member',
      joinedAt: new Date().toISOString()
    })
    team.updatedAt = new Date().toISOString()

    const filePath = path.join(TEAMS_DIR, `${teamId}.json`)
    fs.writeFileSync(filePath, JSON.stringify(team, null, 2), 'utf-8')

    return team
  },

  async removeMember(teamId: string, userId: string): Promise<Team | null> {
    await this.init()

    const team = await this.getTeamById(teamId)
    if (!team) {
      return null
    }

    const owner = team.members.find(m => m.role === 'owner')
    if (owner && owner.userId === userId) {
      return null
    }

    team.members = team.members.filter(member => member.userId !== userId)
    team.updatedAt = new Date().toISOString()

    const filePath = path.join(TEAMS_DIR, `${teamId}.json`)
    fs.writeFileSync(filePath, JSON.stringify(team, null, 2), 'utf-8')

    return team
  },

  async updateMemberRole(teamId: string, userId: string, request: UpdateMemberRoleRequest): Promise<Team | null> {
    await this.init()

    const team = await this.getTeamById(teamId)
    if (!team) {
      return null
    }

    const member = team.members.find(m => m.userId === userId)
    if (!member || member.role === 'owner') {
      return team
    }

    member.role = request.role
    team.updatedAt = new Date().toISOString()

    const filePath = path.join(TEAMS_DIR, `${teamId}.json`)
    fs.writeFileSync(filePath, JSON.stringify(team, null, 2), 'utf-8')

    return team
  },

  async isMember(teamId: string, userId: string): Promise<boolean> {
    const team = await this.getTeamById(teamId)
    if (!team) {
      return false
    }

    return team.members.some(member => member.userId === userId)
  },

  async isAdmin(teamId: string, userId: string): Promise<boolean> {
    const team = await this.getTeamById(teamId)
    if (!team) {
      return false
    }

    const member = team.members.find(m => m.userId === userId)
    return member ? (member.role === 'owner' || member.role === 'admin') : false
  }
}