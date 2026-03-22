import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './Knob.module.css'

interface KnobProps {
  label: string
  value: number
  min: number
  max: number
  default: number
  unit?: string
  curve?: 'linear' | 'exponential' | 'logarithmic'
  accentColor: string
  onChange: (value: number) => void
}

function normalToValue(normal: number, min: number, max: number, curve: KnobProps['curve']): number {
  const n = Math.max(0, Math.min(1, normal))
  if (curve === 'exponential') {
    return min * Math.pow(max / min, n)
  }
  if (curve === 'logarithmic') {
    return min + (Math.log(n + 1) / Math.log(2)) * (max - min)
  }
  return min + n * (max - min)
}

function valueToNormal(value: number, min: number, max: number, curve: KnobProps['curve']): number {
  const v = Math.max(min, Math.min(max, value))
  if (curve === 'exponential') {
    return Math.log(v / min) / Math.log(max / min)
  }
  if (curve === 'logarithmic') {
    return Math.pow(2, (v - min) / (max - min)) - 1
  }
  return (v - min) / (max - min)
}

function formatValue(value: number, unit?: string): string {
  let formatted: string
  if (Math.abs(value) >= 10000) {
    formatted = (value / 1000).toFixed(1) + 'k'
  } else if (Math.abs(value) >= 1000) {
    formatted = (value / 1000).toFixed(2) + 'k'
  } else if (Math.abs(value) >= 10) {
    formatted = value.toFixed(1)
  } else {
    formatted = value.toFixed(2)
  }
  return unit ? `${formatted} ${unit}` : formatted
}

// Knob travel: 270 degrees (from -135° to +135°)
const MIN_ANGLE = -135
const MAX_ANGLE = 135

export default function Knob({
  label,
  value,
  min,
  max,
  default: defaultValue,
  unit,
  curve = 'linear',
  accentColor,
  onChange,
}: KnobProps) {
  const [isActive, setIsActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null)
  const normalRef = useRef(valueToNormal(value, min, max, curve))
  const lastYRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)
  const pointerTypeRef = useRef<string>('')
  const elRef = useRef<HTMLDivElement>(null)

  // Sync external value changes
  normalRef.current = valueToNormal(value, min, max, curve)

  const angle = MIN_ANGLE + normalRef.current * (MAX_ANGLE - MIN_ANGLE)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const el = e.currentTarget as HTMLDivElement
    el.setPointerCapture(e.pointerId)
    pointerIdRef.current = e.pointerId
    pointerTypeRef.current = e.pointerType
    lastYRef.current = e.clientY
    setIsActive(true)
    if (e.pointerType === 'touch') {
      setTouchPos({ x: e.clientX, y: e.clientY })
    }
  }, [])

  const handleDoubleClick = useCallback(() => {
    onChange(defaultValue)
  }, [defaultValue, onChange])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY / 600
    const next = Math.max(0, Math.min(1, normalRef.current + delta))
    onChange(normalToValue(next, min, max, curve))
  }, [min, max, curve, onChange])

  useEffect(() => {
    const el = elRef.current
    if (!isActive || !el) return

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return
      const sensitivity = e.shiftKey ? 0.001 : 0.01
      const delta = -(e.clientY - lastYRef.current) * sensitivity
      lastYRef.current = e.clientY
      const next = Math.max(0, Math.min(1, normalRef.current + delta))
      normalRef.current = next
      onChange(normalToValue(next, min, max, curve))
      if (pointerTypeRef.current === 'touch') {
        setTouchPos({ x: e.clientX, y: e.clientY })
      }
    }

    const stopCapture = () => {
      pointerIdRef.current = null
      pointerTypeRef.current = ''
      setIsActive(false)
      setTouchPos(null)
    }

    // Listen on the element — with setPointerCapture, iOS delivers events here, not document
    el.addEventListener('pointermove', handlePointerMove)
    el.addEventListener('pointerup', stopCapture)
    el.addEventListener('lostpointercapture', stopCapture)  // safety fallback
    return () => {
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerup', stopCapture)
      el.removeEventListener('lostpointercapture', stopCapture)
    }
  }, [isActive, min, max, curve, onChange])

  const glowOpacity = isActive ? 1 : isHovered ? 0.65 : 0.15

  return (
    <div className={styles.knobWrapper}>
      <div
        ref={elRef}
        className={styles.knob}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        style={{
          boxShadow: `0 0 0 1px rgba(255,255,255,0.08), ${isActive || isHovered ? `0 0 12px ${accentColor}` : 'none'}`,
          cursor: 'ns-resize',
        }}
      >
        {/* Glow ring */}
        <div
          className={styles.glowRing}
          style={{
            border: `1px solid ${accentColor}`,
            boxShadow: isActive
              ? `0 0 16px ${accentColor}, 0 0 6px ${accentColor}, inset 0 0 4px rgba(0,0,0,0.5)`
              : `0 0 8px ${accentColor}, inset 0 0 4px rgba(0,0,0,0.5)`,
            opacity: glowOpacity,
          }}
        />
        {/* Indicator line */}
        <div
          className={styles.indicator}
          style={{
            transform: `translateX(-50%) rotate(${angle}deg)`,
            background: accentColor,
            boxShadow: `0 0 4px ${accentColor}`,
          }}
        />
        {/* Center dot */}
        <div className={styles.center} />
      </div>
      <div className={styles.label} style={{ color: 'var(--text-dim)' }}>
        {label}
      </div>
      <div
        className={styles.value}
        style={{ color: isActive ? accentColor : 'var(--text-dim)' }}
      >
        {formatValue(value, unit)}
      </div>
      {isActive && touchPos && (
        <div
          className={styles.touchTooltip}
          style={{ left: touchPos.x, top: touchPos.y - 60 }}
        >
          {formatValue(value, unit)}
        </div>
      )}
    </div>
  )
}
