import { create } from 'zustand'
import { Project, Table, Column, Relationship, Index, Version } from '../types'
import { projectApi, tableApi, columnApi, relationshipApi, indexApi, versionApi } from '../services/api'
import { localStorageService, LocalProject, LocalTable, LocalColumn, LocalRelationship, LocalIndex, LocalVersion } from '../services/localStorageService'
import { ThemeMode } from '../theme/types'

interface AppState {
  projects: Project[]
  currentProject: Project | null
  tables: Table[]
  relationships: Relationship[]
  selectedTableId: string | null
  versions: Version[]
  loading: boolean
  past: AppState[]
  future: AppState[]
  isOnline: boolean
  isSyncing: boolean
  lastSaved: number | null
  isLocalMode: boolean
  fontSize: number
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
}

interface AppStore extends AppState {
  loadProjects: () => Promise<void>
  selectProject: (id: string) => Promise<void>
  createProject: (data: Partial<Project>) => Promise<void>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  loadTables: (projectId: string) => Promise<void>
  createTable: (projectId: string, data: Partial<Table>) => Promise<void>
  updateTable: (id: string, data: Partial<Table>) => Promise<void>
  updateTablePosition: (id: string, x: number, y: number) => Promise<void>
  deleteTable: (id: string) => Promise<void>
  selectTable: (id: string | null) => void

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
  setLocalMode: (localMode: boolean) => void
  setFontSize: (size: number) => void
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
  loadSettings: () => Promise<void>
  syncToLocal: () => Promise<void>
  loadFromLocal: (projectId: string) => Promise<void>
  saveToLocal: () => Promise<void>
  syncAllToServer: () => Promise<void>
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
  versions: [],
  loading: false,
  past: [{
    projects: [],
    currentProject: null,
    tables: [],
    relationships: [],
    selectedTableId: null,
    versions: [],
    loading: false,
    past: [],
    future: [],
    isOnline: true,
    isLocalMode: false,
    isSyncing: false,
    lastSaved: null,
    fontSize: 14,
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
    autoAddIdColumn: true
  }],
  future: [],
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSaved: null,
  isLocalMode: false,
  fontSize: 14,
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

