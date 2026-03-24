import { useCallback, useEffect, useRef, useState } from 'react'
import { useRackStore } from '@/store/rackStore'
import { getModuleDefinition } from '@/engine/moduleRegistry'
import { SIGNAL_COLORS } from '@/engine/signalTypes'
import { getPortCenter } from '@/ui/Cables/CableLayer'
import { getCableBezier, bezierPoint } from '@/ui/Cables/Cable'
import AudioEngineManager from '@/engine/AudioEngineManager'
import AudioProbeDisplay from './AudioProbeDisplay'
import CvProbeDisplay from './CvProbeDisplay'
import GateProbeDisplay from './GateProbeDisplay'
import styles from './SignalProbe.module.css'

const ASPECT = 4 / 3
const MIN_W = 200
const MAX_W = 500
const DEFAULT_W = 300
const MARGIN = 16

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function applyScaleVars(el: HTMLElement, w: number) {
  const s = Math.max(0, Math.min(1, (w - MIN_W) / (MAX_W - MIN_W)))
  el.style.setProperty('--probe-title-font', `${lerp(10, 14, s)}px`)
  el.style.setProperty('--probe-hud-font', `${lerp(18, 36, s)}px`)
  el.style.setProperty('--probe-info-font', `${lerp(8, 12, s)}px`)
  el.style.setProperty('--probe-stat-font', `${lerp(9, 12, s)}px`)
  el.style.setProperty('--probe-hud-pad', `${lerp(4, 8, s)}px`)
  el.style.setProperty('--probe-grip-size', `${lerp(8, 12, s)}px`)
}

const SIGNAL_TITLES: Record<string, string> = {
  audio: 'AUDIO SIGNAL',
  cv: 'CONTROL VOLTAGE',
  gate: 'GATE SIGNAL',
}

interface SignalProbeProps {
  containerRef: React.RefObject<HTMLElement | null>
  scrollContainerRef: React.RefObject<HTMLElement | null>
  zoom: number
}

