import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import ReactFlow, {
  Background,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  getSmoothStepPath,
  BaseEdge,
  EdgeProps
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Table, Relationship } from '../types'
import TableNode from './TableNode'
import { SmartEdge } from './SmartEdge'
import RelationshipEditor from './RelationshipEditor'
import { useAppStore } from '../stores/appStore'
import { Button, Space, Dropdown, message, Modal, Form, Card, Radio, Slider, Select, Input, AutoComplete, Divider } from 'antd'
import { PlusOutlined, CodeOutlined, LinkOutlined, ExportOutlined, PictureOutlined, FileImageOutlined, SettingOutlined, ZoomInOutlined, ZoomOutOutlined, RotateLeftOutlined, CompressOutlined, AimOutlined, LockOutlined, DeleteOutlined, TeamOutlined, WifiOutlined, UndoOutlined, RedoOutlined, AlignLeftOutlined, AlignRightOutlined, AlignCenterOutlined, VerticalAlignMiddleOutlined, ColumnWidthOutlined, VerticalAlignTopOutlined, VerticalAlignBottomOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import CreateTableModal from './CreateTableModal'
import CollabCursors from './CollabCursors'
import { projectApi } from '../services/api'
import { useCollab } from '../providers/CollabProvider'
import { collabManager } from '../services/collabManager'

interface AutoLayoutOptions {
  layoutType: 'grid' | 'hierarchical' | 'compact'
  paddingX: number
  paddingY: number
  tableWidth: number
  tableHeight: number
  startX: number
  startY: number
  maxColumns: number
  direction: 'horizontal' | 'vertical'
}

const defaultLayoutOptions: AutoLayoutOptions = {
  layoutType: 'grid',
  paddingX: 60,
  paddingY: 60,
  tableWidth: 280,
  tableHeight: 120,
  startX: 100,
  startY: 100,
  maxColumns: 4,
  direction: 'horizontal'
}

const AvoidNodeEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  })

  return <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
}

const nodeTypes = {
  tableNode: TableNode
}

const edgeTypes = {
  smart: SmartEdge,
  avoidNode: AvoidNodeEdge
}

const NODE_WIDTH = 280
const NODE_HEIGHT = 200
const CANVAS_ZOOM_MIN = 0.5
const CANVAS_ZOOM_MAX = 2
const CURSOR_SEND_INTERVAL = 50

const ZOOM_PRESETS = [50, 60, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 140, 150, 160, 170, 180, 190, 200] as const

const REL_TYPE_OPTIONS = [
  { label: '一对多 (1:N)', value: 'one-to-many' },
  { label: '一对一 (1:1)', value: 'one-to-one' },
  { label: '多对多 (M:N)', value: 'many-to-many' }
]

const SHORTCUT_GROUPS = [
  {
    title: '📋 通用操作',
    items: [
      { key: 'Ctrl + S', desc: '保存项目' },
      { key: 'Ctrl + Z', desc: '撤销' },
      { key: 'Ctrl + Shift + Z', desc: '重做' },
      { key: 'Escape', desc: '清除选中 / 关闭编辑' },
      { key: '?', desc: '显示此帮助面板' },
    ]
  },
  {
    title: '🔲 表节点操作',
    items: [
      { key: 'Delete / Backspace', desc: '删除选中表 / 关系线' },
      { key: 'Ctrl + A', desc: '全选所有表' },
      { key: 'Ctrl + C', desc: '复制表（含列和索引）' },
      { key: 'Ctrl + V', desc: '粘贴表' },
      { key: 'Shift + Z', desc: '缩放至适配' },
    ]
  },
  {
    title: '🖱️ 画布操作',
    items: [
      { key: '鼠标拖拽', desc: '移动表节点（吸附开启时自动对齐网格）' },
      { key: '滚轮 / 触控板', desc: '缩放画布' },
      { key: '双击表名', desc: '快速编辑表名' },
      { key: '双击列名', desc: '快速编辑列名' },
      { key: '右键表节点', desc: '上下文菜单（编辑/复制/删除）' },
      { key: '拖拽底部Handle', desc: '拖拽连线快速创建关系' },
    ]
  }
]

const SVG_EXPORT = {
  padding: 60,
  nodeWidth: 280,
  nodeMinHeight: 150,
  columnHeight: 32,
  headerHeight: 56,
  commentHeight: 20,
  gapX: 100,
  gapY: 80,
  maxWidth: 1400,
  fontSize: {
    title: 15,
    column: 13,
    comment: 11,
    legend: 12
  },
  colors: {
    background: '#ffffff',
    headerBg: '#1890ff',
    headerText: '#ffffff',
    border: '#1890ff',
    text: '#262626',
    textSecondary: '#8c8c8c',
    pkText: '#fa8c16',
    fkText: '#52c41a',
    line: '#1890ff',
    pkBg: '#fff7e6',
    fkBg: '#f6ffed',
    oddRow: '#fafafa',
    evenRow: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.08)'
  }
} as const

const GridOverlay = React.memo(({ snapToGrid, gridSize }: { snapToGrid: boolean; gridSize: number }) => {
  if (!snapToGrid) return null
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id={`grid-${gridSize}`}
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <circle cx="0" cy="0" r="0.5" fill="#d9d9d9" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#grid-${gridSize})`} />
    </svg>
  )
})
GridOverlay.displayName = 'GridOverlay'

const DragInfoTooltip = React.memo(({ dragInfo, snapToGrid }: { dragInfo: { x: number; y: number; snappedX: number; snappedY: number } | null; snapToGrid: boolean }) => {
  if (!dragInfo) return null
  return (
    <div style={{
      position: 'fixed',
      left: '50%',
      bottom: 24,
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.82)',
      color: '#fff',
      borderRadius: 8,
      padding: '6px 14px',
      fontSize: 12,
      fontFamily: 'monospace',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      pointerEvents: 'none',
      whiteSpace: 'nowrap'
    }}>
      <span style={{ opacity: 0.6 }}>原始:</span>
      <span>{Math.round(dragInfo.x)}, {Math.round(dragInfo.y)}</span>
      {snapToGrid && (
        <>
          <span style={{ opacity: 0.4, margin: '0 4px' }}>|</span>
          <span style={{ opacity: 0.6 }}>吸附:</span>
          <span style={{ color: '#52c41a', fontWeight: 600 }}>{Math.round(dragInfo.snappedX)}, {Math.round(dragInfo.snappedY)}</span>
        </>
      )}
    </div>
  )
})
DragInfoTooltip.displayName = 'DragInfoTooltip'

