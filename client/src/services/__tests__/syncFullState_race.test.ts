import { describe, it, expect, beforeEach } from 'vitest'
import * as Y from 'yjs'
import { collabManager, SyncFullStateInput } from '../collabManager'

/**
 * 测试 syncFullState 在极端并发场景下不再误删远程新增数据
 *
 * 场景：syncToCRDT(get()) 捕获 appStore 快照时，远程 CRDT 已经写入了新增数据
 * 快照不包含这些新增数据，原增量删除逻辑会误删它们
 * 修复后 syncFullState 仅做新增和更新，不做删除
 */

function buildSnapshot(tables: any[], columns: any[], relationships: any[], indexes: any[]): SyncFullStateInput {
  return { tables, columns, relationships, indexes }
}

function extractTableIds(doc: Y.Doc): string[] {
  const root = doc.getMap('root')
  const tablesMap = root.get('tables') as Y.Map<Y.Map<any>>
  if (!tablesMap) return []
  const ids: string[] = []
  tablesMap.forEach((_, key) => ids.push(key))
  return ids.sort()
}

function extractColumnIds(doc: Y.Doc): string[] {
  const root = doc.getMap('root')
  const columnsMap = root.get('columns') as Y.Map<Y.Map<any>>
  if (!columnsMap) return []
  const ids: string[] = []
  columnsMap.forEach((_, key) => ids.push(key))
  return ids.sort()
}

function extractRelationshipIds(doc: Y.Doc): string[] {
  const root = doc.getMap('root')
  const relsMap = root.get('relationships') as Y.Map<Y.Map<any>>
  if (!relsMap) return []
  const ids: string[] = []
  relsMap.forEach((_, key) => ids.push(key))
  return ids.sort()
}

function extractIndexIds(doc: Y.Doc): string[] {
  const root = doc.getMap('root')
  const indexesMap = root.get('indexes') as Y.Map<Y.Map<any>>
  if (!indexesMap) return []
  const ids: string[] = []
  indexesMap.forEach((_, key) => ids.push(key))
  return ids.sort()
}

function makeTable(id: string, overrides: Partial<any> = {}) {
  return {
    id, name: `Table_${id}`, comment: '', positionX: 0, positionY: 0,
    projectId: 'proj_1', ...overrides
  }
}

function makeColumn(id: string, tableId: string, overrides: Partial<any> = {}) {
  return {
    id, tableId, name: `Col_${id}`, dataType: 'VARCHAR', length: 255,
    nullable: true, autoIncrement: false, primaryKey: false, unique: false,
    comment: '', order: 0, ...overrides
  }
}

function makeRelationship(id: string, overrides: Partial<any> = {}) {
  return {
    id, projectId: 'proj_1', sourceTableId: 't1', sourceColumnId: 'c1',
    targetTableId: 't2', targetColumnId: 'c2', relationshipType: 'one-to-one',
    onUpdate: 'NO ACTION', onDelete: 'NO ACTION', ...overrides
  }
}

function makeIndex(id: string, tableId: string, overrides: Partial<any> = {}) {
  return {
    id, tableId, name: `Idx_${id}`, columns: ['c1'], unique: false,
    type: 'BTREE', ...overrides
  }
}

