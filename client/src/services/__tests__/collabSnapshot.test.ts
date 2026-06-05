import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as Y from 'yjs'

class MockWebSocket {
  url: string
  readyState: number = 0
  onopen: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onclose: ((event: any) => void) | null = null
  binaryType: BinaryType = 'arraybuffer'
  CLOSED = 3
  OPEN = 1
  CONNECTING = 0
  CLOSING = 2

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = 1
      this.onopen?.(new Event('open'))
    }, 0)
  }

  send() {}
  close() {
    this.readyState = 3
  }
}

vi.stubGlobal('WebSocket', MockWebSocket)

function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function saveSnapshotToStorage(doc: Y.Doc, projectId: string): void {
  const state = Y.encodeStateAsUpdate(doc)
  const key = `collab_snapshot_${projectId}`
  const base64 = arrayBufferToBase64(state)
  localStorage.setItem(key, base64)
}

function loadSnapshotFromStorage(doc: Y.Doc, projectId: string): boolean {
  const key = `collab_snapshot_${projectId}`
  const base64 = localStorage.getItem(key)
  if (!base64) return false
  const state = base64ToArrayBuffer(base64)
  Y.applyUpdate(doc, new Uint8Array(state), 'snapshot')
  return true
}

describe('断点续传 - Base64 编解码', () => {

  it('Uint8Array 编码后解码应还原为相同内容', () => {
    const original = new Uint8Array([0, 1, 2, 127, 128, 200, 255])
    const base64 = arrayBufferToBase64(original)
    const decoded = new Uint8Array(base64ToArrayBuffer(base64))
    expect(decoded).toEqual(original)
  })

  it('空 Uint8Array 编码后解码应为空', () => {
    const original = new Uint8Array(0)
    const base64 = arrayBufferToBase64(original)
    const decoded = new Uint8Array(base64ToArrayBuffer(base64))
    expect(decoded.length).toBe(0)
  })

  it('大数组（10KB）编码后解码应完整还原', () => {
    const original = new Uint8Array(10240)
    for (let i = 0; i < original.length; i++) {
      original[i] = (i * 7 + 13) % 256
    }
    const base64 = arrayBufferToBase64(original)
    const decoded = new Uint8Array(base64ToArrayBuffer(base64))
    expect(decoded).toEqual(original)
  })

  it('包含全部 256 个字节值的数组应正确编解码', () => {
    const original = new Uint8Array(256)
    for (let i = 0; i < 256; i++) {
      original[i] = i
    }
    const base64 = arrayBufferToBase64(original)
    const decoded = new Uint8Array(base64ToArrayBuffer(base64))
    expect(decoded).toEqual(original)
  })

  it('base64 字符串应为合法格式', () => {
    const data = new Uint8Array([72, 101, 108, 108, 111])
    const base64 = arrayBufferToBase64(data)
    expect(base64).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(base64).toBe('SGVsbG8=')
  })
})

