import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  OnSelectionChangeParams
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Table, Relationship } from '../types'
import TableNode from './TableNode'
import RelationshipEditor from './RelationshipEditor'
import { useAppStore } from '../stores/appStore'
import { Button, Space, Dropdown, message, Modal, Form, Card, Radio, Slider, Select, Input, Popconfirm, AutoComplete, Tooltip } from 'antd'
import { PlusOutlined, CodeOutlined, LinkOutlined, ExportOutlined, PictureOutlined, FileImageOutlined, SettingOutlined, ZoomInOutlined, ZoomOutOutlined, RotateLeftOutlined, CompressOutlined, AimOutlined, LockOutlined, DeleteOutlined, CheckSquareOutlined, BorderOutlined, SearchOutlined, CloseCircleFilled, CopyOutlined, AlignLeftOutlined, AlignRightOutlined, AlignCenterOutlined, VerticalAlignTopOutlined, VerticalAlignBottomOutlined, UndoOutlined, RedoOutlined } from '@ant-design/icons'
import CreateTableModal from './CreateTableModal'
import { projectApi } from '../services/api'

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

const nodeTypes = {
  tableNode: TableNode
}

const MenuItem: React.FC<{ children: React.ReactNode; onClick: () => void; danger?: boolean }> = ({ children, onClick, danger }) => {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <div
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        fontSize: 13,
        color: danger ? '#ff4d4f' : isHovered ? '#1890ff' : 'inherit',
        background: isHovered ? '#f0f7ff' : 'transparent',
        transition: 'all 0.15s ease'
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  )
}

const MenuDivider = () => (
  <div style={{ height: 1, background: '#f0f0f0', margin: '4px 0' }} />
)

