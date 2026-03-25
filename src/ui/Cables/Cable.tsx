import { useCallback, useRef, useState } from 'react'
import { useRackStore } from '@/store/rackStore'
import {
  CABLE_COLORS,
  PULSE_SEGMENT_RATIO,
  PULSE_COLOR_ATTACK,
  getAudioCableVisuals,
  getCvCableVisuals,
} from './cableColors'
import type { SignalType } from '@/types/module'
import type { CableDisplayMode } from '@/types/store'

interface Point { x: number; y: number }

// ── Bézier math helpers ──────────────────────────────────────────────────────

interface BezierCtrl { p0: Point; p1: Point; p2: Point; p3: Point }

/** Same-row cables sag gently (~10%); cross-row cables droop dramatically (~35%) */
function computeDroop(start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const verticalRatio = Math.min(1, Math.abs(dy) / 200)
  const droopFactor = 0.10 + verticalRatio * 0.25
  return Math.min(dist * droopFactor, 120)
}

export function getCableBezier(start: Point, end: Point): BezierCtrl {
  const dx = end.x - start.x
  const droop = computeDroop(start, end)
  return {
    p0: start,
    p1: { x: start.x + dx * 0.25, y: start.y + droop },
    p2: { x: start.x + dx * 0.75, y: end.y + droop },
    p3: end,
  }
}

export function bezierPoint(t: number, b: BezierCtrl): Point {
  const u = 1 - t
  return {
    x: u*u*u*b.p0.x + 3*u*u*t*b.p1.x + 3*u*t*t*b.p2.x + t*t*t*b.p3.x,
    y: u*u*u*b.p0.y + 3*u*u*t*b.p1.y + 3*u*t*t*b.p2.y + t*t*t*b.p3.y,
  }
}

function bezierNormal(t: number, b: BezierCtrl): Point {
  const u = 1 - t
  const tx = 3*u*u*(b.p1.x-b.p0.x) + 6*u*t*(b.p2.x-b.p1.x) + 3*t*t*(b.p3.x-b.p2.x)
  const ty = 3*u*u*(b.p1.y-b.p0.y) + 6*u*t*(b.p2.y-b.p1.y) + 3*t*t*(b.p3.y-b.p2.y)
  const len = Math.sqrt(tx*tx + ty*ty)
  if (len < 0.001) return { x: 0, y: -1 }
  return { x: -ty / len, y: tx / len }
}

// ── Signal-shaped polygon ─────────────────────────────────────────────────────

const POLYGON_SAMPLES = 96
const BASE_HALF_WIDTH = 2          // 4px total minimum cable width
const AUDIO_MAX_DEVIATION = 8      // ±8px per side for audio
const CV_MAX_DEVIATION = 10        // ±10px per side for CV

/**
 * Build a filled polygon whose edges deform based on signal data.
 *
 * Audio (signed -1..+1): top edge follows positive half, bottom follows negative.
 *   signal=+1 → top bulges out, bottom at base. signal=-1 → bottom bulges out.
 *   Cable width = 4px at zero crossings, 12px at peaks.
 *
 * CV/Gate (unsigned 0..1): both edges expand symmetrically.
 *   signal=1 → cable fully expanded. signal=0 → base width only.
 */
function computeSignalPolygon(
  start: Point, end: Point,
  waveform: Float32Array | null,
  scrollOffset: number,
  maxDeviation: number,
  baseHalfWidth: number,
  mode: 'audio' | 'cv' | 'gate',
): string {
  const bz = getCableBezier(start, end)
  const N = POLYGON_SAMPLES

  const topX = new Float64Array(N)
  const topY = new Float64Array(N)
  const botX = new Float64Array(N)
  const botY = new Float64Array(N)
  const wLen = waveform ? waveform.length : 0

  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const pt = bezierPoint(t, bz)
    const norm = bezierNormal(t, bz)

    let signal = 0
    if (waveform && wLen > 0) {
      const rawIdx = (((i / N) * wLen - scrollOffset) % wLen + wLen) % wLen
      const idx0 = Math.floor(rawIdx)
      const idx1 = (idx0 + 1) % wLen
      const frac = rawIdx - idx0
      signal = waveform[idx0] * (1 - frac) + waveform[idx1] * frac
    }

    let topDev: number, botDev: number
    if (mode === 'audio') {
      // Asymmetric: top edge traces positive half, bottom traces negative half
      topDev = Math.max(0, signal) * maxDeviation
      botDev = Math.max(0, -signal) * maxDeviation
    } else {
      // Symmetric: both edges expand equally (CV 0-1, gate 0-1)
      const dev = Math.max(0, signal) * maxDeviation
      topDev = dev
      botDev = dev
    }

    topX[i] = pt.x + norm.x * (baseHalfWidth + topDev)
    topY[i] = pt.y + norm.y * (baseHalfWidth + topDev)
    botX[i] = pt.x - norm.x * (baseHalfWidth + botDev)
    botY[i] = pt.y - norm.y * (baseHalfWidth + botDev)
  }

  // Build closed polygon: forward top edge, backward bottom edge
  const parts: string[] = []
  parts.push(`M${topX[0].toFixed(1)} ${topY[0].toFixed(1)}`)
  for (let i = 1; i < N; i++) parts.push(`L${topX[i].toFixed(1)} ${topY[i].toFixed(1)}`)
  for (let i = N - 1; i >= 0; i--) parts.push(`L${botX[i].toFixed(1)} ${botY[i].toFixed(1)}`)
  parts.push('Z')
  return parts.join('')
}

