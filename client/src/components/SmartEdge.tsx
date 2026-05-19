import React, { useMemo } from 'react'
import { BaseEdge, EdgeProps, getBezierPath, getStraightPath, Edge } from 'reactflow'
import { useAppStore } from '../stores/appStore'

function getNodeBounds(node: any) {
  const x = node.position?.x || node.positionX || 0
  const y = node.position?.y || node.positionY || 0
  const width = node.width || 280
  const height = node.height || 120
  return { x, y, width, height, right: x + width, bottom: y + height, cx: x + width / 2, cy: y + height / 2 }
}

function rectsOverlap(a: { x: number; y: number; right: number; bottom: number }, b: { x: number; y: number; right: number; bottom: number }, padding: number = 20): boolean {
  return !(a.right + padding < b.x || b.right + padding < a.x || a.bottom + padding < b.y || b.bottom + padding < a.y)
}

function lineIntersectsRect(x1: number, y1: number, x2: number, y2: number, rect: { x: number; y: number; right: number; bottom: number }, padding: number = 15): boolean {
  const rx = rect.x - padding
  const ry = rect.y - padding
  const rr = rect.right + padding
  const rb = rect.bottom + padding

  if ((x1 >= rx && x1 <= rr && y1 >= ry && y1 <= rb) || (x2 >= rx && x2 <= rr && y2 >= ry && y2 <= rb)) {
    return true
  }

  const dx = x2 - x1
  const dy = y2 - y1
  const edges: Array<[number, number, number, number]> = [
    [rx, ry, rr, ry],
    [rr, ry, rr, rb],
    [rx, rb, rr, rb],
    [rx, ry, rx, rb]
  ]

  for (const [ex1, ey1, ex2, ey2] of edges) {
    const denom = dx * (ey2 - ey1) - dy * (ex2 - ex1)
    if (Math.abs(denom) < 0.001) continue
    const t = ((ex1 - x1) * (ey2 - ey1) - (ey1 - y1) * (ex2 - ex1)) / denom
    const u = ((ex1 - x1) * dy - (ey1 - y1) * dx) / denom
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true
  }
  return false
}

function computeSmartPath(
  sourceX: number, sourceY: number, sourcePosition: any,
  targetX: number, targetY: number, targetPosition: any,
  sourceId: string, targetId: string
): string {
  const tables = useAppStore.getState().tables
  const nodes = tables.map(t => ({
    id: t.id,
    position: { x: t.positionX || 0, y: t.positionY || 0 },
    width: 280,
    height: Math.max(120, 50 + (t.columns?.length || 0) * 28)
  }))

  const blockingNodes = nodes.filter(n => n.id !== sourceId && n.id !== targetId)

  const sourceBounds = nodes.find(n => n.id === sourceId)
  const targetBounds = nodes.find(n => n.id === targetId)

  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const dist = Math.sqrt(dx * dx + dy * dy)

  const isBlocked = blockingNodes.some(node => {
    const bounds = getNodeBounds(node)
    return lineIntersectsRect(sourceX, sourceY, targetX, targetY, bounds)
  })

  if (!isBlocked) {
    const controlOffset = Math.min(dist * 0.3, 80)
    let cp1x = sourceX, cp1y = sourceY, cp2x = targetX, cp2y = targetY

    if (Math.abs(dx) > Math.abs(dy)) {
      cp1x = sourceX + controlOffset * Math.sign(dx)
      cp1y = sourceY
      cp2x = targetX - controlOffset * Math.sign(dx)
      cp2y = targetY
    } else {
      cp1x = sourceX
      cp1y = sourceY + controlOffset * Math.sign(dy)
      cp2x = targetX
      cp2y = targetY - controlOffset * Math.sign(dy)
    }

    return `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`
  }

  const detourOffset = 80
  const candidates: Array<{ path: string; cost: number }> = []

  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  const offsets = [
    { ox: 0, oy: -detourOffset },
    { ox: 0, oy: detourOffset },
    { ox: -detourOffset, oy: 0 },
    { ox: detourOffset, oy: 0 },
    { ox: -detourOffset * 0.7, oy: -detourOffset * 0.7 },
    { ox: detourOffset * 0.7, oy: -detourOffset * 0.7 },
    { ox: -detourOffset * 0.7, oy: detourOffset * 0.7 },
    { ox: detourOffset * 0.7, oy: detourOffset * 0.7 }
  ]

  for (const { ox, oy } of offsets) {
    const wpX = midX + ox
    const wpY = midY + oy

    const seg1Blocked = blockingNodes.some(node => {
      const bounds = getNodeBounds(node)
      return lineIntersectsRect(sourceX, sourceY, wpX, wpY, bounds)
    })
    const seg2Blocked = blockingNodes.some(node => {
      const bounds = getNodeBounds(node)
      return lineIntersectsRect(wpX, wpY, targetX, targetY, bounds)
    })

    const blocked = seg1Blocked || seg2Blocked
    const cost = Math.abs(ox) + Math.abs(oy) + (blocked ? 1000 : 0)

    const cp1x = sourceX + (wpX - sourceX) * 0.5
    const cp1y = sourceY + (wpY - sourceY) * 0.5
    const cp2x = wpX + (targetX - wpX) * 0.3
    const cp2y = wpY + (targetY - wpY) * 0.3
    const cp3x = wpX + (targetX - wpX) * 0.7
    const cp3y = wpY + (targetY - wpY) * 0.7
    const cp4x = targetX - (targetX - wpX) * 0.5
    const cp4y = targetY - (targetY - wpY) * 0.5

    const path = `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${wpX} ${wpY} C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${targetX} ${targetY}`

    candidates.push({ path, cost })
  }

  candidates.sort((a, b) => a.cost - b.cost)
  return candidates[0].path
}

export function SmartEdge(props: EdgeProps) {
  const { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, source, target, style, markerEnd, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius } = props

  const path = useMemo(() => {
    return computeSmartPath(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, source || '', target || '')
  }, [sourceX, sourceY, targetX, targetY, source, target])

  return (
    <BaseEdge
      path={path}
      style={style}
      markerEnd={markerEnd}
    />
  )
}

export const smartEdgeType = {
  smart: SmartEdge
}