describe('syncFullState 竞态条件修复 - 不误删远程新增数据', () => {

  beforeEach(() => {
    // 重置 collabManager 内部的 doc 引用
    const mgr = collabManager as any
    if (mgr.doc) {
      mgr.destroyCRDT()
    }
    mgr.doc = null
    mgr.projectId = null
  })

  // ===== 核心测试：模拟竞态条件场景 =====

  it('TEST-1: 快照不含远程新增的表时，不应删除该表', () => {
    // 模拟：远程客户端新增了表 T3，已经写入 CRDT
    const mgr = collabManager as any
    mgr.doc = new Y.Doc()
    mgr.projectId = 'test_proj'

    // 远程数据已存在于 CRDT 中（T1, T2, T3 都在）
    const remoteSnapshot = buildSnapshot(
      [makeTable('t1'), makeTable('t2'), makeTable('t3')],
      [],
      [],
      []
    )
    collabManager.syncFullState(remoteSnapshot)

    // 验证初始状态：3 张表
    expect(extractTableIds(mgr.doc)).toEqual(['t1', 't2', 't3'])

    // 模拟：appStore 快照中只有 T1, T2（T3 还未同步到 appStore）
    const appStoreSnapshot = buildSnapshot(
      [makeTable('t1'), makeTable('t2')],
      [],
      [],
      []
    )
    collabManager.syncFullState(appStoreSnapshot)

    // 关键断言：T3 不应被删除
    expect(extractTableIds(mgr.doc)).toEqual(['t1', 't2', 't3'])
  })

  it('TEST-2: 快照不含远程新增的列时，不应删除该列', () => {
    const mgr = collabManager as any
    mgr.doc = new Y.Doc()
    mgr.projectId = 'test_proj'

    // 远程已存在 3 列
    const remoteSnapshot = buildSnapshot(
      [makeTable('t1')],
      [makeColumn('c1', 't1'), makeColumn('c2', 't1'), makeColumn('c3', 't1')],
      [],
      []
    )
    collabManager.syncFullState(remoteSnapshot)

    expect(extractColumnIds(mgr.doc)).toEqual(['c1', 'c2', 'c3'])

    // appStore 快照只有 c1, c2
    const appStoreSnapshot = buildSnapshot(
      [makeTable('t1')],
      [makeColumn('c1', 't1'), makeColumn('c2', 't1')],
      [],
      []
    )
    collabManager.syncFullState(appStoreSnapshot)

    // c3 不应被删除
    expect(extractColumnIds(mgr.doc)).toEqual(['c1', 'c2', 'c3'])
  })

  it('TEST-3: 快照不含远程新增的关系时，不应删除该关系', () => {
    const mgr = collabManager as any
    mgr.doc = new Y.Doc()
    mgr.projectId = 'test_proj'

    const remoteSnapshot = buildSnapshot(
      [],
      [],
      [makeRelationship('r1'), makeRelationship('r2'), makeRelationship('r3')],
      []
    )
    collabManager.syncFullState(remoteSnapshot)

    expect(extractRelationshipIds(mgr.doc)).toEqual(['r1', 'r2', 'r3'])

    const appStoreSnapshot = buildSnapshot(
      [],
      [],
      [makeRelationship('r1'), makeRelationship('r2')],
      []
    )
    collabManager.syncFullState(appStoreSnapshot)

    expect(extractRelationshipIds(mgr.doc)).toEqual(['r1', 'r2', 'r3'])
  })

  it('TEST-4: 快照不含远程新增的索引时，不应删除该索引', () => {
    const mgr = collabManager as any
    mgr.doc = new Y.Doc()
    mgr.projectId = 'test_proj'

    const remoteSnapshot = buildSnapshot(
      [makeTable('t1')],
      [],
      [],
      [makeIndex('i1', 't1'), makeIndex('i2', 't1'), makeIndex('i3', 't1')]
    )
    collabManager.syncFullState(remoteSnapshot)

    expect(extractIndexIds(mgr.doc)).toEqual(['i1', 'i2', 'i3'])

    const appStoreSnapshot = buildSnapshot(
      [makeTable('t1')],
      [],
      [],
      [makeIndex('i1', 't1'), makeIndex('i2', 't1')]
    )
    collabManager.syncFullState(appStoreSnapshot)

    expect(extractIndexIds(mgr.doc)).toEqual(['i1', 'i2', 'i3'])
  })

  // ===== 复合场景：同时有多个类型的远程新增数据 =====

  it('TEST-5: 快照不含所有类型的新增条目时，均不应删除', () => {
    const mgr = collabManager as any
    mgr.doc = new Y.Doc()
    mgr.projectId = 'test_proj'

    // 远程已存在完整数据
    const remoteSnapshot = buildSnapshot(
      [makeTable('t1'), makeTable('t2')],
      [makeColumn('c1', 't1'), makeColumn('c2', 't1')],
      [makeRelationship('r1')],
      [makeIndex('i1', 't1')]
    )
    collabManager.syncFullState(remoteSnapshot)

    // 验证初始状态
    expect(extractTableIds(mgr.doc)).toEqual(['t1', 't2'])
    expect(extractColumnIds(mgr.doc)).toEqual(['c1', 'c2'])
    expect(extractRelationshipIds(mgr.doc)).toEqual(['r1'])
    expect(extractIndexIds(mgr.doc)).toEqual(['i1'])

    // appStore 快照缺了 t2, c2, r1, i1
    const appStoreSnapshot = buildSnapshot(
      [makeTable('t1')],
      [makeColumn('c1', 't1')],
      [],
      []
    )
    collabManager.syncFullState(appStoreSnapshot)

    // 所有远程数据都应保留
    expect(extractTableIds(mgr.doc)).toEqual(['t1', 't2'])
    expect(extractColumnIds(mgr.doc)).toEqual(['c1', 'c2'])
    expect(extractRelationshipIds(mgr.doc)).toEqual(['r1'])
    expect(extractIndexIds(mgr.doc)).toEqual(['i1'])
  })

  // ===== 更新场景：已有数据应被更新 =====

  it('TEST-6: syncFullState 应正确更新已存在条目的字段', () => {
    const mgr = collabManager as any
    mgr.doc = new Y.Doc()
    mgr.projectId = 'test_proj'

    // 远程已有 t1，名称为 "Old Name"
    const remoteSnapshot = buildSnapshot(
      [makeTable('t1', { name: 'Old Name' })],
      [],
      [],
      []
    )
    collabManager.syncFullState(remoteSnapshot)

    // 验证原始名称
    const root = mgr.doc.getMap('root')
    const tablesMap = root.get('tables') as Y.Map<Y.Map<any>>
    expect(tablesMap.get('t1')?.get('name')).toBe('Old Name')

    // appStore 快照中 t1 名称已改为 "New Name"
    const appStoreSnapshot = buildSnapshot(
      [makeTable('t1', { name: 'New Name' })],
      [],
      [],
      []
    )
    collabManager.syncFullState(appStoreSnapshot)

    // 名称应更新
    expect(tablesMap.get('t1')?.get('name')).toBe('New Name')
    // 表仍存在
    expect(extractTableIds(mgr.doc)).toEqual(['t1'])
  })

  // ===== 新增场景：空 CRDT 时正常写入 =====

  it('TEST-7: 空 CRDT 时 syncFullState 应正常写入所有数据', () => {
    const mgr = collabManager as any
    mgr.doc = new Y.Doc()
    mgr.projectId = 'test_proj'

    const snapshot = buildSnapshot(
      [makeTable('t1'), makeTable('t2')],
      [makeColumn('c1', 't1')],
      [makeRelationship('r1')],
      [makeIndex('i1', 't1')]
    )
    collabManager.syncFullState(snapshot)

    expect(extractTableIds(mgr.doc)).toEqual(['t1', 't2'])
    expect(extractColumnIds(mgr.doc)).toEqual(['c1'])
    expect(extractRelationshipIds(mgr.doc)).toEqual(['r1'])
    expect(extractIndexIds(mgr.doc)).toEqual(['i1'])
  })

  // ===== 边界场景：重复调用 syncFullState =====

  it('TEST-8: 连续多次 syncFullState 不应导致数据丢失', () => {
    const mgr = collabManager as any
    mgr.doc = new Y.Doc()
    mgr.projectId = 'test_proj'

    // 第一次写入
    collabManager.syncFullState(buildSnapshot(
      [makeTable('t1'), makeTable('t2')],
      [],
      [],
      []
    ))
    expect(extractTableIds(mgr.doc)).toEqual(['t1', 't2'])

    // 第二次写入（只含 t1）
    collabManager.syncFullState(buildSnapshot(
      [makeTable('t1')],
      [],
      [],
      []
    ))
    // t2 不应被删除
    expect(extractTableIds(mgr.doc)).toEqual(['t1', 't2'])

    // 第三次写入（含 t1, t3）
    collabManager.syncFullState(buildSnapshot(
      [makeTable('t1'), makeTable('t3')],
      [],
      [],
      []
    ))
    // t2, t3 都应存在
    expect(extractTableIds(mgr.doc)).toEqual(['t1', 't2', 't3'])
  })
})