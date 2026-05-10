import { create } from 'zustand'
import { Project, Table, Column, Relationship, Index, Version, ModelConfig } from '../types'
import { projectApi, tableApi, columnApi, relationshipApi, indexApi, versionApi } from '../services/api'
import { localStorageService, LocalProject, LocalTable, LocalColumn, LocalRelationship, LocalIndex, LocalVersion } from '../services/localStorageService'
import { ThemeMode } from '../theme/types'

interface ShortcutConfig {
  undo: string[]
  redo: string[]
  save: string[]
  newTable: string[]
  resetZoom: string[]
  zoomIn: string[]
  zoomOut: string[]
  settings: string[]
  importExport: string[]
  delete: string[]
  selectAll: string[]
  copy: string[]
  paste: string[]
  find: string[]
  toggleLeftSidebar: string[]
}

interface UpdateLog {
  id: string
  version: string
  date: string
  type: 'security' | 'feature' | 'bugfix' | 'other'
  description: string
  details?: string[]
}

interface FontConfig {
  base: number
  title: number
  subtitle: number
  body: number
  caption: number
  tableHeader: number
  tableContent: number
  toolbar: number
}

interface AppState {
  projects: Project[]
  currentProject: Project | null
  tables: Table[]
  relationships: Relationship[]
  selectedTableId: string | null
  selectedTableIds: string[]
  versions: Version[]
  loading: boolean
  projectLoading: boolean
  projectListLoading: boolean
  past: AppState[]
  future: AppState[]
  isOnline: boolean
  isSyncing: boolean
  lastSaved: number | null
  isLocalMode: boolean
  fontConfig: FontConfig
  themeColor: string
  themeMode: ThemeMode
  compactMode: boolean
  canvasZoom: number
  showMiniMap: boolean
  autoSaveInterval: number
  edgeStyle: 'straight' | 'step' | 'smooth'
  showEdgeLabels: boolean
  tablePrefix: string
  tablePrefixPresets: string[]
  autoAddIdColumn: boolean
  shortcuts: ShortcutConfig
  copiedTable: Table | null
  updateLogs: UpdateLog[]
  modelConfigs: ModelConfig[]
  activeModelId: string | null
  syncQueueCount: number
}

interface AppStore extends AppState {
  loadProjects: () => Promise<void>
  selectProject: (id: string) => Promise<void>
  createProject: (data: Partial<Project>) => Promise<void>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  getSyncQueue: () => Promise<any[]>

  loadTables: (projectId: string) => Promise<void>
  createTable: (projectId: string, data: Partial<Table>, skipAutoIdColumn?: boolean) => Promise<void>
  updateTable: (id: string, data: Partial<Table>) => Promise<void>
  updateTablePosition: (id: string, x: number, y: number) => void
  deleteTable: (id: string) => Promise<void>
  selectTable: (id: string | null) => void
  addSelectedTable: (id: string) => void
  removeSelectedTable: (id: string) => void
  clearSelectedTables: () => void
  selectMultipleTables: (ids: string[]) => void

  loadColumns: (tableId: string) => Promise<void>
  createColumn: (tableId: string, data: Partial<Column>) => Promise<void>
  updateColumn: (id: string, data: Partial<Column>) => Promise<void>
  deleteColumn: (id: string) => Promise<void>
  updateColumnOrder: (tableId: string, columnIds: string[]) => Promise<void>

  loadRelationships: (projectId: string) => Promise<void>
  createRelationship: (projectId: string, data: Partial<Relationship>) => Promise<void>
  updateRelationship: (id: string, data: Partial<Relationship>) => Promise<void>
  deleteRelationship: (id: string) => Promise<void>

  loadIndexes: (tableId: string) => Promise<void>
  createIndex: (tableId: string, data: Partial<Index>) => Promise<void>
  updateIndex: (id: string, data: Partial<Index>) => Promise<void>
  deleteIndex: (id: string) => Promise<void>

  loadVersions: (projectId: string) => Promise<void>
  createVersion: (projectId: string, data: Partial<Version>) => Promise<void>
  updateVersion: (id: string, data: Partial<Version>) => Promise<void>
  deleteVersion: (id: string) => Promise<void>
  restoreVersion: (versionId: string) => Promise<boolean>

  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  pushHistory: () => void

  setOnline: (online: boolean) => void
  setLocalMode: (localMode: boolean) => Promise<void>
  setThemeColor: (color: string) => void
  setThemeMode: (mode: ThemeMode) => void
  setCompactMode: (compact: boolean) => void
  setCanvasZoom: (zoom: number) => void
  setShowMiniMap: (show: boolean) => void
  setAutoSaveInterval: (interval: number) => void
  setEdgeStyle: (style: 'straight' | 'step' | 'smooth') => void
  setShowEdgeLabels: (show: boolean) => void
  setTablePrefix: (prefix: string) => void
  addTablePrefixPreset: (prefix: string) => void
  removeTablePrefixPreset: (prefix: string) => void
  setAutoAddIdColumn: (autoAdd: boolean) => void
  
  setFontConfig: (config: FontConfig) => void
  setFontSize: (key: keyof FontConfig, size: number) => void
  scaleFontSizes: (scale: number) => void
  resetFontConfig: () => void
  loadFontConfig: () => Promise<void>
  
  setShortcuts: (shortcuts: ShortcutConfig) => void
  loadShortcuts: () => Promise<void>
  copyTable: (tableId: string) => void
  pasteTable: () => void
  selectAllTables: () => void
  
  loadSettings: () => Promise<void>
  syncToLocal: () => Promise<void>
  loadFromLocal: (projectId: string) => Promise<void>
  saveToLocal: () => Promise<void>
  syncAllToServer: () => Promise<{ total: number; success: number; failed: number; failedItems: any[] } | undefined>
  addUpdateLog: (log: Omit<UpdateLog, 'id' | 'date'>) => void
  loadUpdateLogs: () => Promise<void>
  