// ── Cable path ────────────────────────────────────────────────────────────────

export function getCablePath(start: Point, end: Point): string {
  const dx = end.x - start.x
  const droop = computeDroop(start, end)

  const cp1x = start.x + dx * 0.25
  const cp1y = start.y + droop
  const cp2x = start.x + dx * 0.75
  const cp2y = end.y + droop

  return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`
}

/** Rough Bezier arc length estimate (avoids DOM getTotalLength) */
function estimatePathLength(start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const droop = computeDroop(start, end)
  return dist + droop * 0.5
}

// ── Cable component ───────────────────────────────────────────────────────────

interface CableProps {
  id: string
  start: Point
  end: Point
  signalType: SignalType
  selected: boolean
  signalLevel?: number
  gateHigh?: boolean
  pulseProgress?: number
  pulseDirection?: 'attack' | 'release' | null
  flowPhase?: number
  dominantFreqHz?: number
  waveform?: Float32Array | null
  gateWidth?: number
  moduleOff?: boolean
  destSignalType?: SignalType
  displayMode?: CableDisplayMode
}

export default function Cable({
  id, start, end, signalType, selected,
  signalLevel = 0.5,
  gateHigh = false,
  pulseProgress = 0,
  pulseDirection = null,
  flowPhase = 0,
  waveform = null,
  gateWidth = 2,
  moduleOff = false,
  destSignalType,
  displayMode,
}: CableProps) {
  const selectCable = useRackStore((s) => s.selectCable)
  const selectedCableId = useRackStore((s) => s.selectedCableId)
  const setProbeClickPos = useRackStore((s) => s.setProbeClickPos)
  const [hovered, setHovered] = useState(false)

  // ── Display mode deviation interpolation ──────────────────────────────
  const prevTimeRef = useRef(performance.now())
  const devScaleRef = useRef(0)

  const mode = displayMode ?? 'clean'
  let targetDevScale: number
  if (selected || hovered) {
    targetDevScale = 1.0
  } else {
    switch (mode) {
      case 'full':   targetDevScale = 1.0; break
      case 'subtle': targetDevScale = 0.25; break
      default:       targetDevScale = 0.0; break
    }
  }

  const now = performance.now()
  const dt = (now - prevTimeRef.current) / 1000
  prevTimeRef.current = now
  const rate = targetDevScale > devScaleRef.current ? 6.67 : 5.0
  devScaleRef.current += (targetDevScale - devScaleRef.current) * Math.min(1, dt * rate)
  if (Math.abs(devScaleRef.current - targetDevScale) < 0.01) {
    devScaleRef.current = targetDevScale
  }
  const effectiveDevScale = devScaleRef.current

  const baseColor = CABLE_COLORS[signalType]
  const d = getCablePath(start, end)

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (selectedCableId === id) {
        selectCable(null)
      } else {
        setProbeClickPos({ x: e.clientX, y: e.clientY })
        selectCable(id)
      }
    },
    [id, selectedCableId, selectCable, setProbeClickPos],
  )

  // ── Ghost state for OFF modules ──────────────────────────────────────────
  // When either end's module is OFF, cable goes ghost: nearly invisible, no effects
  if (moduleOff) {
    return (
      <g onClick={handleClick} onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{ cursor: 'crosshair', pointerEvents: 'auto' }}>
        <path d={d} stroke="transparent" strokeWidth={20} fill="none" />
        <path
          d={d}
          stroke={baseColor}
          strokeWidth={2}
          strokeOpacity={0.08}
          fill="none"
          strokeLinecap="round"
        />
      </g>
    )
  }

  // ── Gate cables: binary rendering — sharp on/off, no glow ────────────────
  if (signalType === 'gate') {
    const showPulse = pulseProgress > 0 && pulseProgress < 1 && pulseDirection !== null
    const pulsePathLen = estimatePathLength(start, end)
    const effectiveGateHalfWidth = BASE_HALF_WIDTH + (gateWidth / 2 - BASE_HALF_WIDTH) * effectiveDevScale
    const gatePolygon = computeSignalPolygon(start, end, null, 0, 0, effectiveGateHalfWidth, 'gate')

    // GATE LOW: nearly invisible thin polygon
    if (!gateHigh && !showPulse) {
      return (
        <g onClick={handleClick} onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{ cursor: 'crosshair', pointerEvents: 'auto' }}>
          <path d={d} stroke="transparent" strokeWidth={20} fill="none" />
          <path d={gatePolygon} fill={baseColor} fillOpacity={0.08} stroke="none" />
          {hovered && !selected && (
            <path d={d} stroke={baseColor} strokeWidth={4} strokeOpacity={0.35} fill="none" strokeLinecap="round" style={{ filter: 'blur(4px)' }} />
          )}
          {selected && (
            <path d={d} stroke={baseColor} strokeWidth={6} fill="none" strokeLinecap="round" style={{ animation: 'probePulse 1.5s ease-in-out infinite' }} />
          )}
        </g>
      )
    }

    // GATE HIGH + ATTACK PULSE: fuse-burning effect (strokes for animation overlays)
    // Dark unlit fuse ahead → white-hot fire front → bright magenta fill behind
    if (showPulse && pulseDirection === 'attack') {
      return (
        <g onClick={handleClick} onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{ cursor: 'crosshair', pointerEvents: 'auto' }}>
          <path d={d} stroke="transparent" strokeWidth={20} fill="none" />
          {/* Layer 1: Dark unlit fuse — polygon at low opacity */}
          <path d={gatePolygon} fill={baseColor} fillOpacity={0.12} stroke="none" />
          {/* Layer 2: Lit portion behind the pulse — bright stroke */}
          <path
            d={d} stroke={baseColor} strokeWidth={4} strokeOpacity={1.0}
            fill="none" strokeLinecap="round"
            strokeDasharray={`${pulseProgress * pulsePathLen} ${pulsePathLen}`}
            style={{ filter: `drop-shadow(0 0 8px ${baseColor})` }}
          />
          {/* Layer 3: White-hot pulse front — 10px stroke, 16px blur */}
          <path
            d={d} stroke="#ffffff" strokeWidth={10} strokeOpacity={1.0}
            fill="none" strokeLinecap="round"
            strokeDasharray={`8 ${pulsePathLen}`}
            strokeDashoffset={pulsePathLen * (1 - pulseProgress)}
            style={{ filter: `drop-shadow(0 0 16px #ffffff) drop-shadow(0 0 6px ${baseColor})` }}
          />
          {/* Destination spark on arrival */}
          {pulseProgress > 0.85 && (
            <circle cx={end.x} cy={end.y} r={8} fill="#ffffff"
              opacity={Math.min(1, (pulseProgress - 0.85) * 6)}
              style={{ filter: `blur(4px) drop-shadow(0 0 8px ${baseColor})` }} />
          )}
        </g>
      )
    }

    // GATE HIGH SUSTAINED: solid bright polygon
    if (gateHigh && !showPulse) {
      return (
        <g onClick={handleClick} onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{ cursor: 'crosshair', pointerEvents: 'auto' }}>
          <path d={d} stroke="transparent" strokeWidth={20} fill="none" />
          <path
            d={gatePolygon} fill={baseColor} fillOpacity={1.0} stroke="none"
            style={{ filter: `drop-shadow(0 0 8px ${baseColor})` }}
          />
          {/* Endpoint sparks */}
          <circle cx={start.x} cy={start.y} r={4} fill={baseColor} opacity={0.6}
            style={{ filter: 'blur(2px)' }} />
          <circle cx={end.x} cy={end.y} r={4} fill={baseColor} opacity={0.6}
            style={{ filter: 'blur(2px)' }} />
          {selected && (
            <path d={d} stroke={baseColor} strokeWidth={6} fill="none" strokeLinecap="round" style={{ animation: 'probePulse 1.5s ease-in-out infinite' }} />
          )}
        </g>
      )
    }

    // GATE RELEASE: instant snap to thin polygon
    return (
      <g onClick={handleClick} onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{ cursor: 'crosshair', pointerEvents: 'auto' }}>
        <path d={d} stroke="transparent" strokeWidth={20} fill="none" />
        <path d={gatePolygon} fill={baseColor} fillOpacity={0.08} stroke="none" />
      </g>
    )
  }

  // ── Normalized visual params — same function for every cable of this type ──
  const params = signalType === 'audio'
    ? getAudioCableVisuals(signalLevel)
    : getCvCableVisuals(signalLevel)

  // Selected state overrides
  const activeColor = params.bodyColor
  const bodyOpacity = selected ? 0.6  : params.bodyOpacity
  const coreOpacity = selected ? 1.0  : params.coreOpacity
  const bodyWidth   = selected ? 5    : params.bodyWidth
  const coreWidth   = selected ? 2.5  : params.coreWidth
  // Derive filter strings from params
  const glowHex = Math.round(params.glowOpacity * 255).toString(16).padStart(2, '0')
  const bodyFilter = params.glowBlur > 0
    ? `drop-shadow(0 0 ${params.glowBlur}px ${params.glowColor}${glowHex})`
    : 'none'
  const coreFilter = selected
    ? `drop-shadow(0 0 12px ${params.glowColor}) drop-shadow(0 0 4px ${params.glowColor})`
    : params.glowBlur > 0
      ? `drop-shadow(0 0 ${params.glowBlur + 2}px ${params.glowColor}${glowHex}) drop-shadow(0 0 ${Math.round(params.glowBlur * 0.4)}px ${params.glowColor})`
      : 'none'

  const transition = 'fill-opacity 0.15s linear, filter 0.15s linear'
  const strokeTransition = 'stroke-opacity 0.15s linear, filter 0.15s linear, stroke-width 0.15s linear'

  // ── Glow field specs ──────────────────────────────────────────────────────
  const glowFieldOpacity = params.glowOpacity
  const glowFieldBlur = params.glowBlur

  // ── Pulse overlay (gate transitions only) ─────────────────────────────────
  const showPulse = pulseProgress > 0 && pulseProgress < 1 && pulseDirection !== null
  const pulsePathLen = estimatePathLength(start, end)
  const pulseSegment = pulsePathLen * PULSE_SEGMENT_RATIO
  let pulseDashoffset = 0
  if (showPulse) {
    const travel = pulseDirection === 'release' ? (1 - pulseProgress) : pulseProgress
    pulseDashoffset = pulsePathLen * (1 - travel)
  }

  // ── Signal-shaped polygon body ────────────────────────────────────────────
  const hasSignal = waveform && waveform.length > 0 && signalLevel > 0.05
  const scrollOffset = hasSignal ? (flowPhase / 24) * waveform!.length : 0
  const fullMaxDev = signalType === 'audio' ? AUDIO_MAX_DEVIATION : CV_MAX_DEVIATION
  const maxDev = fullMaxDev * effectiveDevScale
  const polyMode = signalType === 'audio' ? 'audio' as const : 'cv' as const
  const polygonPath = computeSignalPolygon(
    start, end,
    hasSignal ? waveform! : null,
    scrollOffset,
    maxDev,
    BASE_HALF_WIDTH,
    polyMode,
  )

  // Wider polygon for glow field — follows the deformed body shape
  const glowPolygonPath = signalLevel > 0.05 && effectiveDevScale > 0.01
    ? computeSignalPolygon(
        start, end,
        hasSignal ? waveform! : null,
        scrollOffset,
        fullMaxDev * effectiveDevScale + 4 * effectiveDevScale,
        BASE_HALF_WIDTH + 3 * effectiveDevScale,
        polyMode,
      )
    : ''

  // ── Endpoint spark specs ──────────────────────────────────────────────────
  const sparkRadius = params.sparkRadius
  const sparkBlur = 2 + Math.round(signalLevel * 2)
  const sparkOpacity = params.sparkOpacity
  const sparkCenterOpacity = signalLevel * 0.7

  return (
    <g onClick={handleClick} onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{ cursor: 'crosshair', pointerEvents: 'auto' }}>
      {/* Hit area — invisible wide stroke for easy clicking */}
      <path
        d={d}
        stroke="transparent"
        strokeWidth={20}
        fill="none"
      />

      {/* Layer 0: Glow field — wider deformed polygon with blur */}
      {signalLevel > 0.05 && (
        <path
          d={glowPolygonPath}
          fill={activeColor}
          fillOpacity={glowFieldOpacity}
          stroke="none"
          style={{
            filter: `blur(${glowFieldBlur}px)`,
            transition,
          }}
        />
      )}

      {/* Layer 1: Cable body — signal-shaped filled polygon */}
      <path
        d={polygonPath}
        fill={activeColor}
        fillOpacity={bodyOpacity}
        stroke="none"
        style={{
          filter: bodyFilter,
          transition,
        }}
      />

      {/* Layer 2: Cable core — thin bright centerline stroke with neon glow */}
      <path
        d={d}
        stroke={activeColor}
        strokeWidth={coreWidth}
        strokeOpacity={coreOpacity}
        fill="none"
        strokeLinecap="round"
        style={{
          filter: coreFilter,
          transition: strokeTransition,
          willChange: 'filter, stroke-opacity',
        }}
      />

      {/* Traveling pulse — bright segment races along the cable on gate transitions */}
      {showPulse && (
        <path
          d={d}
          stroke={pulseDirection === 'attack' ? PULSE_COLOR_ATTACK : baseColor}
          strokeWidth={pulseDirection === 'attack' ? 5 : 3}
          strokeOpacity={pulseDirection === 'attack' ? 1.0 : 0.5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${pulseSegment} ${pulsePathLen}`}
          strokeDashoffset={pulseDashoffset}
          style={{
            filter: `drop-shadow(0 0 ${pulseDirection === 'attack' ? 14 : 8}px ${PULSE_COLOR_ATTACK}) drop-shadow(0 0 4px #ffffff)`,
          }}
        />
      )}

      {/* Cross-type indicator — dashed stripe in dest port color */}
      {destSignalType && (
        <path
          d={d}
          stroke={CABLE_COLORS[destSignalType]}
          strokeWidth={1.5}
          strokeOpacity={0.4 + signalLevel * 0.4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="3 9"
          strokeDashoffset={-flowPhase * 0.5}
          style={{
            filter: signalLevel > 0.1
              ? `drop-shadow(0 0 3px ${CABLE_COLORS[destSignalType]})`
              : 'none',
          }}
        />
      )}

      {/* Hover glow overlay — brightens cable on hover (not when selected) */}
      {hovered && !selected && (
        <path
          d={d}
          stroke={baseColor}
          strokeWidth={bodyWidth + 2}
          strokeOpacity={0.35}
          fill="none"
          strokeLinecap="round"
          style={{ filter: `blur(4px)` }}
        />
      )}

      {/* Selection / probe highlight — pulsing when probed */}
      {selected && (
        <path
          d={d}
          stroke={baseColor}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          style={{ animation: 'probePulse 1.5s ease-in-out infinite' }}
        />
      )}

      {/* Endpoint sparks — bloom at cable-port connections */}
      {signalLevel > 0.08 && (
        <>
          <circle
            cx={start.x} cy={start.y} r={sparkRadius}
            fill={activeColor}
            opacity={sparkOpacity}
            style={{ filter: `blur(${sparkBlur}px)` }}
          />
          <circle
            cx={start.x} cy={start.y} r={2}
            fill="#ffffff"
            opacity={sparkCenterOpacity}
          />
          <circle
            cx={end.x} cy={end.y} r={sparkRadius}
            fill={destSignalType ? CABLE_COLORS[destSignalType] : activeColor}
            opacity={sparkOpacity}
            style={{ filter: `blur(${sparkBlur}px)` }}
          />
          <circle
            cx={end.x} cy={end.y} r={2}
            fill="#ffffff"
            opacity={sparkCenterOpacity}
          />
        </>
      )}
    </g>
  )
}

// Injected once into the SVG's <defs> — kept for potential fallback
export function CableFlowKeyframes() {
  return (
    <defs>
      <style>{`
        @keyframes cableFlow {
          to { stroke-dashoffset: -24; }
        }
        @keyframes cableFlowIdle {
          to { stroke-dashoffset: -30; }
        }
        @keyframes probePulse {
          0%, 100% { stroke-opacity: 0.20; }
          50% { stroke-opacity: 0.40; }
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
