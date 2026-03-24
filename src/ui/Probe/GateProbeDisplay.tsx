import { useEffect, useRef, useState } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import { clearCanvas, drawGrid } from '@/modules/_shared/drawUtils'
import AudioEngineManager from '@/engine/AudioEngineManager'
import styles from './SignalProbe.module.css'

interface Props {
  sourceModuleId: string
  color: string
  layout?: 'large' | 'medium' | 'small'
  routeLabel?: string
}

const BUFFER_LEN = 240
// At 60fps, 240 samples ≈ 4 seconds
const BUFFER_DURATION_S = BUFFER_LEN / 60

export default function GateProbeDisplay({ sourceModuleId, color, layout = 'large', routeLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const bufferRef = useRef(new Uint8Array(BUFFER_LEN))
  const writeIdxRef = useRef(0)
  const [gateHigh, setGateHigh] = useState(false)
  const [rate, setRate] = useState(0)
  const [duty, setDuty] = useState(0)
  const [annotation, setAnnotation] = useState('Gate signals are binary — fully on or fully off')
  const lastAnnotationTime = useRef(0)
  const lastHighTime = useRef(0)

  // ResizeObserver — keep canvas pixel buffer matched to container + DPR
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      sizeRef.current = { w: width, h: height }
      const dpr = window.devicePixelRatio || 1
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useAnimationFrame(() => {
    const { w, h } = sizeRef.current
    if (w === 0 || h === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const data = AudioEngineManager.getInstance().getVisualizationData(sourceModuleId)

    // Extract gate state (same priority as CableSignalMonitor)
    let high = false
    if (data.customData?.gateValue !== undefined) {
      high = (data.customData.gateValue as number) > 0.5
    } else if (data.waveform && data.waveform.length > 0) {
      high = data.waveform[data.waveform.length - 1] > 0.5
    }

    // Write to circular buffer
    const buf = bufferRef.current
    const idx = writeIdxRef.current % BUFFER_LEN
    buf[idx] = high ? 1 : 0
    writeIdxRef.current++

    setGateHigh(high)

    // Compute statistics from buffer
    const filled = Math.min(writeIdxRef.current, BUFFER_LEN)
    let highCount = 0
    let transitions = 0
    const startRead = writeIdxRef.current - filled
    for (let i = 0; i < filled; i++) {
      const si = (startRead + i) % BUFFER_LEN
      if (buf[si] === 1) highCount++
      if (i > 0) {
        const prev = (startRead + i - 1) % BUFFER_LEN
        if (buf[prev] === 0 && buf[si] === 1) transitions++
      }
    }
    const dutyPct = filled > 0 ? (highCount / filled) * 100 : 0
    const transitionsPerSec = transitions / BUFFER_DURATION_S
    setRate(Math.round(transitionsPerSec * 10) / 10)
    setDuty(Math.round(dutyPct))

    // Track held gate duration
    if (high) {
      if (lastHighTime.current === 0) lastHighTime.current = performance.now()
    } else {
      lastHighTime.current = 0
    }

    // Draw timeline
    clearCanvas(ctx)
    drawGrid(ctx, 8, '#141420')

    const barW = w / BUFFER_LEN
    for (let i = 0; i < filled; i++) {
      const si = (startRead + i) % BUFFER_LEN
      const x = (i / BUFFER_LEN) * w
      if (buf[si] === 1) {
        // HIGH — bright filled rectangle with glow
        ctx.save()
        ctx.fillStyle = color
        ctx.globalAlpha = 0.15
        ctx.fillRect(x, 2, barW + 0.5, h - 4)
        ctx.globalAlpha = 0.8
        ctx.fillRect(x, 4, barW + 0.5, h - 8)
        ctx.shadowColor = color
        ctx.shadowBlur = 6
        ctx.fillRect(x, 4, barW + 0.5, h - 8)
        ctx.shadowBlur = 0
        ctx.restore()
      }
    }

    // Write-head indicator
    const headX = (filled / BUFFER_LEN) * w
    ctx.save()
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.4
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.moveTo(headX, 0)
    ctx.lineTo(headX, h)
    ctx.stroke()
    ctx.restore()

    // Throttled annotations
    const now = performance.now()
    if (now - lastAnnotationTime.current > 500) {
      lastAnnotationTime.current = now
      if (lastHighTime.current > 0 && now - lastHighTime.current > 2000) {
        setAnnotation('Gate held open')
      } else if (transitionsPerSec > 0.5) {
        const bpm = Math.round(transitionsPerSec * 60)
        setAnnotation(`Triggering at ~${bpm} BPM`)
      } else {
        setAnnotation('Gate signals are binary — fully on or fully off')
      }
    }
  })

  return (
    <>
      {/* Gate timeline — fills all available vertical space */}
      <div ref={containerRef} className={styles.displayArea}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
        {/* HUD overlay — always visible */}
        <div className={styles.hudOverlay}>
          <div className={`${styles.gateDot} ${gateHigh ? '' : styles.gateDotLow}`} />
          <span className={styles.hudValue} style={{ color, textShadow: `0 0 8px ${color}60` }}>
            {gateHigh ? 'HIGH' : 'LOW'}
          </span>
          <span className={styles.hudNote}>{rate}/s {duty}%</span>
        </div>
      </div>

      {/* Info section — hidden at small */}
      {layout !== 'small' && (
        <div className={styles.infoSection}>
          {routeLabel && <div>{routeLabel}</div>}
          {layout === 'large' && annotation && <div className={styles.annotation}>{annotation}</div>}
        </div>
      )}
    </>
  )
}