const CanvasContent: React.FC = () => {
  const { tables, currentProject, updateTablePosition, selectTable, selectedTableId, selectedTableIds, selectTables, selectAllTables, addToSelection, removeFromSelection, clearSelection, deleteSelectedTables, deleteTable, createTable, loadTables, relationships, loadRelationships, canvasZoom, setCanvasZoom, showMiniMap, setShowMiniMap, edgeStyle, showEdgeLabels, updateTable, snapToGrid, gridSize, showGuides, highlightedRelationshipId, hoveredRelationshipId, setHighlightedRelationship, setHoveredRelationship, themeColor, copySelectedTables, pasteTables, undo, redo, canUndo, canRedo } = useAppStore()
  const reactFlow = useReactFlow()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRelationshipEditorOpen, setIsRelationshipEditorOpen] = useState(false)
  const [showAutoLayoutModal, setShowAutoLayoutModal] = useState(false)
  const [layoutOptions, setLayoutOptions] = useState<AutoLayoutOptions>(defaultLayoutOptions)
  const [autoLayoutForm] = Form.useForm()
  const [isLocked, setIsLocked] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [searchResults, setSearchResults] = useState<Table[]>([])
  const [highlightedTableId, setHighlightedTableId] = useState<string | null>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('canvasSearchHistory')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tableId?: string } | null>(null)

  useEffect(() => {
    if (currentProject) {
      loadTables(currentProject.id)
      loadRelationships(currentProject.id)
    }
  }, [currentProject?.id])

  useEffect(() => {
    if (reactFlow && tables.length > 0) {
      setTimeout(() => {
        reactFlow.fitView({ padding: 0.2, duration: 300 })
      }, 100)
    }
  }, [reactFlow, tables.length])

  useEffect(() => {
    if (reactFlow) {
      reactFlow.zoomTo(canvasZoom)
    }
  }, [reactFlow, canvasZoom])

  useEffect(() => {
    if (canvasZoom < 0.5) {
      setCanvasZoom(0.5)
    } else if (canvasZoom > 2) {
      setCanvasZoom(2)
    }
  }, [canvasZoom, setCanvasZoom])

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // 没有选择项目时渲染空内容
  if (!currentProject) {
    return null
  }

  const handleNodeMouseEnter = useCallback((tableId: string) => {
    const relatedRelationships = relationships.filter(
      r => r.sourceTableId === tableId || r.targetTableId === tableId
    )
    if (relatedRelationships.length > 0) {
      setHighlightedRelationship(relatedRelationships[0].id)
    }
  }, [relationships, setHighlightedRelationship])

  const handleNodeMouseLeave = useCallback(() => {
    setHighlightedRelationship(null)
  }, [setHighlightedRelationship])

  const nodes: Node[] = useMemo(() => {
    if (!tables || !Array.isArray(tables)) return []
    return tables.map(table => {
      const tableRelationshipCount = relationships.filter(
        r => r.sourceTableId === table.id || r.targetTableId === table.id
      ).length

      return {
        id: table.id,
        type: 'tableNode',
        position: { x: table.positionX || 0, y: table.positionY || 0 },
        data: {
          table,
          onEdit: selectTable,
          onDelete: deleteTable,
          highlighted: highlightedTableId === table.id,
          relationshipCount: tableRelationshipCount,
          onMouseEnter: handleNodeMouseEnter,
          onMouseLeave: handleNodeMouseLeave
        },
        selected: selectedTableIds.includes(table.id)
      }
    })
  }, [tables, selectedTableIds, selectTable, deleteTable, highlightedTableId, relationships, handleNodeMouseEnter, handleNodeMouseLeave])

  const edges: Edge[] = useMemo(() => {
    if (!relationships || !Array.isArray(relationships)) return []
    return relationships.map(rel => {
      const sourceTable = tables.find(t => t.id === rel.sourceTableId)
      const targetTable = tables.find(t => t.id === rel.targetTableId)

      if (sourceTable && targetTable) {
        const sourceColumn = sourceTable.columns?.find(c => c.id === rel.sourceColumnId)
        const targetColumn = targetTable.columns?.find(c => c.id === rel.targetColumnId)
        const sourceCard = rel.sourceCardinality || '1'
        const targetCard = rel.targetCardinality || 'N'
        const cardinalityLabel = showEdgeLabels ? `${sourceCard} → ${targetCard}` : undefined
        const fieldLabel = `${sourceTable.name}.${sourceColumn?.name || ''} → ${targetTable.name}.${targetColumn?.name || ''}`
        const label = showEdgeLabels ? `${cardinalityLabel}\n${fieldLabel}` : undefined
        
        const isHighlighted = highlightedRelationshipId === rel.id
        const isHovered = hoveredRelationshipId === rel.id
        const isRelatedToSelected = selectedTableIds.length > 0 && 
          (selectedTableIds.includes(rel.sourceTableId) || selectedTableIds.includes(rel.targetTableId))
        
        let strokeColor = themeColor
        let strokeWidth = 2
        let opacity = 1
        
        if (isHighlighted) {
          strokeColor = '#faad14'
          strokeWidth = 3
        } else if (isHovered) {
          strokeColor = '#52c41a'
          strokeWidth = 3
        } else if (selectedTableIds.length > 0 && !isRelatedToSelected) {
          opacity = 0.3
        }

        return {
          id: rel.id,
          source: rel.sourceTableId,
          target: rel.targetTableId,
          animated: isHighlighted || isHovered,
          label,
          labelStyle: {
            fontSize: 10,
            fill: '#666',
            whiteSpace: 'pre'
          },
          labelBgStyle: {
            fill: 'rgba(255, 255, 255, 0.9)',
            rx: 4
          },
          style: {
            stroke: strokeColor,
            strokeWidth,
            opacity
          },
          type: edgeStyle,
          onMouseEnter: () => setHoveredRelationship(rel.id),
          onMouseLeave: () => setHoveredRelationship(null)
        }
      }
      return null
    }).filter(Boolean) as Edge[]
  }, [relationships, tables, edgeStyle, showEdgeLabels, highlightedRelationshipId, hoveredRelationshipId, selectedTableIds, setHoveredRelationship, themeColor])

  const [nodeState, setNodeState, onNodeChange] = useNodesState(nodes)
  const [edgeState, setEdgeState, onEdgeChange] = useEdgesState(edges)

  // 同步更新节点和边状态
  useEffect(() => {
    setNodeState(nodes)
    setEdgeState(edges)
  }, [nodes, edges, setNodeState, setEdgeState])

  const onNodeDragStop = useCallback((event: any, node: Node) => {
    updateTablePosition(node.id, node.position.x, node.position.y)
  }, [updateTablePosition])

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      if (selectedTableIds.includes(node.id)) {
        removeFromSelection(node.id)
      } else {
        addToSelection(node.id)
      }
    } else {
      selectTable(node.id)
    }
    
    const relatedRelationships = relationships.filter(
      r => r.sourceTableId === node.id || r.targetTableId === node.id
    )
    if (relatedRelationships.length > 0) {
      setHighlightedRelationship(relatedRelationships[0].id)
    } else {
      setHighlightedRelationship(null)
    }
  }, [tables, selectTable, selectedTableIds, addToSelection, removeFromSelection, relationships, setHighlightedRelationship])

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const ids = params.nodes.map(n => n.id)
    if (ids.length > 0) {
      selectTables(ids)
    }
  }, [selectTables])

  const onPaneClick = useCallback(() => {
    selectTable(null)
    clearSelection()
    setHighlightedRelationship(null)
  }, [selectTable, clearSelection, setHighlightedRelationship])

  const handleDeleteSelected = async () => {
    if (selectedTableIds.length === 0) {
      message.warning('请先选择要删除的表')
      return
    }
    await deleteSelectedTables()
    message.success(`已删除 ${selectedTableIds.length} 个表`)
  }

  const handleSelectAll = () => {
    const allIds = tables.map(t => t.id)
    selectTables(allIds)
    message.success(`已选择 ${allIds.length} 个表`)
  }

  const handleClearSelection = () => {
    clearSelection()
    message.info('已取消选择')
  }

  const handleSearch = (value: string) => {
    setSearchValue(value)
    if (!value.trim()) {
      setSearchResults([])
      setHighlightedTableId(null)
      return
    }
    const results = tables.filter(table => 
      table.name.toLowerCase().includes(value.toLowerCase()) ||
      (table.comment && table.comment.toLowerCase().includes(value.toLowerCase()))
    )
    setSearchResults(results)
  }

  const handleSearchSelect = (value: string) => {
    const table = tables.find(t => t.id === value || t.name === value)
    if (table) {
      setHighlightedTableId(table.id)
      selectTable(table.id)
      clearSelection()
      
      const node = nodeState.find(n => n.id === table.id)
      if (node) {
        reactFlow.setCenter(node.position.x + 140, node.position.y + 60, {
          duration: 500
        })
      }
      
      if (!searchHistory.includes(table.name)) {
        const newHistory = [table.name, ...searchHistory.filter(h => h !== table.name)].slice(0, 10)
        setSearchHistory(newHistory)
        localStorage.setItem('canvasSearchHistory', JSON.stringify(newHistory))
      }
      
      setSearchResults([])
      setSearchValue('')
    }
  }

  const handleClearSearch = () => {
    setSearchValue('')
    setSearchResults([])
    setHighlightedTableId(null)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        const searchInput = document.querySelector('.canvas-search-input') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        setCanvasZoom(1)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        handleDuplicateSelected()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        if (canRedo()) redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        selectAllTables()
      }
      if (e.key === 'Delete' && selectedTableIds.length > 0) {
        handleDeleteSelected()
      }
      if (e.key === 'Escape' && highlightedTableId) {
        handleClearSearch()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedTableIds, canRedo, redo, handleDeleteSelected, selectAllTables])

  const handleDuplicateSelected = async () => {
    if (selectedTableIds.length === 0) {
      message.warning('请先选择要复制的表')
      return
    }
    copySelectedTables()
    await pasteTables(50, 50)
    message.success(`已复制 ${selectedTableIds.length} 个表`)
  }

  const handleAlignLeft = () => {
    if (selectedTableIds.length < 2) {
      message.warning('请选择至少2个表进行对齐')
      return
    }
    const selectedTables = tables.filter(t => selectedTableIds.includes(t.id))
    const minX = Math.min(...selectedTables.map(t => t.positionX || 0))
    selectedTables.forEach(table => {
      updateTablePosition(table.id, minX, table.positionY || 0)
    })
    message.success('已左对齐')
  }

  const handleAlignRight = () => {
    if (selectedTableIds.length < 2) {
      message.warning('请选择至少2个表进行对齐')
      return
    }
    const selectedTables = tables.filter(t => selectedTableIds.includes(t.id))
    const maxX = Math.max(...selectedTables.map(t => (t.positionX || 0) + 280))
    selectedTables.forEach(table => {
      updateTablePosition(table.id, maxX - 280, table.positionY || 0)
    })
    message.success('已右对齐')
  }

  const handleAlignCenter = () => {
    if (selectedTableIds.length < 2) {
      message.warning('请选择至少2个表进行对齐')
      return
    }
    const selectedTables = tables.filter(t => selectedTableIds.includes(t.id))
    const minX = Math.min(...selectedTables.map(t => t.positionX || 0))
    const maxX = Math.max(...selectedTables.map(t => (t.positionX || 0) + 280))
    const centerX = (minX + maxX) / 2 - 140
    selectedTables.forEach(table => {
      updateTablePosition(table.id, centerX, table.positionY || 0)
    })
    message.success('已水平居中')
  }

  const handleAlignTop = () => {
    if (selectedTableIds.length < 2) {
      message.warning('请选择至少2个表进行对齐')
      return
    }
    const selectedTables = tables.filter(t => selectedTableIds.includes(t.id))
    const minY = Math.min(...selectedTables.map(t => t.positionY || 0))
    selectedTables.forEach(table => {
      updateTablePosition(table.id, table.positionX || 0, minY)
    })
    message.success('已顶对齐')
  }

  const handleAlignBottom = () => {
    if (selectedTableIds.length < 2) {
      message.warning('请选择至少2个表进行对齐')
      return
    }
    const selectedTables = tables.filter(t => selectedTableIds.includes(t.id))
    const maxY = Math.max(...selectedTables.map(t => (t.positionY || 0) + 150))
    selectedTables.forEach(table => {
      updateTablePosition(table.id, table.positionX || 0, maxY - 150)
    })
    message.success('已底对齐')
  }

  const searchOptions = useMemo(() => {
    const tableOptions = tables.map(table => ({
      value: table.id,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <strong>{table.name}</strong>
            {table.comment && <span style={{ color: '#888', marginLeft: 8 }}>{table.comment}</span>}
          </span>
        </div>
      )
    }))
    
    const historyOptions = searchHistory
      .filter(h => !searchValue || h.toLowerCase().includes(searchValue.toLowerCase()))
      .slice(0, 3)
      .map(h => ({
        value: `history:${h}`,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#888', fontSize: 12 }}>历史</span>
            <span>{h}</span>
          </div>
        )
      }))
    
    return [...historyOptions, ...tableOptions]
  }, [tables, searchValue, searchHistory])

  const onMoveEnd = useCallback((event: any, viewport: any) => {
    if (viewport.zoom !== canvasZoom) {
      const clampedZoom = Math.max(0.5, Math.min(viewport.zoom, 2))
      setCanvasZoom(Math.round(clampedZoom * 100) / 100)
    }
  }, [canvasZoom, setCanvasZoom])

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
      const rowSizes = [1, 2, 3, Math.ceil(tablesToLayout.length / 2)]
      let currentIndex = 0
      let currentRow = 0
      let currentCol = 0
      let currentY = opts.startY
      
      const rowHeights: number[] = []
      
      return tablesToLayout.map((table) => {
        const rowTables = rowSizes[currentRow] || 4
        const height = calculateTableHeight(table)
        
        if (currentCol === 0) {
          rowHeights[currentRow] = height
        } else {
          rowHeights[currentRow] = Math.max(rowHeights[currentRow], height)
        }
        
        const result = {
          ...table,
          positionX: opts.startX + currentCol * (opts.tableWidth + opts.paddingX),
          positionY: currentY
        }
        
        currentCol++
        if (currentCol >= rowTables) {
          currentCol = 0
          currentRow++
          currentY += rowHeights[currentRow - 1] + opts.paddingY
        }
        
        return result
      })
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

  const applyAutoLayout = () => {
    if (tables.length === 0) {
      message.warning('没有表需要布局')
      return
    }
    
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
  }

  const resetLayoutOptions = () => {
    autoLayoutForm.setFieldsValue(defaultLayoutOptions)
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

  const exportToPNG = async () => {
    if (!currentProject) {
      message.error('请先选择一个项目')
      return
    }

    try {
      const svgContent = generateERDiagramSVG()
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
        link.download = `${currentProject.name || 'er-diagram'}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        URL.revokeObjectURL(url)
        message.success('ER 图已导出为 PNG')
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        message.error('PNG 导出失败，正在尝试 SVG 导出')
        exportToSVG()
      }

      img.src = url
    } catch (error) {
      console.error('导出 PNG 失败:', error)
      message.error('导出 PNG 失败，正在尝试 SVG 导出')
      exportToSVG()
    }
  }

  const exportToSVG = () => {
    if (!currentProject) {
      message.error('没有选中的项目')
      return
    }

    try {
      const svgContent = generateERDiagramSVG()
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentProject.name}.svg`
      a.click()
      URL.revokeObjectURL(url)
      message.success('ER 图已导出为 SVG')
    } catch (error) {
      console.error('导出 SVG 失败:', error)
      message.error('导出 SVG 失败')
    }
  }

  const generateERDiagramSVG = (): string => {
    if (!currentProject) return ''

    const padding = 50
    const nodeWidth = 220
    const nodeMinHeight = 150
    const columnHeight = 28
    const headerHeight = 50
    const gapX = 80
    const gapY = 80

    const positions: { [key: string]: { x: number; y: number; width: number; height: number } } = {}
    let currentX = padding
    let currentY = padding
    let maxYInRow = 0

    tables.forEach((table, index) => {
      const colCount = (table.columns?.length || 0) + 1
      const height = Math.max(nodeMinHeight, headerHeight + colCount * columnHeight)
      const width = nodeWidth

      if (currentX + width > 1200) {
        currentX = padding
        currentY = maxYInRow + gapY
      }

      positions[table.id] = { x: currentX, y: currentY, width, height }

      currentX += width + gapX
      maxYInRow = Math.max(maxYInRow, currentY + height)
    })

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${maxYInRow + padding * 2}" style="background:#fafafa">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#1890ff"/>
    </marker>
    <style>
      .table-header { fill: #1890ff; }
      .table-title { fill: white; font-size: 14px; font-weight: bold; }
      .column-text { fill: #333; font-size: 12px; }
      .primary-key { fill: #faad14; }
    </style>
  </defs>
`

    tables.forEach(table => {
      const pos = positions[table.id]
      if (!pos) return

      svg += `  <g>
    <rect x="${pos.x}" y="${pos.y}" width="${pos.width}" height="${pos.height}" fill="white" stroke="#1890ff" stroke-width="2" rx="4"/>
    <rect x="${pos.x}" y="${pos.y}" width="${pos.width}" height="${headerHeight}" fill="#1890ff" rx="4" ry="4"/>
    <text x="${pos.x + 10}" y="${pos.y + 30}" class="table-title">${table.name}</text>
`

      table.columns?.forEach((col, idx) => {
        const y = pos.y + headerHeight + 20 + idx * columnHeight
        svg += `    <text x="${pos.x + 10}" y="${y}" class="column-text">${col.name} (${col.dataType})</text>
`
      })

      svg += `  </g>
`
    })

    relationships.forEach(rel => {
      const sourcePos = positions[rel.sourceTableId]
      const targetPos = positions[rel.targetTableId]
      if (!sourcePos || !targetPos) return

      const sourceX = sourcePos.x + sourcePos.width / 2
      const sourceY = sourcePos.y + sourcePos.height
      const targetX = targetPos.x + targetPos.width / 2
      const targetY = targetPos.y

      svg += `  <line x1="${sourceX}" y1="${sourceY}" x2="${targetX}" y2="${targetY}" stroke="#1890ff" stroke-width="2" marker-end="url(#arrowhead)"/>
`
    })

    svg += `</svg>`
    return svg
  }

  const exportMenuItems = [
    {
      key: 'png',
      icon: <FileImageOutlined />,
      label: '导出为 PNG',
      onClick: exportToPNG
    },
    {
      key: 'svg',
      icon: <PictureOutlined />,
      label: '导出为 SVG',
      onClick: exportToSVG
    }
  ]

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
      <div style={{ height: '100%', width: '100%', position: 'relative' }} ref={reactFlowWrapper} onContextMenu={(e) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY })
      }}>
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal}>
              新建表
            </Button>
            <Button.Group>
              <Tooltip title="撤销 (Ctrl+Z)">
                <Button icon={<UndoOutlined />} onClick={undo} disabled={!canUndo()} />
              </Tooltip>
              <Tooltip title="重做 (Ctrl+Y)">
                <Button icon={<RedoOutlined />} onClick={redo} disabled={!canRedo()} />
              </Tooltip>
            </Button.Group>
            <Button icon={<LinkOutlined />} onClick={() => setIsRelationshipEditorOpen(true)}>
              关系管理
            </Button>
            <Button icon={<SettingOutlined />} onClick={handleAutoLayout}>
              自动布局
            </Button>
            <Dropdown menu={{ items: exportMenuItems }} placement="bottomLeft">
              <Button icon={<ExportOutlined />}>
                导出 ER 图
              </Button>
            </Dropdown>
            <Button icon={<CodeOutlined />} onClick={handleGenerateDDL}>
              导出DDL
            </Button>
            {selectedTableIds.length > 1 && (
              <Dropdown menu={{
                items: [
                  { key: 'left', icon: <AlignLeftOutlined />, label: '左对齐', onClick: handleAlignLeft },
                  { key: 'center', icon: <AlignCenterOutlined />, label: '水平居中', onClick: handleAlignCenter },
                  { key: 'right', icon: <AlignRightOutlined />, label: '右对齐', onClick: handleAlignRight },
                  { key: 'divider1', type: 'divider' },
                  { key: 'top', icon: <VerticalAlignTopOutlined />, label: '顶对齐', onClick: handleAlignTop },
                  { key: 'bottom', icon: <VerticalAlignBottomOutlined />, label: '底对齐', onClick: handleAlignBottom },
                ]
              }} placement="bottomLeft">
                <Button icon={<AlignLeftOutlined />}>
                  对齐
                </Button>
              </Dropdown>
            )}
          </Space>
        </div>

        <div style={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          zIndex: 10,
          width: 280
        }}>
          <AutoComplete
            value={searchValue}
            options={searchOptions}
            onSearch={handleSearch}
            onSelect={handleSearchSelect}
            onClear={handleClearSearch}
            placeholder="搜索表名 (Ctrl+F)"
            allowClear
            style={{ width: '100%' }}
          >
            <Input 
              className="canvas-search-input"
              prefix={<SearchOutlined style={{ color: '#999' }} />}
              suffix={
                highlightedTableId ? (
                  <CloseCircleFilled 
                    style={{ color: '#1890ff', cursor: 'pointer' }} 
                    onClick={handleClearSearch}
                  />
                ) : null
              }
            />
          </AutoComplete>
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 36,
              left: 0,
              right: 0,
              background: 'white',
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              maxHeight: 200,
              overflowY: 'auto',
              zIndex: 1000
            }}>
              <div style={{ padding: '8px 12px', color: '#999', fontSize: 12, borderBottom: '1px solid #f0f0f0' }}>
                找到 {searchResults.length} 个结果
              </div>
              {searchResults.map(table => (
                <div
                  key={table.id}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => handleSearchSelect(table.id)}
                >
                  <span style={{ fontWeight: 500 }}>{table.name}</span>
                  {table.comment && (
                    <span style={{ color: '#888', fontSize: 12 }}>{table.comment}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedTableIds.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 70,
            left: 16,
            zIndex: 10,
            background: '#1890ff',
            borderRadius: 8,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
          }}>
            <span style={{ color: '#fff', fontWeight: 500 }}>
              已选择 {selectedTableIds.length} 个表
            </span>
            <Button
              size="small"
              icon={<CheckSquareOutlined />}
              onClick={handleSelectAll}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}
            >
              全选
            </Button>
            <Button
              size="small"
              icon={<BorderOutlined />}
              onClick={handleClearSelection}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}
            >
              取消
            </Button>
            <Popconfirm
              title={`确定要删除选中的 ${selectedTableIds.length} 个表吗？`}
              onConfirm={handleDeleteSelected}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                批量删除
              </Button>
            </Popconfirm>
          </div>
        )}

        <ReactFlow
          nodes={nodeState}
          edges={edgeState}
          onNodesChange={onNodeChange}
          onEdgesChange={onEdgeChange}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onMoveEnd={onMoveEnd}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: '#fafafa', width: '100%', height: '100%' }}
          nodesDraggable={!isLocked}
          panOnDrag={true}
          selectNodesOnDrag={false}
        >
          <Background
            color={showGuides ? "#1890ff" : "#eee"}
            gap={gridSize}
            size={1}
            style={{ opacity: showGuides ? 0.3 : 1 }}
          />
          <div style={{ 
            position: 'absolute', 
            top: 10, 
            right: 10, 
            zIndex: 100,
            background: '#ffffff',
            borderRadius: 8,
            padding: 4,
            boxShadow: 'rgba(0, 0, 0, 0.1) 0 2px 12px',
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
                border: '1px solid #ddd',
                borderRadius: 4,
                width: 150,
                height: 100
              }}
              nodeColor={(node) => '#1890ff'}
              maskColor="rgba(24,144,255,0.1)"
            />
          )}
        </ReactFlow>

        {contextMenu && (
          <div
            style={{
              position: 'absolute',
              left: contextMenu.x,
              top: contextMenu.y,
              zIndex: 1000,
              background: '#fff',
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '4px 0',
              minWidth: 160
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem onClick={() => {
              if (currentProject) {
                const rect = reactFlowWrapper.current?.getBoundingClientRect()
                if (rect) {
                  const x = contextMenu.x - rect.left
                  const y = contextMenu.y - rect.top
                  createTable(currentProject.id, { name: '新表', positionX: x, positionY: y })
                }
              }
              setContextMenu(null)
            }}>新建表</MenuItem>
            <MenuItem onClick={() => {
              reactFlow?.fitView({ padding: 0.2, duration: 300 })
              setContextMenu(null)
            }}>适应视图</MenuItem>
            <MenuDivider />
            <MenuItem onClick={() => {
              handleSelectAll()
              setContextMenu(null)
            }}>全选 (Ctrl+A)</MenuItem>
            <MenuItem onClick={() => {
              handleClearSelection()
              setContextMenu(null)
            }}>取消选择</MenuItem>
            {selectedTableIds.length > 0 && (
              <>
                <MenuDivider />
                <MenuItem onClick={() => {
                  selectTable(selectedTableIds[0])
                  setContextMenu(null)
                }}><CopyOutlined style={{marginRight: 8}}/>编辑表</MenuItem>
                <MenuItem onClick={() => {
                  handleDuplicateSelected()
                  setContextMenu(null)
                }}><CopyOutlined style={{marginRight: 8}}/>快速复制 (Ctrl+D)</MenuItem>
                <MenuItem onClick={() => {
                  setIsRelationshipEditorOpen(true)
                  setContextMenu(null)
                }}>创建关系</MenuItem>
                <MenuItem danger onClick={() => {
                  handleDeleteSelected()
                  setContextMenu(null)
                }}>删除选中 ({selectedTableIds.length})</MenuItem>
              </>
            )}
          </div>
        )}

        <div style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 8,
          padding: '6px 12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 100
        }}>
          <Dropdown
            menu={{
              items: [
                { key: '50%', label: '50%', onClick: () => setCanvasZoom(0.5) },
                { key: '60%', label: '60%', onClick: () => setCanvasZoom(0.6) },
                { key: '70%', label: '70%', onClick: () => setCanvasZoom(0.7) },
                { key: '75%', label: '75%', onClick: () => setCanvasZoom(0.75) },
                { key: '80%', label: '80%', onClick: () => setCanvasZoom(0.8) },
                { key: '85%', label: '85%', onClick: () => setCanvasZoom(0.85) },
                { key: '90%', label: '90%', onClick: () => setCanvasZoom(0.9) },
                { key: '95%', label: '95%', onClick: () => setCanvasZoom(0.95) },
                { key: '100%', label: '100%', onClick: () => setCanvasZoom(1) },
                { key: '105%', label: '105%', onClick: () => setCanvasZoom(1.05) },
                { key: '110%', label: '110%', onClick: () => setCanvasZoom(1.1) },
                { key: '115%', label: '115%', onClick: () => setCanvasZoom(1.15) },
                { key: '120%', label: '120%', onClick: () => setCanvasZoom(1.2) },
                { key: '125%', label: '125%', onClick: () => setCanvasZoom(1.25) },
                { key: '130%', label: '130%', onClick: () => setCanvasZoom(1.3) },
                { key: '140%', label: '140%', onClick: () => setCanvasZoom(1.4) },
                { key: '150%', label: '150%', onClick: () => setCanvasZoom(1.5) },
                { key: '160%', label: '160%', onClick: () => setCanvasZoom(1.6) },
                { key: '170%', label: '170%', onClick: () => setCanvasZoom(1.7) },
                { key: '180%', label: '180%', onClick: () => setCanvasZoom(1.8) },
                { key: '190%', label: '190%', onClick: () => setCanvasZoom(1.9) },
                { key: '200%', label: '200%', onClick: () => setCanvasZoom(2) }
              ]
            }}
          >
            <span
              style={{
                cursor: 'pointer',
                fontWeight: canvasZoom === 1 ? 600 : 500,
                color: canvasZoom === 1 ? '#52c41a' : '#1890ff',
                padding: '2px 8px',
                borderRadius: 4,
                background: canvasZoom === 1 ? 'rgba(82, 196, 26, 0.1)' : 'transparent',
                transition: 'all 0.2s ease'
              }}
              title="点击重置为100% (Ctrl+0)"
              onClick={(e) => {
                e.stopPropagation()
                setCanvasZoom(1)
              }}
            >
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
        <Form form={autoLayoutForm} layout="vertical">
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
                <Slider min={20} max={150} defaultValue={defaultLayoutOptions.paddingX} />
              </Form.Item>
              <Form.Item label="垂直间距" name="paddingY">
                <Slider min={20} max={150} defaultValue={defaultLayoutOptions.paddingY} />
              </Form.Item>
              <Form.Item label="最大列数" name="maxColumns">
                <Select style={{ width: '100%' }} defaultValue={defaultLayoutOptions.maxColumns}>
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
    </>
  )
}

const Canvas: React.FC = () => (
  <ReactFlowProvider>
    <CanvasContent />
  </ReactFlowProvider>
)

export default Canvas
