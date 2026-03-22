import { useEffect, useRef, useState } from 'react'
import { useRackStore } from '@/store/rackStore'
import { isCompatible } from '@/engine/signalTypes'
import { getModuleDefinition } from '@/engine/moduleRegistry'
import { HP_PX } from '@/ui/ModulePanel/ModulePanel'
import Cable, { DragCable, CableFlowKeyframes } from './Cable'

interface Point { x: number; y: number }

// Coordinates are in scroll-content space (scrollLeft/scrollTop added so cables
// stay aligned when the rack scrolls horizontally)
function getPortCenter(moduleId: string, portId: string, container: HTMLElement): Point | null {
  const selector = `[data-module-id="${moduleId}"][data-port-id="${portId}"]`
  const portEl = container.querySelector(selector)
  if (!portEl) return null
  const portRect = portEl.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return {
    x: portRect.left + portRect.width / 2 - containerRect.left + container.scrollLeft,
    y: portRect.top + portRect.height / 2 - containerRect.top + container.scrollTop,
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
  const endCableDrag = useRackStore((s) => s.endCableDrag)
  const addConnection = useRackStore((s) => s.addConnection)
  // Keep a ref to draggingCable so async handlers see the latest value
  const draggingCableRef = useRef(draggingCable)
  draggingCableRef.current = draggingCable

  const [cursorPos, setCursorPos] = useState<Point>({ x: 0, y: 0 })
  // Bump this counter on scroll to force cable position recalculation
  const [, setScrollTick] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)

  // Re-render cables when the scroll container scrolls so coordinates stay aligned
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let rafId = 0
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => setScrollTick((t) => t + 1))
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafId)
    }
  }, [containerRef])

  // Track cursor/touch during cable drag
  useEffect(() => {
    if (!draggingCable) return
    const update = (clientX: number, clientY: number) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      // Convert to content space (same as getPortCenter)
      setCursorPos({
        x: clientX - rect.left + container.scrollLeft,
        y: clientY - rect.top + container.scrollTop,
      })
    }
    const onPointerMove = (e: PointerEvent) => update(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) update(t.clientX, t.clientY)
    }
    // On pointer/touch up: hit-test the element under the finger.
    // On touch, pointerup fires on the source element, not where the finger lifts,
    // so we must use elementFromPoint to find the destination port.
    const tryConnect = (clientX: number, clientY: number) => {
      const drag = draggingCableRef.current
      if (!drag) return

      const el = document.elementFromPoint(clientX, clientY)
      if (el) {
        // Walk up to find a port element (the ring div is a child of the port div)
        let target: Element | null = el
        while (target && target !== document.body) {
          const moduleId = target.getAttribute('data-module-id')
          const portId = target.getAttribute('data-port-id')
          const direction = target.getAttribute('data-direction')
          if (moduleId && portId && direction === 'input') {
            const modules = useRackStore.getState().modules
            const destModType = modules[moduleId]?.type ?? ''
            const def = getModuleDefinition(destModType)
            const port = def?.ports.find((p) => p.id === portId)
            if (port && isCompatible(drag.signalType, port.signalType)) {
              addConnection(
                { moduleId: drag.moduleId, portId: drag.portId },
                { moduleId, portId },
              )
            }
            break
          }
          target = target.parentElement
        }
      }
      endCableDrag()
    }

    const onPointerUp = (e: PointerEvent) => tryConnect(e.clientX, e.clientY)
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0]
      if (t) tryConnect(t.clientX, t.clientY)
      else endCableDrag()
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [draggingCable, containerRef, endCableDrag])

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

  const container = containerRef.current

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: 84 * HP_PX,  // full rack content width — must match the scroll container
        height: '100%',
        pointerEvents: 'none',  // always passthrough — cable <g> elements re-enable individually
        overflow: 'visible',
        zIndex: 10,
      }}
    >
      <CableFlowKeyframes />

      {/* Rendered connections — pointer-events disabled during drag so elementFromPoint finds ports */}
      <g style={{ pointerEvents: draggingCable ? 'none' : undefined }}>
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
      </g>

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
