import { Version } from '../types'

export interface VersionDiff {
  version1: Version
  version2: Version
  added: DiffItem[]
  removed: DiffItem[]
  modified: DiffItem[]
  unchanged: DiffItem[]
}

export interface DiffItem {
  type: 'table' | 'column' | 'relationship' | 'index'
  action: 'added' | 'removed' | 'modified'
  name: string
  tableName?: string
  details?: {
    [key: string]: {
      old?: any
      new?: any
    }
  }
}

interface TableData {
  id: string
  name: string
  comment?: string
  positionX: number
  positionY: number
  columns?: any[]
  indexes?: any[]
}

interface RelationshipData {
  id: string
  name?: string
  sourceTableId: string
  targetTableId: string
  relationshipType: string
}

export const versionDiffService = {
  compareVersions(version1: Version, version2: Version): VersionDiff {
    const diff: VersionDiff = {
      version1,
      version2,
      added: [],
      removed: [],
      modified: [],
      unchanged: []
    }

    let data1: any = {}
    let data2: any = {}

    try {
      data1 = typeof version1.data === 'string' ? JSON.parse(version1.data) : version1.data
      data2 = typeof version2.data === 'string' ? JSON.parse(version2.data) : version2.data
    } catch (e) {
      console.error('Failed to parse version data:', e)
      return diff
    }

    const tables1: TableData[] = data1.tables || []
    const tables2: TableData[] = data2.tables || []
    const relationships1: RelationshipData[] = data1.relationships || []
    const relationships2: RelationshipData[] = data2.relationships || []

    const tableMap1 = new Map(tables1.map(t => [t.name, t]))
    const tableMap2 = new Map(tables2.map(t => [t.name, t]))

    for (const table of tables2) {
      if (!tableMap1.has(table.name)) {
        diff.added.push({
          type: 'table',
          action: 'added',
          name: table.name,
          details: { comment: { new: table.comment } }
        })
      }
    }

    for (const table of tables1) {
      if (!tableMap2.has(table.name)) {
        diff.removed.push({
          type: 'table',
          action: 'removed',
          name: table.name,
          details: { comment: { old: table.comment } }
        })
      }
    }

    for (const table1 of tables1) {
      const table2 = tableMap2.get(table1.name)
      if (!table2) continue

      const columnMap1 = new Map((table1.columns || []).map((c: any) => [c.name, c]))
      const columnMap2 = new Map((table2.columns || []).map((c: any) => [c.name, c]))

      for (const col2 of table2.columns || []) {
        if (!columnMap1.has(col2.name)) {
          diff.added.push({
            type: 'column',
            action: 'added',
            name: col2.name,
            tableName: table1.name,
            details: {
              dataType: { new: col2.dataType },
              nullable: { new: col2.nullable },
              comment: { new: col2.comment }
            }
          })
        }
      }

      for (const col1 of table1.columns || []) {
        if (!columnMap2.has(col1.name)) {
          diff.removed.push({
            type: 'column',
            action: 'removed',
            name: col1.name,
            tableName: table1.name,
            details: {
              dataType: { old: col1.dataType },
              nullable: { old: col1.nullable },
              comment: { old: col1.comment }
            }
          })
        }
      }

      for (const col1 of table1.columns || []) {
        const col2 = columnMap2.get(col1.name)
        if (!col2) continue

        const changes: DiffItem['details'] = {}
        let hasChange = false

        if (col1.dataType !== col2.dataType) {
          changes.dataType = { old: col1.dataType, new: col2.dataType }
          hasChange = true
        }
        if (col1.nullable !== col2.nullable) {
          changes.nullable = { old: col1.nullable, new: col2.nullable }
          hasChange = true
        }
        if (col1.comment !== col2.comment) {
          changes.comment = { old: col1.comment, new: col2.comment }
          hasChange = true
        }
        if (col1.primaryKey !== col2.primaryKey) {
          changes.primaryKey = { old: col1.primaryKey, new: col2.primaryKey }
          hasChange = true
        }

        if (hasChange) {
          diff.modified.push({
            type: 'column',
            action: 'modified',
            name: col1.name,
            tableName: table1.name,
            details: changes
          })
        } else {
          diff.unchanged.push({
            type: 'column',
            action: 'modified',
            name: col1.name,
            tableName: table1.name
          })
        }
      }
    }

    const relMap1 = new Map(relationships1.map(r => [r.id, r]))
    const relMap2 = new Map(relationships2.map(r => [r.id, r]))

    for (const rel of relationships2) {
      if (!relMap1.has(rel.id)) {
        diff.added.push({
          type: 'relationship',
          action: 'added',
          name: rel.name || `${rel.sourceTableId} -> ${rel.targetTableId}`,
          details: {
            type: { new: rel.relationshipType }
          }
        })
      }
    }

    for (const rel of relationships1) {
      if (!relMap2.has(rel.id)) {
        diff.removed.push({
          type: 'relationship',
          action: 'removed',
          name: rel.name || `${rel.sourceTableId} -> ${rel.targetTableId}`,
          details: {
            type: { old: rel.relationshipType }
          }
        })
      }
    }

    return diff
  },

  formatDiffSummary(diff: VersionDiff): string {
    const lines: string[] = []
    lines.push(`版本对比: v${diff.version1.version} vs v${diff.version2.version}`)
    lines.push('')

    if (diff.added.length > 0) {
      lines.push(`新增 (${diff.added.length})`)
      for (const item of diff.added) {
        lines.push(`  + ${item.name}${item.tableName ? ` (${item.tableName})` : ''}`)
      }
      lines.push('')
    }

    if (diff.removed.length > 0) {
      lines.push(`删除 (${diff.removed.length})`)
      for (const item of diff.removed) {
        lines.push(`  - ${item.name}${item.tableName ? ` (${item.tableName})` : ''}`)
      }
      lines.push('')
    }

    if (diff.modified.length > 0) {
      lines.push(`修改 (${diff.modified.length})`)
      for (const item of diff.modified) {
        lines.push(`  ~ ${item.name}${item.tableName ? ` (${item.tableName})` : ''}`)
        if (item.details) {
          for (const [key, value] of Object.entries(item.details)) {
            if (value.old !== undefined && value.new !== undefined) {
              lines.push(`      ${key}: ${value.old} -> ${value.new}`)
            }
          }
        }
      }
      lines.push('')
    }

    return lines.join('\n')
  },

  getDiffStats(diff: VersionDiff): {
    total: number
    added: number
    removed: number
    modified: number
    unchanged: number
  } {
    return {
      total: diff.added.length + diff.removed.length + diff.modified.length,
      added: diff.added.length,
      removed: diff.removed.length,
      modified: diff.modified.length,
      unchanged: diff.unchanged.length
    }
  }
}