  setOnline: (online: boolean) => set({ isOnline: online }),
  setLocalMode: (localMode: boolean) => {
    set({ isLocalMode: localMode })
    if (localMode) {
      localStorageService.setMeta('localMode', true)
    } else {
      localStorageService.setMeta('localMode', false)
    }
  },
  setFontSize: (size: number) => {
    set({ fontSize: size })
    localStorageService.setMeta('fontSize', size)
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

    const savedFontSize = await localStorageService.getMeta<number>('fontSize')
    if (savedFontSize !== undefined) {
      set({ fontSize: savedFontSize })
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

  loadFromLocal: async (projectId: string) => {
    set({ loading: true })
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
          versions,
          loading: false
        })
      }
    } catch (error) {
      console.error('Failed to load from local storage:', error)
      set({ loading: false })
    }
  },

  saveToLocal: async () => {
    await get().syncToLocal()
    startAutoSaveTimer(get())
  },

  syncAllToServer: async () => {
    const { isOnline, currentProject } = get()
    if (!isOnline || !currentProject) return

    set({ isSyncing: true })
    try {
      const syncQueue = await localStorageService.getSyncQueue()

      for (const item of syncQueue) {
        try {
          switch (item.entity) {
            case 'project':
              if (item.type === 'create' || item.type === 'update') {
                await projectApi.update(item.entityId, item.data)
              } else if (item.type === 'delete') {
                await projectApi.delete(item.entityId)
              }
              break
            case 'table':
              if (item.type === 'create') {
                await tableApi.create(item.data.projectId, item.data)
              } else if (item.type === 'update') {
                await tableApi.update(item.entityId, item.data)
              } else if (item.type === 'delete') {
                await tableApi.delete(item.entityId)
              }
              break
            case 'column':
              if (item.type === 'create') {
                await columnApi.create(item.data.tableId, item.data)
              } else if (item.type === 'update') {
                await columnApi.update(item.entityId, item.data)
              } else if (item.type === 'delete') {
                await columnApi.delete(item.entityId)
              }
              break
            case 'relationship':
              if (item.type === 'create') {
                await relationshipApi.create(item.data.projectId, item.data)
              } else if (item.type === 'update') {
                await relationshipApi.update(item.entityId, item.data)
              } else if (item.type === 'delete') {
                await relationshipApi.delete(item.entityId)
              }
              break
            case 'index':
              if (item.type === 'create') {
                await indexApi.create(item.data.tableId, item.data)
              } else if (item.type === 'update') {
                await indexApi.update(item.entityId, item.data)
              } else if (item.type === 'delete') {
                await indexApi.delete(item.entityId)
              }
              break
            case 'version':
              if (item.type === 'create') {
                await versionApi.create(item.data.projectId, item.data)
              } else if (item.type === 'update') {
                await versionApi.update(item.entityId, item.data)
              } else if (item.type === 'delete') {
                await versionApi.delete(item.entityId)
              }
              break
          }
          if (item.id) {
            await localStorageService.removeSyncQueueItem(item.id)
          }
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error)
        }
      }

      if (syncQueue.length > 0) {
        await get().loadProjects()
        if (currentProject) {
          await get().selectProject(currentProject.id)
        }
      }
    } catch (error) {
      console.error('Failed to sync to server:', error)
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
      versions: get().versions,
      loading: get().loading,
      past: get().past,
      future: get().future,
      isOnline: get().isOnline,
      isSyncing: get().isSyncing,
      lastSaved: get().lastSaved,
      isLocalMode: get().isLocalMode,
      fontSize: get().fontSize,
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
      autoAddIdColumn: get().autoAddIdColumn
    }

    set({
      projects: nextState.projects,
      currentProject: nextState.currentProject,
      tables: nextState.tables,
      relationships: nextState.relationships,
      selectedTableId: nextState.selectedTableId,
      versions: nextState.versions,
      loading: nextState.loading,
      past: [...get().past, currentState],
      future: future.slice(1),
      fontSize: nextState.fontSize,
      themeColor: nextState.themeColor,
      compactMode: nextState.compactMode,
      canvasZoom: nextState.canvasZoom,
      showMiniMap: nextState.showMiniMap,
      autoSaveInterval: nextState.autoSaveInterval,
      edgeStyle: nextState.edgeStyle,
      showEdgeLabels: nextState.showEdgeLabels
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
      versions: get().versions,
      loading: get().loading,
      past: get().past,
      future: get().future,
      isOnline: get().isOnline,
      isSyncing: get().isSyncing,
      lastSaved: get().lastSaved,
      isLocalMode: get().isLocalMode,
      fontSize: get().fontSize,
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
      autoAddIdColumn: get().autoAddIdColumn
    }
    set(state => ({
      past: [...state.past.slice(-19), currentState],
      future: []
    }))
    startAutoSaveTimer(get())
  },

  loadProjects: async () => {
    set({ loading: true })
    try {
      const { isLocalMode, isOnline } = get()
      
      if (isLocalMode) {
        const localProjects = await localStorageService.getAllProjects()
        set({ projects: localProjects as Project[] })
      } else if (isOnline) {
        const response = await projectApi.getAll()
        if (response.success && response.data) {
          set({ projects: response.data })
          for (const project of response.data) {
            await localStorageService.saveProject(project as LocalProject)
          }
        }
      } else {
        const localProjects = await localStorageService.getAllProjects()
        set({ projects: localProjects as Project[] })
      }
    } finally {
      set({ loading: false })
    }
  },

  selectProject: async (id: string) => {
    set({ loading: true })
    try {
      const { isLocalMode, isOnline } = get()
      
      if (isLocalMode) {
        await get().loadFromLocal(id)
        get().pushHistory()
      } else if (isOnline) {
        const response = await projectApi.getById(id)
        if (response.success && response.data) {
          get().pushHistory()
          set({ currentProject: response.data })
          await localStorageService.saveProject(response.data as LocalProject)
          await Promise.all([
            get().loadTables(id),
            get().loadRelationships(id)
          ])
          await get().syncToLocal()
        }
      } else {
        await get().loadFromLocal(id)
        get().pushHistory()
      }
    } finally {
      set({ loading: false })
    }
  },

  createProject: async (data: Partial<Project>) => {
    set({ loading: true })
    try {
      const { isLocalMode, isOnline } = get()
      
      if (isLocalMode) {
        const localProject: LocalProject = {
          id: `local_${Date.now()}`,
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
          id: `local_${Date.now()}`,
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
        await localStorageService.addToSyncQueue({
          type: 'create',
          entity: 'project',
          entityId: localProject.id,
          data: localProject
        })
      }
    } finally {
      set({ loading: false })
    }
  },

  updateProject: async (id: string, data: Partial<Project>) => {
    set({ loading: true })
    try {
      const { isLocalMode, isOnline } = get()
      
      if (isLocalMode) {
        const existing = await localStorageService.getProject(id)
        if (existing) {
          const updated = { ...existing, ...data, updatedAt: new Date().toISOString(), lastModified: Date.now() }
          await localStorageService.saveProject(updated)
          set(state => ({
            projects: state.projects.map(p => p.id === id ? updated as Project : p),
            currentProject: state.currentProject?.id === id ? updated as Project : state.currentProject
          }))
        }
      } else if (isOnline) {
        const response = await projectApi.update(id, data)
        if (response.success && response.data) {
          set(state => ({
            projects: state.projects.map(p => p.id === id ? response.data! : p),
            currentProject: state.currentProject?.id === id ? response.data! : state.currentProject
          }))
          await localStorageService.saveProject(response.data as LocalProject)
        }
      } else {
        const existing = await localStorageService.getProject(id)
        if (existing) {
          const updated = { ...existing, ...data, updatedAt: new Date().toISOString(), lastModified: Date.now() }
          await localStorageService.saveProject(updated)
          set(state => ({
            projects: state.projects.map(p => p.id === id ? updated as Project : p),
            currentProject: state.currentProject?.id === id ? updated as Project : state.currentProject
          }))
          await localStorageService.addToSyncQueue({
            type: 'update',
            entity: 'project',
            entityId: id,
            data: updated
          })
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  deleteProject: async (id: string) => {
    set({ loading: true })
    try {
      if (get().isOnline) {
        await projectApi.delete(id)
      }
      await localStorageService.deleteProject(id)
      await localStorageService.addToSyncQueue({
        type: 'delete',
        entity: 'project',
        entityId: id
      })
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
      if (get().isOnline) {
        const response = await tableApi.getAll(projectId)
        if (response.success && response.data) {
          const tablesWithColumns = response.data.map(table => ({
            ...table,
            columns: []
          }))
          set({ tables: tablesWithColumns })

          for (const table of tablesWithColumns) {
            await localStorageService.saveTable(table as LocalTable)
            await get().loadColumns(table.id)
          }
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

  createTable: async (projectId: string, data: Partial<Table>) => {
    set({ loading: true })
    try {
      const store = get()
      
      // 创建表
      let newTable: Table
      if (store.isOnline) {
        const response = await tableApi.create(projectId, data)
        if (!response.success || !response.data) return
        newTable = { ...response.data!, columns: [], indexes: [] }
      } else {
        newTable = {
          id: `local_${Date.now()}`,
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

      // 自动创建id列（如果开启该功能）
      if (store.autoAddIdColumn) {
        const idColumnData = {
          name: 'id',
          dataType: 'BIGINT',
          nullable: false,
          primaryKey: true,
          autoIncrement: true,
          unique: true,
          order: 0
        }
        
        if (store.isOnline) {
          const columnResponse = await columnApi.create(newTable.id, idColumnData)
          if (columnResponse.success && columnResponse.data) {
            newTable.columns = [columnResponse.data]
            await localStorageService.saveColumn(columnResponse.data as LocalColumn)
          }
        } else {
          const localColumn: LocalColumn = {
            id: `local_col_${Date.now()}`,
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
      
      if (!store.isOnline) {
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
      if (get().isOnline) {
        const response = await tableApi.update(id, data)
        if (response.success && response.data) {
          set(state => ({
            tables: state.tables.map(t => t.id === id ? response.data! : t)
          }))
          const updated = response.data
          await localStorageService.saveTable(updated as LocalTable)
        }
      } else {
        const existing = await localStorageService.getTable(id)
        if (existing) {
          const updated = { ...existing, ...data, updatedAt: new Date().toISOString(), lastModified: Date.now() }
          await localStorageService.saveTable(updated)
          set(state => ({
            tables: state.tables.map(t => t.id === id ? updated as Table : t)
          }))
          await localStorageService.addToSyncQueue({
            type: 'update',
            entity: 'table',
            entityId: id,
            data: updated
          })
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  updateTablePosition: async (id: string, positionX: number, positionY: number) => {
    set(state => ({
      tables: state.tables.map(t => t.id === id ? { ...t, positionX, positionY } : t)
    }))
    try {
      if (get().isOnline) {
        await tableApi.updatePosition(id, positionX, positionY)
      }
      const existing = await localStorageService.getTable(id)
      if (existing) {
        const updated = { ...existing, positionX, positionY, lastModified: Date.now() }
        await localStorageService.saveTable(updated)
      }
    } catch (error) {
      console.error('Failed to update table position:', error)
    }
  },

  deleteTable: async (id: string) => {
    set({ loading: true })
    try {
      if (get().isOnline) {
        await tableApi.delete(id)
      }
      await localStorageService.deleteTable(id)
      await localStorageService.addToSyncQueue({
        type: 'delete',
        entity: 'table',
        entityId: id
      })
      get().pushHistory()
      set(state => ({
        tables: state.tables.filter(t => t.id !== id),
        selectedTableId: state.selectedTableId === id ? null : state.selectedTableId
      }))
    } finally {
      set({ loading: false })
    }
  },

  selectTable: (id: string | null) => set({ selectedTableId: id }),

  loadColumns: async (tableId: string) => {
    if (get().isOnline) {
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
    if (get().isOnline) {
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
        id: `local_${Date.now()}`,
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
      await localStorageService.addToSyncQueue({
        type: 'create',
        entity: 'column',
        entityId: localColumn.id,
        data: localColumn
      })
    }
  },

  updateColumn: async (id: string, data: Partial<Column>) => {
    if (get().isOnline) {
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
      const columns = get().tables.flatMap(t => t.columns)
      const existing = columns.find(c => c.id === id)
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
        await localStorageService.addToSyncQueue({
          type: 'update',
          entity: 'column',
          entityId: id,
          data: updated
        })
      }
    }
  },

  deleteColumn: async (id: string) => {
    if (get().isOnline) {
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
      const columns = get().tables.flatMap(t => t.columns)
      const existing = columns.find(c => c.id === id)
      if (existing) {
        await localStorageService.deleteColumn(id)
        get().pushHistory()
        set(state => ({
          tables: state.tables.map(t => ({
            ...t,
            columns: t.columns.filter(c => c.id !== id)
          }))
        }))
        await localStorageService.addToSyncQueue({
          type: 'delete',
          entity: 'column',
          entityId: id
        })
      }
    }
  },

  updateColumnOrder: async (tableId: string, columnIds: string[]) => {
    const table = get().tables.find(t => t.id === tableId)
    if (!table) return

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

    if (get().isOnline) {
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
    if (get().isOnline) {
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
    set({ loading: true })
    try {
      if (get().isOnline) {
        const response = await relationshipApi.create(projectId, data)
        if (response.success && response.data) {
          get().pushHistory()
          set(state => ({ relationships: [...state.relationships, response.data!] }))
          await localStorageService.saveRelationship(response.data as LocalRelationship)
        }
      } else {
        const localRelationship: LocalRelationship = {
          id: `local_${Date.now()}`,
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
        await localStorageService.addToSyncQueue({
          type: 'create',
          entity: 'relationship',
          entityId: localRelationship.id,
          data: localRelationship
        })
      }
    } finally {
      set({ loading: false })
    }
  },

  updateRelationship: async (id: string, data: Partial<Relationship>) => {
    set({ loading: true })
    try {
      if (get().isOnline) {
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
          await localStorageService.addToSyncQueue({
            type: 'update',
            entity: 'relationship',
            entityId: id,
            data: updated
          })
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  deleteRelationship: async (id: string) => {
    set({ loading: true })
    try {
      if (get().isOnline) {
        await relationshipApi.delete(id)
      }
      await localStorageService.deleteRelationship(id)
      await localStorageService.addToSyncQueue({
        type: 'delete',
        entity: 'relationship',
        entityId: id
      })
      get().pushHistory()
      set(state => ({
        relationships: state.relationships.filter(r => r.id !== id)
      }))
    } finally {
      set({ loading: false })
    }
  },

  loadIndexes: async (tableId: string) => {
    if (get().isOnline) {
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
    set({ loading: true })
    try {
      if (get().isOnline) {
        const response = await indexApi.create(tableId, data)
        if (response.success && response.data) {
          set(state => ({
            tables: state.tables.map(t => t.id === tableId ? { ...t, indexes: [...(t.indexes || []), response.data!] } : t)
          }))
          await localStorageService.saveIndex(response.data as LocalIndex)
        }
      } else {
        const localIndex: LocalIndex = {
          id: `local_${Date.now()}`,
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
        await localStorageService.addToSyncQueue({
          type: 'create',
          entity: 'index',
          entityId: localIndex.id,
          data: localIndex
        })
      }
    } finally {
      set({ loading: false })
    }
  },

  updateIndex: async (id: string, data: Partial<Index>) => {
    set({ loading: true })
    try {
      if (get().isOnline) {
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
            await localStorageService.addToSyncQueue({
              type: 'update',
              entity: 'index',
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

  deleteIndex: async (id: string) => {
    set({ loading: true })
    try {
      const targetTable = get().tables.find(t => t.indexes?.some(i => i.id === id))
      if (get().isOnline) {
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
        if (!get().isOnline) {
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
    if (get().isOnline) {
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
    set({ loading: true })
    try {
      if (get().isOnline) {
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
        await localStorageService.addToSyncQueue({
          type: 'create',
          entity: 'version',
          entityId: localVersion.id,
          data: localVersion
        })
      }
    } finally {
      set({ loading: false })
    }
  },

  updateVersion: async (id: string, data: Partial<Version>) => {
    set({ loading: true })
    try {
      if (get().isOnline) {
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
          await localStorageService.addToSyncQueue({
            type: 'update',
            entity: 'version',
            entityId: id,
            data: updated
          })
        }
      }
    } finally {
      set({ loading: false })
    }
  },

  deleteVersion: async (id: string) => {
    set({ loading: true })
    try {
      if (get().isOnline) {
        await versionApi.delete(id)
      }
      await localStorageService.deleteVersion(id)
      await localStorageService.addToSyncQueue({
        type: 'delete',
        entity: 'version',
        entityId: id
      })
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