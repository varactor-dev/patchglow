import { useCallback } from 'react'
import { useRackStore } from '@/store/rackStore'
import { CABLE_COLORS, FLOW_DURATION, FLOW_DASHARRAY } from './cableColors'
import type { SignalType } from '@/types/module'

interface Point { x: number; y: number }

export function getCablePath(start: Point, end: Point): string {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const droop = Math.min(dist * 0.3, 120)

  const cp1x = start.x + dx * 0.25
  const cp1y = start.y + droop
  const cp2x = start.x + dx * 0.75
  const cp2y = end.y + droop

  return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`
}

interface CableProps {
  id: string
  start: Point
  end: Point
  signalType: SignalType
  selected: boolean
}

export default function Cable({ id, start, end, signalType, selected }: CableProps) {
  const selectCable = useRackStore((s) => s.selectCable)
  const selectedCableId = useRackStore((s) => s.selectedCableId)

  const color = CABLE_COLORS[signalType]
  const duration = FLOW_DURATION[signalType]
  const d = getCablePath(start, end)

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (selectedCableId === id) {
        selectCable(null)
      } else {
        selectCable(id)
      }
    },
    [id, selectedCableId, selectCable],
  )

  // Delete on keyboard event is handled at document level in CableLayer

  const opacity = selected ? 1 : 0.85

  return (
    <g onClick={handleClick} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
      {/* Hit area — invisible wide stroke for easy clicking */}
      <path
        d={d}
        stroke="transparent"
        strokeWidth={12}
        fill="none"
      />

      {/* Cable body — thick dim background stroke with ambient glow */}
      <path
        d={d}
        stroke={color}
        strokeWidth={selected ? 5 : 4}
        strokeOpacity={selected ? 0.5 : 0.25}
        fill="none"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />

      {/* Cable core — bright thin stroke with strong neon glow */}
      <path
        d={d}
        stroke={color}
        strokeWidth={selected ? 2.5 : 2}
        strokeOpacity={opacity}
        fill="none"
        strokeLinecap="round"
        style={{
          filter: selected
            ? `drop-shadow(0 0 12px ${color}) drop-shadow(0 0 4px ${color})`
            : `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 3px ${color})`,
        }}
      />

      {/* Signal flow animation — white particles glow along colored cable */}
      <path
        d={d}
        stroke="#ffffff"
        strokeWidth={2}
        strokeOpacity={0.85}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={FLOW_DASHARRAY}
        style={{
          animation: `cableFlow ${duration}s linear infinite`,
          filter: `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 2px #ffffff)`,
        }}
      />

      {/* Selection highlight — bright ring at midpoint */}
      {selected && (
        <path
          d={d}
          stroke={color}
          strokeWidth={6}
          strokeOpacity={0.2}
          fill="none"
          strokeLinecap="round"
        />
      )}
    </g>
  )
}

// Injected once into the SVG's <defs>
export function CableFlowKeyframes() {
  return (
    <defs>
      <style>{`
        @keyframes cableFlow {
          to { stroke-dashoffset: -24; }
        }
      `}</style>
    </defs>
  )
}

// In-progress drag cable
interface DragCableProps {
  start: Point
  end: Point
  signalType: SignalType
}

export function DragCable({ start, end, signalType }: DragCableProps) {
  const color = CABLE_COLORS[signalType]
  const d = getCablePath(start, end)

  return (
    <path
      d={d}
      stroke={color}
      strokeWidth={2}
      strokeOpacity={0.7}
      strokeDasharray="6 8"
      fill="none"
      strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
    />
  )
}