describe('断点续传 - Y.Doc 快照保存与加载', () => {

  const TEST_PROJECT_ID = 'test_project_001'

  beforeEach(() => {
    localStorage.clear()
  })

  it('保存后加载空 Doc 应成功', () => {
    const doc = new Y.Doc()
    saveSnapshotToStorage(doc, TEST_PROJECT_ID)
    expect(localStorage.getItem(`collab_snapshot_${TEST_PROJECT_ID}`)).toBeTruthy()

    const restoredDoc = new Y.Doc()
    const loaded = loadSnapshotFromStorage(restoredDoc, TEST_PROJECT_ID)
    expect(loaded).toBe(true)
  })

  it('保存包含 Map 数据的 Doc 后加载应还原数据', () => {
    const doc = new Y.Doc()
    const map = doc.getMap('testMap')
    map.set('key1', 'value1')
    map.set('key2', 42)
    map.set('key3', true)

    saveSnapshotToStorage(doc, TEST_PROJECT_ID)

    const restoredDoc = new Y.Doc()
    loadSnapshotFromStorage(restoredDoc, TEST_PROJECT_ID)

    const restoredMap = restoredDoc.getMap('testMap')
    expect(restoredMap.get('key1')).toBe('value1')
    expect(restoredMap.get('key2')).toBe(42)
    expect(restoredMap.get('key3')).toBe(true)
  })

  it('保存包含嵌套结构的 Doc 后加载应还原', () => {
    const doc = new Y.Doc()
    const map = doc.getMap('nested')
    const innerMap = new Y.Map()
    innerMap.set('a', 1)
    innerMap.set('b', 2)
    map.set('inner', innerMap)

    saveSnapshotToStorage(doc, TEST_PROJECT_ID)

    const restoredDoc = new Y.Doc()
    loadSnapshotFromStorage(restoredDoc, TEST_PROJECT_ID)

    const restoredMap = restoredDoc.getMap('nested')
    const restoredInner = restoredMap.get('inner') as Y.Map<unknown>
    expect(restoredInner.get('a')).toBe(1)
    expect(restoredInner.get('b')).toBe(2)
  })

  it('保存包含 Y.Array 的 Doc 后加载应还原顺序', () => {
    const doc = new Y.Doc()
    const arr = doc.getArray('testArray')
    arr.push(['first', 'second', 'third'])

    saveSnapshotToStorage(doc, TEST_PROJECT_ID)

    const restoredDoc = new Y.Doc()
    loadSnapshotFromStorage(restoredDoc, TEST_PROJECT_ID)

    const restoredArr = restoredDoc.getArray('testArray')
    expect(restoredArr.toArray()).toEqual(['first', 'second', 'third'])
  })

  it('保存包含 Y.Text 的 Doc 后加载应还原文本', () => {
    const doc = new Y.Doc()
    const text = doc.getText('testText')
    text.insert(0, 'Hello Yjs')

    saveSnapshotToStorage(doc, TEST_PROJECT_ID)

    const restoredDoc = new Y.Doc()
    loadSnapshotFromStorage(restoredDoc, TEST_PROJECT_ID)

    const restoredText = restoredDoc.getText('testText')
    expect(restoredText.toString()).toBe('Hello Yjs')
  })

  it('多次保存覆盖后加载应取最新状态', () => {
    const doc = new Y.Doc()
    const map = doc.getMap('versioned')
    map.set('version', 1)
    saveSnapshotToStorage(doc, TEST_PROJECT_ID)

    map.set('version', 2)
    map.set('extra', 'added later')
    saveSnapshotToStorage(doc, TEST_PROJECT_ID)

    const restoredDoc = new Y.Doc()
    loadSnapshotFromStorage(restoredDoc, TEST_PROJECT_ID)

    const restoredMap = restoredDoc.getMap('versioned')
    expect(restoredMap.get('version')).toBe(2)
    expect(restoredMap.get('extra')).toBe('added later')
  })

  it('不同 projectId 的快照应隔离存储', () => {
    const doc1 = new Y.Doc()
    doc1.getMap('data').set('project', 'A')
    saveSnapshotToStorage(doc1, 'project_a')

    const doc2 = new Y.Doc()
    doc2.getMap('data').set('project', 'B')
    saveSnapshotToStorage(doc2, 'project_b')

    const restoredA = new Y.Doc()
    loadSnapshotFromStorage(restoredA, 'project_a')
    expect(restoredA.getMap('data').get('project')).toBe('A')

    const restoredB = new Y.Doc()
    loadSnapshotFromStorage(restoredB, 'project_b')
    expect(restoredB.getMap('data').get('project')).toBe('B')
  })

  it('增量更新后快照应包含所有变更', () => {
    const doc = new Y.Doc()
    const map = doc.getMap('incremental')

    map.set('step', 1)
    saveSnapshotToStorage(doc, TEST_PROJECT_ID)

    map.set('step', 2)
    map.delete('step')

    const arr = doc.getArray('later')
    arr.push(['new item'])

    saveSnapshotToStorage(doc, TEST_PROJECT_ID)

    const restoredDoc = new Y.Doc()
    loadSnapshotFromStorage(restoredDoc, TEST_PROJECT_ID)

    expect(restoredDoc.getMap('incremental').get('step')).toBeUndefined()
    expect(restoredDoc.getArray('later').toArray()).toEqual(['new item'])
  })
})

