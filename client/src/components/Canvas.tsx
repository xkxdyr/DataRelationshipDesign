import React, { useCallback, useMemo, useEffect, useState } from 'react'
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
import { Button, Space, Modal, Form, Input } from 'antd'
import { PlusOutlined, CodeOutlined, LinkOutlined } from '@ant-design/icons'
import { projectApi } from '../services/api'

const nodeTypes = {
  tableNode: TableNode
}

const CanvasContent: React.FC = () => {
  const { tables, currentProject, updateTablePosition, selectTable, selectedTableId, deleteTable, createTable, loadTables, relationships, loadRelationships, canvasZoom, setCanvasZoom, showMiniMap, setShowMiniMap, edgeStyle, showEdgeLabels } = useAppStore()
  const reactFlow = useReactFlow()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRelationshipEditorOpen, setIsRelationshipEditorOpen] = useState(false)
  const [form] = Form.useForm()

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
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleCreateTable = async (values: any) => {
    if (currentProject) {
      await createTable(currentProject.id, { 
        name: values.name,
        comment: values.comment || '',
        positionX: 100,
        positionY: 100
      })
      setIsModalOpen(false)
    }
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

  return (
    <>
      <div style={{ height: '100%', width: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal}>
              新建表
            </Button>
            <Button icon={<LinkOutlined />} onClick={() => setIsRelationshipEditorOpen(true)}>
              关系管理
            </Button>
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

      <Modal
        title="新建表"
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTable}
        >
          <Form.Item
            name="name"
            label="表名称"
            rules={[{ required: true, message: '请输入表名称' }]}
          >
            <Input placeholder="请输入表名称" />
          </Form.Item>
          
          <Form.Item
            name="comment"
            label="表注释"
          >
            <Input.TextArea placeholder="请输入表注释" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

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
