import React, { useMemo } from 'react'
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath, getStraightPath, Edge } from 'reactflow'
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

function pointDist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

function buildBezierPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cpx1 = prev.x + (curr.x - prev.x) * 0.3
    const cpy1 = prev.y + (curr.y - prev.y) * 0.3
    const cpx2 = curr.x - (curr.x - prev.x) * 0.3
    const cpy2 = curr.y - (curr.y - prev.y) * 0.3
    d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`
  }
  return d
}

function lineCrossesAnyNode(
  x1: number, y1: number, x2: number, y2: number,
  nodes: Array<{ x: number; y: number; right: number; bottom: number }>,
  padding: number = 12
): boolean {
  for (const rect of nodes) {
    if (lineIntersectsRect(x1, y1, x2, y2, rect, padding)) return true
  }
  return false
}

function routeAroundNode(
  sourceX: number, sourceY: number,
  targetX: number, targetY: number,
  blockers: Array<{ x: number; y: number; width: number; height: number; right: number; bottom: number; cx: number; cy: number }>,
  blockingRects: Array<{ x: number; y: number; right: number; bottom: number }>,
  sourceId: string, targetId: string
): string {
  const candidates: Array<{ path: string; cost: number }> = []

  const otherBlockers = blockingRects.filter(r => {
    return !blockers.some(b => Math.abs(b.x - r.x) < 1 && Math.abs(b.y - r.y) < 1)
  })

  const padding = 30

  for (const blocker of blockers) {
    const corners = [
      { x: blocker.x - padding, y: blocker.y - padding },
      { x: blocker.right + padding, y: blocker.y - padding },
      { x: blocker.x - padding, y: blocker.bottom + padding },
      { x: blocker.right + padding, y: blocker.bottom + padding }
    ]

    for (const corner of corners) {
      const seg1Blocked = lineCrossesAnyNode(sourceX, sourceY, corner.x, corner.y, otherBlockers)
      const seg2Blocked = lineCrossesAnyNode(corner.x, corner.y, targetX, targetY, otherBlockers)

      if (seg1Blocked || seg2Blocked) continue

      const detourDist = pointDist(sourceX, sourceY, corner.x, corner.y) +
                         pointDist(corner.x, corner.y, targetX, targetY) -
                         pointDist(sourceX, sourceY, targetX, targetY)

      const path = buildBezierPath([
        { x: sourceX, y: sourceY },
        { x: corner.x, y: corner.y },
        { x: targetX, y: targetY }
      ])

      candidates.push({ path, cost: detourDist })
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.cost - b.cost)
    return candidates[0].path
  }

  const detourOffset = 100
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  const offsets = [
    { ox: 0, oy: -detourOffset }, { ox: 0, oy: detourOffset },
    { ox: -detourOffset, oy: 0 }, { ox: detourOffset, oy: 0 },
    { ox: -detourOffset * 0.7, oy: -detourOffset * 0.7 },
    { ox: detourOffset * 0.7, oy: -detourOffset * 0.7 },
    { ox: -detourOffset * 0.7, oy: detourOffset * 0.7 },
    { ox: detourOffset * 0.7, oy: detourOffset * 0.7 }
  ]

  for (const { ox, oy } of offsets) {
    const wpX = midX + ox
    const wpY = midY + oy

    const seg1Blocked = lineCrossesAnyNode(sourceX, sourceY, wpX, wpY, blockingRects)
    const seg2Blocked = lineCrossesAnyNode(wpX, wpY, targetX, targetY, blockingRects)
    const blocked = seg1Blocked || seg2Blocked
    const cost = Math.abs(ox) + Math.abs(oy) + (blocked ? 1000 : 0)

    const path = buildBezierPath([
      { x: sourceX, y: sourceY },
      { x: wpX, y: wpY },
      { x: targetX, y: targetY }
    ])

    candidates.push({ path, cost })
  }

  candidates.sort((a, b) => a.cost - b.cost)
  return candidates[0]?.path || buildBezierPath([{ x: sourceX, y: sourceY }, { x: targetX, y: targetY }])
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

  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const dist = Math.sqrt(dx * dx + dy * dy)

  const blockingRects = blockingNodes.map(n => getNodeBounds(n))

  const isPathBlocked = blockingNodes.some(node => {
    const bounds = getNodeBounds(node)
    return lineIntersectsRect(sourceX, sourceY, targetX, targetY, bounds)
  })

  if (!isPathBlocked) {
    return buildBezierPath([{ x: sourceX, y: sourceY }, { x: targetX, y: targetY }])
  }

  const blockingRectsWithData = blockingNodes
    .filter(n => {
      const bounds = getNodeBounds(n)
      return lineIntersectsRect(sourceX, sourceY, targetX, targetY, bounds)
    })
    .map(n => getNodeBounds(n))

  return routeAroundNode(sourceX, sourceY, targetX, targetY, blockingRectsWithData, blockingRects, sourceId, targetId)
}

export function SmartEdge(props: EdgeProps) {
  const { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, source, target, style, markerEnd, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius } = props

  const path = useMemo(() => {
    return computeSmartPath(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, source || '', target || '')
  }, [sourceX, sourceY, targetX, targetY, source, target])

  const labelX = (sourceX + targetX) / 2
  const labelY = (sourceY + targetY) / 2

  return (
    <>
      <BaseEdge
        path={path}
        style={style}
        markerEnd={markerEnd}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 11,
              pointerEvents: 'all',
              ...labelStyle
            } as React.CSSProperties}
            className="nodrag nopan"
          >
            {labelShowBg && (
              <div
                style={{
                  position: 'absolute',
                  background: '#ffffffcc',
                  borderRadius: labelBgBorderRadius || 3,
                  padding: labelBgPadding || 3,
                  width: '100%',
                  height: '100%',
                  ...labelBgStyle
                } as React.CSSProperties}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1, padding: '1px 3px' }}>
              {typeof label === 'string' ? label : ''}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const smartEdgeType = {
  smart: SmartEdge
}
