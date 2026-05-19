import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateVersionDTO {
  name: string
  comment?: string
  data?: string
}

export interface UpdateVersionDTO {
  name?: string
  comment?: string
  data?: string
}

export interface ColumnDiff {
  name: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  changes?: Array<{ field: string; oldValue: any; newValue: any }>
}

export interface TableDiff {
  id: string
  name: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  changes?: Array<{ field: string; oldValue: any; newValue: any }>
  columns: ColumnDiff[]
  columnSummary: { added: number; removed: number; modified: number; unchanged: number }
}

export interface RelationshipDiff {
  id: string
  name: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  changes?: Array<{ field: string; oldValue: any; newValue: any }>
}

export interface VersionCompareResult {
  versionId1: string
  versionName1: string
  versionId2: string
  versionName2: string
  tables: TableDiff[]
  relationships: RelationshipDiff[]
  summary: {
    tablesAdded: number
    tablesRemoved: number
    tablesModified: number
    tablesUnchanged: number
    columnsAdded: number
    columnsRemoved: number
    columnsModified: number
    relationshipsAdded: number
    relationshipsRemoved: number
    relationshipsModified: number
  }
}

function compareFields(obj1: any, obj2: any, excludeKeys: string[]): Array<{ field: string; oldValue: any; newValue: any }> {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = []
  const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})])
  for (const key of allKeys) {
    if (excludeKeys.includes(key)) continue
    const v1 = obj1?.[key]
    const v2 = obj2?.[key]
    if (JSON.stringify(v1) !== JSON.stringify(v2)) {
      changes.push({ field: key, oldValue: v1, newValue: v2 })
    }
  }
  return changes
}

