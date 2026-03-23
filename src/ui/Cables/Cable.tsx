import { useCallback } from 'react'
import { useRackStore } from '@/store/rackStore'
import {
  CABLE_COLORS,
  FLOW_DASHARRAY,
  PULSE_SEGMENT_RATIO,
  PULSE_COLOR_ATTACK,
  FLOW_HOT_COLOR,
  AUDIO_COLOR_COLD,
  AUDIO_COLOR_MID,
  AUDIO_COLOR_HOT,
} from './cableColors'
import type { SignalType } from '@/types/module'

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

function getCableBezier(start: Point, end: Point): BezierCtrl {
  const dx = end.x - start.x
  const droop = computeDroop(start, end)
  return {
    p0: start,
    p1: { x: start.x + dx * 0.25, y: start.y + droop },
    p2: { x: start.x + dx * 0.75, y: end.y + droop },
    p3: end,
  }
}

function bezierPoint(t: number, b: BezierCtrl): Point {
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

// ── Waveform-riding path ─────────────────────────────────────────────────────

const WAVEFORM_SAMPLES = 64
const AUDIO_AMPLITUDE = 8   // max ±px deviation for audio
const CV_AMPLITUDE = 6      // max ±px for CV signals

function computeWaveformPath(
  start: Point, end: Point,
  waveform: Float32Array,
  scrollOffset: number,
  amplitude: number,
  isUnipolar: boolean,
): string {
  const bz = getCableBezier(start, end)
  const N = WAVEFORM_SAMPLES
  const wLen = waveform.length

  let path = ''
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const pt = bezierPoint(t, bz)
    const norm = bezierNormal(t, bz)

    const rawIdx = (((i / N) * wLen - scrollOffset) % wLen + wLen) % wLen
    const idx0 = Math.floor(rawIdx)
    const idx1 = (idx0 + 1) % wLen
    const frac = rawIdx - idx0
    let value = waveform[idx0] * (1 - frac) + waveform[idx1] * frac

    if (isUnipolar) value = value * 2 - 1

    const offset = value * amplitude
    const x = pt.x + norm.x * offset
    const y = pt.y + norm.y * offset

    path += i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : ` L${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return path
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function lerpColor(a: string, b: string, t: number): string {
  const p = (c: string, i: number) => parseInt(c.slice(i, i + 2), 16)
  const r = Math.round(p(a, 1) + (p(b, 1) - p(a, 1)) * t)
  const g = Math.round(p(a, 3) + (p(b, 3) - p(a, 3)) * t)
  const bl = Math.round(p(a, 5) + (p(b, 5) - p(a, 5)) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

function getAudioHeatColor(level: number): string {
  if (level > 0.95) return '#ffffff' // clipping flash
  if (level < 0.5) return lerpColor(AUDIO_COLOR_COLD, AUDIO_COLOR_MID, level * 2)
  return lerpColor(AUDIO_COLOR_MID, AUDIO_COLOR_HOT, (level - 0.5) * 2)
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
  moduleOff?: boolean
  destSignalType?: SignalType
}

export default function Cable({
  id, start, end, signalType, selected,
  signalLevel = 0.5,
  gateHigh = false,
  pulseProgress = 0,
  pulseDirection = null,
  flowPhase = 0,
  waveform = null,
  moduleOff = false,
  destSignalType,
}: CableProps) {
  const selectCable = useRackStore((s) => s.selectCable)
  const selectedCableId = useRackStore((s) => s.selectedCableId)

  const baseColor = CABLE_COLORS[signalType]
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

  // ── Ghost state for OFF modules ──────────────────────────────────────────
  // When either end's module is OFF, cable goes ghost: nearly invisible, no effects
  if (moduleOff) {
    return (
      <g onClick={handleClick} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
        <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
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

    // GATE LOW: nearly invisible thin line
    if (!gateHigh && !showPulse) {
      return (
        <g onClick={handleClick} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
          <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
          <path d={d} stroke={baseColor} strokeWidth={2} strokeOpacity={0.08} fill="none" strokeLinecap="round" />
          {selected && (
            <path d={d} stroke={baseColor} strokeWidth={6} strokeOpacity={0.2} fill="none" strokeLinecap="round" />
          )}
        </g>
      )
    }

    // GATE HIGH + ATTACK PULSE: fuse-burning effect
    // Dark unlit fuse ahead → white-hot fire front → bright magenta fill behind
    if (showPulse && pulseDirection === 'attack') {
      return (
        <g onClick={handleClick} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
          <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
          {/* Layer 1: Dark unlit fuse — full cable at low opacity */}
          <path d={d} stroke={baseColor} strokeWidth={2} strokeOpacity={0.12}
            fill="none" strokeLinecap="round" />
          {/* Layer 2: Lit portion behind the pulse — bright fill */}
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

    // GATE HIGH SUSTAINED: solid bright magenta, no dashes
    if (gateHigh && !showPulse) {
      return (
        <g onClick={handleClick} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
          <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
          <path
            d={d} stroke={baseColor} strokeWidth={4} strokeOpacity={1.0}
            fill="none" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${baseColor})` }}
          />
          {/* Endpoint sparks */}
          <circle cx={start.x} cy={start.y} r={4} fill={baseColor} opacity={0.6}
            style={{ filter: 'blur(2px)' }} />
          <circle cx={end.x} cy={end.y} r={4} fill={baseColor} opacity={0.6}
            style={{ filter: 'blur(2px)' }} />
          {selected && (
            <path d={d} stroke={baseColor} strokeWidth={6} strokeOpacity={0.2} fill="none" strokeLinecap="round" />
          )}
        </g>
      )
    }

    // GATE RELEASE: instant snap to dark
    return (
      <g onClick={handleClick} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
        <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
        <path d={d} stroke={baseColor} strokeWidth={2} strokeOpacity={0.08} fill="none" strokeLinecap="round" />
      </g>
    )
  }

  // ── Dynamic brightness — audio/cv cables only (gate returned early above) ─
  const brightness = signalLevel

  // Cross-row cables get a subtle glow boost for visual prominence
  const crossRowDy = Math.abs(end.y - start.y)
  const crossRowBoost = Math.min(0.3, crossRowDy / 600)

  // Color: audio cables shift hotter with signal, others use fixed color
  const activeColor = signalType === 'audio'
    ? getAudioHeatColor(brightness)
    : baseColor

  // IDLE: opacity 0.12, width 2px, no glow
  // ACTIVE: opacity 1.0, width 4px, 12px glow — 8x opacity difference
  const bodyOpacity = selected ? 0.6  : 0.12 + brightness * 0.88
  const coreOpacity = selected ? 1.0  : 0.12 + brightness * 0.88
  const bodyWidth   = selected ? 5    : 2 + (brightness + crossRowBoost) * 2        // 2px → 4px+
  const coreWidth   = selected ? 2.5  : 1 + brightness * 1        // 1px → 2px
  const flowOpacity = brightness < 0.05 ? 0 : brightness * 0.9    // invisible when idle
  const glowBlur    = brightness < 0.05 ? 0 : Math.round(brightness * 12) // 0 → 12px

  const flowDasharray = FLOW_DASHARRAY

  // Glow halo with alpha scaling
  const glowHex = Math.round(brightness * 255).toString(16).padStart(2, '0')
  const bodyFilter = glowBlur > 0
    ? `drop-shadow(0 0 ${glowBlur}px ${baseColor}${glowHex})`
    : 'none'
  const coreFilter = selected
    ? `drop-shadow(0 0 12px ${baseColor}) drop-shadow(0 0 4px ${baseColor})`
    : glowBlur > 0
      ? `drop-shadow(0 0 ${glowBlur + 2}px ${baseColor}${glowHex}) drop-shadow(0 0 ${Math.round(glowBlur * 0.4)}px ${baseColor})`
      : 'none'

  const transition = 'stroke-opacity 0.15s linear, filter 0.15s linear, stroke-width 0.15s linear'

  // ── Glow field specs ──────────────────────────────────────────────────────
  const glowFieldOpacity = brightness * 0.7
  const glowFieldBlur = 4 + Math.round((brightness + crossRowBoost) * 8) // 4px → 12px+

  // ── Pulse overlay (gate transitions only) ─────────────────────────────────
  const showPulse = pulseProgress > 0 && pulseProgress < 1 && pulseDirection !== null
  const pulsePathLen = estimatePathLength(start, end)
  const pulseSegment = pulsePathLen * PULSE_SEGMENT_RATIO
  let pulseDashoffset = 0
  if (showPulse) {
    const travel = pulseDirection === 'release' ? (1 - pulseProgress) : pulseProgress
    pulseDashoffset = pulsePathLen * (1 - travel)
  }

  // ── Waveform-riding path ─────────────────────────────────────────────────
  const hasWaveform = waveform && waveform.length > 0 && brightness > 0.05
  let waveformPathStr = ''
  if (hasWaveform) {
    const isUnipolar = signalType === 'cv'
    const maxAmp = signalType === 'audio' ? AUDIO_AMPLITUDE : CV_AMPLITUDE
    const amp = maxAmp * brightness
    const scrollOffset = (flowPhase / 24) * waveform.length
    waveformPathStr = computeWaveformPath(start, end, waveform, scrollOffset, amp, isUnipolar)
  }

  // ── Endpoint spark specs ──────────────────────────────────────────────────
  const sparkRadius = 4 + brightness * 3         // 4px → 7px
  const sparkBlur = 2 + Math.round(brightness * 2) // 2px → 4px
  const sparkOpacity = brightness * 0.5
  const sparkCenterOpacity = brightness * 0.7

  return (
    <g onClick={handleClick} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
      {/* Hit area — invisible wide stroke for easy clicking */}
      <path
        d={d}
        stroke="transparent"
        strokeWidth={12}
        fill="none"
      />

      {/* Layer 0: Glow field — wide blurred ambient halo, signal-reactive */}
      {brightness > 0.05 && (
        <path
          d={d}
          stroke={activeColor}
          strokeWidth={14}
          strokeOpacity={glowFieldOpacity}
          fill="none"
          strokeLinecap="round"
          style={{
            filter: `blur(${glowFieldBlur}px)`,
            transition,
          }}
        />
      )}

      {/* Layer 1: Cable body — medium stroke, always visible */}
      <path
        d={d}
        stroke={activeColor}
        strokeWidth={bodyWidth}
        strokeOpacity={bodyOpacity}
        fill="none"
        strokeLinecap="round"
        style={{
          filter: bodyFilter,
          transition,
          willChange: 'filter, stroke-opacity',
        }}
      />

      {/* Layer 2: Cable core — thin bright stroke with neon glow */}
      <path
        d={d}
        stroke={activeColor}
        strokeWidth={coreWidth}
        strokeOpacity={coreOpacity}
        fill="none"
        strokeLinecap="round"
        style={{
          filter: coreFilter,
          transition,
          willChange: 'filter, stroke-opacity',
        }}
      />

      {/* Layer 3: Signal visualization — waveform riding OR dashed particles */}
      {hasWaveform ? (
        <path
          d={waveformPathStr}
          stroke={FLOW_HOT_COLOR[signalType]}
          strokeWidth={2}
          strokeOpacity={flowOpacity}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: glowBlur > 0
              ? `drop-shadow(0 0 ${Math.round(glowBlur * 0.7)}px ${baseColor}) drop-shadow(0 0 2px #ffffff)`
              : 'none',
          }}
        />
      ) : (
        <path
          d={d}
          stroke={FLOW_HOT_COLOR[signalType]}
          strokeWidth={2}
          strokeOpacity={flowOpacity}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={flowDasharray}
          strokeDashoffset={-flowPhase}
          style={{
            filter: glowBlur > 0
              ? `drop-shadow(0 0 ${Math.round(glowBlur * 0.7)}px ${baseColor}) drop-shadow(0 0 2px #ffffff)`
              : 'none',
            transition,
          }}
        />
      )}

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
          strokeOpacity={0.4 + brightness * 0.4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="3 9"
          strokeDashoffset={-flowPhase * 0.5}
          style={{
            filter: brightness > 0.1
              ? `drop-shadow(0 0 3px ${CABLE_COLORS[destSignalType]})`
              : 'none',
          }}
        />
      )}

      {/* Selection highlight */}
      {selected && (
        <path
          d={d}
          stroke={baseColor}
          strokeWidth={6}
          strokeOpacity={0.2}
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Endpoint sparks — bloom at cable-port connections */}
      {brightness > 0.08 && (
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
