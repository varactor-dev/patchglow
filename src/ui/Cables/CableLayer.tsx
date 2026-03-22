import { useCallback, useEffect, useRef, useState } from 'react'
import { useRackStore } from '@/store/rackStore'
import Cable, { DragCable, CableFlowKeyframes } from './Cable'

interface Point { x: number; y: number }

function getPortCenter(moduleId: string, portId: string, container: Element): Point | null {
  const selector = `[data-module-id="${moduleId}"][data-port-id="${portId}"]`
  const portEl = container.querySelector(selector)
  if (!portEl) return null
  const portRect = portEl.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return {
    x: portRect.left + portRect.width / 2 - containerRect.left,
    y: portRect.top + portRect.height / 2 - containerRect.top,
  }
}

interface CableLayerProps {
  containerRef: React.RefObject<HTMLElement | null>
}

export default function CableLayer({ containerRef }: CableLayerProps) {
  const connections = useRackStore((s) => s.connections)
  const selectedCableId = useRackStore((s) => s.selectedCableId)
  const draggingCable = useRackStore((s) => s.draggingCable)
  const removeConnection = useRackStore((s) => s.removeConnection)
  const selectCable = useRackStore((s) => s.selectCable)

  const [cursorPos, setCursorPos] = useState<Point>({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  // Track cursor during cable drag
  useEffect(() => {
    if (!draggingCable) return
    const onMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [draggingCable, containerRef])

  // Delete selected cable on keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCableId) {
        e.preventDefault()
        removeConnection(selectedCableId)
      }
      if (e.key === 'Escape') {
        selectCable(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedCableId, removeConnection, selectCable])

  // Deselect cable on background click
  const handleSvgClick = useCallback(() => {
    if (selectedCableId) selectCable(null)
  }, [selectedCableId, selectCable])

  const container = containerRef.current

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: draggingCable ? 'none' : 'auto',
        overflow: 'visible',
        zIndex: 10,
      }}
      onClick={handleSvgClick}
    >
      <CableFlowKeyframes />

      {/* Rendered connections */}
      {container && connections.map((conn) => {
        const start = getPortCenter(conn.sourceModuleId, conn.sourcePortId, container)
        const end = getPortCenter(conn.destModuleId, conn.destPortId, container)
        if (!start || !end) return null

        return (
          <Cable
            key={conn.id}
            id={conn.id}
            start={start}
            end={end}
            signalType={conn.signalType}
            selected={conn.id === selectedCableId}
          />
        )
      })}

      {/* In-progress drag cable */}
      {container && draggingCable && (() => {
        const start = getPortCenter(draggingCable.moduleId, draggingCable.portId, container)
        if (!start) return null
        return (
          <DragCable
            start={start}
            end={cursorPos}
            signalType={draggingCable.signalType}
          />
        )
      })()}
    </svg>
  )
}