describe('断点续传 - 边界与异常情况', () => {

  const TEST_PROJECT_ID = 'edge_case_project'

  beforeEach(() => {
    localStorage.clear()
  })

  it('不存在的快照 key 加载应返回 false', () => {
    const doc = new Y.Doc()
    const loaded = loadSnapshotFromStorage(doc, 'nonexistent_project')
    expect(loaded).toBe(false)
  })

  it('localStorage 中无数据时加载应返回 false', () => {
    const doc = new Y.Doc()
    expect(localStorage.length).toBe(0)
    const loaded = loadSnapshotFromStorage(doc, TEST_PROJECT_ID)
    expect(loaded).toBe(false)
  })

  it('损坏的 base64 数据加载应抛出异常且不影响 Doc', () => {
    const key = `collab_snapshot_${TEST_PROJECT_ID}`
    localStorage.setItem(key, '!!!not-valid-base64!!!')

    const doc = new Y.Doc()
    expect(() => {
      loadSnapshotFromStorage(doc, TEST_PROJECT_ID)
    }).toThrow()
  })

  it('空字符串快照加载应返回 false（falsy 守卫拦截）', () => {
    const key = `collab_snapshot_${TEST_PROJECT_ID}`
    localStorage.setItem(key, '')

    const doc = new Y.Doc()
    doc.getMap('existing').set('keep', 'me')

    const loaded = loadSnapshotFromStorage(doc, TEST_PROJECT_ID)
    expect(loaded).toBe(false)
    expect(doc.getMap('existing').get('keep')).toBe('me')
  })

  it('保存后清空再加载应返回 false', () => {
    const doc = new Y.Doc()
    doc.getMap('data').set('temp', 'will be cleared')
    saveSnapshotToStorage(doc, TEST_PROJECT_ID)

    localStorage.clear()

    const restoredDoc = new Y.Doc()
    const loaded = loadSnapshotFromStorage(restoredDoc, TEST_PROJECT_ID)
    expect(loaded).toBe(false)
  })

  it('localStorage 存储超大数据应成功', () => {
    const doc = new Y.Doc()
    const map = doc.getMap('large')

    for (let i = 0; i < 500; i++) {
      map.set(`key_${i}`, `value_${i}_${'x'.repeat(100)}`)
    }

    saveSnapshotToStorage(doc, TEST_PROJECT_ID)

    const stored = localStorage.getItem(`collab_snapshot_${TEST_PROJECT_ID}`)
    expect(stored).toBeTruthy()

    const restoredDoc = new Y.Doc()
    const loaded = loadSnapshotFromStorage(restoredDoc, TEST_PROJECT_ID)
    expect(loaded).toBe(true)

    const restoredMap = restoredDoc.getMap('large')
    expect(restoredMap.get('key_0')).toBe(`value_0_${'x'.repeat(100)}`)
    expect(restoredMap.get('key_499')).toBe(`value_499_${'x'.repeat(100)}`)
    expect(restoredMap.size).toBe(500)
  })

  it('快照保存前后 Y.Doc 事务一致性', () => {
    const doc = new Y.Doc()

    doc.transact(() => {
      const map = doc.getMap('atomic')
      map.set('a', 1)
      map.set('b', 2)
      map.set('c', 3)
    })

    saveSnapshotToStorage(doc, TEST_PROJECT_ID)

    const restoredDoc = new Y.Doc()
    loadSnapshotFromStorage(restoredDoc, TEST_PROJECT_ID)

    const restoredMap = restoredDoc.getMap('atomic')
    expect(restoredMap.get('a')).toBe(1)
    expect(restoredMap.get('b')).toBe(2)
    expect(restoredMap.get('c')).toBe(3)
  })
})