const CanvasContent: React.FC = () => {
  const { tables, currentProject, updateTablePosition, selectTable, selectedTableId, selectedTableIds, deleteTable, createTable, loadTables, relationships, loadRelationships, canvasZoom, setCanvasZoom, snapToGrid, gridSize, setSnapToGrid, setGridSize, showMiniMap, setShowMiniMap, edgeStyle, showEdgeLabels, updateTable, selectMultipleTables, addSelectedTable, removeSelectedTable, clearSelectedTables, copyTable, pasteTable, copiedTable, undo, redo, canUndo, canRedo, deleteRelationship, createRelationship, updateRelationship, canEdit, canManage, currentProjectRole } = useAppStore()
  const { isConnected, onlineUsers } = useCollab()
  const reactFlow = useReactFlow()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRelationshipEditorOpen, setIsRelationshipEditorOpen] = useState(false)
  const [showAutoLayoutModal, setShowAutoLayoutModal] = useState(false)
  const [layoutOptions, setLayoutOptions] = useState<AutoLayoutOptions>(defaultLayoutOptions)
  const [autoLayoutForm] = Form.useForm()
  const [isLocked, setIsLocked] = useState(false)
  const [showBatchActions, setShowBatchActions] = useState(false)
  
  const [marqueeActive, setMarqueeActive] = useState(false)
  const [marqueeStart, setMarqueeStart] = useState({ x: 0, y: 0 })
  const [marqueeEnd, setMarqueeEnd] = useState({ x: 0, y: 0 })
  const [marqueeMode, setMarqueeMode] = useState<'contains' | 'intersect'>('contains')
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [dragInfo, setDragInfo] = useState<{ x: number; y: number; snappedX: number; snappedY: number } | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [connectSource, setConnectSource] = useState<{ tableId: string; tableName: string } | null>(null)
  const [connectTarget, setConnectTarget] = useState<{ tableId: string; tableName: string } | null>(null)
  const [connectRelType, setConnectRelType] = useState('one-to-many')
  const [connectSourceCol, setConnectSourceCol] = useState('')
  const [connectTargetCol, setConnectTargetCol] = useState('')
  const [editingRelId, setEditingRelId] = useState<string | null>(null)
  const [editRelName, setEditRelName] = useState('')
  const [editRelType, setEditRelType] = useState('one-to-many')
  const [edgeContextMenuPos, setEdgeContextMenuPos] = useState<{ x: number; y: number; edgeId: string } | null>(null)
  const [searchText, setSearchText] = useState('')
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const lastCursorSendRef = useRef(0)

  useEffect(() => {
    if (currentProject) {
      loadTables(currentProject.id)
      loadRelationships(currentProject.id)
    }
  }, [currentProject?.id])

  useEffect(() => {
    if (reactFlow) {
      reactFlow.zoomTo(canvasZoom)
    }
  }, [reactFlow, canvasZoom])

  useEffect(() => {
    if (canvasZoom < CANVAS_ZOOM_MIN) {
      setCanvasZoom(CANVAS_ZOOM_MIN)
    } else if (canvasZoom > CANVAS_ZOOM_MAX) {
      setCanvasZoom(CANVAS_ZOOM_MAX)
    }
  }, [canvasZoom, setCanvasZoom])

  // 监听多选状态，显示批量操作提示
  useEffect(() => {
    if (selectedTableIds.length > 1) {
      setShowBatchActions(true)
      
      const timer = setTimeout(() => setIsLocked(true), 200)
      return () => clearTimeout(timer)
    } else {
      setIsLocked(false)
      // 延迟隐藏，给用户一些操作时间
      const timer = setTimeout(() => setShowBatchActions(false), 200)
      return () => clearTimeout(timer)
    }
  }, [selectedTableIds])

  const initialNodes: Node[] = useMemo(() => {
    if (!tables || !Array.isArray(tables)) return []
    return tables.map(table => ({
      id: table.id,
      type: 'tableNode',
      position: { x: table.positionX || 0, y: table.positionY || 0 },
      data: {
        table,
        onEdit: selectTable,
        onDelete: deleteTable
      },
      selected: selectedTableIds.includes(table.id),
      selectable: true
    }))
  }, [tables, selectedTableIds, selectTable, deleteTable])

  const initialEdges: Edge[] = useMemo(() => {
    if (!relationships || !Array.isArray(relationships)) return []
    return relationships.map(rel => {
      const sourceTable = tables.find(t => t.id === rel.sourceTableId)
      const targetTable = tables.find(t => t.id === rel.targetTableId)

      // 如果表都存在，生成边
      if (sourceTable && targetTable) {
        const sourceColumn = sourceTable.columns?.find(c => c.id === rel.sourceColumnId)
        const targetColumn = targetTable.columns?.find(c => c.id === rel.targetColumnId)
        const label = `${sourceTable.name}.${sourceColumn?.name || ''} → ${targetTable.name}.${targetColumn?.name || ''}`

        return {
          id: rel.id,
          source: rel.sourceTableId,
          target: rel.targetTableId,
          animated: edgeStyle !== 'smart' && edgeStyle !== 'avoidNode',
          label: showEdgeLabels ? label : undefined,
          labelStyle: {
            fontSize: 11,
            fill: 'var(--theme-text-secondary)'
          },
          style: {
            stroke: 'var(--theme-primary)',
            strokeWidth: 2
          },
          type: edgeStyle === 'smart' ? 'smart' : edgeStyle === 'avoidNode' ? 'avoidNode' : edgeStyle
        }
      }
      return null
    }).filter(Boolean) as Edge[]
  }, [relationships, tables, edgeStyle, showEdgeLabels])

  const [nodeState, setNodeState, onNodeChange] = useNodesState(initialNodes)
  const [edgeState, setEdgeState, onEdgesChange] = useEdgesState(initialEdges)

  const displayEdges = useMemo(() => {
    if (!hoveredNodeId && !hoveredEdgeId) return edgeState

    const connectedEdgeIds = new Set<string>()
    if (hoveredNodeId) {
      edgeState.forEach(edge => {
        if (edge.source === hoveredNodeId || edge.target === hoveredNodeId) {
          connectedEdgeIds.add(edge.id)
        }
      })
    }

    return edgeState.map(edge => {
      const isHighlighted = hoveredEdgeId === edge.id || connectedEdgeIds.has(edge.id)
      if (isHighlighted) {
        return {
          ...edge,
          style: { ...edge.style, stroke: '#1890ff', strokeWidth: 3, opacity: 1 },
          animated: true
        }
      }
      // 当有节点或边悬停时，淡化其他边
      if (hoveredNodeId || hoveredEdgeId) {
        return { ...edge, style: { ...edge.style, opacity: 0.15 } }
      }
      return edge
    })
  }, [edgeState, hoveredNodeId, hoveredEdgeId])

  const isDraggingRef = React.useRef(false)

  // 在项目切换时完全重新初始化
  useEffect(() => {
    setNodeState(initialNodes)
    setEdgeState(initialEdges)
  }, [currentProject?.id])

  // 监听 tables 和 selectedTableIds 变化，同步到 React Flow 节点（但要避免拖动过程中的循环）
  useEffect(() => {
    if (isDraggingRef.current) return // 拖动过程中不同步
    
    // 检查是否有位置变化
    const hasPositionChanged = nodeState.some(node => {
      const table = tables.find(t => t.id === node.id)
      return table && (table.positionX !== node.position.x || table.positionY !== node.position.y)
    })
    
    // 检查表ID列表是否变化（添加/删除）
    const tableIds = tables.map(t => t.id).join(',')
    const nodeIds = nodeState.map(n => n.id).join(',')
    const hasTableListChanged = tableIds !== nodeIds
    
    // 检查选中状态是否变化
    const hasSelectionChanged = nodeState.some(node => {
      const isSelected = selectedTableIds.includes(node.id)
      return node.selected !== isSelected
    })
    
    if (hasPositionChanged || hasTableListChanged || hasSelectionChanged) {
      setNodeState(initialNodes)
      setEdgeState(initialEdges)
    }
  }, [tables, selectedTableIds])

  const onNodeDragStart = useCallback(() => {
    isDraggingRef.current = true
  }, [])

  const onNodeDrag = useCallback((event: any, node: Node) => {
    const rawX = node.position.x
    const rawY = node.position.y
    let snappedX = rawX
    let snappedY = rawY

    if (snapToGrid && gridSize > 0) {
      snappedX = Math.round(rawX / gridSize) * gridSize
      snappedY = Math.round(rawY / gridSize) * gridSize
    }

    setDragInfo({ x: rawX, y: rawY, snappedX, snappedY })
  }, [snapToGrid, gridSize])

  const onNodeDragStop = useCallback((event: any, node: Node) => {
    let finalX = node.position.x
    let finalY = node.position.y

    if (snapToGrid && gridSize > 0) {
      finalX = Math.round(finalX / gridSize) * gridSize
      finalY = Math.round(finalY / gridSize) * gridSize
    }

    updateTablePosition(node.id, finalX, finalY)
    setDragInfo(null)
    setTimeout(() => {
      isDraggingRef.current = false
    }, 100)
  }, [updateTablePosition, snapToGrid, gridSize])

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (marqueeActive) return
    if (isDraggingRef.current) return

    if (event.ctrlKey || event.metaKey) {
      if (selectedTableIds.includes(node.id)) {
        removeSelectedTable(node.id)
      } else {
        addSelectedTable(node.id)
      }
    } else {
      // 单击只选中，不打开编辑栏
      selectMultipleTables([node.id])
    }
  }, [tables, selectMultipleTables, selectedTableIds, addSelectedTable, removeSelectedTable, marqueeActive])

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (marqueeActive) return
    if (isDraggingRef.current) return
    
    // 双击才打开编辑栏
    selectTable(node.id)
  }, [selectTable, marqueeActive])

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (marqueeActive) return

    if (!(event.target as HTMLElement).closest('.react-flow__node') && !(event.target as HTMLElement).closest('.react-flow__edge')) {
      if (event.ctrlKey || event.metaKey) {
        return
      }
      clearSelectedTables()
      setSelectedEdgeId(null)
    }
  }, [selectTable, clearSelectedTables, marqueeActive])

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation()
    setSelectedEdgeId(prev => prev === edge.id ? null : edge.id)
  }, [])

  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation()
    const rel = relationships.find(r => r.id === edge.id)
    if (!rel) return
    setEditingRelId(edge.id)
    setEditRelName(rel.name || '')
    setEditRelType(rel.relationshipType || 'one-to-many')
  }, [relationships])

  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedEdgeId(edge.id)
    setEdgeContextMenuPos({ x: event.clientX, y: event.clientY, edgeId: edge.id })
  }, [])

  const handleEdgeMenuClick = ({ key }: { key: string }) => {
    if (!edgeContextMenuPos) return
    const rel = relationships.find(r => r.id === edgeContextMenuPos.edgeId)
    setEdgeContextMenuPos(null)
    if (key === 'editRel') {
      if (!rel) return
      setEditingRelId(edgeContextMenuPos.edgeId)
      setEditRelName(rel.name || '')
      setEditRelType(rel.relationshipType || 'one-to-many')
    } else if (key === 'deleteRel') {
      Modal.confirm({
        title: '确认删除关系',
        content: '确定要删除这条关系吗？',
        okText: '删除',
        cancelText: '取消',
        okType: 'danger',
        onOk: async () => {
          await deleteRelationship(edgeContextMenuPos.edgeId)
          setSelectedEdgeId(null)
          message.success('关系已删除')
        }
      })
    }
  }

  const handleUpdateRel = async () => {
    if (!editingRelId) return
    await updateRelationship(editingRelId, {
      name: editRelName || undefined,
      relationshipType: editRelType
    })
    setEditingRelId(null)
    message.success('关系已更新')
  }

  const onConnect = useCallback((connection: any) => {
    if (!canEdit) { message.warning('当前为查看者，无法创建关系'); return }
    const { source, target } = connection
    const sourceTable = tables.find(t => t.id === source)
    const targetTable = tables.find(t => t.id === target)
    if (!sourceTable || !targetTable) return

    const pkCol = sourceTable.columns.find(c => c.primaryKey)
    setConnectSourceCol(pkCol?.id || sourceTable.columns[0]?.id || '')
    const targetPk = targetTable.columns.find(c => c.primaryKey)
    setConnectTargetCol(targetPk?.id || targetTable.columns[0]?.id || '')

    setConnectSource({ tableId: source, tableName: sourceTable.name })
    setConnectTarget({ tableId: target, tableName: targetTable.name })
    setConnectRelType('one-to-many')
  }, [tables])

  const handleConfirmConnect = async () => {
    if (!connectSource || !connectTarget || !currentProject) return
    if (!connectSourceCol || !connectTargetCol) { message.warning('请选择源列和目标列'); return }

    await createRelationship(currentProject.id, {
      sourceTableId: connectSource.tableId,
      sourceColumnId: connectSourceCol,
      targetTableId: connectTarget.tableId,
      targetColumnId: connectTargetCol,
      relationshipType: connectRelType,
      onUpdate: 'NO ACTION',
      onDelete: 'NO ACTION'
    })
    message.success(`已创建关系 "${connectSource.tableName} → ${connectTarget.tableName}"`)
    setConnectSource(null)
    setConnectTarget(null)
  }

  const onSelectionChange = useCallback((params: { nodes: any[]; edges: any[] }) => {
    const selectedIds = params.nodes.map((node: any) => node.id)
    if (selectedIds.length > 0) {
      selectMultipleTables(selectedIds)
    } else {
      clearSelectedTables()
    }
  }, [selectMultipleTables, clearSelectedTables])

  const onPaneMouseDown = useCallback((event: React.MouseEvent) => {
    
    if (event.button !== 2) return
    event.preventDefault()
    event.stopPropagation()
    if ((event.target as HTMLElement).closest('.react-flow__node')) return

    const rect = reactFlowWrapper.current?.getBoundingClientRect()
    if (rect) {
      const { left, top } = rect
      setMarqueeStart({ x: event.clientX - left, y: event.clientY - top })
      setMarqueeEnd({ x: event.clientX - left, y: event.clientY - top })
      setMarqueeActive(true)
    }
  }, [])

  const onPaneMouseMove = useCallback((event: React.MouseEvent) => {
    if (!marqueeActive) {
      const now = Date.now()
      if (now - lastCursorSendRef.current >= CURSOR_SEND_INTERVAL && isConnected) {
        lastCursorSendRef.current = now
        const rect = reactFlowWrapper.current?.getBoundingClientRect()
        if (rect) {
          const flowPos = reactFlow.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY
          })
          collabManager.sendCursorUpdate(Math.round(flowPos.x), Math.round(flowPos.y))
        }
      }
      return
    }

    const rect = reactFlowWrapper.current?.getBoundingClientRect()
    if (rect) {
      const { left, top } = rect
      setMarqueeEnd({ x: event.clientX - left, y: event.clientY - top })
    }
  }, [marqueeActive, isConnected])

  const onPaneMouseUp = useCallback(() => {
    if (!marqueeActive) return

    const startX = Math.min(marqueeStart.x, marqueeEnd.x)
    const startY = Math.min(marqueeStart.y, marqueeEnd.y)
    const endX = Math.max(marqueeStart.x, marqueeEnd.x)
    const endY = Math.max(marqueeStart.y, marqueeEnd.y)

    const marqueeStartFlow = reactFlow.screenToFlowPosition({ x: startX, y: startY })
    const marqueeEndFlow = reactFlow.screenToFlowPosition({ x: endX, y: endY })

    const mStartX = Math.min(marqueeStartFlow.x, marqueeEndFlow.x)
    const mStartY = Math.min(marqueeStartFlow.y, marqueeEndFlow.y)
    const mEndX = Math.max(marqueeStartFlow.x, marqueeEndFlow.x)
    const mEndY = Math.max(marqueeStartFlow.y, marqueeEndFlow.y)

    const selectedIds = tables
      .filter(table => {
        const tableX = table.positionX || 0
        const tableY = table.positionY || 0

        if (marqueeMode === 'contains') {
          return tableX >= mStartX && tableX + NODE_WIDTH <= mEndX &&
                 tableY >= mStartY && tableY + NODE_HEIGHT <= mEndY
        } else {
          return tableX < mEndX && tableX + NODE_WIDTH > mStartX &&
                 tableY < mEndY && tableY + NODE_HEIGHT > mStartY
        }
      })
      .map(t => t.id)

    if (selectedIds.length > 0) {
      selectMultipleTables(selectedIds)
    }

    setMarqueeActive(false)
    setMarqueeStart({ x: 0, y: 0 })
    setMarqueeEnd({ x: 0, y: 0 })
  }, [marqueeActive, marqueeStart, marqueeEnd, marqueeMode, tables, selectMultipleTables])

  const onMoveEnd = useCallback((event: any, viewport: any) => {
    if (viewport.zoom !== canvasZoom) {
      const clampedZoom = Math.max(CANVAS_ZOOM_MIN, Math.min(viewport.zoom, CANVAS_ZOOM_MAX))
      setCanvasZoom(Math.round(clampedZoom * 100) / 100)
    }
  }, [canvasZoom, setCanvasZoom])

  const handleBatchDelete = () => {
    if (!canEdit) { message.warning('当前为查看者，无法删除表'); return }
    if (selectedTableIds.length === 0) return
    Modal.confirm({
      title: `确认删除`,
      content: `您确定要删除选中的 ${selectedTableIds.length} 张表吗？此操作不可撤销。`,
      okText: '确定删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        for (const id of selectedTableIds) {
          await deleteTable(id)
        }
        clearSelectedTables()
        message.success(`成功删除 ${selectedTableIds.length} 张表`)
      }
    })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedTableIds.length > 0 || selectedEdgeId)) {
        e.preventDefault()
        if (selectedEdgeId) {
          const rel = relationships.find(r => r.id === selectedEdgeId)
          Modal.confirm({
            title: '确认删除关系',
            content: `确定要删除关系 "${rel?.sourceTableId || ''} → ${rel?.targetTableId || ''}" 吗？`,
            okText: '删除',
            cancelText: '取消',
            okType: 'danger',
            onOk: async () => {
              await deleteRelationship(selectedEdgeId)
              setSelectedEdgeId(null)
            }
          })
        } else if (selectedTableIds.length === 1) {
          Modal.confirm({
            title: '确认删除表',
            content: `确定要删除表 "${tables.find(t => t.id === selectedTableIds[0])?.name || ''}" 吗？`,
            okText: '删除',
            cancelText: '取消',
            okType: 'danger',
            onOk: async () => {
              await deleteTable(selectedTableIds[0])
              clearSelectedTables()
            }
          })
        } else {
          handleBatchDelete()
        }
        return
      }

      if (e.key === 'Escape') {
        if (selectedTableIds.length > 0) {
          clearSelectedTables()
        }
        if (selectedEdgeId) {
          setSelectedEdgeId(null)
        }
        return
      }

      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (tables && tables.length > 0) {
          selectMultipleTables(tables.map(t => t.id))
        }
        return
      }

      if ((e.key === 'c' || e.key === 'C') && (e.ctrlKey || e.metaKey) && selectedTableIds.length > 0) {
        if (selectedTableIds.length === 1) {
          copyTable(selectedTableIds[0])
          message.success(`已复制表 "${tables.find(t => t.id === selectedTableIds[0])?.name || ''}"`)
        } else {
          message.info('批量复制暂仅支持单张表，请选中一张表后重试')
        }
        return
      }

      if ((e.key === 'v' || e.key === 'V') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (!copiedTable) {
          message.warning('剪贴板为空，请先复制一张表')
          return
        }
        pasteTable()
        return
      }

      if (e.key === 'z' && e.shiftKey && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (selectedTableIds.length > 0) {
          reactFlow?.fitView({ nodes: selectedTableIds.map(id => ({ id })), padding: 0.15 })
        } else {
          reactFlow?.fitView({ padding: 0.1, includeHiddenNodes: false })
        }
        return
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowShortcuts(true)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedTableIds, tables, deleteTable, clearSelectedTables, selectMultipleTables, handleBatchDelete, copyTable, pasteTable, copiedTable, selectedEdgeId, relationships, deleteRelationship])

  // 没有选择项目时渲染空内容
  if (!currentProject) {
    return (
      <>
        <div style={{ display: 'none' }}>
          <Form form={autoLayoutForm} layout="vertical">
            <Form.Item name="layoutType"><Input /></Form.Item>
            <Form.Item name="paddingX"><Input /></Form.Item>
            <Form.Item name="paddingY"><Input /></Form.Item>
            <Form.Item name="maxColumns"><Input /></Form.Item>
          </Form>
        </div>
      </>
    )
  }

  const autoLayoutTables = (tablesToLayout: any[], options: Partial<AutoLayoutOptions> = {}): any[] => {
    if (!tablesToLayout || tablesToLayout.length === 0) return tablesToLayout

    const opts = { ...defaultLayoutOptions, ...options }

    const calculateTableHeight = (table: any) => {
      const baseHeight = opts.tableHeight
      const columnCount = table.columns?.length || 0
      const heightPerColumn = 28
      const headerHeight = 50
      return Math.max(baseHeight, headerHeight + columnCount * heightPerColumn)
    }

    if (opts.layoutType === 'grid') {
      const cols = opts.maxColumns ? Math.min(Math.ceil(Math.sqrt(tablesToLayout.length)), opts.maxColumns) : Math.ceil(Math.sqrt(tablesToLayout.length))
      
      const rowHeights: number[] = []
      for (let row = 0; row < Math.ceil(tablesToLayout.length / cols); row++) {
        let maxHeight = opts.tableHeight
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col
          if (idx < tablesToLayout.length) {
            maxHeight = Math.max(maxHeight, calculateTableHeight(tablesToLayout[idx]))
          }
        }
        rowHeights.push(maxHeight)
      }

      return tablesToLayout.map((table, index) => {
        const col = index % cols
        const row = Math.floor(index / cols)
        
        let y = opts.startY
        for (let i = 0; i < row; i++) {
          y += rowHeights[i] + opts.paddingY
        }
        
        return {
          ...table,
          positionX: opts.startX + col * (opts.tableWidth + opts.paddingX),
          positionY: y
        }
      })
    } else if (opts.layoutType === 'hierarchical') {
      // 层级布局 - 基于依赖关系
      const dependencyMap = new Map<string, Set<string>>() // tableId -> 它依赖的表
      const dependentsMap = new Map<string, Set<string>>() // tableId -> 依赖它的表

      tablesToLayout.forEach(t => {
        dependencyMap.set(t.id, new Set())
        dependentsMap.set(t.id, new Set())
      })

      // 从关系中提取依赖
      relationships.forEach(rel => {
        // source 依赖 target（source 有外键指向 target）
        dependencyMap.get(rel.sourceTableId)?.add(rel.targetTableId)
        dependentsMap.get(rel.targetTableId)?.add(rel.sourceTableId)
      })

      // 拓扑排序确定层级
      const levels = new Map<string, number>()
      const visited = new Set<string>()

      function assignLevel(tableId: string, level: number) {
        if (visited.has(tableId)) {
          levels.set(tableId, Math.max(levels.get(tableId) || 0, level))
          return
        }
        visited.add(tableId)
        levels.set(tableId, level)

        // 依赖的表在更高层级
        const deps = dependencyMap.get(tableId) || new Set()
        deps.forEach(depId => {
          if (dependencyMap.has(depId)) {
            assignLevel(depId, level + 1)
          }
        })
      }

      // 从没有依赖的表开始（根节点）
      const roots = tablesToLayout.filter(t => (dependencyMap.get(t.id)?.size || 0) === 0)
      roots.forEach(t => assignLevel(t.id, 0))

      // 处理未被访问的表（循环依赖）
      tablesToLayout.forEach(t => {
        if (!visited.has(t.id)) {
          assignLevel(t.id, 0)
        }
      })

      // 按层级分组
      const levelGroups = new Map<number, string[]>()
      levels.forEach((level, tableId) => {
        if (!levelGroups.has(level)) levelGroups.set(level, [])
        levelGroups.get(level)!.push(tableId)
      })

      // 分配位置
      const maxLevel = Math.max(...levels.values(), 0)
      const levelHeight = opts.tableHeight + opts.paddingY
      const tableSpacing = opts.tableWidth + opts.paddingX

      const positions: Record<string, { x: number; y: number }> = {}
      levelGroups.forEach((tableIds, level) => {
        const totalWidth = tableIds.length * tableSpacing
        const startX = opts.startX + (opts.maxColumns ? 0 : 0)
        const y = (maxLevel - level) * levelHeight + opts.startY

        tableIds.forEach((tableId, index) => {
          positions[tableId] = {
            x: startX + index * tableSpacing,
            y
          }
        })
      })

      return tablesToLayout.map(table => ({
        ...table,
        positionX: positions[table.id]?.x ?? opts.startX,
        positionY: positions[table.id]?.y ?? opts.startY
      }))
    } else if (opts.layoutType === 'compact') {
      const cols = opts.maxColumns ? Math.min(Math.ceil(Math.sqrt(tablesToLayout.length)), opts.maxColumns) : Math.ceil(Math.sqrt(tablesToLayout.length))
      const compactPaddingX = 30
      const compactPaddingY = 30

      const rowHeights: number[] = []
      for (let row = 0; row < Math.ceil(tablesToLayout.length / cols); row++) {
        let maxHeight = opts.tableHeight
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col
          if (idx < tablesToLayout.length) {
            maxHeight = Math.max(maxHeight, calculateTableHeight(tablesToLayout[idx]))
          }
        }
        rowHeights.push(maxHeight)
      }

      return tablesToLayout.map((table, index) => {
        const col = index % cols
        const row = Math.floor(index / cols)
        
        let y = opts.startY
        for (let i = 0; i < row; i++) {
          y += rowHeights[i] + compactPaddingY
        }
        
        return {
          ...table,
          positionX: opts.startX + col * (opts.tableWidth + compactPaddingX),
          positionY: y
        }
      })
    }
    
    return tablesToLayout
  }

  const handleAutoLayout = () => {
    setShowAutoLayoutModal(true)
    autoLayoutForm.setFieldsValue({
      layoutType: layoutOptions.layoutType,
      paddingX: layoutOptions.paddingX,
      paddingY: layoutOptions.paddingY,
      maxColumns: layoutOptions.maxColumns
    })
  }

  const applyAutoLayout = async () => {
    if (tables.length === 0) {
      message.warning('没有表需要布局')
      return
    }

    // 请求布局锁
    if (isConnected) {
      collabManager.acquireLock('table', 'layout')
      // 等待锁获取结果（简化处理，给一个短暂延迟）
      await new Promise(resolve => setTimeout(resolve, 500))
      const layoutLock = collabManager.isTableLocked('layout')
      if (layoutLock) {
        message.warning('其他用户正在编辑，无法执行自动布局')
        return
      }
    }

    try {
      const values = autoLayoutForm.getFieldsValue()
      const options: Partial<AutoLayoutOptions> = {
        layoutType: values.layoutType,
        paddingX: values.paddingX,
        paddingY: values.paddingY,
        maxColumns: values.maxColumns
      }

      const layoutedTables = autoLayoutTables(tables, options)

      layoutedTables.forEach(table => {
        updateTablePosition(table.id, table.positionX, table.positionY)
      })

      setLayoutOptions(prev => ({ ...prev, ...options }))
      setShowAutoLayoutModal(false)
      message.success('布局整理完成')

      // 广播布局完成通知
      if (isConnected) {
        collabManager.sendCursorUpdate(-1, -1) // 触发同步
      }
    } finally {
      // 释放布局锁
      if (isConnected) {
        collabManager.releaseLock('table', 'layout')
      }
    }
  }

  const resetLayoutOptions = () => {
    autoLayoutForm.setFieldsValue(defaultLayoutOptions)
  }

  const getSelectedTableNodes = () => {
    return tables.filter(t => selectedTableIds.includes(t.id))
  }

  const alignTables = (type: 'left' | 'right' | 'top' | 'bottom' | 'hcenter' | 'vcenter' | 'hdistribute' | 'vdistribute') => {
    const nodes = getSelectedTableNodes()
    if (nodes.length < 2) { message.warning('请至少选中 2 张表'); return }

    switch (type) {
      case 'left': {
        const minX = Math.min(...nodes.map(n => n.positionX))
        nodes.forEach(n => updateTablePosition(n.id, minX, n.positionY))
        break
      }
      case 'right': {
        const maxX = Math.max(...nodes.map(n => n.positionX + NODE_WIDTH))
        nodes.forEach(n => updateTablePosition(n.id, maxX - NODE_WIDTH, n.positionY))
        break
      }
      case 'top': {
        const minY = Math.min(...nodes.map(n => n.positionY))
        nodes.forEach(n => updateTablePosition(n.id, n.positionX, minY))
        break
      }
      case 'bottom': {
        const maxY = Math.max(...nodes.map(n => n.positionY + NODE_HEIGHT))
        nodes.forEach(n => updateTablePosition(n.id, n.positionX, maxY - NODE_HEIGHT))
        break
      }
      case 'hcenter': {
        const centerX = nodes.reduce((sum, n) => sum + n.positionX + NODE_WIDTH / 2, 0) / nodes.length
        nodes.forEach(n => updateTablePosition(n.id, centerX - NODE_WIDTH / 2, n.positionY))
        break
      }
      case 'vcenter': {
        const centerY = nodes.reduce((sum, n) => sum + n.positionY + NODE_HEIGHT / 2, 0) / nodes.length
        nodes.forEach(n => updateTablePosition(n.id, n.positionX, centerY - NODE_HEIGHT / 2))
        break
      }
      case 'hdistribute': {
        const sortedByX = [...nodes].sort((a, b) => a.positionX - b.positionX)
        const leftMost = sortedByX[0].positionX
        const rightMost = sortedByX[sortedByX.length - 1].positionX + NODE_WIDTH
        const totalWidth = rightMost - leftMost
        const gap = totalWidth / nodes.length
        sortedByX.forEach((n, i) => updateTablePosition(n.id, leftMost + gap * i, n.positionY))
        break
      }
      case 'vdistribute': {
        const sortedByY = [...nodes].sort((a, b) => a.positionY - b.positionY)
        const topMost = sortedByY[0].positionY
        const bottomMost = sortedByY[sortedByY.length - 1].positionY + NODE_HEIGHT
        const totalHeight = bottomMost - topMost
        const gap = totalHeight / nodes.length
        sortedByY.forEach((n, i) => updateTablePosition(n.id, n.positionX, topMost + gap * i))
        break
      }
    }
    message.success(`已${type === 'left' ? '左对齐' : type === 'right' ? '右对齐' : type === 'top' ? '顶对齐' : type === 'bottom' ? '底对齐' : type === 'hcenter' ? '水平居中' : type === 'vcenter' ? '垂直居中' : type === 'hdistribute' ? '水平分布' : '垂直分布'} ${nodes.length} 张表`)
  }

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleGenerateDDL = async () => {
    if (currentProject) {
      const response = await projectApi.generateDDL(currentProject.id)
      if (response.success && response.data) {
        const ddl = response.data.ddl
        const blob = new Blob([ddl], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${currentProject.name}.sql`
        a.click()
        URL.revokeObjectURL(url)
      }
    }
  }

  const exportToPNG = async (diagramType: 'er' | 'class' = 'er') => {
    if (!currentProject) {
      message.error('请先选择一个项目')
      return
    }

    try {
      const svgContent = diagramType === 'er' ? generateERDiagramSVG() : generateClassDiagramSVG()
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(svgBlob)
      
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        message.error('无法创建画布上下文')
        return
      }

      img.onload = () => {
        canvas.width = img.width * 2
        canvas.height = img.height * 2
        ctx.scale(2, 2)
        ctx.fillStyle = '#fafafa'
        ctx.fillRect(0, 0, img.width, img.height)
        ctx.drawImage(img, 0, 0)
        
        const link = document.createElement('a')
        const suffix = diagramType === 'er' ? 'er-diagram' : 'class-diagram'
        link.download = `${currentProject.name || suffix}-${suffix}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        URL.revokeObjectURL(url)
        message.success(diagramType === 'er' ? 'E-R 图已导出为 PNG' : '类图已导出为 PNG')
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        message.error('PNG 导出失败，正在尝试 SVG 导出')
        exportToSVG(diagramType)
      }

      img.src = url
    } catch (error) {
      console.error('导出 PNG 失败:', error)
      message.error('导出 PNG 失败，正在尝试 SVG 导出')
      exportToSVG(diagramType)
    }
  }

  const exportToSVG = (diagramType: 'er' | 'class' = 'er') => {
    if (!currentProject) {
      message.error('没有选中的项目')
      return
    }

    try {
      const svgContent = diagramType === 'er' ? generateERDiagramSVG() : generateClassDiagramSVG()
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const suffix = diagramType === 'er' ? 'er-diagram' : 'class-diagram'
      a.href = url
      a.download = `${currentProject.name || suffix}-${suffix}.svg`
      a.click()
      URL.revokeObjectURL(url)
      message.success(diagramType === 'er' ? 'E-R 图已导出为 SVG' : '类图已导出为 SVG')
    } catch (error) {
      console.error('导出 SVG 失败:', error)
      message.error('导出 SVG 失败')
    }
  }

  const generateERDiagramSVG = (): string => {
    if (!currentProject) return ''

    // ===== 标准E-R图 (Chen Notation) 配置 =====
    // 实体=矩形(只显示表名), 属性=椭圆, 关系=菱形, 基数=连线标注
    const ER_CONFIG = {
      padding: 60,
      entityWidth: 160,            // 实体矩形宽度(只显示表名)
      entityHeight: 50,            // 实体矩形高度
      attrEllipseRx: 55,           // 属性椭圆水平半径
      attrEllipseRy: 18,           // 属性椭圆垂直半径
      attrGapY: 42,                // 属性间垂直间距
      attrOffsetX: 130,            // 属性椭圆中心到实体中心的水平偏移
      diamondHalfW: 45,            // 菱形半宽
      diamondHalfH: 30,            // 菱形半高
      entityGapX: 380,             // 实体间水平间距(留出属性空间)
      entityGapY: 80,              // 实体间垂直间距
      maxWidth: 2400,
      fontSize: {
        entity: 14,                // 实体名字号
        attr: 11,                  // 属性名字号
        diamond: 11,               // 关系名字号
        cardinality: 13,           // 基数字号
        legend: 11
      },
      colors: {
        background: '#ffffff',
        entityFill: '#dbeafe',       // 实体矩形填充(浅蓝)
        entityStroke: '#1d4ed8',     // 实体边框(蓝)
        entityText: '#1e3a8a',       // 实体文字
        attrFill: '#fef9c3',         // 属性椭圆填充(浅黄)
        attrStroke: '#a16207',       // 属性边框
        attrText: '#422006',         // 属性文字
        pkAttrStroke: '#dc2626',     // 主键属性边框(红)
        pkAttrFill: '#fee2e2',       // 主键属性填充(浅红)
        fkAttrStroke: '#16a34a',     // 外键属性边框(绿)
        fkAttrFill: '#dcfce7',       // 外键属性填充(浅绿)
        relFill: '#fed7aa',          // 关系菱形填充(浅橙)
        relStroke: '#c2410c',        // 关系边框
        relText: '#7c2d12',          // 关系文字
        line: '#475569',             // 连线
        cardinalityBg: '#ffffff',    // 基数标签背景
        shadow: 'rgba(0, 0, 0, 0.08)'
      }
    } as const

    // 收集外键字段ID
    const foreignKeyColumnIds = new Set<string>()
    relationships.forEach(rel => {
      if (rel.sourceColumnId) foreignKeyColumnIds.add(rel.sourceColumnId)
    })

    // 计算每个实体单元的尺寸(实体+属性)
    interface EntityLayout {
      id: string
      name: string
      x: number
      y: number
      width: number
      height: number
      attrs: { id: string; name: string; dataType: string; isPK: boolean; isFK: boolean; x: number; y: number }[]
    }

    const entityLayouts: EntityLayout[] = []
    let currentX = ER_CONFIG.padding
    let currentY = ER_CONFIG.padding + 70 // 留出标题空间
    let maxYInRow = 0

    tables.forEach((table) => {
      const cols = table.columns || []
      const attrCount = cols.length
      // 实体单元高度 = max(实体高度, 属性总高度)
      const unitHeight = Math.max(
        ER_CONFIG.entityHeight,
        attrCount * ER_CONFIG.attrGapY + 20
      )
      // 实体单元宽度 = 实体宽度 + 属性偏移 + 属性椭圆宽度
      const unitWidth = ER_CONFIG.entityWidth + ER_CONFIG.attrOffsetX + ER_CONFIG.attrEllipseRx * 2 + 20

      // 自动换行
      if (currentX + unitWidth > ER_CONFIG.maxWidth - ER_CONFIG.padding) {
        currentX = ER_CONFIG.padding
        currentY = maxYInRow + ER_CONFIG.entityGapY
      }

      // 实体矩形位置(居中于单元左侧)
      const entityCx = currentX + ER_CONFIG.entityWidth / 2
      const entityCy = currentY + unitHeight / 2

      // 计算属性椭圆位置(实体右侧,垂直排列)
      const attrs = cols.map((col, idx) => {
        const attrY = entityCy - (attrCount * ER_CONFIG.attrGapY) / 2 + idx * ER_CONFIG.attrGapY + ER_CONFIG.attrGapY / 2
        const attrX = entityCx + ER_CONFIG.attrOffsetX
        return {
          id: col.id,
          name: col.name,
          dataType: col.dataType,
          isPK: col.primaryKey,
          isFK: foreignKeyColumnIds.has(col.id),
          x: attrX,
          y: attrY
        }
      })

      entityLayouts.push({
        id: table.id,
        name: table.name,
        x: entityCx - ER_CONFIG.entityWidth / 2,
        y: entityCy - ER_CONFIG.entityHeight / 2,
        width: ER_CONFIG.entityWidth,
        height: ER_CONFIG.entityHeight,
        attrs
      })

      currentX += unitWidth + 40
      maxYInRow = Math.max(maxYInRow, currentY + unitHeight)
    })

    // 计算关系菱形位置
    interface RelLayout {
      id: string
      name: string
      label: string
      relType: string
      sourceCard: string
      targetCard: string
      diamondX: number
      diamondY: number
      sourceEntityId: string
      targetEntityId: string
    }

    const relLayouts: RelLayout[] = []
    relationships.forEach((rel) => {
      const source = entityLayouts.find(e => e.id === rel.sourceTableId)
      const target = entityLayouts.find(e => e.id === rel.targetTableId)
      if (!source || !target) return

      // 菱形放在两个实体中间
      const sourceCx = source.x + source.width / 2
      const sourceCy = source.y + source.height / 2
      const targetCx = target.x + target.width / 2
      const targetCy = target.y + target.height / 2

      let label = '1:N'
      let sourceCard = '1'
      let targetCard = 'N'
      switch (rel.relationshipType) {
        case 'one-to-one': label = '1:1'; sourceCard = '1'; targetCard = '1'; break
        case 'one-to-many': label = '1:N'; sourceCard = '1'; targetCard = 'N'; break
        case 'many-to-many': label = 'M:N'; sourceCard = 'M'; targetCard = 'N'; break
      }

      relLayouts.push({
        id: rel.id,
        name: rel.name || label,
        label,
        relType: rel.relationshipType || 'one-to-many',
        sourceCard,
        targetCard,
        diamondX: (sourceCx + targetCx) / 2,
        diamondY: (sourceCy + targetCy) / 2,
        sourceEntityId: rel.sourceTableId,
        targetEntityId: rel.targetTableId
      })
    })

    const svgWidth = Math.min(
      maxYInRow > ER_CONFIG.padding * 3 ? ER_CONFIG.maxWidth : currentX,
      ER_CONFIG.maxWidth
    )
    const svgHeight = maxYInRow + ER_CONFIG.padding + 60 // 底部图例空间

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}"
     style="background:${ER_CONFIG.colors.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif"
     viewBox="0 0 ${svgWidth} ${svgHeight}">
  <defs>
    <filter id="er-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${ER_CONFIG.colors.shadow}" flood-opacity="0.6"/>
    </filter>
    <style>
      .er-entity-name { fill: ${ER_CONFIG.colors.entityText}; font-size: ${ER_CONFIG.fontSize.entity}px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .er-attr-name { fill: ${ER_CONFIG.colors.attrText}; font-size: ${ER_CONFIG.fontSize.attr}px; font-family: 'SF Mono', 'Consolas', monospace; }
      .er-attr-pk { fill: ${ER_CONFIG.colors.pkAttrStroke}; font-weight: 700; text-decoration: underline; }
      .er-attr-fk { fill: ${ER_CONFIG.colors.fkAttrStroke}; font-style: italic; }
      .er-rel-name { fill: ${ER_CONFIG.colors.relText}; font-size: ${ER_CONFIG.fontSize.diamond}px; font-weight: 600; font-family: -apple-system, sans-serif; }
      .er-card { fill: ${ER_CONFIG.colors.line}; font-size: ${ER_CONFIG.fontSize.cardinality}px; font-weight: 700; font-family: -apple-system, sans-serif; }
      .er-legend { fill: #334155; font-size: ${ER_CONFIG.fontSize.legend}px; font-family: -apple-system, sans-serif; }
      .er-title { fill: #1e293b; font-size: 18px; font-weight: 700; font-family: -apple-system, sans-serif; }
      .er-subtitle { fill: #64748b; font-size: 12px; font-family: -apple-system, sans-serif; }
    </style>
  </defs>

  <!-- 标题 -->
  <text x="${ER_CONFIG.padding}" y="35" class="er-title">E-R Diagram: ${escapeXml(currentProject.name)}</text>
  <text x="${ER_CONFIG.padding}" y="52" class="er-subtitle">Entity-Relationship Diagram (Chen Notation) | ${new Date().toLocaleDateString('zh-CN')}</text>
  <line x1="${ER_CONFIG.padding}" y1="62" x2="${svgWidth - ER_CONFIG.padding}" y2="62" stroke="#e2e8f0" stroke-width="1"/>
`

    // ===== 绘制属性椭圆 + 连线(属性→实体) =====
    entityLayouts.forEach((entity) => {
      const entityCx = entity.x + entity.width / 2
      const entityCy = entity.y + entity.height / 2

      entity.attrs.forEach((attr) => {
        const fill = attr.isPK ? ER_CONFIG.colors.pkAttrFill : attr.isFK ? ER_CONFIG.colors.fkAttrFill : ER_CONFIG.colors.attrFill
        const stroke = attr.isPK ? ER_CONFIG.colors.pkAttrStroke : attr.isFK ? ER_CONFIG.colors.fkAttrStroke : ER_CONFIG.colors.attrStroke
        const textClass = attr.isPK ? 'er-attr-name er-attr-pk' : attr.isFK ? 'er-attr-name er-attr-fk' : 'er-attr-name'

        // 属性到实体的连线
        svg += `  <line x1="${attr.x - ER_CONFIG.attrEllipseRx}" y1="${attr.y}" x2="${entityCx + entity.width / 2}" y2="${entityCy}" stroke="${ER_CONFIG.colors.line}" stroke-width="1"/>
`

        // 属性椭圆
        svg += `  <ellipse cx="${attr.x}" cy="${attr.y}" rx="${ER_CONFIG.attrEllipseRx}" ry="${ER_CONFIG.attrEllipseRy}"
          fill="${fill}" stroke="${stroke}" stroke-width="1.5" filter="url(#er-shadow)"/>
  <text x="${attr.x}" y="${attr.y + 4}" class="${textClass}" text-anchor="middle">${escapeXml(attr.name)}</text>
`
      })
    })

    // ===== 绘制实体矩形 =====
    entityLayouts.forEach((entity) => {
      svg += `  <!-- 实体: ${escapeXml(entity.name)} -->
  <rect x="${entity.x}" y="${entity.y}" width="${entity.width}" height="${entity.height}"
        fill="${ER_CONFIG.colors.entityFill}" stroke="${ER_CONFIG.colors.entityStroke}" stroke-width="2.5" rx="4" filter="url(#er-shadow)"/>
  <text x="${entity.x + entity.width / 2}" y="${entity.y + entity.height / 2 + 5}" class="er-entity-name" text-anchor="middle">${escapeXml(entity.name)}</text>
`
    })

    // ===== 绘制关系菱形 + 连线 + 基数 =====
    relLayouts.forEach((rp) => {
      const source = entityLayouts.find(e => e.id === rp.sourceEntityId)
      const target = entityLayouts.find(e => e.id === rp.targetEntityId)
      if (!source || !target) return

      const sourceCx = source.x + source.width / 2
      const sourceCy = source.y + source.height / 2
      const targetCx = target.x + target.width / 2
      const targetCy = target.y + target.height / 2

      // 计算实体边界连接点
      const dx = rp.diamondX - sourceCx
      const dy = rp.diamondY - sourceCy
      const sourceEdgeX = dx > 0 ? source.x + source.width : source.x
      const sourceEdgeY = sourceCy

      const dx2 = targetCx - rp.diamondX
      const dy2 = targetCy - rp.diamondY
      const targetEdgeX = dx2 > 0 ? target.x : target.x + target.width
      const targetEdgeY = targetCy

      svg += `  <!-- 关系: ${escapeXml(rp.name)} -->
  <!-- 连线: 实体→关系 -->
  <line x1="${sourceEdgeX}" y1="${sourceEdgeY}" x2="${rp.diamondX - ER_CONFIG.diamondHalfW}" y2="${rp.diamondY}" stroke="${ER_CONFIG.colors.line}" stroke-width="2"/>

  <!-- 关系菱形 -->
  <polygon points="${rp.diamondX},${rp.diamondY - ER_CONFIG.diamondHalfH}
                   ${rp.diamondX + ER_CONFIG.diamondHalfW},${rp.diamondY}
                   ${rp.diamondX},${rp.diamondY + ER_CONFIG.diamondHalfH}
                   ${rp.diamondX - ER_CONFIG.diamondHalfW},${rp.diamondY}"
           fill="${ER_CONFIG.colors.relFill}" stroke="${ER_CONFIG.colors.relStroke}" stroke-width="2" filter="url(#er-shadow)"/>
  <text x="${rp.diamondX}" y="${rp.diamondY + 4}" class="er-rel-name" text-anchor="middle">${escapeXml(rp.label)}</text>

  <!-- 连线: 关系→实体 -->
  <line x1="${rp.diamondX + ER_CONFIG.diamondHalfW}" y1="${rp.diamondY}" x2="${targetEdgeX}" y2="${targetEdgeY}" stroke="${ER_CONFIG.colors.line}" stroke-width="2"/>

  <!-- 基数标注: 源端 -->
  <circle cx="${sourceEdgeX + (rp.diamondX - sourceEdgeX) * 0.3}" cy="${sourceEdgeY + (rp.diamondY - sourceEdgeY) * 0.3}" r="11" fill="${ER_CONFIG.colors.cardinalityBg}" stroke="${ER_CONFIG.colors.line}" stroke-width="1.5"/>
  <text x="${sourceEdgeX + (rp.diamondX - sourceEdgeX) * 0.3}" y="${sourceEdgeY + (rp.diamondY - sourceEdgeY) * 0.3 + 4}" class="er-card" text-anchor="middle">${rp.sourceCard}</text>

  <!-- 基数标注: 目标端 -->
  <circle cx="${targetEdgeX + (rp.diamondX - targetEdgeX) * 0.7}" cy="${targetEdgeY + (rp.diamondY - targetEdgeY) * 0.7}" r="11" fill="${ER_CONFIG.colors.cardinalityBg}" stroke="${ER_CONFIG.colors.line}" stroke-width="1.5"/>
  <text x="${targetEdgeX + (rp.diamondX - targetEdgeX) * 0.7}" y="${targetEdgeY + (rp.diamondY - targetEdgeY) * 0.7 + 4}" class="er-card" text-anchor="middle">${rp.targetCard}</text>
`
    })

    // ===== 图例 =====
    const legendY = svgHeight - 50
    svg += `  <!-- 图例 -->
  <g transform="translate(${ER_CONFIG.padding}, ${legendY})">
    <rect x="0" y="0" width="${svgWidth - ER_CONFIG.padding * 2}" height="40" fill="rgba(255,255,255,0.98)" stroke="#cbd5e1" stroke-width="1" rx="6"/>
    <text x="16" y="25" class="er-legend" font-weight="600">E-R图符号:</text>
    <rect x="90" y="13" width="28" height="18" fill="${ER_CONFIG.colors.entityFill}" stroke="${ER_CONFIG.colors.entityStroke}" stroke-width="2" rx="3"/>
    <text x="126" y="26" class="er-legend">实体</text>
    <ellipse cx="190" cy="22" rx="22" ry="12" fill="${ER_CONFIG.colors.attrFill}" stroke="${ER_CONFIG.colors.attrStroke}" stroke-width="1.5"/>
    <text x="220" y="26" class="er-legend">属性</text>
    <ellipse cx="290" cy="22" rx="22" ry="12" fill="${ER_CONFIG.colors.pkAttrFill}" stroke="${ER_CONFIG.colors.pkAttrStroke}" stroke-width="1.5"/>
    <text x="320" y="26" class="er-legend">主键属性(下划线)</text>
    <ellipse cx="450" cy="22" rx="22" ry="12" fill="${ER_CONFIG.colors.fkAttrFill}" stroke="${ER_CONFIG.colors.fkAttrStroke}" stroke-width="1.5"/>
    <text x="480" y="26" class="er-legend">外键属性</text>
    <polygon points="580,22 600,10 620,22 600,34" fill="${ER_CONFIG.colors.relFill}" stroke="${ER_CONFIG.colors.relStroke}" stroke-width="1.5"/>
    <text x="630" y="26" class="er-legend">关系</text>
    <circle cx="700" cy="22" r="9" fill="#fff" stroke="${ER_CONFIG.colors.line}" stroke-width="1.5"/>
    <text x="700" y="26" class="er-card" text-anchor="middle" font-size="11">N</text>
    <text x="718" y="26" class="er-legend">基数</text>
  </g>
`

    svg += '</svg>'
    return svg
  }

  // ===== 生成UML类图 (Class Diagram) =====
  const generateClassDiagramSVG = (): string => {
    if (!currentProject) return ''

    const CLASS_CONFIG = {
      padding: 80,
      classWidth: 280,
      headerHeight: 44,
      columnHeight: 26,
      separatorHeight: 8,
      gapX: 100,
      gapY: 80,
      maxWidth: 1600,
      fontSize: {
        title: 15,
        column: 12,
        type: 11,
        legend: 11
      },
      colors: {
        background: '#ffffff',
        classFill: '#fafafa',
        classStroke: '#475569',
        headerBg: '#334155',
        headerText: '#ffffff',
        text: '#1e293b',
        textSecondary: '#64748b',
        pkText: '#b45309',
        fkText: '#15803d',
        line: '#64748b',
        pkBg: '#fef3c7',
        fkBg: '#dcfce7',
        oddRow: '#f8fafc',
        evenRow: '#ffffff',
        shadow: 'rgba(0, 0, 0, 0.06)'
      }
    } as const

    const positions: { [key: string]: { x: number; y: number; width: number; height: number } } = {}
    let currentX = CLASS_CONFIG.padding
    let currentY = CLASS_CONFIG.padding
    let maxYInRow = 0

    tables.forEach((table) => {
      const colCount = table.columns?.length || 0
      const height = Math.max(
        CLASS_CONFIG.headerHeight + 40,
        CLASS_CONFIG.headerHeight + colCount * CLASS_CONFIG.columnHeight + CLASS_CONFIG.separatorHeight + 10
      )
      const width = CLASS_CONFIG.classWidth

      if (currentX + width > CLASS_CONFIG.maxWidth - CLASS_CONFIG.padding) {
        currentX = CLASS_CONFIG.padding
        currentY = maxYInRow + CLASS_CONFIG.gapY
      }

      positions[table.id] = { x: currentX, y: currentY, width, height }
      currentX += width + CLASS_CONFIG.gapX
      maxYInRow = Math.max(maxYInRow, currentY + height)
    })

    const foreignKeyColumnIds = new Set<string>()
    relationships.forEach(rel => {
      if (rel.sourceColumnId) {
        foreignKeyColumnIds.add(rel.sourceColumnId)
      }
    })

    const svgWidth = Math.min(
      maxYInRow > CLASS_CONFIG.padding * 3 ? CLASS_CONFIG.maxWidth : currentX,
      CLASS_CONFIG.maxWidth
    )
    const svgHeight = maxYInRow + CLASS_CONFIG.padding * 2

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}"
     style="background:${CLASS_CONFIG.colors.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif"
     viewBox="0 0 ${svgWidth} ${svgHeight}">
  <defs>
    <filter id="cls-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${CLASS_CONFIG.colors.shadow}" flood-opacity="0.8"/>
    </filter>
    <linearGradient id="cls-header-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#475569;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#334155;stop-opacity:1" />
    </linearGradient>
    <marker id="cls-arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${CLASS_CONFIG.colors.line}"/>
    </marker>
    <marker id="cls-diamond" viewBox="0 0 12 12" refX="11" refY="6"
            markerWidth="10" markerHeight="10" orient="auto">
      <path d="M 0 6 L 6 0 L 12 6 L 6 12 z" fill="${CLASS_CONFIG.colors.line}" stroke="${CLASS_CONFIG.colors.line}" stroke-width="1"/>
    </marker>
    <style>
      .cls-title { fill: ${CLASS_CONFIG.colors.headerText}; font-size: ${CLASS_CONFIG.fontSize.title}px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .cls-attr { fill: ${CLASS_CONFIG.colors.text}; font-size: ${CLASS_CONFIG.fontSize.column}px; font-family: 'SF Mono', 'Consolas', monospace; }
      .cls-type { fill: ${CLASS_CONFIG.colors.textSecondary}; font-size: ${CLASS_CONFIG.fontSize.type}px; font-family: 'SF Mono', 'Consolas', monospace; }
      .cls-pk { fill: ${CLASS_CONFIG.colors.pkText}; font-weight: 700; }
      .cls-fk { fill: ${CLASS_CONFIG.colors.fkText}; font-style: italic; }
      .cls-rel-label { fill: ${CLASS_CONFIG.colors.textSecondary}; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .cls-legend { fill: ${CLASS_CONFIG.colors.text}; font-size: ${CLASS_CONFIG.fontSize.legend}px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .cls-diagram-title { fill: #1e293b; font-size: 18px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .cls-diagram-subtitle { fill: #64748b; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    </style>
  </defs>
`

    // 标题
    svg += `
  <text x="${CLASS_CONFIG.padding}" y="35" class="cls-diagram-title">Class Diagram: ${escapeXml(currentProject.name)}</text>
  <text x="${CLASS_CONFIG.padding}" y="52" class="cls-diagram-subtitle">UML Class Diagram | Generated on ${new Date().toLocaleDateString('zh-CN')}</text>
  <line x1="${CLASS_CONFIG.padding}" y1="62" x2="${svgWidth - CLASS_CONFIG.padding}" y2="62" stroke="#e2e8f0" stroke-width="1"/>
`

    // 绘制类（表）节点
    tables.forEach((table, tableIdx) => {
      const pos = positions[table.id]
      if (!pos) return

      const bgColor = tableIdx % 2 === 0 ? CLASS_CONFIG.colors.evenRow : CLASS_CONFIG.colors.oddRow

      svg += `
  <!-- ========== Class: ${escapeXml(table.name)} ========== -->
  <g filter="url(#cls-shadow)">
    <rect x="${pos.x}" y="${pos.y}" width="${pos.width}" height="${pos.height}"
          fill="${bgColor}" stroke="${CLASS_CONFIG.colors.classStroke}" stroke-width="1.5" rx="4"/>

    <!-- 类名区域 -->
    <rect x="${pos.x}" y="${pos.y}" width="${pos.width}" height="${CLASS_CONFIG.headerHeight}"
          fill="url(#cls-header-grad)" rx="4" ry="4"/>
    <path d="M ${pos.x} ${pos.y + CLASS_CONFIG.headerHeight - 4}
             Q ${pos.x} ${pos.y + CLASS_CONFIG.headerHeight} ${pos.x + 4} ${pos.y + CLASS_CONFIG.headerHeight}
             L ${pos.x + pos.width - 4} ${pos.y + CLASS_CONFIG.headerHeight}
             Q ${pos.x + pos.width} ${pos.y + CLASS_CONFIG.headerHeight} ${pos.x + pos.width} ${pos.y + CLASS_CONFIG.headerHeight - 4}"
          fill="url(#cls-header-grad)"/>

    <text x="${pos.x + pos.width / 2}" y="${pos.y + 28}" class="cls-title" text-anchor="middle">${escapeXml(table.name)}</text>

    <!-- 分隔线 -->
    <line x1="${pos.x}" y1="${pos.y + CLASS_CONFIG.headerHeight}" x2="${pos.x + pos.width}" y2="${pos.y + CLASS_CONFIG.headerHeight}" stroke="${CLASS_CONFIG.colors.classStroke}" stroke-width="1"/>
`

      // 属性列表
      let fieldY = pos.y + CLASS_CONFIG.headerHeight + 18

      table.columns?.forEach((col, idx) => {
        const isPK = col.primaryKey
        const isFK = foreignKeyColumnIds.has(col.id)
        const rowBg = idx % 2 === 0 ? 'rgba(148,163,184,0.06)' : 'transparent'

        svg += `    <rect x="${pos.x + 1}" y="${fieldY - 14}" width="${pos.width - 2}" height="${CLASS_CONFIG.columnHeight}" fill="${rowBg}"/>
`

        // 可见性符号: PK用+，FK用#，其他用-
        let visibility = '- '
        if (isPK) visibility = '+ '
        else if (isFK) visibility = '# '

        const textClass = isPK ? 'cls-attr cls-pk' : isFK ? 'cls-attr cls-fk' : 'cls-attr'
        let keyLabel = ''
        if (isPK) keyLabel = ' {PK}'
        if (isFK) keyLabel = ' {FK}'

        svg += `    <text x="${pos.x + 12}" y="${fieldY}" class="${textClass}">${visibility}${escapeXml(col.name)}${keyLabel}</text>
    <text x="${pos.x + pos.width - 12}" y="${fieldY}" class="cls-type" text-anchor="end">${escapeXml(col.dataType)}</text>
`
        fieldY += CLASS_CONFIG.columnHeight
      })

      svg += `  </g>
`
    })

    // 绘制关系连线（UML风格：直线+箭头/菱形）
    relationships.forEach((rel) => {
      const sourcePos = positions[rel.sourceTableId]
      const targetPos = positions[rel.targetTableId]
      if (!sourcePos || !targetPos) return

      const sourceCx = sourcePos.x + sourcePos.width / 2
      const sourceCy = sourcePos.y + sourcePos.height / 2
      const targetCx = targetPos.x + targetPos.width / 2
      const targetCy = targetPos.y + targetPos.height / 2

      // 计算边界交点
      const dx = targetCx - sourceCx
      const dy = targetCy - sourceCy
      const sx = dx > 0 ? sourcePos.x + sourcePos.width : sourcePos.x
      const sy = sourceCy
      const tx = dx > 0 ? targetPos.x : targetPos.x + targetPos.width
      const ty = targetCy

      let relLabel = '1..*'
      let markerEnd = 'url(#cls-arrow)'
      switch (rel.relationshipType) {
        case 'one-to-one':
          relLabel = '1..1'
          markerEnd = 'url(#cls-arrow)'
          break
        case 'one-to-many':
          relLabel = '1..*'
          markerEnd = 'url(#cls-arrow)'
          break
        case 'many-to-many':
          relLabel = '*..*'
          markerEnd = 'url(#cls-diamond)'
          break
        default:
          relLabel = '1..*'
      }

      const midX = (sx + tx) / 2
      const midY = (sy + ty) / 2

      svg += `
  <!-- 关系: ${escapeXml(rel.name || '')} -->
  <line x1="${sx}" y1="${sy}" x2="${tx}" y2="${ty}"
        stroke="${CLASS_CONFIG.colors.line}" stroke-width="1.5" marker-end="${markerEnd}"/>
  <rect x="${midX - 30}" y="${midY - 10}" width="60" height="18" fill="white" stroke="${CLASS_CONFIG.colors.line}" stroke-width="0.5" rx="3"/>
  <text x="${midX}" y="${midY + 3}" class="cls-rel-label" text-anchor="middle">${relLabel}</text>
`
    })

    // 图例
    const legendY = svgHeight - 55
    svg += `
  <!-- ========== 类图图例 ========== -->
  <g transform="translate(${CLASS_CONFIG.padding}, ${legendY})">
    <rect x="0" y="0" width="${svgWidth - CLASS_CONFIG.padding * 2}" height="42"
          fill="rgba(255,255,255,0.98)" stroke="#cbd5e1" stroke-width="1" rx="6"/>
    <text x="16" y="26" class="cls-legend" font-weight="600">类图符号:</text>
    <rect x="90" y="14" width="24" height="16" fill="${CLASS_CONFIG.colors.classFill}" stroke="${CLASS_CONFIG.colors.classStroke}" stroke-width="1.5" rx="3"/>
    <text x="122" y="26" class="cls-legend">类 (Class/表)</text>
    <text x="220" y="26" class="cls-legend cls-pk">+ PK</text>
    <text x="260" y="26" class="cls-legend">主键属性</text>
    <text x="340" y="26" class="cls-legend cls-fk"># FK</text>
    <text x="380" y="26" class="cls-legend">外键属性</text>
    <line x1="460" y1="22" x2="500" y2="22" stroke="${CLASS_CONFIG.colors.line}" stroke-width="1.5" marker-end="url(#cls-arrow)"/>
    <text x="510" y="26" class="cls-legend">关联 (1:N)</text>
    <line x1="600" y1="22" x2="640" y2="22" stroke="${CLASS_CONFIG.colors.line}" stroke-width="1.5" marker-end="url(#cls-diamond)"/>
    <text x="652" y="26" class="cls-legend">聚合 (M:N)</text>
  </g>
`

    svg += '</svg>'
    return svg
  }

  // XML转义函数，防止XSS攻击
  const escapeXml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const exportMenuItems = useMemo(() => [
    {
      key: 'er-group',
      label: 'E-R 图',
      children: [
        {
          key: 'er-png',
          icon: <FileImageOutlined />,
          label: '导出为 PNG',
          onClick: () => exportToPNG('er')
        },
        {
          key: 'er-svg',
          icon: <PictureOutlined />,
          label: '导出为 SVG',
          onClick: () => exportToSVG('er')
        }
      ]
    },
    {
      key: 'class-group',
      label: '类图 (UML)',
      children: [
        {
          key: 'class-png',
          icon: <FileImageOutlined />,
          label: '导出为 PNG',
          onClick: () => exportToPNG('class')
        },
        {
          key: 'class-svg',
          icon: <PictureOutlined />,
          label: '导出为 SVG',
          onClick: () => exportToSVG('class')
        }
      ]
    }
  ], [])

  const alignMenuItems = useMemo(() => [
    { key: 'left', label: '左对齐', icon: <AlignLeftOutlined />, disabled: selectedTableIds.length < 2, onClick: () => alignTables('left') },
    { key: 'hcenter', label: '水平居中', icon: <AlignCenterOutlined />, disabled: selectedTableIds.length < 2, onClick: () => alignTables('hcenter') },
    { key: 'right', label: '右对齐', icon: <AlignRightOutlined />, disabled: selectedTableIds.length < 2, onClick: () => alignTables('right') },
    { type: 'divider' as const },
    { key: 'top', label: '顶对齐', icon: <VerticalAlignTopOutlined />, disabled: selectedTableIds.length < 2, onClick: () => alignTables('top') },
    { key: 'vcenter', label: '垂直居中', icon: <VerticalAlignMiddleOutlined />, disabled: selectedTableIds.length < 2, onClick: () => alignTables('vcenter') },
    { key: 'bottom', label: '底对齐', icon: <VerticalAlignBottomOutlined />, disabled: selectedTableIds.length < 2, onClick: () => alignTables('bottom') },
    { type: 'divider' as const },
    { key: 'hdistribute', label: '水平分布', icon: <ColumnWidthOutlined />, disabled: selectedTableIds.length < 3, onClick: () => alignTables('hdistribute') },
    { key: 'vdistribute', label: '垂直分布', icon: <VerticalAlignTopOutlined />, disabled: selectedTableIds.length < 3, onClick: () => alignTables('vdistribute') }
  ], [selectedTableIds.length])

  const marqueeModeMenuItems = useMemo(() => [
    { key: 'contains', label: '包含选择', onClick: () => setMarqueeMode('contains') },
    { key: 'intersect', label: '相交选择', onClick: () => setMarqueeMode('intersect') }
  ], [])

  return (
    <>
      <div style={{ display: 'none' }}>
        <Form form={autoLayoutForm} layout="vertical">
          <Form.Item name="layoutType"><Input /></Form.Item>
          <Form.Item name="paddingX"><Input /></Form.Item>
          <Form.Item name="paddingY"><Input /></Form.Item>
          <Form.Item name="maxColumns"><Input /></Form.Item>
        </Form>
      </div>
      <div style={{ height: '100%', width: '100%', position: 'relative' }} ref={reactFlowWrapper}>
        <div style={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          zIndex: 10,
          background: 'var(--theme-card)',
          borderRadius: 8,
          border: '1px solid var(--theme-border)',
          boxShadow: '0 2px 8px var(--theme-shadow)',
          padding: '4px 8px'
        }}>
          <AutoComplete
            style={{ width: 180 }}
            value={searchText}
            onSearch={setSearchText}
            onSelect={(id) => {
              const table = tables.find(t => t.id === id)
              if (table) {
                selectTable(id)
                reactFlow?.fitView({ nodes: [{ id }], padding: 0.3, duration: 300 })
                setSearchText('')
              }
            }}
            options={searchText ? tables
              .filter(t => t.name.toLowerCase().includes(searchText.toLowerCase()))
              .map(t => ({ value: t.id, label: t.name }))
              : []}
            placeholder="搜索表..."
            allowClear
          >
            <Input 
              prefix={<SearchOutlined style={{ color: '#999', fontSize: 12 }} />} 
              allowClear 
              size="small"
              style={{ border: 'none', boxShadow: 'none' }}
            />
          </AutoComplete>
        </div>
        <div style={{ 
          position: 'absolute', 
          top: 16, 
          left: 16, 
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--theme-card)',
          borderRadius: 8,
          border: '1px solid var(--theme-border)',
          boxShadow: '0 2px 8px var(--theme-shadow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal} size="small" disabled={!canEdit}>
              新建表
            </Button>
            <Button icon={<LinkOutlined />} onClick={() => setIsRelationshipEditorOpen(true)} size="small" disabled={!canEdit}>
              关系管理
            </Button>
            <Button icon={<SettingOutlined />} onClick={handleAutoLayout} size="small">
              自动布局
            </Button>
            {currentProjectRole && currentProjectRole !== 'owner' && (
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: currentProjectRole === 'viewer' ? '#fff1f0' : '#e6f7ff',
                color: currentProjectRole === 'viewer' ? '#cf1322' : '#096dd9',
                border: `1px solid ${currentProjectRole === 'viewer' ? '#ffa39e' : '#91d5ff'}`,
                whiteSpace: 'nowrap',
              }}>
                {currentProjectRole === 'viewer' ? '只读' : '编辑者'}
              </span>
            )}
          </div>
          
          <Divider type="vertical" style={{ height: 28, margin: '0 2px' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Button
              icon={<AimOutlined />}
              size="small"
              type={snapToGrid ? 'primary' : 'default'}
              onClick={() => setSnapToGrid(!snapToGrid)}
              title={snapToGrid ? '关闭网格吸附' : '开启网格吸附'}
            />
            <Button
              icon={<CompressOutlined />}
              size="small"
              onClick={() => {
                if (selectedTableIds.length > 0) {
                  reactFlow?.fitView({ nodes: selectedTableIds.map(id => ({ id })), padding: 0.15 })
                } else {
                  reactFlow?.fitView({ padding: 0.1, includeHiddenNodes: false })
                }
              }}
              title={selectedTableIds.length > 0 ? `缩放至选区` : '缩放至适配'}
            />
            <Dropdown
              menu={{
                items: alignMenuItems
              }}
              placement="bottomLeft"
            >
              <Button icon={<AlignCenterOutlined />} size="small" title={selectedTableIds.length >= 2 ? `对齐` : '请先选中至少 2 张表'} disabled={selectedTableIds.length < 2} />
            </Dropdown>
            <Button
              icon={<UndoOutlined />}
              size="small"
              disabled={!canUndo()}
              onClick={() => undo()}
              title="撤销 (Ctrl+Z)"
            />
            <Button
              icon={<RedoOutlined />}
              size="small"
              disabled={!canRedo()}
              onClick={() => redo()}
              title="重做 (Ctrl+Shift+Z)"
            />
          </div>
          
          <Divider type="vertical" style={{ height: 28, margin: '0 2px' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Dropdown menu={{ items: exportMenuItems }} placement="bottomLeft">
              <Button icon={<ExportOutlined />} size="small" title="导出" />
            </Dropdown>
            <Button icon={<CodeOutlined />} onClick={handleGenerateDDL} size="small" title="导出DDL" />
            <Dropdown 
              menu={{ 
                items: marqueeModeMenuItems,
                selectedKeys: [marqueeMode]
              }} 
              placement="bottomLeft"
            >
              <Button icon={<LockOutlined />} size="small" title={marqueeMode === 'contains' ? '包含选择' : '相交选择'} />
            </Dropdown>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 10,
              background: isConnected ? 'rgba(82,196,26,0.08)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${isConnected ? '#52c41a' : 'rgba(0,0,0,0.06)'}`,
              fontSize: 11,
              color: isConnected ? '#52c41a' : '#999',
              transition: 'all 0.3s ease'
            }}>
              <WifiOutlined style={{ fontSize: 11 }} />
              <span>{isConnected ? '已连接' : '未连接'}</span>
              {isConnected && onlineUsers.length > 1 && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  padding: '1px 5px',
                  borderRadius: 8,
                  background: '#52c41a',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 500
                }}>
                  <TeamOutlined style={{ fontSize: 8 }} />
                  {onlineUsers.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 批量操作提示 */}
        {showBatchActions && selectedTableIds.length > 1 && (
          <div style={{ 
            position: 'absolute', 
            top: 60, 
            left: 16, 
            zIndex: 10,
            background: 'var(--theme-card)',
            border: '1px solid var(--theme-border)',
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: '0 2px 8px var(--theme-shadow)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <span style={{ fontSize: 12, color: 'var(--theme-text-secondary)' }}>
              已选择 <strong style={{ color: 'var(--theme-primary)' }}>{selectedTableIds.length}</strong> 张表
            </span>
            <div style={{ height: 20, width: 1, background: 'var(--theme-border)' }} />
            <Button 
              type="text" 
              danger 
              size="small" 
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
            >
              批量删除
            </Button>
            <Button 
              type="text" 
              size="small" 
              onClick={clearSelectedTables}
            >
              取消选择
            </Button>
          </div>
        )}

        {selectedEdgeId && (
          <div style={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: '#fff',
            border: '1px solid #1890ff',
            borderRadius: 8,
            padding: '6px 16px',
            boxShadow: '0 2px 8px rgba(24,144,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <span style={{ fontSize: 12, color: '#1890ff', fontWeight: 500 }}>
              已选中关系线
            </span>
            <div style={{ height: 16, width: 1, background: '#e8e8e8' }} />
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => {
                const rel = relationships.find(r => r.id === selectedEdgeId)
                Modal.confirm({
                  title: '确认删除关系',
                  content: `确定要删除关系吗？`,
                  okText: '删除',
                  cancelText: '取消',
                  okType: 'danger',
                  onOk: async () => {
                    await deleteRelationship(selectedEdgeId)
                    setSelectedEdgeId(null)
                  }
                })
              }}
            >
              删除关系
            </Button>
            <Button
              type="text"
              size="small"
              onClick={() => setSelectedEdgeId(null)}
            >
              取消
            </Button>
          </div>
        )}

        <DragInfoTooltip dragInfo={dragInfo} snapToGrid={snapToGrid} />

        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⌨️ 键盘快捷键</span>
              <span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>按 ? 键随时打开</span>
            </div>
          }
          open={showShortcuts}
          onCancel={() => setShowShortcuts(false)}
          footer={null}
          width={560}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {SHORTCUT_GROUPS.map(group => (
              <div key={group.title}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#333',
                  marginBottom: 8,
                  paddingBottom: 6,
                  borderBottom: '1px solid #f0f0f0'
                }}>{group.title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px' }}>
                  {group.items.map(item => (
                    <React.Fragment key={item.key}>
                      <kbd style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        fontSize: 11,
                        fontFamily: 'monospace',
                        background: '#f5f5f5',
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}>{item.key}</kbd>
                      <span style={{ fontSize: 13, color: '#555', lineHeight: '24px' }}>{item.desc}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>

        <Modal
          title="编辑关系"
          open={!!editingRelId}
          onCancel={() => setEditingRelId(null)}
          onOk={handleUpdateRel}
          okText="保存"
          cancelText="取消"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>关系名称</div>
              <Input
                placeholder="可选，例如 fk_order_user"
                value={editRelName}
                onChange={(e) => setEditRelName(e.target.value)}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>关系类型</div>
              <Select
                style={{ width: '100%' }}
                value={editRelType}
                onChange={setEditRelType}
                options={REL_TYPE_OPTIONS}
              />
            </div>
          </div>
        </Modal>

        <Modal
          title="创建关系"
          open={!!connectSource && !!connectTarget}
          onCancel={() => { setConnectSource(null); setConnectTarget(null) }}
          onOk={handleConfirmConnect}
          okText="创建关系"
          cancelText="取消"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', fontSize: 14, color: '#666' }}>
              {connectSource?.tableName} <span style={{ color: '#1890ff', margin: '0 8px' }}>→</span> {connectTarget?.tableName}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>源列 (外键)</div>
                <Select
                  style={{ width: '100%' }}
                  value={connectSourceCol || undefined}
                  onChange={setConnectSourceCol}
                  options={tables.find(t => t.id === connectSource?.tableId)?.columns.map(c => ({
                    label: `${c.name} (${c.dataType})`, value: c.id
                  })) || []}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>目标列 (引用)</div>
                <Select
                  style={{ width: '100%' }}
                  value={connectTargetCol || undefined}
                  onChange={setConnectTargetCol}
                  options={tables.find(t => t.id === connectTarget?.tableId)?.columns.map(c => ({
                    label: `${c.name} (${c.dataType})${c.primaryKey ? ' 🔑' : ''}`, value: c.id
                  })) || []}
                />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>关系类型</div>
              <Select
                style={{ width: '100%' }}
                value={connectRelType}
                onChange={setConnectRelType}
                options={REL_TYPE_OPTIONS}
              />
            </div>
          </div>
        </Modal>

        {marqueeActive && (
          <div
            style={{
              position: 'absolute',
              top: Math.min(marqueeStart.y, marqueeEnd.y),
              left: Math.min(marqueeStart.x, marqueeEnd.x),
              width: Math.abs(marqueeEnd.x - marqueeStart.x),
              height: Math.abs(marqueeEnd.y - marqueeStart.y),
              border: '2px dashed #1890ff',
              backgroundColor: 'rgba(24, 144, 255, 0.1)',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          />
        )}

        <ReactFlow
          nodes={nodeState}
          edges={displayEdges}
          onNodesChange={onNodeChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeMouseEnter={(e, node) => setHoveredNodeId(node.id)}
          onNodeMouseLeave={() => setHoveredNodeId(null)}
          onEdgeMouseEnter={(e, edge) => setHoveredEdgeId(edge.id)}
          onEdgeMouseLeave={() => setHoveredEdgeId(null)}
          onEdgeClick={onEdgeClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onEdgeContextMenu={onEdgeContextMenu}
          onConnect={onConnect}
          onPaneClick={onPaneClick}
          onMoveEnd={onMoveEnd}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          style={{ background: 'var(--theme-background)', width: '100%', height: '100%' }}
          nodesDraggable={!isLocked}
          onMouseDown={onPaneMouseDown}
          onMouseMove={onPaneMouseMove}
          onMouseUp={onPaneMouseUp}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <Background
            color={snapToGrid ? '#e0e0e0' : '#f0f0f0'}
            gap={snapToGrid ? gridSize : 24}
            size={snapToGrid ? 1 : 2}
          />
          {snapToGrid && <GridOverlay snapToGrid={snapToGrid} gridSize={gridSize} />}
          <div style={{ 
            position: 'absolute', 
            top: 60, 
            right: 10, 
            zIndex: 100,
            background: 'var(--theme-card)',
            borderRadius: 8,
            padding: 4,
            boxShadow: '0 2px 8px var(--theme-shadow)',
            border: '1px solid var(--theme-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <Button
              type="text"
              icon={<ZoomInOutlined style={{ fontSize: 14 }} />}
              onClick={() => setCanvasZoom(Math.min(canvasZoom + 0.1, 2))}
              disabled={isLocked}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                padding: 0,
                margin: 0,
                color: isLocked ? '#ccc' : '#666'
              }}
              title="放大"
            />
            <Button
              type="text"
              icon={<ZoomOutOutlined style={{ fontSize: 14 }} />}
              onClick={() => setCanvasZoom(Math.max(canvasZoom - 0.1, 0.5))}
              disabled={isLocked}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                padding: 0,
                margin: 0,
                color: isLocked ? '#ccc' : '#666'
              }}
              title="缩小"
            />
            <div style={{ height: 4, borderTop: '1px solid #f0f0f0', margin: '2px 0' }} />
            <Button
              type="text"
              icon={<RotateLeftOutlined style={{ fontSize: 14 }} />}
              onClick={() => setCanvasZoom(1)}
              disabled={isLocked}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                padding: 0,
                margin: 0,
                color: isLocked ? '#ccc' : '#666'
              }}
              title="重置缩放"
            />
            <Button
              type="text"
              icon={<CompressOutlined style={{ fontSize: 14 }} />}
              onClick={() => reactFlow?.fitView()}
              disabled={isLocked}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                padding: 0,
                margin: 0,
                color: isLocked ? '#ccc' : '#666'
              }}
              title="适应视图"
            />
            <Button
              type="text"
              icon={<AimOutlined style={{ fontSize: 14 }} />}
              onClick={() => {
                reactFlow?.setViewport({ x: 0, y: 0, zoom: canvasZoom })
              }}
              disabled={isLocked}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                padding: 0,
                margin: 0,
                color: isLocked ? '#ccc' : '#666'
              }}
              title="居中"
            />
            <div style={{ height: 4, borderTop: '1px solid #f0f0f0', margin: '2px 0' }} />
            <Button
              type="text"
              icon={<LockOutlined style={{ fontSize: 14 }} />}
              onClick={() => setIsLocked(!isLocked)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                padding: 0,
                margin: 0,
                color: isLocked ? '#1890ff' : '#666',
                backgroundColor: isLocked ? '#e6f7ff' : 'transparent'
              }}
              title={isLocked ? '解锁' : '锁定'}
            />
          </div>
          {showMiniMap && (
            <MiniMap
              style={{
                position: 'absolute',
                bottom: 50,
                right: 10,
                border: '1px solid var(--theme-border)',
                borderRadius: 8,
                width: 150,
                height: 100,
                boxShadow: '0 2px 8px var(--theme-shadow)',
                background: 'var(--theme-card)'
              }}
              nodeColor={(node) => '#1890ff'}
              maskColor="rgba(24,144,255,0.1)"
            />
          )}
          {isConnected && <CollabCursors />}
        </ReactFlow>

        <div style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          background: 'var(--theme-card)',
          borderRadius: 8,
          padding: '6px 12px',
          boxShadow: '0 2px 8px var(--theme-shadow)',
          border: '1px solid var(--theme-border)',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 100
        }}>
          <Dropdown
            menu={{
              items: ZOOM_PRESETS.map(p => ({
                key: `${p}%`,
                label: `${p}%`,
                onClick: () => setCanvasZoom(p / 100)
              }))
            }}
          >
            <span style={{ cursor: 'pointer', fontWeight: 500, color: '#1890ff' }}>
              {(canvasZoom * 100).toFixed(0)}%
            </span>
          </Dropdown>
        </div>
      </div>

      <CreateTableModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <RelationshipEditor
        visible={isRelationshipEditorOpen}
        onClose={() => setIsRelationshipEditorOpen(false)}
      />

      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>自动布局</span>
          </Space>
        }
        open={showAutoLayoutModal}
        onCancel={() => setShowAutoLayoutModal(false)}
        footer={null}
        width={500}
      >
        <Form form={autoLayoutForm} layout="vertical" initialValues={defaultLayoutOptions}>
          <Card size="small" title="布局类型" style={{ marginBottom: 16 }}>
            <Form.Item name="layoutType">
              <Radio.Group>
                <Radio.Button value="grid">网格布局</Radio.Button>
                <Radio.Button value="hierarchical">层级布局</Radio.Button>
                <Radio.Button value="compact">紧凑布局</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Card>

          <Card size="small" title="布局选项" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item label="水平间距" name="paddingX">
                <Slider min={20} max={150} />
              </Form.Item>
              <Form.Item label="垂直间距" name="paddingY">
                <Slider min={20} max={150} />
              </Form.Item>
              <Form.Item label="最大列数" name="maxColumns">
                <Select style={{ width: '100%' }}>
                  <Select.Option value={2}>2 列</Select.Option>
                  <Select.Option value={3}>3 列</Select.Option>
                  <Select.Option value={4}>4 列</Select.Option>
                  <Select.Option value={5}>5 列</Select.Option>
                  <Select.Option value={6}>6 列</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <Button onClick={resetLayoutOptions}>
              默认
            </Button>
            <Space>
              <Button onClick={() => setShowAutoLayoutModal(false)}>
                取消
              </Button>
              <Button type="primary" onClick={applyAutoLayout}>
                应用
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <Dropdown
        menu={{
          items: [
            { key: 'editRel', label: '编辑关系', icon: <EditOutlined /> },
            { key: 'deleteRel', label: '删除关系', icon: <DeleteOutlined />, danger: true }
          ],
          onClick: handleEdgeMenuClick
        }}
        open={!!edgeContextMenuPos}
        onOpenChange={(open) => !open && setEdgeContextMenuPos(null)}
      >
        {edgeContextMenuPos && (
          <div style={{
            position: 'fixed',
            top: edgeContextMenuPos.y,
            left: edgeContextMenuPos.x,
            width: 0,
            height: 0,
            pointerEvents: 'none'
          }} />
        )}
      </Dropdown>
    </>
  )
}

const Canvas: React.FC = () => (
  <ReactFlowProvider>
    <CanvasContent />
  </ReactFlowProvider>
)

export default Canvas
