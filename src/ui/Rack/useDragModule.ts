import { useState, useRef, useEffect, useCallback } from 'react'
import { useRackStore } from '@/store/rackStore'
import { getModule } from '@/engine/moduleRegistry'
import { HP_PX } from '@/ui/ModulePanel/ModulePanel'
import { RACK_HP, NUM_ROWS, ROW_HEIGHT, RAIL_HEIGHT } from './Rack'

export interface DragState {
  instanceId: string
  hp: number
  originRow: number
  originCol: number
  offsetX: number
  offsetY: number
  snapRow: number
  snapCol: number
  snapValid: boolean
}

interface PendingDrag {
  instanceId: string
  pointerId: number
  startX: number
  startY: number
  element: Element
  timerId: ReturnType<typeof setTimeout>
}

function checkOverlap(
  dragId: string,
  targetRow: number,
  targetCol: number,
  targetHp: number,
): boolean {
  const modules = useRackStore.getState().modules
  for (const mod of Object.values(modules)) {
    if (mod.instanceId === dragId) continue
    if (mod.position.row !== targetRow) continue
    const reg = getModule(mod.type)
    if (!reg) continue
    const modHp = reg.definition.hp
    if (targetCol < mod.position.col + modHp && mod.position.col < targetCol + targetHp) {
      return true
    }
  }
  return false
}

export function useDragModule(
  zoom: number,
  rackRef: React.RefObject<HTMLElement | null>,
) {
  const [dragState, setDragState] = useState<DragState | null>(null)
  const pendingRef = useRef<PendingDrag | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  // Clean up pending drag on unmount
  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timerId)
        pendingRef.current = null
      }
    }
  }, [])

  // Cancel pending drag if pointer moves too far before timer fires
  useEffect(() => {
    if (!pendingRef.current) return

    const pending = pendingRef.current
    const onMove = (e: PointerEvent) => {
      if (!pendingRef.current || e.pointerId !== pending.pointerId) return
      const dx = e.clientX - pending.startX
      const dy = e.clientY - pending.startY
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        clearTimeout(pending.timerId)
        pendingRef.current = null
      }
    }

    const onUp = (e: PointerEvent) => {
      if (!pendingRef.current || e.pointerId !== pending.pointerId) return
      clearTimeout(pending.timerId)
      pendingRef.current = null
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [pendingRef.current?.pointerId])

  // Document-level drag move + drop handlers (active only while dragging)
  useEffect(() => {
    if (!dragState) return

    const drag = dragRef.current!
    const pending = pendingRef.current

    const onMove = (e: PointerEvent) => {
      if (pending && e.pointerId !== pending.pointerId) return
      const z = zoomRef.current
      const offsetX = (e.clientX - (pending?.startX ?? 0)) / z
      const offsetY = (e.clientY - (pending?.startY ?? 0)) / z

      // Compute snap column
      let snapCol = drag.originCol + Math.round(offsetX / HP_PX)
      snapCol = Math.max(0, Math.min(RACK_HP - drag.hp, snapCol))

      // Compute snap row from cursor Y relative to rack
      let snapRow = drag.originRow
      const rack = rackRef.current
      if (rack) {
        const rackRect = rack.getBoundingClientRect()
        const relY = (e.clientY - rackRect.top) / z
        const rowPitch = RAIL_HEIGHT + ROW_HEIGHT
        snapRow = Math.floor((relY - RAIL_HEIGHT / 2) / rowPitch)
        snapRow = Math.max(0, Math.min(NUM_ROWS - 1, snapRow))
      }

      const snapValid = !checkOverlap(drag.instanceId, snapRow, snapCol, drag.hp)

      const next: DragState = {
        ...drag,
        offsetX,
        offsetY,
        snapRow,
        snapCol,
        snapValid,
      }
      dragRef.current = next
      setDragState(next)
    }

    const onUp = () => {
      const final = dragRef.current
      if (final && final.snapValid) {
        useRackStore.getState().moveModule(final.instanceId, {
          row: final.snapRow,
          col: final.snapCol,
        })
      }
      dragRef.current = null
      pendingRef.current = null
      setDragState(null)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dragRef.current = null
        pendingRef.current = null
        setDragState(null)
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [dragState !== null, rackRef])

  const handleDragStart = useCallback(
    (instanceId: string, e: React.PointerEvent) => {
      // Don't interfere with right-click (context menu for remove)
      if (e.button !== 0) return

      const delay = e.pointerType === 'mouse' ? 200 : 500
      const startX = e.clientX
      const startY = e.clientY
      const pointerId = e.pointerId
      const element = e.currentTarget

      // Prevent text selection and default touch behavior
      e.preventDefault()

      const timerId = setTimeout(() => {
        const mod = useRackStore.getState().modules[instanceId]
        if (!mod) return
        const reg = getModule(mod.type)
        if (!reg) return

        // Capture pointer so we get move/up events even outside the element
        try { (element as HTMLElement).setPointerCapture(pointerId) } catch { /* ok */ }

        const initial: DragState = {
          instanceId,
          hp: reg.definition.hp,
          originRow: mod.position.row,
          originCol: mod.position.col,
          offsetX: 0,
          offsetY: 0,
          snapRow: mod.position.row,
          snapCol: mod.position.col,
          snapValid: true,
        }
        dragRef.current = initial
        setDragState(initial)
      }, delay)

      pendingRef.current = { instanceId, pointerId, startX, startY, element, timerId }
    },
    [],
  )

  return { dragState, handleDragStart }
}
