import { PrismaClient } from '@prisma/client'
import { crdtFactory } from './crdt'

const prisma = new PrismaClient()

const SAVE_INTERVAL = 30000

class CollabPersistence {
  private saveIntervals: Map<string, NodeJS.Timeout> = new Map()
  private isEnabled = true

  async saveProject(projectId: string): Promise<void> {
    if (!this.isEnabled) return

    try {
      const manager = crdtFactory.getManager(projectId)
      if (!manager) {
        console.log(`项目 ${projectId} 没有活跃的 CRDT 文档，跳过保存`)
        return
      }

      const state = manager.getState()
      const jsonState = manager.toJSON()

      await prisma.version.upsert({
        where: {
          projectId_version: {
            projectId,
            version: 0
          }
        },
        update: {
          data: JSON.stringify(jsonState),
          comment: '协作自动保存'
        },
        create: {
          projectId,
          version: 0,
          name: '协作自动保存',
          comment: '协作自动保存',
          data: JSON.stringify(jsonState)
        }
      })

      console.log(`项目 ${projectId} 已保存到数据库`)
    } catch (error) {
      console.error(`保存项目 ${projectId} 失败:`, error)
    }
  }

  async loadProject(projectId: string): Promise<boolean> {
    try {
      const version = await prisma.version.findUnique({
        where: {
          projectId_version: {
            projectId,
            version: 0
          }
        }
      })

      if (!version || !version.data) {
        console.log(`项目 ${projectId} 没有找到保存的协作状态`)
        return false
      }

      const manager = crdtFactory.getManager(projectId)
      const data = JSON.parse(version.data)
      manager.fromJSON(data)

      console.log(`项目 ${projectId} 已从数据库恢复`)
      return true
    } catch (error) {
      console.error(`加载项目 ${projectId} 失败:`, error)
      return false
    }
  }

  startAutoSave(projectId: string): void {
    this.stopAutoSave(projectId)

    const interval = setInterval(() => {
      this.saveProject(projectId)
    }, SAVE_INTERVAL)

    this.saveIntervals.set(projectId, interval)
    console.log(`项目 ${projectId} 自动保存已启动 (间隔 ${SAVE_INTERVAL / 1000}秒)`)
  }

  stopAutoSave(projectId: string): void {
    const interval = this.saveIntervals.get(projectId)
    if (interval) {
      clearInterval(interval)
      this.saveIntervals.delete(projectId)
      console.log(`项目 ${projectId} 自动保存已停止`)
    }
  }

  async saveAllProjects(): Promise<void> {
    const projectIds = Array.from(this.saveIntervals.keys())
    console.log(`开始保存 ${projectIds.length} 个项目...`)

    await Promise.all(projectIds.map(id => this.saveProject(id)))

    console.log(`已保存 ${projectIds.length} 个项目`)
  }

  disable(): void {
    this.isEnabled = false
  }

  enable(): void {
    this.isEnabled = true
  }
}

export const collabPersistence = new CollabPersistence()