export const versionService = {
  async findByProjectId(projectId: string) {
    return await prisma.version.findMany({
      where: { projectId },
      orderBy: { version: 'desc' }
    })
  },

  async findById(id: string) {
    return await prisma.version.findUnique({
      where: { id }
    })
  },

  async create(projectId: string, data: CreateVersionDTO) {
    // 获取当前所有版本并排序找到最大版本号
    const versions = await prisma.version.findMany({
      where: { projectId },
      select: { version: true },
      orderBy: { version: 'desc' },
      take: 1
    })
    
    const newVersion = versions.length > 0 ? versions[0].version + 1 : 1

    const activeBranch = await prisma.branch.findFirst({
      where: { projectId, isActive: true },
      select: { id: true }
    })
    
    return await prisma.version.create({
      data: {
        projectId,
        version: newVersion,
        name: data.name,
        comment: data.comment || null,
        data: data.data || '{}',
        branchId: activeBranch?.id || null
      }
    })
  },

  async update(id: string, data: UpdateVersionDTO) {
    return await prisma.version.update({
      where: { id },
      data: {
        name: data.name,
        comment: data.comment,
        data: data.data
      }
    })
  },

  async delete(id: string) {
    return await prisma.version.delete({
      where: { id }
    })
  },

  async compare(versionId1: string, versionId2: string): Promise<VersionCompareResult> {
    const [v1, v2] = await Promise.all([
      this.findById(versionId1),
      this.findById(versionId2)
    ])

    if (!v1 || !v2) {
      throw new Error('Version not found')
    }

    const snapshot1: any = JSON.parse(v1.data || '{}')
    const snapshot2: any = JSON.parse(v2.data || '{}')

    const tables1: any[] = snapshot1.tables || []
    const tables2: any[] = snapshot2.tables || []
    const rels1: any[] = snapshot1.relationships || []
    const rels2: any[] = snapshot2.relationships || []

    const tableMap1 = new Map(tables1.map((t: any) => [t.id, t]))
    const tableMap2 = new Map(tables2.map((t: any) => [t.id, t]))

    const tablesResult: TableDiff[] = []

    for (const t1 of tables1) {
      const t2 = tableMap2.get(t1.id)
      if (!t2) {
        tablesResult.push({
          id: t1.id, name: t1.name, status: 'removed',
          columns: (t1.columns || []).map((c: any) => ({ name: c.name, status: 'removed' as const })),
          columnSummary: { added: 0, removed: (t1.columns || []).length, modified: 0, unchanged: 0 }
        })
      } else {
        const tableChanged = t1.name !== t2.name || t1.comment !== t2.comment
        const colMap1 = new Map((t1.columns || []).map((c: any) => [c.id, c]))
        const colMap2 = new Map((t2.columns || []).map((c: any) => [c.id, c]))
        const columnDiffs: ColumnDiff[] = []
        let colAdded = 0, colRemoved = 0, colModified = 0, colUnchanged = 0

        for (const c1 of (t1.columns || [])) {
          const c2 = colMap2.get(c1.id)
          if (!c2) {
            columnDiffs.push({ name: c1.name, status: 'removed' })
            colRemoved++
          } else {
            const fieldChanges = compareFields(c1, c2, ['id', 'tableId', 'orderIndex'])
            if (fieldChanges.length > 0) {
              columnDiffs.push({ name: c1.name, status: 'modified', changes: fieldChanges })
              colModified++
            } else {
              columnDiffs.push({ name: c1.name, status: 'unchanged' })
              colUnchanged++
            }
          }
        }
        for (const c2 of (t2.columns || [])) {
          if (!colMap1.has(c2.id)) {
            columnDiffs.push({ name: c2.name, status: 'added' })
            colAdded++
          }
        }

        const tableChanges = tableChanged
          ? Object.keys(t1).filter(k => t1[k] !== t2[k] && !['columns', 'id'].includes(k))
              .map(k => ({ field: k, oldValue: t1[k], newValue: t2[k] }))
          : undefined

        tablesResult.push({
          id: t1.id, name: t1.name,
          status: tableChanged || colAdded + colRemoved + colModified > 0 ? 'modified' : 'unchanged',
          changes: tableChanges,
          columns: columnDiffs,
          columnSummary: { added: colAdded, removed: colRemoved, modified: colModified, unchanged: colUnchanged }
        })
      }
    }

    for (const t2 of tables2) {
      if (!tableMap1.has(t2.id)) {
        tablesResult.push({
          id: t2.id, name: t2.name, status: 'added',
          columns: (t2.columns || []).map((c: any) => ({ name: c.name, status: 'added' as const })),
          columnSummary: { added: (t2.columns || []).length, removed: 0, modified: 0, unchanged: 0 }
        })
      }
    }

    const relMap1 = new Map(rels1.map((r: any) => [r.id, r]))
    const relMap2 = new Map(rels2.map((r: any) => [r.id, r]))
    const relsResult: RelationshipDiff[] = []

    for (const r1 of rels1) {
      const r2 = relMap2.get(r1.id)
      if (!r2) {
        relsResult.push({ id: r1.id, name: r1.name || `关系-${r1.id}`, status: 'removed' })
      } else {
        const changes = compareFields(r1, r2, ['id', 'projectId'])
        relsResult.push({
          id: r1.id, name: r1.name || `关系-${r1.id}`,
          status: changes.length > 0 ? 'modified' : 'unchanged',
          changes: changes.length > 0 ? changes : undefined
        })
      }
    }
    for (const r2 of rels2) {
      if (!relMap1.has(r2.id)) {
        relsResult.push({ id: r2.id, name: r2.name || `关系-${r2.id}`, status: 'added' })
      }
    }

    const summary = {
      tablesAdded: tablesResult.filter(t => t.status === 'added').length,
      tablesRemoved: tablesResult.filter(t => t.status === 'removed').length,
      tablesModified: tablesResult.filter(t => t.status === 'modified').length,
      tablesUnchanged: tablesResult.filter(t => t.status === 'unchanged').length,
      columnsAdded: tablesResult.reduce((s, t) => s + t.columnSummary.added, 0),
      columnsRemoved: tablesResult.reduce((s, t) => s + t.columnSummary.removed, 0),
      columnsModified: tablesResult.reduce((s, t) => s + t.columnSummary.modified, 0),
      relationshipsAdded: relsResult.filter(r => r.status === 'added').length,
      relationshipsRemoved: relsResult.filter(r => r.status === 'removed').length,
      relationshipsModified: relsResult.filter(r => r.status === 'modified').length
    }

    return {
      versionId1: v1.id,
      versionName1: v1.name,
      versionId2: v2.id,
      versionName2: v2.name,
      tables: tablesResult,
      relationships: relsResult,
      summary
    }
  }
}