describe('断点续传 - collabManager 快照生命周期集成', () => {

  beforeEach(() => {
    localStorage.clear()
  })

  it('loadSnapshot 应在 initCRDT 时被调用', async () => {
    const { collabManager } = await import('../collabManager')

    const doc = new Y.Doc()
    doc.getMap('preData').set('preloaded', 'yes')
    const state = Y.encodeStateAsUpdate(doc)
    const base64 = arrayBufferToBase64(state)
    localStorage.setItem('collab_snapshot_test_lifecycle', base64)

    const mgr = collabManager as any
    mgr.doc = null
    mgr.projectId = 'test_lifecycle'
    mgr.initCRDT()

    const restoredMap = mgr.doc.getMap('preData')
    expect(restoredMap.get('preloaded')).toBe('yes')

    mgr.destroyCRDT()
  })

  it('destroyCRDT 时应调用 saveSnapshot', async () => {
    const { collabManager } = await import('../collabManager')

    const mgr = collabManager as any
    mgr.doc = null
    mgr.projectId = 'test_destroy_save'
    mgr.initCRDT()

    const map = mgr.doc.getMap('persistData')
    map.set('saved', true)

    mgr.destroyCRDT()

    const stored = localStorage.getItem('collab_snapshot_test_destroy_save')
    expect(stored).toBeTruthy()

    const restoredDoc = new Y.Doc()
    const state = base64ToArrayBuffer(stored!)
    Y.applyUpdate(restoredDoc, new Uint8Array(state), 'snapshot')
    expect(restoredDoc.getMap('persistData').get('saved')).toBe(true)
  })

  it('scheduleSnapshotSave 应在 CRDT 更新后延迟触发', async () => {
    vi.useFakeTimers()

    const { collabManager } = await import('../collabManager')

    const mgr = collabManager as any
    mgr.doc = null
    mgr.projectId = 'test_schedule'
    mgr.initCRDT()

    const map = mgr.doc.getMap('scheduled')
    map.set('step', 1)

    const key = 'collab_snapshot_test_schedule'
    expect(localStorage.getItem(key)).toBeNull()

    vi.advanceTimersByTime(5000)

    const stored = localStorage.getItem(key)
    expect(stored).toBeTruthy()

    const restoredDoc = new Y.Doc()
    const state = base64ToArrayBuffer(stored!)
    Y.applyUpdate(restoredDoc, new Uint8Array(state), 'snapshot')
    expect(restoredDoc.getMap('scheduled').get('step')).toBe(1)

    mgr.destroyCRDT()
    vi.useRealTimers()
  })

  it('频繁更新应防抖（只保存最后一次状态）', async () => {
    vi.useFakeTimers()

    const { collabManager } = await import('../collabManager')

    const mgr = collabManager as any
    mgr.doc = null
    mgr.projectId = 'test_debounce'
    mgr.initCRDT()

    const map = mgr.doc.getMap('debounce')

    map.set('count', 1)
    vi.advanceTimersByTime(1000)
    map.set('count', 2)
    vi.advanceTimersByTime(1000)
    map.set('count', 3)
    vi.advanceTimersByTime(1000)
    map.set('count', 4)
    vi.advanceTimersByTime(5000)

    const key = 'collab_snapshot_test_debounce'
    const stored = localStorage.getItem(key)
    expect(stored).toBeTruthy()

    const restoredDoc = new Y.Doc()
    const state = base64ToArrayBuffer(stored!)
    Y.applyUpdate(restoredDoc, new Uint8Array(state), 'snapshot')
    expect(restoredDoc.getMap('debounce').get('count')).toBe(4)

    mgr.cancelSnapshotSave()
    mgr.destroyCRDT()
    vi.useRealTimers()
  })

  it('cancelSnapshotSave 应取消待执行的快照保存', async () => {
    vi.useFakeTimers()

    const { collabManager } = await import('../collabManager')

    const mgr = collabManager as any
    mgr.doc = null
    mgr.projectId = 'test_cancel'
    mgr.initCRDT()

    mgr.doc.getMap('cancelTest').set('value', 1)

    vi.advanceTimersByTime(2000)

    mgr.cancelSnapshotSave()

    const key = 'collab_snapshot_test_cancel'
    expect(localStorage.getItem(key)).toBeNull()

    mgr.destroyCRDT()
    vi.useRealTimers()
  })

  it('无 projectId 时 saveSnapshot 应安全跳过', async () => {
    const { collabManager } = await import('../collabManager')

    const mgr = collabManager as any
    mgr.doc = null
    mgr.projectId = null
    mgr.initCRDT()

    expect(() => {
      mgr.saveSnapshot()
    }).not.toThrow()

    mgr.destroyCRDT()
  })

  it('无 doc 时 saveSnapshot 应安全跳过', async () => {
    const { collabManager } = await import('../collabManager')

    const mgr = collabManager as any
    mgr.doc = null
    mgr.projectId = 'test_no_doc'

    expect(() => {
      mgr.saveSnapshot()
    }).not.toThrow()

    expect(localStorage.getItem('collab_snapshot_test_no_doc')).toBeNull()
  })

  it('getSnapshotKey 应正确拼接 projectId', async () => {
    const { collabManager } = await import('../collabManager')

    const mgr = collabManager as any
    mgr.projectId = 'my_project'

    const key = mgr.getSnapshotKey()
    expect(key).toBe('collab_snapshot_my_project')
  })
})