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
  ReactFlowProvider
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Table, Relationship } from '../types'
import TableNode from './TableNode'
import RelationshipEditor from './RelationshipEditor'
import { useAppStore } from '../stores/appStore'
import { Button, Space, Dropdown, message } from 'antd'
import { PlusOutlined, CodeOutlined, LinkOutlined, ExportOutlined, PictureOutlined, FileImageOutlined } from '@ant-design/icons'
import CreateTableModal from './CreateTableModal'
import { projectApi } from '../services/api'

const nodeTypes = {
  tableNode: TableNode
}

const CanvasContent: React.FC = () => {
  const { tables, currentProject, updateTablePosition, selectTable, selectedTableId, deleteTable, createTable, loadTables, relationships, loadRelationships, canvasZoom, setCanvasZoom, showMiniMap, setShowMiniMap, edgeStyle, showEdgeLabels } = useAppStore()
  const reactFlow = useReactFlow()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRelationshipEditorOpen, setIsRelationshipEditorOpen] = useState(false)

  useEffect(() => {
    if (currentProject) {
      loadTables(currentProject.id)
      loadRelationships(currentProject.id)
    }
  }, [currentProject?.id])

  useEffect(() => {
    if (reactFlow && canvasZoom !== 1) {
      reactFlow.zoomTo(canvasZoom)
    }
  }, [reactFlow, canvasZoom])

  // 没有选择项目时渲染空内容
  if (!currentProject) {
    return null
  }

  const nodes: Node[] = useMemo(() => {
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
      selected: selectedTableId === table.id
    }))
  }, [tables, selectedTableId, selectTable, deleteTable])

  const edges: Edge[] = useMemo(() => {
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
          animated: true,
          label: showEdgeLabels ? label : undefined,
          labelStyle: {
            fontSize: 11,
            fill: '#666'
          },
          style: {
            stroke: '#1890ff',
            strokeWidth: 2
          },
          type: edgeStyle
        }
      }
      return null
    }).filter(Boolean) as Edge[]
  }, [relationships, tables, edgeStyle, showEdgeLabels])

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
    const table = tables.find(t => t.id === node.id)
    if (table) {
      selectTable(table.id)
    }
  }, [tables, selectTable])

  const onPaneClick = useCallback(() => {
    selectTable(null)
  }, [selectTable])

  const onMoveEnd = useCallback((event: any, viewport: any) => {
    if (viewport.zoom !== canvasZoom) {
      setCanvasZoom(viewport.zoom)
    }
  }, [canvasZoom, setCanvasZoom])

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
      <div style={{ height: '100%', width: '100%', position: 'relative' }} ref={reactFlowWrapper}>
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal}>
              新建表
            </Button>
            <Button icon={<LinkOutlined />} onClick={() => setIsRelationshipEditorOpen(true)}>
              关系管理
            </Button>
            <Dropdown menu={{ items: exportMenuItems }} placement="bottomLeft">
              <Button icon={<ExportOutlined />}>
                导出 ER 图
              </Button>
            </Dropdown>
            <Button icon={<CodeOutlined />} onClick={handleGenerateDDL}>
              导出DDL
            </Button>
          </Space>
        </div>

        <ReactFlow
          nodes={nodeState}
          edges={edgeState}
          onNodesChange={onNodeChange}
          onEdgesChange={onEdgeChange}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onMoveEnd={onMoveEnd}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: '#fafafa', width: '100%', height: '100%' }}
        >
          <Background color="#eee" gap={16} size={2} />
          <Controls />
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
      </div>

      <CreateTableModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <RelationshipEditor
        visible={isRelationshipEditorOpen}
        onClose={() => setIsRelationshipEditorOpen(false)}
      />
    </>
  )
}

const Canvas: React.FC = () => (
  <ReactFlowProvider>
    <CanvasContent />
  </ReactFlowProvider>
)

export default Canvas
