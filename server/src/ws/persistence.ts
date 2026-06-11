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
        return
      }

      const state = manager.getState()
      const jsonState = manager.toJSON()
      const version = manager.getVersion()

      await prisma.version.upsert({
        where: {
          projectId_version: {
            projectId,
            version: 0
          }
        },
        update: {
          data: JSON.stringify(jsonState),
          comment: '协作自动保存',
          collabState: Buffer.from(state).toString('base64'),
          collabVersion: version
        },
        create: {
          projectId,
          version: 0,
          name: '协作自动保存',
          comment: '协作自动保存',
          data: JSON.stringify(jsonState),
          collabState: Buffer.from(state).toString('base64'),
          collabVersion: version
        }
      })

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
        return false
      }

      const manager = crdtFactory.getManager(projectId)

      // 优先使用 CRDT 二进制状态恢复（更精确）
      if (version.collabState) {
        const stateBuffer = Buffer.from(version.collabState, 'base64')
        manager.applyState(new Uint8Array(stateBuffer))
      } else {
        const data = JSON.parse(version.data)
        manager.fromJSON(data)
      }

      console.warn(`[Persistence] 项目 ${projectId} 已从数据库恢复 (collabVersion: ${version.collabVersion || 0})`)
      return true
    } catch (error) {
      console.error(`加载项目 ${projectId} 失败:`, error)
      return false
    }
  }

  async getLastVersion(projectId: string): Promise<number> {
    try {
      const record = await prisma.version.findUnique({
        where: {
          projectId_version: {
            projectId,
            version: 0
          }
        }
      })
      return record?.collabVersion || 0
    } catch (error) {
      console.error(`获取项目 ${projectId} 版本号失败:`, error)
      return 0
    }
  }

  startAutoSave(projectId: string): void {
    this.stopAutoSave(projectId)

    const interval = setInterval(() => {
      this.saveProject(projectId)
    }, SAVE_INTERVAL)

    this.saveIntervals.set(projectId, interval)
  }

  stopAutoSave(projectId: string): void {
    const interval = this.saveIntervals.get(projectId)
    if (interval) {
      clearInterval(interval)
      this.saveIntervals.delete(projectId)
    }
  }

  async saveAllProjects(): Promise<void> {
    const projectIds = Array.from(this.saveIntervals.keys())

    await Promise.all(projectIds.map(id => this.saveProject(id)))
  }

  disable(): void {
    this.isEnabled = false
  }

  enable(): void {
    this.isEnabled = true
  }
}

export const collabPersistence = new CollabPersistence()