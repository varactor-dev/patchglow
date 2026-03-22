import { useCallback } from 'react'
import { SIGNAL_COLORS, isCompatible } from '@/engine/signalTypes'
import { useRackStore } from '@/store/rackStore'
import type { SignalType } from '@/types/module'
import styles from './Port.module.css'

interface PortProps {
  moduleId: string
  portId: string
  label: string
  direction: 'input' | 'output'
  signalType: SignalType
  onPortElement?: (el: HTMLDivElement | null) => void
}

export default function Port({
  moduleId,
  portId,
  label,
  direction,
  signalType,
  onPortElement,
}: PortProps) {
  const startCableDrag = useRackStore((s) => s.startCableDrag)
  const endCableDrag = useRackStore((s) => s.endCableDrag)
  const draggingCable = useRackStore((s) => s.draggingCable)
  const addConnection = useRackStore((s) => s.addConnection)
  const connections = useRackStore((s) => s.connections)

  const isConnected = connections.some(
    (c) =>
      (c.sourceModuleId === moduleId && c.sourcePortId === portId) ||
      (c.destModuleId === moduleId && c.destPortId === portId),
  )

  const isBeingDragged =
    draggingCable?.moduleId === moduleId && draggingCable?.portId === portId

  const isDragInProgress = draggingCable !== null
  const isEligibleDest =
    isDragInProgress &&
    direction === 'input' &&
    draggingCable.moduleId !== moduleId &&
    isCompatible(draggingCable.signalType, signalType)

  const isIneligibleDest =
    isDragInProgress && direction === 'input' && !isEligibleDest

  const color = SIGNAL_COLORS[signalType]

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (direction !== 'output') return
      e.preventDefault()
      e.stopPropagation()
      startCableDrag(moduleId, portId, signalType)
    },
    [direction, moduleId, portId, signalType, startCableDrag],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (direction !== 'input') return
      if (!draggingCable) return
      if (!isEligibleDest) return
      e.preventDefault()
      e.stopPropagation()
      addConnection(
        { moduleId: draggingCable.moduleId, portId: draggingCable.portId },
        { moduleId, portId },
      )
      endCableDrag()
    },
    [direction, draggingCable, isEligibleDest, addConnection, moduleId, portId, endCableDrag],
  )

  let ringOpacity = direction === 'output' ? 1 : 0.5
  if (isConnected) ringOpacity = 1
  if (isBeingDragged) ringOpacity = 0.3
  if (isEligibleDest) ringOpacity = 1
  if (isIneligibleDest) ringOpacity = 0.2

  return (
    <div className={styles.portWrapper}>
      <div
        ref={onPortElement}
        className={styles.port}
        data-module-id={moduleId}
        data-port-id={portId}
        data-direction={direction}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        style={{
          cursor: direction === 'output' ? 'crosshair' : isEligibleDest ? 'pointer' : 'default',
        }}
      >
        {/* Outer ring */}
        <div
          className={`${styles.ring} ${isEligibleDest ? styles.ringPulse : ''}`}
          style={{
            borderColor: color,
            boxShadow: `0 0 ${isConnected || isEligibleDest ? 8 : 4}px ${color}`,
            opacity: ringOpacity,
          }}
        />
        {/* Socket hole */}
        <div className={styles.socket} />
      </div>
      <div className={styles.label} style={{ color: 'var(--text-dim)' }}>
        {label}
      </div>
    </div>
  )
}