  loadModelConfigs: () => Promise<void>
  addModelConfig: (model: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateModelConfig: (id: string, model: Partial<ModelConfig>) => Promise<void>
  deleteModelConfig: (id: string) => Promise<void>
  setActiveModel: (id: string | null) => void
  
  // 本地和云端项目同步功能
  uploadProjectToCloud: (projectId: string) => Promise<{ success: boolean; message?: string }>
  saveProjectToLocal: (projectId: string) => Promise<{ success: boolean; message?: string }>
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
const startAutoSaveTimer = (store: AppStore) => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  autoSaveTimer = setTimeout(() => {
    store.saveToLocal()
  }, store.autoSaveInterval)
}

export const useAppStore = create<AppStore>((set, get) => ({
  projects: [],
  currentProject: null,
  tables: [],
  relationships: [],
  selectedTableId: null,
  selectedTableIds: [],
  versions: [],
  loading: false,
  projectLoading: false,
  projectListLoading: false,
  past: [],
  future: [],
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSaved: null,
  isLocalMode: false,
  fontConfig: {
    base: 11,
    title: 16,
    subtitle: 13,
    body: 11,
    caption: 10,
    tableHeader: 11,
    tableContent: 10,
    toolbar: 11
  },
  themeColor: '#1890ff',
  themeMode: 'light',
  compactMode: false,
  canvasZoom: 1,
  showMiniMap: true,
  autoSaveInterval: 30000,
  edgeStyle: 'smooth',
  showEdgeLabels: true,
  tablePrefix: '',
  tablePrefixPresets: ['', 'tbl_', 't_', 'sys_', 'app_', 'wp_', 'xmy_'],
  autoAddIdColumn: true,
  shortcuts: {
    undo: ['ctrl', 'z'],
    redo: ['ctrl', 'shift', 'z'],
    save: ['ctrl', 's'],
    newTable: ['ctrl', 'shift', 't'],
    resetZoom: ['ctrl', '0'],
    zoomIn: ['ctrl', '+'],
    zoomOut: ['ctrl', '-'],
    settings: ['ctrl', ','],
    importExport: ['ctrl', 'shift', 'e'],
    delete: ['delete'],
    selectAll: ['ctrl', 'a'],
    copy: ['ctrl', 'c'],
    paste: ['ctrl', 'v'],
    find: ['ctrl', 'f'],
    toggleLeftSidebar: ['alt', 'q']
  },
  copiedTable: null,
  updateLogs: [],
  modelConfigs: [],
  activeModelId: null,
  syncQueueCount: 0,
  setOnline: (online: boolean) => set({ isOnline: online }),
  refreshSyncQueueCount: async () => {
    const queue = await localStorageService.getSyncQueue()
    set({ syncQueueCount: queue.length })
  },
  getSyncQueue: async () => {
    return localStorageService.getSyncQueue()
  },
  setLocalMode: async (localMode: boolean) => {
    set({ isLocalMode: localMode })
    if (localMode) {
      localStorageService.setMeta('localMode', true)
    } else {
      localStorageService.setMeta('localMode', false)
    }
    // 切换模式时刷新项目列表
    await get().loadProjects()
    
    // 如果当前有选中的项目，重新加载项目数据
    const { currentProject } = get()
    if (currentProject) {
      await get().selectProject(currentProject.id)
    }
  },
  setThemeColor: (color: string) => {
    set({ themeColor: color })
    localStorageService.setMeta('themeColor', color)
  },
  setThemeMode: (mode: ThemeMode) => {
    set({ themeMode: mode })
    localStorageService.setMeta('themeMode', mode)
  },
  setCompactMode: (compact: boolean) => {
    set({ compactMode: compact })
    localStorageService.setMeta('compactMode', compact)
  },
  setCanvasZoom: (zoom: number) => {
    set({ canvasZoom: zoom })
    localStorageService.setMeta('canvasZoom', zoom)
  },
  setShowMiniMap: (show: boolean) => {
    set({ showMiniMap: show })
    localStorageService.setMeta('showMiniMap', show)
  },
  setAutoSaveInterval: (interval: number) => {
    set({ autoSaveInterval: interval })
    localStorageService.setMeta('autoSaveInterval', interval)
  },
  setEdgeStyle: (style: 'straight' | 'step' | 'smooth') => {
    set({ edgeStyle: style })
    localStorageService.setMeta('edgeStyle', style)
  },
  setShowEdgeLabels: (show: boolean) => {
    set({ showEdgeLabels: show })
    localStorageService.setMeta('showEdgeLabels', show)
  },
  setTablePrefix: (prefix: string) => {
    set({ tablePrefix: prefix })
    localStorageService.setMeta('tablePrefix', prefix)
  },
  addTablePrefixPreset: (prefix: string) => {
    set((state) => {
      if (prefix.trim() && !state.tablePrefixPresets.includes(prefix.trim())) {
        const newPresets = [...state.tablePrefixPresets, prefix.trim()]
        localStorageService.setMeta('tablePrefixPresets', newPresets)
        return { tablePrefixPresets: newPresets }
      }
      return state
    })
  },
  removeTablePrefixPreset: (prefix: string) => {
    set((state) => {
      const newPresets = state.tablePrefixPresets.filter((p) => p !== prefix)
      localStorageService.setMeta('tablePrefixPresets', newPresets)
      return { tablePrefixPresets: newPresets }
    })
  },
  setAutoAddIdColumn: (autoAdd: boolean) => {
    set({ autoAddIdColumn: autoAdd })
    localStorageService.setMeta('autoAddIdColumn', autoAdd)
  },
  loadSettings: async () => {
    const savedLocalMode = await localStorageService.getMeta<boolean>('localMode')
    if (savedLocalMode !== undefined) {
      set({ isLocalMode: savedLocalMode })
    }

    const savedThemeColor = await localStorageService.getMeta<string>('themeColor')
    if (savedThemeColor !== undefined) {
      set({ themeColor: savedThemeColor })
    }

    const savedThemeMode = await localStorageService.getMeta<ThemeMode>('themeMode')
    if (savedThemeMode !== undefined) {
      set({ themeMode: savedThemeMode })
    }

    const savedCompactMode = await localStorageService.getMeta<boolean>('compactMode')
    if (savedCompactMode !== undefined) {
      set({ compactMode: savedCompactMode })
    }

    const savedCanvasZoom = await localStorageService.getMeta<number>('canvasZoom')
    if (savedCanvasZoom !== undefined) {
      set({ canvasZoom: savedCanvasZoom })
    }

    const savedShowMiniMap = await localStorageService.getMeta<boolean>('showMiniMap')
    if (savedShowMiniMap !== undefined) {
      set({ showMiniMap: savedShowMiniMap })
    }

    const savedAutoSaveInterval = await localStorageService.getMeta<number>('autoSaveInterval')
    if (savedAutoSaveInterval !== undefined) {
      set({ autoSaveInterval: savedAutoSaveInterval })
    }

    const savedEdgeStyle = await localStorageService.getMeta<'straight' | 'step' | 'smooth'>('edgeStyle')
    if (savedEdgeStyle !== undefined) {
      set({ edgeStyle: savedEdgeStyle })
    }

    const savedShowEdgeLabels = await localStorageService.getMeta<boolean>('showEdgeLabels')
    if (savedShowEdgeLabels !== undefined) {
      set({ showEdgeLabels: savedShowEdgeLabels })
    }

    const savedTablePrefix = await localStorageService.getMeta<string>('tablePrefix')
    if (savedTablePrefix !== undefined) {
      set({ tablePrefix: savedTablePrefix })
    }

    const savedTablePrefixPresets = await localStorageService.getMeta<string[]>('tablePrefixPresets')
    if (savedTablePrefixPresets && savedTablePrefixPresets.length > 0) {
      set({ tablePrefixPresets: savedTablePrefixPresets })
    }

    const savedAutoAddIdColumn = await localStorageService.getMeta<boolean>('autoAddIdColumn')
    if (savedAutoAddIdColumn !== undefined) {
      set({ autoAddIdColumn: savedAutoAddIdColumn })
    }
  },

  syncToLocal: async () => {
    const { currentProject, tables, relationships, versions } = get()
    if (!currentProject) return

    set({ isSyncing: true })
    try {
      const localProject: LocalProject = {
        ...currentProject,
        lastModified: Date.now()
      }
      await localStorageService.saveProject(localProject)

      for (const table of tables) {
        const localTable: LocalTable = {
          ...table,
          lastModified: Date.now()
        }
        await localStorageService.saveTable(localTable)

        for (const column of table.columns || []) {
          const localColumn: LocalColumn = {
            ...column,
            lastModified: Date.now()
          }
          await localStorageService.saveColumn(localColumn)
        }

        for (const index of table.indexes || []) {
          const localIndex: LocalIndex = {
            ...index,
            lastModified: Date.now()
          }
          await localStorageService.saveIndex(localIndex)
        }
      }

      for (const relationship of relationships) {
        const localRelationship: LocalRelationship = {
          ...relationship,
          lastModified: Date.now()
        }
        await localStorageService.saveRelationship(localRelationship)
      }

      for (const version of versions) {
        const localVersion: LocalVersion = {
          ...version,
          lastModified: Date.now()
        }
        await localStorageService.saveVersion(localVersion)
      }

      await localStorageService.setMeta('lastSyncTime', Date.now())
      set({ lastSaved: Date.now(), isSyncing: false })
    } catch (error) {
      console.error('Failed to sync to local storage:', error)
      set({ isSyncing: false })
    }
  },

  loadFromLocal: async (projectId: string, setLoading: boolean = false) => {
    if (setLoading) {
      set({ loading: true })
    }
    try {
      const project = await localStorageService.getProject(projectId)
      if (project) {
        const tables = await localStorageService.getTablesByProject(projectId)
        const tablesWithData = await Promise.all(
          tables.map(async (table) => {
            const columns = await localStorageService.getColumnsByTable(table.id)
            const indexes = await localStorageService.getIndexesByTable(table.id)
            return { ...table, columns, indexes } as Table
          })
        )
        const relationships = await localStorageService.getRelationshipsByProject(projectId)
        const versions = await localStorageService.getVersionsByProject(projectId)

        set({
          currentProject: project,
          tables: tablesWithData,
          relationships,
          versions
        })
      }
    } catch (error) {
      console.error('Failed to load from local storage:', error)
    } finally {
      if (setLoading) {
        set({ loading: false })
      }
    }
  },

  saveToLocal: async () => {
    await get().syncToLocal()
    startAutoSaveTimer(get())
  },

  syncAllToServer: async () => {
    const { isOnline } = get()
    if (!isOnline) return

    set({ isSyncing: true })
    try {
      const syncQueue = await localStorageService.getSyncQueue()
      const failedItems = []
      const idMapping = new Map<string, string>() // 本地ID -> 云端ID映射
      let successCount = 0

      for (const item of syncQueue) {
        try {
          let retries = 3
          let lastError = null
          let createdEntityId = null

          while (retries > 0) {
            try {
              // 如果有ID映射，使用云端ID
              const effectiveEntityId = idMapping.get(item.entityId) || item.entityId
              
              switch (item.entity) {
                case 'project':
                  if (item.type === 'create') {
                    const response = await projectApi.create(item.data)
                    if (response.success && response.data) {
                      createdEntityId = response.data.id
                      // 保存ID映射
                      idMapping.set(item.entityId, createdEntityId)
                      // 更新本地项目ID为云端ID
                      const localProject = await localStorageService.getProject(item.entityId)
                      if (localProject) {
                        const updatedProject = { ...localProject, id: createdEntityId, createdBy: undefined }
                        await localStorageService.deleteProject(item.entityId)
                        await localStorageService.saveProject(updatedProject)
                      }
                    }
                  } else if (item.type === 'update') {
                    await projectApi.update(effectiveEntityId, item.data)
                  } else if (item.type === 'delete') {
                    await projectApi.delete(effectiveEntityId)
                  }
                  break
                case 'table':
                  if (item.type === 'create') {
                    // 如果项目ID有映射，使用映射后的ID
                    const projectId = idMapping.get(item.data.projectId) || item.data.projectId
                    const response = await tableApi.create(projectId, item.data)
                    if (response.success && response.data) {
                      createdEntityId = response.data.id
                      idMapping.set(item.entityId, createdEntityId)
                      // 更新本地表ID
                      const localTable = await localStorageService.getTable(item.entityId)
                      if (localTable) {
                        const updatedTable = { ...localTable, id: createdEntityId, projectId }
                        await localStorageService.deleteTable(item.entityId)
                        await localStorageService.saveTable(updatedTable)
                      }
                    }
                  } else if (item.type === 'update') {
                    await tableApi.update(effectiveEntityId, item.data)
                  } else if (item.type === 'delete') {
                    await tableApi.delete(effectiveEntityId)
                  }
                  break
                case 'column':
                  if (item.type === 'create') {
                    const tableId = idMapping.get(item.data.tableId) || item.data.tableId
                    const response = await columnApi.create(tableId, item.data)
                    if (response.success && response.data) {
                      createdEntityId = response.data.id
                      idMapping.set(item.entityId, createdEntityId)
                    }
                  } else if (item.type === 'update') {
                    await columnApi.update(effectiveEntityId, item.data)
                  } else if (item.type === 'delete') {
                    await columnApi.delete(effectiveEntityId)
                  }
                  break
                case 'relationship':
                  if (item.type === 'create') {
                    const projectId = idMapping.get(item.data.projectId) || item.data.projectId
                    const sourceTableId = idMapping.get(item.data.sourceTableId) || item.data.sourceTableId
                    const targetTableId = idMapping.get(item.data.targetTableId) || item.data.targetTableId
                    const dataToCreate = {
                      ...item.data,
                      projectId,
                      sourceTableId,
                      targetTableId,
                      sourceColumnId: idMapping.get(item.data.sourceColumnId) || item.data.sourceColumnId,
                      targetColumnId: idMapping.get(item.data.targetColumnId) || item.data.targetColumnId
                    }
                    const response = await relationshipApi.create(projectId, dataToCreate)
                    if (response.success && response.data) {
                      createdEntityId = response.data.id
                      idMapping.set(item.entityId, createdEntityId)
                    }
                  } else if (item.type === 'update') {
                    await relationshipApi.update(effectiveEntityId, item.data)
                  } else if (item.type === 'delete') {
                    await relationshipApi.delete(effectiveEntityId)
                  }
                  break
                case 'index':
                  if (item.type === 'create') {
                    const tableId = idMapping.get(item.data.tableId) || item.data.tableId
                    const columns = item.data.columns.map((colId: string) => idMapping.get(colId) || colId)
                    const response = await indexApi.create(tableId, { ...item.data, columns })
                    if (response.success && response.data) {
                      createdEntityId = response.data.id
                      idMapping.set(item.entityId, createdEntityId)
                    }
                  } else if (item.type === 'update') {
                    await indexApi.update(effectiveEntityId, item.data)
                  } else if (item.type === 'delete') {
                    await indexApi.delete(effectiveEntityId)
                  }
                  break
                case 'version':
                  if (item.type === 'create') {
                    const projectId = idMapping.get(item.data.projectId) || item.data.projectId
                    const response = await versionApi.create(projectId, item.data)
                    if (response.success && response.data) {
                      createdEntityId = response.data.id
                      idMapping.set(item.entityId, createdEntityId)
                    }
                  } else if (item.type === 'update') {
                    await versionApi.update(effectiveEntityId, item.data)
                  } else if (item.type === 'delete') {
                    await versionApi.delete(effectiveEntityId)
                  }
                  break
              }
              // 成功，移除重试状态
              lastError = null
              break
            } catch (error) {
              lastError = error
              retries--
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)))
              }
            }
          }

          if (lastError) {
            console.error(`Failed to sync item ${item.id} after retries:`, lastError)
            failedItems.push(item)
          } else {
            if (item.id) {
              await localStorageService.removeSyncQueueItem(item.id)
            }
            successCount++
          }
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error)
          failedItems.push(item)
        }
      }