export default function SignalProbe({ containerRef, zoom }: SignalProbeProps) {
  const selectedCableId = useRackStore((s) => s.selectedCableId)
  const probeClickPos = useRackStore((s) => s.probeClickPos)
  const connections = useRackStore((s) => s.connections)
  const modules = useRackStore((s) => s.modules)
  const selectCable = useRackStore((s) => s.selectCable)


  const posRef = useRef<{ x: number; y: number } | null>(null)
  const midRef = useRef<{ x: number; y: number } | null>(null)
  const sizeRef = useRef({ w: DEFAULT_W, h: Math.round(DEFAULT_W / ASPECT) })
  const panelRef = useRef<HTMLDivElement>(null)
  const calloutRef = useRef<SVGSVGElement>(null)
  const activityDotRef = useRef<HTMLSpanElement>(null)

  // Drag state
  const draggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  // Resize state
  const resizingRef = useRef(false)
  const [probeWidth, setProbeWidth] = useState(DEFAULT_W)

  // Tether state
  const tRef = useRef(0.5)
  const tetherPhaseRef = useRef(0)

  // Fade-out state
  const closingRef = useRef(false)
  const fadeRef = useRef(1)

  const conn = connections.find((c) => c.id === selectedCableId)
  if (!conn) return null

  const signalType = conn.signalType
  const color = SIGNAL_COLORS[signalType]
  const title = SIGNAL_TITLES[signalType] ?? 'SIGNAL'
  const defaultH = Math.round(DEFAULT_W / ASPECT)

  // Look up module names
  const srcMod = modules[conn.sourceModuleId]
  const destMod = modules[conn.destModuleId]
  const srcDef = srcMod ? getModuleDefinition(srcMod.type) : undefined
  const destDef = destMod ? getModuleDefinition(destMod.type) : undefined
  const srcName = srcDef?.name ?? srcMod?.type ?? '?'
  const destName = destDef?.name ?? destMod?.type ?? '?'
  const srcPort = srcDef?.ports.find((p) => p.id === conn.sourcePortId)?.label ?? conn.sourcePortId
  const destPort = destDef?.ports.find((p) => p.id === conn.destPortId)?.label ?? conn.destPortId
  const routeLabel = `${srcName} ${srcPort} → ${destName} ${destPort}`

  // Compute cable attachment point in screen space (at stored t parameter)
  const computeAttachPoint = useCallback((): { x: number; y: number } | null => {
    const container = containerRef.current
    if (!container) return null
    const start = getPortCenter(conn.sourceModuleId, conn.sourcePortId, container, zoom)
    const end = getPortCenter(conn.destModuleId, conn.destPortId, container, zoom)
    if (!start || !end) return null
    const bz = getCableBezier(start, end)
    const pt = bezierPoint(tRef.current, bz)
    const containerRect = container.getBoundingClientRect()
    return {
      x: pt.x * zoom + containerRect.left,
      y: pt.y * zoom + containerRect.top,
    }
  }, [containerRef, conn.sourceModuleId, conn.sourcePortId, conn.destModuleId, conn.destPortId, zoom])

  // Initialize position from click + compute t parameter
  if (!posRef.current && probeClickPos) {
    sizeRef.current = { w: DEFAULT_W, h: defaultH }

    // Find closest t on cable bezier to click position
    const container = containerRef.current
    if (container) {
      const start = getPortCenter(conn.sourceModuleId, conn.sourcePortId, container, zoom)
      const end = getPortCenter(conn.destModuleId, conn.destPortId, container, zoom)
      if (start && end) {
        const bz = getCableBezier(start, end)
        const containerRect = container.getBoundingClientRect()
        const clickContent = {
          x: (probeClickPos.x - containerRect.left) / zoom,
          y: (probeClickPos.y - containerRect.top) / zoom,
        }
        let bestT = 0.5
        let bestDist = Infinity
        for (let i = 0; i <= 100; i++) {
          const t = i / 100
          const pt = bezierPoint(t, bz)
          const d = (pt.x - clickContent.x) ** 2 + (pt.y - clickContent.y) ** 2
          if (d < bestDist) { bestDist = d; bestT = t }
        }
        tRef.current = bestT
      }
    }

    let px = probeClickPos.x + 20
    let py = probeClickPos.y - defaultH - 20
    if (py < MARGIN) py = probeClickPos.y + 20
    px = Math.max(MARGIN, Math.min(window.innerWidth - DEFAULT_W - MARGIN, px))
    py = Math.max(MARGIN, Math.min(window.innerHeight - defaultH - MARGIN, py))
    posRef.current = { x: px, y: py }
    midRef.current = computeAttachPoint()
    closingRef.current = false
    fadeRef.current = 1
  }

  // Apply scale vars on initial render
  useEffect(() => {
    if (panelRef.current) applyScaleVars(panelRef.current, sizeRef.current.w)
  }, [])

  // ── RAF loop: track cable movement, update tether, activity dot ──────────
  useEffect(() => {
    let raf: number
    let prevTime = performance.now()
    const selectCableRef = { current: selectCable }
    selectCableRef.current = selectCable

    const track = () => {
      const now = performance.now()
      const dt = (now - prevTime) / 1000
      prevTime = now

      // Fade-out on close
      if (closingRef.current) {
        fadeRef.current = Math.max(0, fadeRef.current - dt / 0.2)
        if (panelRef.current) panelRef.current.style.opacity = String(fadeRef.current)
        if (calloutRef.current) calloutRef.current.style.opacity = String(fadeRef.current)
        if (fadeRef.current <= 0) {
          selectCableRef.current(null)
          return
        }
        raf = requestAnimationFrame(track)
        // Still update tether during fade
      }

      const newMid = computeAttachPoint()

      // Position tracking — skip during manual drag
      if (!draggingRef.current && !resizingRef.current && newMid && midRef.current && posRef.current) {
        const dx = newMid.x - midRef.current.x
        const dy = newMid.y - midRef.current.y
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          const sw = sizeRef.current.w
          const sh = sizeRef.current.h
          posRef.current = {
            x: Math.max(MARGIN, Math.min(window.innerWidth - sw - MARGIN, posRef.current.x + dx)),
            y: Math.max(MARGIN, Math.min(window.innerHeight - sh - MARGIN, posRef.current.y + dy)),
          }
          if (panelRef.current) {
            panelRef.current.style.left = `${posRef.current.x}px`
            panelRef.current.style.top = `${posRef.current.y}px`
          }
        }
      }
      if (newMid) midRef.current = newMid

      // Update tether (quadratic bezier + diamond)
      if (calloutRef.current && posRef.current && midRef.current) {
        const path = calloutRef.current.querySelector('path')
        const diamond = calloutRef.current.querySelector('rect')

        const sw = sizeRef.current.w
        const sh = sizeRef.current.h
        const anchorX = posRef.current.x + sw / 2
        const anchorY = posRef.current.y > midRef.current.y
          ? posRef.current.y
          : posRef.current.y + sh
        const attachX = midRef.current.x
        const attachY = midRef.current.y

        // Quadratic bezier control point — perpendicular arc
        const mx = (anchorX + attachX) / 2
        const my = (anchorY + attachY) / 2
        const ddx = attachX - anchorX
        const ddy = attachY - anchorY
        const dist = Math.sqrt(ddx * ddx + ddy * ddy)
        const nx = -ddy / (dist || 1)
        const ny = ddx / (dist || 1)
        const arcOffset = dist * 0.15
        const cx = mx + nx * arcOffset
        const cy = my + ny * arcOffset

        if (path) {
          path.setAttribute('d', `M${anchorX},${anchorY} Q${cx},${cy} ${attachX},${attachY}`)
          // Animate dash flow
          tetherPhaseRef.current += dt * 20
          path.setAttribute('stroke-dashoffset', String(-tetherPhaseRef.current))
        }

        if (diamond) {
          // Pulsing size 7-9px at 1Hz
          const size = 8 + Math.sin(now / 1000 * Math.PI * 2)
          const half = size / 2
          diamond.setAttribute('x', String(attachX - half))
          diamond.setAttribute('y', String(attachY - half))
          diamond.setAttribute('width', String(size))
          diamond.setAttribute('height', String(size))
          diamond.setAttribute('transform', `rotate(45 ${attachX} ${attachY})`)
        }
      }

      // Activity dot
      if (activityDotRef.current) {
        const vizData = AudioEngineManager.getInstance().getVisualizationData(conn.sourceModuleId)
        let active = false
        if (signalType === 'audio') {
          if (vizData.waveform && vizData.waveform.length > 0) {
            let sum = 0
            for (let i = 0; i < vizData.waveform.length; i++) sum += vizData.waveform[i] * vizData.waveform[i]
            active = Math.sqrt(sum / vizData.waveform.length) > 0.001
          }
        } else if (signalType === 'gate') {
          active = vizData.customData?.gateValue !== undefined
            ? (vizData.customData.gateValue as number) > 0.5
            : (vizData.waveform?.[vizData.waveform.length - 1] ?? 0) > 0.5
        } else {
          // CV — active if any data present
          active = vizData.customData?.envelopeValue !== undefined
            || vizData.customData?.pressedNote !== undefined
            || vizData.customData?.cvLevel !== undefined
            || (vizData.waveform !== undefined && vizData.waveform.length > 0)
        }
        activityDotRef.current.style.opacity = active
          ? String(0.5 + 0.5 * Math.sin(now / 300))
          : '0.2'
      }

      if (!closingRef.current) {
        raf = requestAnimationFrame(track)
      }
    }
    raf = requestAnimationFrame(track)
    return () => cancelAnimationFrame(raf)
  }, [computeAttachPoint, conn.sourceModuleId, signalType, selectCable])

  // Reset state when cable changes
  useEffect(() => {
    posRef.current = null
    midRef.current = null
    tRef.current = 0.5
    tetherPhaseRef.current = 0
    closingRef.current = false
    fadeRef.current = 1
  }, [selectedCableId])

  // Escape key closes probe
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closingRef.current = true
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // ── Drag handling ────────────────────────────────────────────────────────
  const handleHeaderDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    if (!posRef.current) return
    draggingRef.current = true
    dragOffsetRef.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    }
    if (panelRef.current) {
      panelRef.current.classList.add(styles.probePanelLifted)
    }

    const onMove = (ev: PointerEvent) => {
      if (!posRef.current) return
      const sw = sizeRef.current.w
      const sh = sizeRef.current.h
      posRef.current = {
        x: Math.max(MARGIN, Math.min(window.innerWidth - sw - MARGIN, ev.clientX - dragOffsetRef.current.x)),
        y: Math.max(MARGIN, Math.min(window.innerHeight - sh - MARGIN, ev.clientY - dragOffsetRef.current.y)),
      }
      if (panelRef.current) {
        panelRef.current.style.left = `${posRef.current.x}px`
        panelRef.current.style.top = `${posRef.current.y}px`
      }
    }
    const onUp = () => {
      draggingRef.current = false
      if (panelRef.current) {
        panelRef.current.classList.remove(styles.probePanelLifted)
      }
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [])

  // ── Double-click reset ───────────────────────────────────────────────────
  const handleDoubleClick = useCallback(() => {
    const attach = computeAttachPoint()
    if (!attach) return
    const w = DEFAULT_W
    const h = Math.round(w / ASPECT)
    sizeRef.current = { w, h }
    let px = attach.x + 20
    let py = attach.y - h - 20
    if (py < MARGIN) py = attach.y + 20
    px = Math.max(MARGIN, Math.min(window.innerWidth - w - MARGIN, px))
    py = Math.max(MARGIN, Math.min(window.innerHeight - h - MARGIN, py))
    posRef.current = { x: px, y: py }
    if (panelRef.current) {
      panelRef.current.style.left = `${px}px`
      panelRef.current.style.top = `${py}px`
      panelRef.current.style.width = `${w}px`
      panelRef.current.style.height = `${h}px`
      applyScaleVars(panelRef.current, w)
    }
    setProbeWidth(w)
  }, [computeAttachPoint])

  // ── Resize handling — aspect-ratio locked at 4:3 ──────────────────────────
  const handleResizeDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizingRef.current = true
    const startX = e.clientX
    const startY = e.clientY
    const startW = sizeRef.current.w

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      // Project onto diagonal: favor horizontal, account for vertical
      const delta = dx * 0.75 + dy * 0.25 * ASPECT
      const newW = Math.max(MIN_W, Math.min(MAX_W, startW + delta))
      const newH = Math.round(newW / ASPECT)
      sizeRef.current = { w: newW, h: newH }
      if (panelRef.current) {
        panelRef.current.style.width = `${newW}px`
        panelRef.current.style.height = `${newH}px`
        applyScaleVars(panelRef.current, newW)
      }
    }
    const onUp = () => {
      resizingRef.current = false
      setProbeWidth(sizeRef.current.w)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [])

  // ── Preset sizes (S/M/L) ─────────────────────────────────────────────────
  const applyPreset = useCallback((w: number) => {
    const h = Math.round(w / ASPECT)
    sizeRef.current = { w, h }
    if (panelRef.current) {
      panelRef.current.style.width = `${w}px`
      panelRef.current.style.height = `${h}px`
      applyScaleVars(panelRef.current, w)
    }
    // Re-clamp position to viewport
    if (posRef.current) {
      posRef.current.x = Math.max(MARGIN, Math.min(window.innerWidth - w - MARGIN, posRef.current.x))
      posRef.current.y = Math.max(MARGIN, Math.min(window.innerHeight - h - MARGIN, posRef.current.y))
      if (panelRef.current) {
        panelRef.current.style.left = `${posRef.current.x}px`
        panelRef.current.style.top = `${posRef.current.y}px`
      }
    }
    setProbeWidth(w)
  }, [])

  // ── Close ─────────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    closingRef.current = true
  }, [])

  const pos = posRef.current
  if (!pos) return null
  const mid = midRef.current

  // Responsive layout breakpoint
  const layout = probeWidth >= 380 ? 'large' : probeWidth >= 260 ? 'medium' : 'small' as const

  const cssVars = {
    '--probe-color': color,
    '--probe-glow': color + '60',
    '--probe-bg': color + '18',
  } as React.CSSProperties

  // Callout anchor: center of closest edge
  const sw = sizeRef.current.w
  const sh = sizeRef.current.h
  const anchorX = pos.x + sw / 2
  const anchorY = mid && pos.y > mid.y ? pos.y : pos.y + sh

  return (
    <>
      {/* Tether SVG — quadratic bezier with glow + pulsing diamond */}
      {mid && (
        <svg
          ref={calloutRef}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <defs>
            <filter id="tetherGlow">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>
          {/* Glow layer */}
          <path
            d={`M${anchorX},${anchorY} Q${(anchorX + mid.x) / 2},${(anchorY + mid.y) / 2} ${mid.x},${mid.y}`}
            stroke={color}
            strokeWidth={5}
            strokeOpacity={0.25}
            fill="none"
            filter="url(#tetherGlow)"
          />
          {/* Core tether — animated dashes */}
          <path
            d={`M${anchorX},${anchorY} Q${(anchorX + mid.x) / 2},${(anchorY + mid.y) / 2} ${mid.x},${mid.y}`}
            stroke={color}
            strokeWidth={1.5}
            strokeOpacity={0.5}
            strokeDasharray="6 8"
            strokeDashoffset={0}
            fill="none"
          />
          {/* Diamond attachment point */}
          <rect
            x={mid.x - 4} y={mid.y - 4}
            width={8} height={8}
            transform={`rotate(45 ${mid.x} ${mid.y})`}
            fill={color} fillOpacity={0.6}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
      )}

      {/* Probe panel */}
      <div
        ref={panelRef}
        className={styles.probePanel}
        style={{
          ...cssVars,
          left: pos.x,
          top: pos.y,
          width: sizeRef.current.w,
          height: sizeRef.current.h,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — drag handle */}
        <div
          className={styles.header}
          onPointerDown={handleHeaderDown}
          onDoubleClick={handleDoubleClick}
        >
          <span
            ref={activityDotRef}
            className={styles.activityDot}
            style={{ background: color }}
          />
          <span className={styles.title}>{layout === 'small' ? signalType.toUpperCase() : title}</span>
          <div className={styles.presetGroup}>
            {([['S', MIN_W], ['M', DEFAULT_W], ['L', MAX_W]] as const).map(([label, w]) => (
              <button
                key={label}
                className={`${styles.presetBtn} ${Math.abs(probeWidth - w) < 30 ? styles.presetBtnActive : ''}`}
                onClick={() => applyPreset(w)}
              >{label}</button>
            ))}
          </div>
          <button className={styles.headerBtn} onClick={handleClose} aria-label="Close probe" title="Close">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </button>
        </div>

        {/* Display area — delegated to signal-type-specific component */}
        {signalType === 'audio' && (
          <AudioProbeDisplay sourceModuleId={conn.sourceModuleId} color={color} layout={layout} routeLabel={routeLabel} />
        )}
        {signalType === 'cv' && (
          <CvProbeDisplay sourceModuleId={conn.sourceModuleId} color={color} connection={conn} layout={layout} routeLabel={routeLabel} />
        )}
        {signalType === 'gate' && (
          <GateProbeDisplay sourceModuleId={conn.sourceModuleId} color={color} layout={layout} routeLabel={routeLabel} />
        )}

        {/* Resize grip */}
        <div className={styles.resizeGrip} onPointerDown={handleResizeDown}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1" />
            <line x1="9" y1="4" x2="4" y2="9" stroke="currentColor" strokeWidth="1" />
            <line x1="9" y1="7" x2="7" y2="9" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
      </div>
    </>
  )
}