      if (syncQueue.length > 0) {
        await get().loadProjects()
        const { currentProject: newCurrentProject } = get()
        if (newCurrentProject) {
          await get().selectProject(newCurrentProject.id)
        }
      }

      // 返回同步结果
      return {
        total: syncQueue.length,
        success: successCount,
        failed: failedItems.length,
        failedItems
      }
    } catch (error) {
      console.error('Failed to sync to server:', error)
      throw error
    } finally {
      set({ isSyncing: false })
    }
  },

  undo: () => {
    const { past } = get()
    if (past.length <= 1) return

    const previousState = past[past.length - 2]
    const currentState = past[past.length - 1]

    set({
      projects: previousState.projects,
      currentProject: previousState.currentProject,
      tables: previousState.tables,
      relationships: previousState.relationships,
      past: past.slice(0, -1),
      future: [currentState, ...get().future]
    })
    get().saveToLocal()
  },

  redo: () => {
    const { future } = get()
    if (future.length === 0) return

    const nextState = future[0]
    const currentState: AppState = {
      projects: get().projects,
      currentProject: get().currentProject,
      tables: get().tables,
      relationships: get().relationships,
      selectedTableId: get().selectedTableId,
      selectedTableIds: get().selectedTableIds,
      versions: get().versions,
      loading: get().loading,
      past: get().past,
      future: get().future,
      isOnline: get().isOnline,
      isSyncing: get().isSyncing,
      lastSaved: get().lastSaved,
      isLocalMode: get().isLocalMode,
      fontConfig: get().fontConfig,
      themeColor: get().themeColor,
      themeMode: get().themeMode,
      compactMode: get().compactMode,
      canvasZoom: get().canvasZoom,
      showMiniMap: get().showMiniMap,
      autoSaveInterval: get().autoSaveInterval,
      edgeStyle: get().edgeStyle,
      showEdgeLabels: get().showEdgeLabels,
      tablePrefix: get().tablePrefix,
      tablePrefixPresets: get().tablePrefixPresets,
      autoAddIdColumn: get().autoAddIdColumn,
      shortcuts: get().shortcuts,
      copiedTable: get().copiedTable
    }

    set({
      projects: nextState.projects,
      currentProject: nextState.currentProject,
      tables: nextState.tables,
      relationships: nextState.relationships,
      selectedTableId: nextState.selectedTableId,
      selectedTableIds: nextState.selectedTableIds,
      versions: nextState.versions,
      loading: nextState.loading,
      past: [...get().past, currentState],
      future: future.slice(1),
      fontConfig: nextState.fontConfig || get().fontConfig,
      themeColor: nextState.themeColor || get().themeColor,
      themeMode: nextState.themeMode || get().themeMode,
      compactMode: nextState.compactMode || get().compactMode,
      canvasZoom: nextState.canvasZoom || get().canvasZoom,
      showMiniMap: nextState.showMiniMap || get().showMiniMap,
      autoSaveInterval: nextState.autoSaveInterval || get().autoSaveInterval,
      edgeStyle: nextState.edgeStyle || get().edgeStyle,
      showEdgeLabels: nextState.showEdgeLabels || get().showEdgeLabels,
      tablePrefix: nextState.tablePrefix || get().tablePrefix,
      tablePrefixPresets: nextState.tablePrefixPresets || get().tablePrefixPresets,
      autoAddIdColumn: nextState.autoAddIdColumn || get().autoAddIdColumn,
      shortcuts: nextState.shortcuts || get().shortcuts
    })
    get().saveToLocal()
  },

  canUndo: () => get().past.length > 1,

  canRedo: () => get().future.length > 0,

  pushHistory: () => {
    const currentState: AppState = {
      projects: get().projects,
      currentProject: get().currentProject,
      tables: get().tables,
      relationships: get().relationships,
      selectedTableId: get().selectedTableId,
      selectedTableIds: get().selectedTableIds,
      versions: get().versions,
      loading: get().loading,
      projectLoading: get().projectLoading,
      projectListLoading: get().projectListLoading,
      past: get().past,
      future: get().future,
      isOnline: get().isOnline,
      isSyncing: get().isSyncing,
      lastSaved: get().lastSaved,
      isLocalMode: get().isLocalMode,
      fontConfig: get().fontConfig,
      themeColor: get().themeColor,
      themeMode: get().themeMode,
      compactMode: get().compactMode,
      canvasZoom: get().canvasZoom,
      showMiniMap: get().showMiniMap,
      autoSaveInterval: get().autoSaveInterval,
      edgeStyle: get().edgeStyle,
      showEdgeLabels: get().showEdgeLabels,
      tablePrefix: get().tablePrefix,
      tablePrefixPresets: get().tablePrefixPresets,
      autoAddIdColumn: get().autoAddIdColumn,
      shortcuts: get().shortcuts,
      copiedTable: get().copiedTable
    }
    set(state => ({
      past: [...state.past.slice(-19), currentState],
      future: []
    }))
    startAutoSaveTimer(get())
  },

  loadProjects: async () => {
    set({ projectListLoading: true })
    try {
      const { isLocalMode, isOnline } = get()
      
      if (isLocalMode) {
        const localProjects = await localStorageService.getAllProjects()
        set({ projects: localProjects as Project[] })
      } else {
        // 并行加载本地缓存和云端数据
        const loadLocalPromise = localStorageService.getAllProjects()
        let cloudProjects: Project[] | null = null
        
        if (isOnline) {
          try {
            const response = await projectApi.getAll()
            if (response.success && response.data) {
              cloudProjects = response.data
              // 异步更新本地缓存，不阻塞主流程
              Promise.all(cloudProjects.map(p => 
                localStorageService.saveProject(p as LocalProject)
              )).catch(() => {
                // 缓存保存失败不影响主流程
              })
            }
          } catch (error) {
            // 云端加载失败继续使用本地
            console.warn('云端加载失败，使用本地缓存', error)
          }
        }
        
        // 先显示本地数据，提升响应速度
        const localProjects = await loadLocalPromise
        
        // 合并本地和云端项目，保留所有项目
        let mergedProjects: Project[]
        if (cloudProjects) {
          // 使用 Map 去重，保留最新的（云端项目优先）
          const projectMap = new Map<string, Project>()
          
          // 先添加本地项目
          localProjects.forEach(p => projectMap.set(p.id, p))
          
          // 再添加云端项目，覆盖同名的本地项目
          cloudProjects.forEach(p => projectMap.set(p.id, p))
          
          mergedProjects = Array.from(projectMap.values())
        } else {
          // 只有本地项目
          mergedProjects = localProjects as Project[]
        }
        
        set({ projects: mergedProjects })
      }
    } finally {
      set({ projectListLoading: false })
    }
  },

  selectProject: async (id: string) => {
    set({ projectLoading: true })
    try {
      const { isLocalMode, isOnline } = get()
      
      // 首先检查是否是本地项目
      const isLocal = id.startsWith('local_') || (await localStorageService.getProject(id))?.createdBy === 'local'
      
      if (isLocalMode || isLocal) {
        // 本地模式或本地项目，从本地加载
        await get().loadFromLocal(id)
        get().pushHistory()
      } else if (isOnline) {
        const response = await projectApi.getById(id)
        if (response.success && response.data) {
          get().pushHistory()
          set({ currentProject: response.data })
          await localStorageService.saveProject(response.data as LocalProject)
          
          // 在线模式下，直接加载所有表和列
          const tablesResponse = await tableApi.getAll(id)
          if (tablesResponse.success && tablesResponse.data) {
            // 逐个表加载列
            const tablesWithColumns = await Promise.all(
              tablesResponse.data.map(async (table) => {
                const columnsResponse = await columnApi.getAll(table.id)
                const columns = columnsResponse.success && columnsResponse.data ? columnsResponse.data : []
                const indexesResponse = await indexApi.getAll(table.id)
                const indexes = indexesResponse.success && indexesResponse.data ? indexesResponse.data : []
                
                // 保存到本地缓存
                await localStorageService.saveTable(table as LocalTable)
                for (const column of columns) {
                  await localStorageService.saveColumn(column as LocalColumn)
                }
                for (const index of indexes) {
                  await localStorageService.saveIndex(index as LocalIndex)
                }
                
                return { ...table, columns, indexes } as Table
              })
            )
            
            set({ tables: tablesWithColumns })
          }
          
          await get().loadRelationships(id)
          await get().syncToLocal()
        }
      } else {
        // 离线模式，从本地加载
        await get().loadFromLocal(id)
        get().pushHistory()
      }
    } finally {
      set({ projectLoading: false })
    }
  },

  createProject: async (data: Partial<Project>) => {
    set({ loading: true })
    try {
      const { isLocalMode, isOnline } = get()
      
      if (isLocalMode) {
        const localProject: LocalProject = {
          id: data.id || `local_${Date.now()}`,
          name: data.name || '新项目',
          description: data.description,
          databaseType: data.databaseType || 'MySQL',
          status: 'active',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'local',
          lastModified: Date.now()
        }
        await localStorageService.saveProject(localProject)
        set(state => ({ projects: [...state.projects, localProject as Project] }))
      } else if (isOnline) {
        const response = await projectApi.create(data)
        if (response.success && response.data) {
          set(state => ({ projects: [...state.projects, response.data!] }))
          await localStorageService.saveProject(response.data as LocalProject)
        }
      } else {
        const localProject: LocalProject = {
          id: data.id || `local_${Date.now()}`,
          name: data.name || '新项目',
          description: data.description,
          databaseType: data.databaseType || 'MySQL',
          status: 'active',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'local',
          lastModified: Date.now()
        }
        await localStorageService.saveProject(localProject)
        set(state => ({ projects: [...state.projects, localProject as Project] }))
        
        // 只有非本地模式且离线时才添加到同步队列
        if (!isLocalMode) {
          await localStorageService.addToSyncQueue({
            type: 'create',
            entity: 'project',
            entityId: localProject.id,
            data: localProject
          })
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  updateProject: async (id: string, data: Partial<Project>) => {
    set({ loading: true })
    try {
      const { isLocalMode, isOnline } = get()
      const isLocal = id.startsWith('local_') || (await localStorageService.getProject(id))?.createdBy === 'local'
      
      // 对于本地项目，不管在线离线都先保存到本地
      if (isLocal || isLocalMode) {
        const existing = await localStorageService.getProject(id)
        if (existing) {
          const updated = { ...existing, ...data, updatedAt: new Date().toISOString(), lastModified: Date.now() }
          await localStorageService.saveProject(updated)
          set(state => ({
            projects: state.projects.map(p => p.id === id ? updated as Project : p),
            currentProject: state.currentProject?.id === id ? updated as Project : state.currentProject
          }))
          // 如果在线且非本地模式，尝试同步到云端
          if (!isLocalMode && isOnline && !isLocal) {
            try {
              const response = await projectApi.update(id, data)
              if (response.success && response.data) {
                await localStorageService.saveProject(response.data as LocalProject)
                set(state => ({
                  projects: state.projects.map(p => p.id === id ? response.data! : p),
                  currentProject: state.currentProject?.id === id ? response.data! : state.currentProject
                }))
              }
            } catch (e) {
              // 云端同步失败也没关系，本地已经保存了
              console.warn('Failed to sync update to cloud:', e)
            }
          } else if (!isLocalMode && !isOnline && !isLocal) {
            // 非本地模式且离线，添加到同步队列
            await localStorageService.addToSyncQueue({
              type: 'update',
              entity: 'project',
              entityId: id,
              data: updated
            })
          }
        }
      } else if (isOnline) {
        // 云端项目，先更新云端
        const response = await projectApi.update(id, data)
        if (response.success && response.data) {
          set(state => ({
            projects: state.projects.map(p => p.id === id ? response.data! : p),
            currentProject: state.currentProject?.id === id ? response.data! : state.currentProject
          }))
          await localStorageService.saveProject(response.data as LocalProject)
        }
      } else {
        // 离线状态但项目是云端项目，从本地获取
        const existing = await localStorageService.getProject(id)
        if (existing) {
          const updated = { ...existing, ...data, updatedAt: new Date().toISOString(), lastModified: Date.now() }
          await localStorageService.saveProject(updated)
          set(state => ({
            projects: state.projects.map(p => p.id === id ? updated as Project : p),
            currentProject: state.currentProject?.id === id ? updated as Project : state.currentProject
          }))
          
          // 只有非本地模式时才添加到同步队列
          if (!isLocalMode) {
            await localStorageService.addToSyncQueue({
              type: 'update',
              entity: 'project',
              entityId: id,
              data: updated
            })
          }
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  deleteProject: async (id: string) => {
    set({ loading: true })
    try {
      const { isLocalMode, isOnline } = get()
      const isLocalProject = id.startsWith('local_') || (await localStorageService.getProject(id))?.createdBy === 'local'
      
      if (isOnline && !isLocalMode && !isLocalProject) {
        await projectApi.delete(id)
      }
      await localStorageService.deleteProject(id)
      
      // 只有非本地模式时才添加到同步队列
      if (!isLocalMode && !isLocalProject) {
        await localStorageService.addToSyncQueue({
          type: 'delete',
          entity: 'project',
          entityId: id
        })
      }
      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject
      }))
    } finally {
      set({ loading: false })
    }
  },

  loadTables: async (projectId: string) => {
    set({ loading: true })
    try {
      const { isLocalMode, isOnline } = get()
      // 检查是否是本地项目
      const isLocalProject = projectId.startsWith('local_') || (await localStorageService.getProject(projectId))?.createdBy === 'local'
      
      if (isOnline && !isLocalMode && !isLocalProject) {
        const response = await tableApi.getAll(projectId)
        if (response.success && response.data) {
          // 一次性加载所有表和列
          const tablesWithData = await Promise.all(
            response.data.map(async (table) => {
              const columnsResponse = await columnApi.getAll(table.id)
              const columns = columnsResponse.success && columnsResponse.data ? columnsResponse.data : []
              const indexesResponse = await indexApi.getAll(table.id)
              const indexes = indexesResponse.success && indexesResponse.data ? indexesResponse.data : []
              
              // 保存到本地缓存
              await localStorageService.saveTable(table as LocalTable)
              for (const column of columns) {
                await localStorageService.saveColumn(column as LocalColumn)
              }
              for (const index of indexes) {
                await localStorageService.saveIndex(index as LocalIndex)
              }
              
              return { ...table, columns, indexes } as Table
            })
          )
          
          set({ tables: tablesWithData })
        }
      } else {
        const localTables = await localStorageService.getTablesByProject(projectId)
        const tablesWithData = await Promise.all(
          localTables.map(async (table) => {
            const columns = await localStorageService.getColumnsByTable(table.id)
            const indexes = await localStorageService.getIndexesByTable(table.id)
            return { ...table, columns, indexes } as Table
          })
        )
        set({ tables: tablesWithData })
      }
    } finally {
      set({ loading: false })
    }
  },

  createTable: async (projectId: string, data: Partial<Table>, skipAutoIdColumn?: boolean) => {
    set({ loading: true })
    try {
      const store = get()
      const { isLocalMode, isOnline } = store
      
      // 检查是否是本地项目（本地ID或本地创建）
      const isLocal = projectId.startsWith('local_') || (await localStorageService.getProject(projectId))?.createdBy === 'local'
      
      // 创建表
      let newTable: Table
      if (isOnline && !isLocalMode && !isLocal) {
        // 在线且不是本地项目时，使用API创建
        const response = await tableApi.create(projectId, data)
        if (!response.success || !response.data) return
        newTable = { ...response.data!, columns: [], indexes: [] }
      } else {
        // 离线或是本地项目时，本地创建
        newTable = {
          id: `local_table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          projectId,
          name: data.name || '新表',
          comment: data.comment,
          positionX: data.positionX || 0,
          positionY: data.positionY || 0,
          columns: [],
          indexes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastModified: Date.now()
        } as Table
      }

      // 自动创建id列（如果开启该功能且未指定跳过）
      if (store.autoAddIdColumn && !skipAutoIdColumn) {
        const idColumnData = {
          name: 'id',
          dataType: 'BIGINT',
          nullable: false,
          primaryKey: true,
          autoIncrement: true,
          unique: true,
          order: 0
        }
        
        if (isOnline && !isLocalMode && !isLocal) {
          // 在线且不是本地项目时，使用API创建列
          const columnResponse = await columnApi.create(newTable.id, idColumnData)
          if (columnResponse.success && columnResponse.data) {
            newTable.columns = [columnResponse.data]
            await localStorageService.saveColumn(columnResponse.data as LocalColumn)
          }
        } else {
          // 离线或是本地项目时，本地创建列
          const localColumn: LocalColumn = {
            id: `local_col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            tableId: newTable.id,
            ...idColumnData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          newTable.columns = [localColumn]
          await localStorageService.saveColumn(localColumn)
        }
      }

      get().pushHistory()
      set(state => ({ tables: [...state.tables, newTable] }))
      await localStorageService.saveTable(newTable as LocalTable)
      
      // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
      if (!isLocalMode && !isLocal && !isOnline) {
        await localStorageService.addToSyncQueue({
          type: 'create',
          entity: 'table',
          entityId: newTable.id,
          data: newTable
        })
      }
    } finally {
      set({ loading: false })
    }
  },

  updateTable: async (id: string, data: Partial<Table>) => {
    set({ loading: true })
    try {
      const { isLocalMode, isOnline } = get()
      // 先找到表对应的项目
      const table = get().tables.find(t => t.id === id)
      const projectId = table?.projectId
      const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)
      
      if (isOnline && !isLocalMode && !isLocal) {
        const response = await tableApi.update(id, data)
        if (response.success && response.data) {
          set(state => ({
            tables: state.tables.map(t => t.id === id ? response.data! : t)
          }))
          const updated = response.data
          await localStorageService.saveTable(updated as LocalTable)
        }
      } else {
        // 使用本地查找的table作为existing
        let existing = await localStorageService.getTable(id)
        if (!existing && table) {
          existing = table as LocalTable
        }
        if (existing) {
          const updated = { ...existing, ...data, updatedAt: new Date().toISOString(), lastModified: Date.now() }
          await localStorageService.saveTable(updated)
          set(state => ({
            tables: state.tables.map(t => t.id === id ? updated as Table : t)
          }))
          // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
          if (!isLocalMode && !isLocal && !isOnline) {
            await localStorageService.addToSyncQueue({
              type: 'update',
              entity: 'table',
              entityId: id,
              data: updated
            })
          }
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  updateTablePosition: (id: string, positionX: number, positionY: number) => {
    // 同步更新状态，保证拖动流畅
    set(state => {
      const table = state.tables.find(t => t.id === id)
      if (!table) return state
      
      return {
        tables: state.tables.map(t => t.id === id ? { ...t, positionX, positionY } : t)
      }
    })
    
    // 异步处理持久化和API调用，不阻塞UI
    ;(async () => {
      try {
        const currentState = get()
        const { isLocalMode, isOnline } = currentState
        // 从当前最新的state中获取表信息
        const table = currentState.tables.find(t => t.id === id)
        if (!table) return
        
        const projectId = table.projectId
        const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)
        
        if (isOnline && !isLocalMode && !isLocal) {
          await tableApi.updatePosition(id, positionX, positionY)
        }
        const existing = await localStorageService.getTable(id)
        if (existing) {
          const updated = { ...existing, positionX, positionY, lastModified: Date.now() }
          await localStorageService.saveTable(updated)
          // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
          if (!isLocalMode && !isLocal && !isOnline) {
            await localStorageService.addToSyncQueue({
              type: 'update',
              entity: 'table',
              entityId: id,
              data: updated
            })
          }
        }
      } catch (error) {
        console.error('Failed to update table position:', error)
      }
    })()
  },

  deleteTable: async (id: string) => {
    set({ loading: true })
    try {
      const { isLocalMode, isOnline } = get()
      // 先找到表对应的项目
      const table = get().tables.find(t => t.id === id)
      const projectId = table?.projectId
      const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)
      
      if (isOnline && !isLocalMode && !isLocal) {
        await tableApi.delete(id)
      }
      await localStorageService.deleteTable(id)
      
      // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
      if (!isLocalMode && !isLocal && !isOnline) {
        await localStorageService.addToSyncQueue({
          type: 'delete',
          entity: 'table',
          entityId: id
        })
      }
      get().pushHistory()
      set(state => ({
        tables: state.tables.filter(t => t.id !== id),
        selectedTableId: state.selectedTableId === id ? null : state.selectedTableId
      }))
    } finally {
      set({ loading: false })
    }
  },

  selectTable: (id: string | null) => {
    set({ selectedTableId: id })
    if (id) {
      set({ selectedTableIds: [id] })
    } else {
      set({ selectedTableIds: [] })
    }
  },
  addSelectedTable: (id: string) => {
    set((state) => ({
      selectedTableIds: [...state.selectedTableIds, id],
      selectedTableId: id
    }))
  },
  removeSelectedTable: (id: string) => {
    set((state) => ({
      selectedTableIds: state.selectedTableIds.filter((tid) => tid !== id),
      selectedTableId: state.selectedTableIds.filter((tid) => tid !== id)[0] || null
    }))
  },
  clearSelectedTables: () => {
    set({ selectedTableIds: [], selectedTableId: null })
  },
  selectMultipleTables: (ids: string[]) => {
    // 只设置选中状态，不设置 selectedTableId，这样就不会打开编辑栏
    set({ selectedTableIds: ids })
  },

  copyTable: (tableId: string) => {
    const table = get().tables.find((t) => t.id === tableId)
    if (table) {
      set({ copiedTable: table })
    }
  },
  pasteTable: async () => {
    const copied = get().copiedTable
    const project = get().currentProject
    if (!copied || !project) return

    // 创建新表
    const newTableData: Partial<Table> = {
      name: `${copied.name}_副本`,
      comment: copied.comment,
      positionX: (copied.positionX || 0) + 50,
      positionY: (copied.positionY || 0) + 50
    }

    await get().createTable(project.id, newTableData, true)

    // 获取刚创建的表
    const newTable = get().tables.find(t => t.name === newTableData.name)
    if (!newTable) return

    // 复制列
    if (copied.columns && copied.columns.length > 0) {
      for (const column of copied.columns) {
        const newColumn: Partial<Column> = {
          name: column.name,
          dataType: column.dataType,
          length: column.length,
          precision: column.precision,
          scale: column.scale,
          nullable: column.nullable,
          defaultValue: column.defaultValue,
          autoIncrement: column.autoIncrement,
          primaryKey: column.primaryKey,
          unique: column.unique,
          comment: column.comment,
          order: column.order
        }
        await get().createColumn(newTable.id, newColumn)
      }
    }

    // 复制索引
    if (copied.indexes && copied.indexes.length > 0) {
      // 先加载新表的列以获取新的列ID
      await get().loadColumns(newTable.id)
      const updatedTable = get().tables.find(t => t.id === newTable.id)
      
      if (updatedTable && updatedTable.columns) {
        // 创建列名到新ID的映射
        const columnNameToIdMap = new Map<string, string>()
        for (const col of updatedTable.columns) {
          columnNameToIdMap.set(col.name, col.id)
        }

        for (const index of copied.indexes) {
          // 转换索引中的列ID
          const newColumnIds = index.columns
            .map(oldColId => {
              // 查找原表中对应列的名称
              const originalColumn = copied.columns?.find(c => c.id === oldColId)
              if (originalColumn) {
                return columnNameToIdMap.get(originalColumn.name)
              }
              return undefined
            })
            .filter(Boolean) as string[]

          if (newColumnIds.length > 0) {
            const newIndex: Partial<Index> = {
              name: index.name,
              columns: newColumnIds,
              unique: index.unique,
              type: index.type
            }
            await get().createIndex(newTable.id, newIndex)
          }
        }
      }
    }
  },
  selectAllTables: () => {
    const tableIds = get().tables.map((t) => t.id)
    set({ selectedTableIds: tableIds, selectedTableId: null })
  },

  setShortcuts: (shortcuts: ShortcutConfig) => {
    set({ shortcuts })
    localStorageService.setMeta('shortcuts', shortcuts)
  },
  loadShortcuts: async () => {
    const savedShortcuts = await localStorageService.getMeta<ShortcutConfig>('shortcuts')
    if (savedShortcuts) {
      // 合并新的快捷键字段，避免旧数据缺失字段
      set({ 
        shortcuts: {
          undo: ['ctrl', 'z'],
          redo: ['ctrl', 'shift', 'z'],
          save: ['ctrl', 's'],
          newTable: ['ctrl', 'shift', 't'],
          resetZoom: ['ctrl', '0'],
          zoomIn: ['ctrl', '+'],
          zoomOut: ['ctrl', '-'],
          settings: ['ctrl', ','],
          importExport: ['ctrl', 'shift', 'e'],
          delete: ['delete'],
          selectAll: ['ctrl', 'a'],
          copy: ['ctrl', 'c'],
          paste: ['ctrl', 'v'],
          find: ['ctrl', 'f'],
          toggleLeftSidebar: ['alt', 'q'],
          ...savedShortcuts
        }
      })
    }
  },

  setFontConfig: (config: FontConfig) => {
    set({ fontConfig: config })
    localStorageService.setMeta('fontConfig', config)
  },
  setFontSize: (key: keyof FontConfig, size: number) => {
    set(state => ({
      fontConfig: {
        ...state.fontConfig,
        [key]: Math.max(8, Math.min(32, size))
      }
    }))
    localStorageService.setMeta('fontConfig', get().fontConfig)
  },
  scaleFontSizes: (scale: number) => {
    set(state => ({
      fontConfig: {
        base: Math.max(8, Math.min(32, Math.round(state.fontConfig.base * scale))),
        title: Math.max(12, Math.min(48, Math.round(state.fontConfig.title * scale))),
        subtitle: Math.max(10, Math.min(36, Math.round(state.fontConfig.subtitle * scale))),
        body: Math.max(8, Math.min(32, Math.round(state.fontConfig.body * scale))),
        caption: Math.max(8, Math.min(24, Math.round(state.fontConfig.caption * scale))),
        tableHeader: Math.max(8, Math.min(32, Math.round(state.fontConfig.tableHeader * scale))),
        tableContent: Math.max(8, Math.min(32, Math.round(state.fontConfig.tableContent * scale))),
        toolbar: Math.max(10, Math.min(24, Math.round(state.fontConfig.toolbar * scale)))
      }
    }))
    localStorageService.setMeta('fontConfig', get().fontConfig)
  },
  resetFontConfig: () => {
    const defaultConfig: FontConfig = {
      base: 11,
      title: 16,
      subtitle: 13,
      body: 11,
      caption: 10,
      tableHeader: 11,
      tableContent: 10,
      toolbar: 11
    }
    set({ fontConfig: defaultConfig })
    localStorageService.setMeta('fontConfig', defaultConfig)
  },
  loadFontConfig: async () => {
    const savedConfig = await localStorageService.getMeta<FontConfig>('fontConfig')
    if (savedConfig) {
      set({ fontConfig: savedConfig })
    }
  },

  loadColumns: async (tableId: string) => {
    const { isLocalMode, isOnline } = get()
    // 先找到表对应的项目
    const table = get().tables.find(t => t.id === tableId)
    const projectId = table?.projectId
    const isLocalProject = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)
    
    if (isOnline && !isLocalMode && !isLocalProject) {
      const response = await columnApi.getAll(tableId)
      if (response.success && response.data) {
        set(state => ({
          tables: state.tables.map(t => t.id === tableId ? { ...t, columns: response.data! } : t)
        }))
        for (const column of response.data) {
          await localStorageService.saveColumn(column as LocalColumn)
        }
      }
    } else {
      const columns = await localStorageService.getColumnsByTable(tableId)
      set(state => ({
        tables: state.tables.map(t => t.id === tableId ? { ...t, columns } : t)
      }))
    }
  },

  createColumn: async (tableId: string, data: Partial<Column>) => {
    const { isLocalMode, isOnline } = get()
    // 先找到表对应的项目
    const table = get().tables.find(t => t.id === tableId)
    const projectId = table?.projectId
    const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)
    
    if (isOnline && !isLocalMode && !isLocal) {
      const response = await columnApi.create(tableId, data)
      if (response.success && response.data) {
        get().pushHistory()
        set(state => ({
          tables: state.tables.map(t => {
            if (t.id === tableId) {
              return { ...t, columns: [...t.columns, response.data!] }
            }
            return t
          })
        }))
        await localStorageService.saveColumn(response.data as LocalColumn)
      }
    } else {
      const localColumn: LocalColumn = {
        id: `local_col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tableId,
        name: data.name || '新列',
        dataType: data.dataType || 'VARCHAR',
        length: data.length,
        precision: data.precision,
        scale: data.scale,
        nullable: data.nullable !== false,
        defaultValue: data.defaultValue,
        autoIncrement: data.autoIncrement || false,
        primaryKey: data.primaryKey || false,
        unique: data.unique || false,
        comment: data.comment,
        order: data.order || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastModified: Date.now()
      }
      await localStorageService.saveColumn(localColumn)
      get().pushHistory()
      set(state => ({
        tables: state.tables.map(t => {
          if (t.id === tableId) {
            return { ...t, columns: [...t.columns, localColumn] }
          }
          return t
        })
      }))
      // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
      if (!isLocalMode && !isLocal && !isOnline) {
        await localStorageService.addToSyncQueue({
          type: 'create',
          entity: 'column',
          entityId: localColumn.id,
          data: localColumn
        })
      }
    }
  },

  updateColumn: async (id: string, data: Partial<Column>) => {
    const { isLocalMode, isOnline } = get()
    // 先找到列对应的项目
    const columns = get().tables.flatMap(t => t.columns)
    const existing = columns.find(c => c.id === id)
    const table = existing ? get().tables.find(t => t.id === existing.tableId) : undefined
    const projectId = table?.projectId
    const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)
    
    if (isOnline && !isLocalMode && !isLocal) {
      const response = await columnApi.update(id, data)
      if (response.success && response.data) {
        const updatedColumn = response.data
        set(state => ({
          tables: state.tables.map(t => {
            if (t.id === updatedColumn.tableId) {
              return {
                ...t,
                columns: t.columns.map(c => c.id === id ? updatedColumn : c)
              }
            }
            return t
          })
        }))
        await localStorageService.saveColumn(updatedColumn as LocalColumn)
      }
    } else {
      if (existing) {
        const updated = { ...existing, ...data, updatedAt: new Date().toISOString(), lastModified: Date.now() }
        await localStorageService.saveColumn(updated as LocalColumn)
        set(state => ({
          tables: state.tables.map(t => {
            if (t.id === existing.tableId) {
              return {
                ...t,
                columns: t.columns.map(c => c.id === id ? updated : c)
              }
            }
            return t
          })
        }))
        // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
        if (!isLocalMode && !isLocal && !isOnline) {
          await localStorageService.addToSyncQueue({
            type: 'update',
            entity: 'column',
            entityId: id,
            data: updated
          })
        }
      }
    }
  },

  deleteColumn: async (id: string) => {
    const { isLocalMode, isOnline } = get()
    // 先找到列对应的项目
    const columns = get().tables.flatMap(t => t.columns)
    const existing = columns.find(c => c.id === id)
    const table = existing ? get().tables.find(t => t.id === existing.tableId) : undefined
    const projectId = table?.projectId
    const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)
    
    if (isOnline && !isLocalMode && !isLocal) {
      const response = await columnApi.delete(id)
      if (response.success) {
        get().pushHistory()
        set(state => ({
          tables: state.tables.map(t => ({
            ...t,
            columns: t.columns.filter(c => c.id !== id)
          }))
        }))
        await localStorageService.deleteColumn(id)
      }
    } else {
      if (existing) {
        await localStorageService.deleteColumn(id)
        get().pushHistory()
        set(state => ({
          tables: state.tables.map(t => ({
            ...t,
            columns: t.columns.filter(c => c.id !== id)
          }))
        }))
        // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
        if (!isLocalMode && !isLocal && !isOnline) {
          await localStorageService.addToSyncQueue({
            type: 'delete',
            entity: 'column',
            entityId: id
          })
        }
      }
    }
  },

  updateColumnOrder: async (tableId: string, columnIds: string[]) => {
    const { isLocalMode, isOnline } = get()
    const table = get().tables.find(t => t.id === tableId)
    if (!table) return

    // 先找到表对应的项目，检查是否是本地项目
    const projectId = table.projectId
    const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)

    const reorderedColumns = columnIds.map((id, index) => {
      const column = table.columns.find(c => c.id === id)
      if (column) {
        return { ...column, order: index }
      }
      return null
    }).filter(Boolean) as Column[]

    get().pushHistory()
    set(state => ({
      tables: state.tables.map(t =>
        t.id === tableId ? { ...t, columns: reorderedColumns } : t
      )
    }))

    if (isOnline && !isLocalMode && !isLocal) {
      for (let i = 0; i < columnIds.length; i++) {
        const column = reorderedColumns[i]
        if (column) {
          await columnApi.update(column.id, { order: i })
        }
      }
    }

    for (const column of reorderedColumns) {
      await localStorageService.saveColumn(column)
    }
  },

  loadRelationships: async (projectId: string) => {
    const { isLocalMode, isOnline } = get()
    // 检查是否是本地项目
    const isLocalProject = projectId.startsWith('local_') || (await localStorageService.getProject(projectId))?.createdBy === 'local'
    
    if (isOnline && !isLocalMode && !isLocalProject) {
      const response = await relationshipApi.getAll(projectId)
      if (response.success && response.data) {
        set({ relationships: response.data })
        for (const relationship of response.data) {
          await localStorageService.saveRelationship(relationship as LocalRelationship)
        }
      }
    } else {
      const relationships = await localStorageService.getRelationshipsByProject(projectId)
      set({ relationships })
    }
  },

  createRelationship: async (projectId: string, data: Partial<Relationship>) => {
    const { isLocalMode, isOnline } = get()
    set({ loading: true })
    try {
      // 检查是否是本地项目
      const isLocal = projectId.startsWith('local_') || (await localStorageService.getProject(projectId))?.createdBy === 'local'
      
      if (isOnline && !isLocalMode && !isLocal) {
        const response = await relationshipApi.create(projectId, data)
        if (response.success && response.data) {
          get().pushHistory()
          set(state => ({ relationships: [...state.relationships, response.data!] }))
          await localStorageService.saveRelationship(response.data as LocalRelationship)
        }
      } else {
        const localRelationship: LocalRelationship = {
          id: `local_rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          projectId,
          sourceTableId: data.sourceTableId || '',
          sourceColumnId: data.sourceColumnId || '',
          targetTableId: data.targetTableId || '',
          targetColumnId: data.targetColumnId || '',
          relationshipType: data.relationshipType || 'one-to-one',
          onUpdate: data.onUpdate || 'NO ACTION',
          onDelete: data.onDelete || 'NO ACTION',
          createdAt: new Date().toISOString(),
          lastModified: Date.now()
        }
        await localStorageService.saveRelationship(localRelationship)
        get().pushHistory()
        set(state => ({ relationships: [...state.relationships, localRelationship] }))
        // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
        if (!isLocalMode && !isLocal && !isOnline) {
          await localStorageService.addToSyncQueue({
            type: 'create',
            entity: 'relationship',
            entityId: localRelationship.id,
            data: localRelationship
          })
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  updateRelationship: async (id: string, data: Partial<Relationship>) => {
    const { isLocalMode, isOnline } = get()
    set({ loading: true })
    try {
      // 先找到关系对应的项目，检查是否是本地项目
      const existing = await localStorageService.getRelationship(id)
      const projectId = existing?.projectId
      const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)

      if (isOnline && !isLocalMode && !isLocal) {
        const response = await relationshipApi.update(id, data)
        if (response.success && response.data) {
          set(state => ({
            relationships: state.relationships.map(r => r.id === id ? response.data! : r)
          }))
          await localStorageService.saveRelationship(response.data as LocalRelationship)
        }
      } else {
        const existing = await localStorageService.getRelationship(id)
        if (existing) {
          const updated = { ...existing, ...data, lastModified: Date.now() }
          await localStorageService.saveRelationship(updated)
          set(state => ({
            relationships: state.relationships.map(r => r.id === id ? updated : r)
          }))
          // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
          if (!isLocalMode && !isLocal && !isOnline) {
            await localStorageService.addToSyncQueue({
              type: 'update',
              entity: 'relationship',
              entityId: id,
              data: updated
            })
          }
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  deleteRelationship: async (id: string) => {
    const { isLocalMode, isOnline } = get()
    set({ loading: true })
    try {
      // 先找到关系对应的项目，检查是否是本地项目
      const existing = await localStorageService.getRelationship(id)
      const projectId = existing?.projectId
      const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)

      if (isOnline && !isLocalMode && !isLocal) {
        await relationshipApi.delete(id)
      }
      await localStorageService.deleteRelationship(id)
      // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
      if (!isLocalMode && !isLocal && !isOnline) {
        await localStorageService.addToSyncQueue({
          type: 'delete',
          entity: 'relationship',
          entityId: id
        })
      }
      get().pushHistory()
      set(state => ({
        relationships: state.relationships.filter(r => r.id !== id)
      }))
    } finally {
      set({ loading: false })
    }
  },

  loadIndexes: async (tableId: string) => {
    const { isLocalMode, isOnline } = get()
    // 先找到表对应的项目
    const table = get().tables.find(t => t.id === tableId)
    const projectId = table?.projectId
    const isLocalProject = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)
    
    if (isOnline && !isLocalMode && !isLocalProject) {
      const response = await indexApi.getAll(tableId)
      if (response.success && response.data) {
        set(state => ({
          tables: state.tables.map(t => t.id === tableId ? { ...t, indexes: response.data! } : t)
        }))
        for (const index of response.data) {
          await localStorageService.saveIndex(index as LocalIndex)
        }
      }
    } else {
      const indexes = await localStorageService.getIndexesByTable(tableId)
      set(state => ({
        tables: state.tables.map(t => t.id === tableId ? { ...t, indexes } : t)
      }))
    }
  },

  createIndex: async (tableId: string, data: Partial<Index>) => {
    const { isLocalMode, isOnline } = get()
    set({ loading: true })
    try {
      // 先找到表对应的项目
      const table = get().tables.find(t => t.id === tableId)
      const projectId = table?.projectId
      const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)
      
      if (isOnline && !isLocalMode && !isLocal) {
        const response = await indexApi.create(tableId, data)
        if (response.success && response.data) {
          set(state => ({
            tables: state.tables.map(t => t.id === tableId ? { ...t, indexes: [...(t.indexes || []), response.data!] } : t)
          }))
          await localStorageService.saveIndex(response.data as LocalIndex)
        }
      } else {
        const localIndex: LocalIndex = {
          id: `local_idx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tableId,
          name: data.name || '新索引',
          columns: data.columns || [],
          unique: data.unique || false,
          type: data.type || 'BTREE',
          lastModified: Date.now()
        }
        await localStorageService.saveIndex(localIndex)
        set(state => ({
          tables: state.tables.map(t => t.id === tableId ? { ...t, indexes: [...(t.indexes || []), localIndex] } : t)
        }))
        // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
        if (!isLocalMode && !isLocal && !isOnline) {
          await localStorageService.addToSyncQueue({
            type: 'create',
            entity: 'index',
            entityId: localIndex.id,
            data: localIndex
          })
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  updateIndex: async (id: string, data: Partial<Index>) => {
    const { isLocalMode, isOnline } = get()
    set({ loading: true })
    try {
      // 先找到索引对应的项目，检查是否是本地项目
      const targetTable = get().tables.find(t => t.indexes?.some(i => i.id === id))
      const projectId = targetTable?.projectId
      const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)

      if (isOnline && !isLocalMode && !isLocal) {
        const response = await indexApi.update(id, data)
        if (response.success && response.data) {
          const updatedIndex = response.data
          set(state => ({
            tables: state.tables.map(t => ({
              ...t,
              indexes: t.indexes?.map(i => i.id === id ? updatedIndex : i) || []
            }))
          }))
          await localStorageService.saveIndex(updatedIndex as LocalIndex)
        }
      } else {
        const tables = get().tables
        const targetTable = tables.find(t => t.indexes?.some(i => i.id === id))
        if (targetTable) {
          const existing = targetTable.indexes?.find(i => i.id === id)
          if (existing) {
            const updated = { ...existing, ...data, lastModified: Date.now() }
            await localStorageService.saveIndex(updated as LocalIndex)
            set(state => ({
              tables: state.tables.map(t => ({
                ...t,
                indexes: t.indexes?.map(i => i.id === id ? updated : i) || []
              }))
            }))
            // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
            if (!isLocalMode && !isLocal && !isOnline) {
              await localStorageService.addToSyncQueue({
                type: 'update',
                entity: 'index',
                entityId: id,
                data: updated
              })
            }
          }
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  deleteIndex: async (id: string) => {
    const { isLocalMode, isOnline } = get()
    set({ loading: true })
    try {
      const targetTable = get().tables.find(t => t.indexes?.some(i => i.id === id))
      // 先找到索引对应的项目，检查是否是本地项目
      const projectId = targetTable?.projectId
      const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)

      if (isOnline && !isLocalMode && !isLocal) {
        await indexApi.delete(id)
      }
      if (targetTable) {
        await localStorageService.deleteIndex(id)
        set(state => ({
          tables: state.tables.map(t => t.id === targetTable.id ? {
            ...t,
            indexes: t.indexes?.filter(i => i.id !== id) || []
          } : t)
        }))
        // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
        if (!isLocalMode && !isLocal && !isOnline) {
          await localStorageService.addToSyncQueue({
            type: 'delete',
            entity: 'index',
            entityId: id
          })
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  loadVersions: async (projectId: string) => {
    const { isLocalMode, isOnline } = get()
    // 检查是否是本地项目
    const isLocalProject = projectId.startsWith('local_') || (await localStorageService.getProject(projectId))?.createdBy === 'local'
    
    if (isOnline && !isLocalMode && !isLocalProject) {
      const response = await versionApi.getAll(projectId)
      if (response.success && response.data) {
        set({ versions: response.data })
        for (const version of response.data) {
          await localStorageService.saveVersion(version as LocalVersion)
        }
      }
    } else {
      const versions = await localStorageService.getVersionsByProject(projectId)
      set({ versions })
    }
  },

  createVersion: async (projectId: string, data: Partial<Version>) => {
    const { isLocalMode, isOnline } = get()
    set({ loading: true })
    try {
      // 检查是否是本地项目
      const isLocal = projectId.startsWith('local_') || (await localStorageService.getProject(projectId))?.createdBy === 'local'
      
      if (isOnline && !isLocalMode && !isLocal) {
        const response = await versionApi.create(projectId, data)
        if (response.success && response.data) {
          set(state => ({ versions: [...state.versions, response.data!] }))
          await localStorageService.saveVersion(response.data as LocalVersion)
        }
      } else {
        const localVersion: LocalVersion = {
          id: `local_${Date.now()}`,
          projectId,
          version: data.version || 1,
          name: data.name || '版本',
          comment: data.comment,
          data: data.data || '{}',
          createdAt: new Date().toISOString(),
          lastModified: Date.now()
        }
        await localStorageService.saveVersion(localVersion)
        set(state => ({ versions: [...state.versions, localVersion] }))
        // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
        if (!isLocalMode && !isLocal && !isOnline) {
          await localStorageService.addToSyncQueue({
            type: 'create',
            entity: 'version',
            entityId: localVersion.id,
            data: localVersion
          })
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  updateVersion: async (id: string, data: Partial<Version>) => {
    const { isLocalMode, isOnline } = get()
    set({ loading: true })
    try {
      // 先找到版本对应的项目，检查是否是本地项目
      const existing = await localStorageService.getVersion(id)
      const projectId = existing?.projectId
      const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)

      if (isOnline && !isLocalMode && !isLocal) {
        const response = await versionApi.update(id, data)
        if (response.success && response.data) {
          set(state => ({
            versions: state.versions.map(v => v.id === id ? response.data! : v)
          }))
          await localStorageService.saveVersion(response.data as LocalVersion)
        }
      } else {
        const versions = get().versions
        const existing = versions.find(v => v.id === id)
        if (existing) {
          const updated = { ...existing, ...data, lastModified: Date.now() }
          await localStorageService.saveVersion(updated)
          set(state => ({
            versions: state.versions.map(v => v.id === id ? updated : v)
          }))
          // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
          if (!isLocalMode && !isLocal && !isOnline) {
            await localStorageService.addToSyncQueue({
              type: 'update',
              entity: 'version',
              entityId: id,
              data: updated
            })
          }
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  deleteVersion: async (id: string) => {
    const { isLocalMode, isOnline } = get()
    set({ loading: true })
    try {
      // 先找到版本对应的项目，检查是否是本地项目
      const existing = await localStorageService.getVersion(id)
      const projectId = existing?.projectId
      const isLocal = projectId?.startsWith('local_') || (projectId ? (await localStorageService.getProject(projectId))?.createdBy === 'local' : false)

      if (isOnline && !isLocalMode && !isLocal) {
        await versionApi.delete(id)
      }
      await localStorageService.deleteVersion(id)
      // 只有非本地模式且不是本地项目但离线了，才添加到同步队列
      if (!isLocalMode && !isLocal && !isOnline) {
        await localStorageService.addToSyncQueue({
          type: 'delete',
          entity: 'version',
          entityId: id
        })
      }
      set(state => ({
        versions: state.versions.filter(v => v.id !== id)
      }))
    } finally {
      set({ loading: false })
    }
  },

  restoreVersion: async (versionId: string) => {
    set({ loading: true })
    try {
      const version = get().versions.find(v => v.id === versionId)
      if (!version) {
        throw new Error('版本不存在')
      }

      let snapshot: any
      try {
        snapshot = JSON.parse(version.data)
      } catch (parseError) {
        console.error('JSON 解析失败:', version.data)
        throw new Error('版本数据格式不正确，请检查是否是有效的 JSON')
      }

      // 支持两种数据格式：旧格式（只有 project）和新格式（有 tables 和 relationships）
      let projectId: string
      let tablesToRestore: any[] = []
      let relationshipsToRestore: any[] = []

      if (snapshot.id && snapshot.tables) {
        // 新格式
        projectId = snapshot.id
        tablesToRestore = snapshot.tables || []
        relationshipsToRestore = snapshot.relationships || []
      } else if (snapshot.project) {
        // 旧格式
        projectId = snapshot.project.id
        tablesToRestore = []
        relationshipsToRestore = []
      } else {
        throw new Error('无效的版本数据格式')
      }

      if (!projectId) {
        throw new Error('无法从版本中获取项目 ID')
      }

      // 清空现有数据
      try {
        await tableApi.deleteAll(projectId)
      } catch (e) {
        console.warn('删除表失败，可能 API 不存在:', e)
        // 如果批量删除 API 不存在，尝试逐个删除
        const existingTables = get().tables.filter(t => t.projectId === projectId)
        for (const table of existingTables) {
          try {
            await tableApi.delete(table.id)
          } catch (de) {
            console.warn(`删除表 ${table.name} 失败:`, de)
          }
        }
      }

      try {
        await relationshipApi.deleteAll(projectId)
      } catch (e) {
        console.warn('删除关系失败，可能 API 不存在:', e)
        // 如果批量删除 API 不存在，尝试逐个删除
        const existingRelationships = get().relationships.filter(r => r.projectId === projectId)
        for (const rel of existingRelationships) {
          try {
            await relationshipApi.delete(rel.id)
          } catch (de) {
            console.warn(`删除关系失败:`, de)
          }
        }
      }

      // 创建表
      for (const table of tablesToRestore) {
        const tableResponse = await tableApi.create(projectId, {
          name: table.name,
          comment: table.comment,
          positionX: table.positionX,
          positionY: table.positionY
        })

        if (tableResponse.success && tableResponse.data) {
          const newTableId = tableResponse.data.id
          
          if (table.columns && Array.isArray(table.columns)) {
            for (let i = 0; i < table.columns.length; i++) {
              const col = table.columns[i]
              try {
                await columnApi.create(newTableId, {
                  name: col.name,
                  dataType: col.dataType,
                  length: col.length,
                  precision: col.precision,
                  scale: col.scale,
                  nullable: col.nullable,
                  primaryKey: col.primaryKey,
                  unique: col.unique,
                  autoIncrement: col.autoIncrement,
                  defaultValue: col.defaultValue,
                  comment: col.comment,
                  order: i
                })
              } catch (ce) {
                console.warn(`创建列 ${col.name} 失败:`, ce)
              }
            }
          }

          if (table.indexes && Array.isArray(table.indexes)) {
            for (const idx of table.indexes) {
              try {
                await indexApi.create(newTableId, {
                  tableId: newTableId,
                  name: idx.name,
                  columns: idx.columns,
                  unique: idx.unique,
                  type: idx.type
                })
              } catch (ie) {
                console.warn(`创建索引 ${idx.name} 失败:`, ie)
              }
            }
          }
        }
      }

      // 创建关系
      for (const rel of relationshipsToRestore) {
        try {
          await relationshipApi.create(projectId, {
            sourceTableId: rel.sourceTableId,
            sourceColumnId: rel.sourceColumnId,
            targetTableId: rel.targetTableId,
            targetColumnId: rel.targetColumnId,
            relationshipType: rel.relationshipType,
            onUpdate: rel.onUpdate,
            onDelete: rel.onDelete
          })
        } catch (re) {
          console.warn('创建关系失败:', re)
        }
      }

      // 重新加载
      await get().loadTables(projectId)
      await get().loadRelationships(projectId)

      return true
    } catch (error) {
      console.error('版本回滚失败:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  addUpdateLog: (log: Omit<UpdateLog, 'id' | 'date'>) => {
    const newLog: UpdateLog = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...log
    }
    set(state => ({
      updateLogs: [newLog, ...state.updateLogs]
    }))
    const logs = [...get().updateLogs]
    localStorageService.setMeta('updateLogs', logs)
  },

  loadUpdateLogs: async () => {
    const savedLogs = await localStorageService.getMeta<UpdateLog[]>('updateLogs')
    if (savedLogs && savedLogs.length > 0) {
      set({ updateLogs: savedLogs })
    }
  },

  loadModelConfigs: async () => {
    const savedModels = await localStorageService.getMeta<ModelConfig[]>('modelConfigs')
    const savedActiveModelId = await localStorageService.getMeta<string | null>('activeModelId')
    if (savedModels) {
      set({ modelConfigs: savedModels })
    }
    if (savedActiveModelId !== undefined) {
      set({ activeModelId: savedActiveModelId })
    }
  },

  addModelConfig: async (model: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newModel: ModelConfig = {
      id: `model_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...model
    }
    
    // 如果是第一个模型，设为默认
    const currentModels = get().modelConfigs
    if (currentModels.length === 0) {
      newModel.isDefault = true
    }
    
    // 如果设为默认，取消其他模型的默认
    if (newModel.isDefault) {
      const updatedModels = currentModels.map(m => ({ ...m, isDefault: false }))
      set({ modelConfigs: [...updatedModels, newModel] })
    } else {
      set(state => ({ modelConfigs: [...state.modelConfigs, newModel] }))
    }
    
    await localStorageService.setMeta('modelConfigs', get().modelConfigs)
    message.success('模型配置添加成功')
  },

  updateModelConfig: async (id: string, model: Partial<ModelConfig>) => {
    const models = get().modelConfigs
    let updatedModels = models.map(m => m.id === id ? { ...m, ...model, updatedAt: new Date().toISOString() } : m)
    
    // 如果设为默认，取消其他模型的默认
    if (model.isDefault) {
      updatedModels = updatedModels.map(m => m.id === id ? { ...m, isDefault: true } : { ...m, isDefault: false })
    }
    
    set({ modelConfigs: updatedModels })
    await localStorageService.setMeta('modelConfigs', updatedModels)
    message.success('模型配置更新成功')
  },

  deleteModelConfig: async (id: string) => {
    const models = get().modelConfigs.filter(m => m.id !== id)
    let newActiveModelId = get().activeModelId
    
    // 如果删除的是当前活跃的模型，尝试使用默认模型
    if (id === newActiveModelId) {
      const defaultModel = models.find(m => m.isDefault)
      newActiveModelId = defaultModel?.id || null
    }
    
    set({ modelConfigs: models, activeModelId: newActiveModelId })
    await localStorageService.setMeta('modelConfigs', models)
    await localStorageService.setMeta('activeModelId', newActiveModelId)
    message.success('模型配置删除成功')
  },

  setActiveModel: async (id: string | null) => {
    set({ activeModelId: id })
    await localStorageService.setMeta('activeModelId', id)
  },

  // 上传本地项目到云端（保持本地项目，在云端创建副本）
  uploadProjectToCloud: async (projectId: string) => {
    if (!get().isOnline) {
      return { success: false, message: '当前网络离线，无法上传到云端' }
    }

    set({ isSyncing: true })
    try {
      // 从本地加载项目数据
      const localProject = await localStorageService.getProject(projectId)
      if (!localProject) {
        return { success: false, message: '找不到本地项目' }
      }

      const localTables = await localStorageService.getTablesByProject(projectId)
      const localRelationships = await localStorageService.getRelationshipsByProject(projectId)
      const localVersions = await localStorageService.getVersionsByProject(projectId)

      // 创建云端项目（始终创建新的）
      const projectData = {
        name: localProject.name,
        description: localProject.description,
        databaseType: localProject.databaseType,
        status: localProject.status
      }
      const response = await projectApi.create(projectData)
      if (!response.success || !response.data) {
        return { success: false, message: '创建云端项目失败' }
      }
      const cloudProject = response.data
      const cloudProjectId = cloudProject.id
      const tableIdMap = new Map<string, string>() // 本地表ID -> 云端表ID映射
      const columnIdMap = new Map<string, string>() // 本列ID -> 云端列ID映射

      // 上传表、列、索引
      for (const localTable of localTables) {
        // 创建表
        const tableResponse = await tableApi.create(cloudProjectId, {
          name: localTable.name,
          comment: localTable.comment,
          positionX: localTable.positionX,
          positionY: localTable.positionY
        })
        if (!tableResponse.success || !tableResponse.data) continue

        const newTableId = tableResponse.data.id
        tableIdMap.set(localTable.id, newTableId)
        
        const localColumns = await localStorageService.getColumnsByTable(localTable.id)
        const localIndexes = await localStorageService.getIndexesByTable(localTable.id)

        // 创建列
        for (const col of localColumns) {
          const columnResponse = await columnApi.create(newTableId, {
            name: col.name,
            dataType: col.dataType,
            length: col.length,
            precision: col.precision,
            scale: col.scale,
            nullable: col.nullable,
            primaryKey: col.primaryKey,
            unique: col.unique,
            autoIncrement: col.autoIncrement,
            defaultValue: col.defaultValue,
            comment: col.comment,
            order: col.order
          })
          if (columnResponse.success && columnResponse.data) {
            columnIdMap.set(col.id, columnResponse.data.id)
          }
        }

        // 创建索引
        for (const idx of localIndexes) {
          // 映射索引中的列ID
          const mappedColumns = idx.columns.map(colId => columnIdMap.get(colId) || colId)
          await indexApi.create(newTableId, {
            name: idx.name,
            columns: mappedColumns,
            unique: idx.unique,
            type: idx.type
          })
        }
      }

      // 上传关系，映射表ID和列ID
      for (const rel of localRelationships) {
        const mappedSourceTableId = tableIdMap.get(rel.sourceTableId) || rel.sourceTableId
        const mappedSourceColumnId = columnIdMap.get(rel.sourceColumnId) || rel.sourceColumnId
        const mappedTargetTableId = tableIdMap.get(rel.targetTableId) || rel.targetTableId
        const mappedTargetColumnId = columnIdMap.get(rel.targetColumnId) || rel.targetColumnId
        
        await relationshipApi.create(cloudProjectId, {
          sourceTableId: mappedSourceTableId,
          sourceColumnId: mappedSourceColumnId,
          targetTableId: mappedTargetTableId,
          targetColumnId: mappedTargetColumnId,
          relationshipType: rel.relationshipType,
          onUpdate: rel.onUpdate,
          onDelete: rel.onDelete
        })
      }

      // 上传版本
      for (const ver of localVersions) {
        await versionApi.create(cloudProjectId, {
          version: ver.version,
          name: ver.name,
          comment: ver.comment,
          data: ver.data
        })
      }

      // 保存云端项目到本地缓存
      await localStorageService.saveProject(cloudProject as LocalProject)
      
      // 保存表和关系到本地缓存
      const cloudTables = await tableApi.getAll(cloudProjectId)
      if (cloudTables.success && cloudTables.data) {
        for (const table of cloudTables.data) {
          await localStorageService.saveTable({ ...table, lastModified: Date.now() })
          const columns = await columnApi.getAll(table.id)
          if (columns.success && columns.data) {
            for (const col of columns.data) {
              await localStorageService.saveColumn({ ...col, lastModified: Date.now() })
            }
          }
          const indexes = await indexApi.getAll(table.id)
          if (indexes.success && indexes.data) {
            for (const idx of indexes.data) {
              await localStorageService.saveIndex({ ...idx, lastModified: Date.now() })
            }
          }
        }
      }
      const cloudRelationships = await relationshipApi.getAll(cloudProjectId)
      if (cloudRelationships.success && cloudRelationships.data) {
        for (const rel of cloudRelationships.data) {
          await localStorageService.saveRelationship({ ...rel, lastModified: Date.now() })
        }
      }
      
      // 更新状态，添加新的云端项目，保持原有本地项目
      const currentProjects = get().projects
      const updatedProjects = [...currentProjects, cloudProject]
      
      set({ projects: updatedProjects })

      return { success: true, message: `项目"${cloudProject.name}"已成功上传到云端` }
    } catch (error) {
      console.error('上传项目到云端失败:', error)
      return { success: false, message: '上传失败: ' + (error as Error).message }
    } finally {
      set({ isSyncing: false })
    }
  },

  // 保存云端项目到本地
  saveProjectToLocal: async (projectId: string) => {
    set({ isSyncing: true })
    try {
      let originalProject
      let tablesData
      let relationshipsData
      let versionsData
      
      if (get().isOnline) {
        // 在线模式，从云端获取项目数据
        const response = await projectApi.getById(projectId)
        if (!response.success || !response.data) {
          return { success: false, message: '获取云端项目失败' }
        }
        originalProject = response.data
        
        // 从云端获取表和关系
        const tablesResponse = await tableApi.getAll(projectId)
        tablesData = tablesResponse.success ? tablesResponse.data : []
        
        const relationshipsResponse = await relationshipApi.getAll(projectId)
        relationshipsData = relationshipsResponse.success ? relationshipsResponse.data : []
        
        const versionsResponse = await versionApi.getAll(projectId)
        versionsData = versionsResponse.success ? versionsResponse.data : []
      } else {
        // 离线模式，从本地获取
        originalProject = await localStorageService.getProject(projectId)
        tablesData = await localStorageService.getTablesByProject(projectId)
        relationshipsData = await localStorageService.getRelationshipsByProject(projectId)
        versionsData = await localStorageService.getVersionsByProject(projectId)
        
        if (!originalProject) {
          return { success: false, message: '找不到项目数据' }
        }
      }

      // 创建新的本地项目ID
      const localProjectId = `local_${Date.now()}`
      const localProject: LocalProject = {
        ...originalProject,
        id: localProjectId,
        createdBy: 'local', // 标记为本地项目
        lastModified: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // 保存项目到本地
      await localStorageService.saveProject(localProject)
      
      // 保存表、列、索引到本地
      const tableIdMap = new Map<string, string>() // 原表ID -> 新本地表ID映射
      const columnIdMap = new Map<string, string>() // 原列ID -> 新本地列ID映射
      
      for (const table of tablesData || []) {
        const localTableId = `local_table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        tableIdMap.set(table.id, localTableId)
        
        const localTable: any = {
          ...table,
          id: localTableId,
          projectId: localProjectId,
          lastModified: Date.now()
        }
        await localStorageService.saveTable(localTable)
        
        // 保存列
        let columns
        if (get().isOnline) {
          const columnsResponse = await columnApi.getAll(table.id)
          columns = columnsResponse.success ? columnsResponse.data : []
        } else {
          columns = await localStorageService.getColumnsByTable(table.id)
        }
        
        for (const col of columns || []) {
          const localColumnId = `local_col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          columnIdMap.set(col.id, localColumnId)
          
          const localColumn: any = {
            ...col,
            id: localColumnId,
            tableId: localTableId,
            lastModified: Date.now()
          }
          await localStorageService.saveColumn(localColumn)
        }
        
        // 保存索引
        let indexes
        if (get().isOnline) {
          const indexesResponse = await indexApi.getAll(table.id)
          indexes = indexesResponse.success ? indexesResponse.data : []
        } else {
          indexes = await localStorageService.getIndexesByTable(table.id)
        }
        
        for (const idx of indexes || []) {
          const localIndexId = `local_idx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const mappedColumns = idx.columns.map(colId => columnIdMap.get(colId) || colId)
          
          const localIndex: any = {
            ...idx,
            id: localIndexId,
            tableId: localTableId,
            columns: mappedColumns,
            lastModified: Date.now()
          }
          await localStorageService.saveIndex(localIndex)
        }
      }
      
      // 保存关系到本地
      for (const rel of relationshipsData || []) {
        const localRelationshipId = `local_rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const mappedSourceTableId = tableIdMap.get(rel.sourceTableId) || rel.sourceTableId
        const mappedSourceColumnId = columnIdMap.get(rel.sourceColumnId) || rel.sourceColumnId
        const mappedTargetTableId = tableIdMap.get(rel.targetTableId) || rel.targetTableId
        const mappedTargetColumnId = columnIdMap.get(rel.targetColumnId) || rel.targetColumnId
        
        const localRelationship: any = {
          ...rel,
          id: localRelationshipId,
          projectId: localProjectId,
          sourceTableId: mappedSourceTableId,
          sourceColumnId: mappedSourceColumnId,
          targetTableId: mappedTargetTableId,
          targetColumnId: mappedTargetColumnId,
          lastModified: Date.now()
        }
        await localStorageService.saveRelationship(localRelationship)
      }
      
      // 保存版本到本地
      for (const ver of versionsData || []) {
        const localVersionId = `local_ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const localVersion: any = {
          ...ver,
          id: localVersionId,
          projectId: localProjectId,
          lastModified: Date.now()
        }
        await localStorageService.saveVersion(localVersion)
      }
      
      // 更新状态，添加新的本地项目
      const currentProjects = get().projects
      const updatedProjects = [...currentProjects, localProject as Project]
      
      set({ projects: updatedProjects })
      
      return { 
        success: true, 
        message: `项目"${localProject.name}"已成功保存到本地` 
      }
    } catch (error) {
      console.error('保存项目到本地失败:', error)
      return { success: false, message: '保存失败: ' + (error as Error).message }
    } finally {
      set({ isSyncing: false })
    }
  }
}))

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAppStore.getState().setOnline(true)
    useAppStore.getState().syncAllToServer()
  })

  window.addEventListener('offline', () => {
    useAppStore.getState().setOnline(false)
  })
}