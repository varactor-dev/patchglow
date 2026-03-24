import { useEffect, useRef, useState } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import { clearCanvas, drawGrid, drawGlowLine } from '@/modules/_shared/drawUtils'
import AudioEngineManager from '@/engine/AudioEngineManager'
import type { Connection } from '@/types/store'
import styles from './SignalProbe.module.css'

interface Props {
  sourceModuleId: string
  color: string
  connection: Connection
  layout?: 'large' | 'medium' | 'small'
  routeLabel?: string
}

const BUFFER_LEN = 120

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function midiToNote(midi: number): string {
  const note = NOTE_NAMES[Math.round(midi) % 12]
  const octave = Math.floor(Math.round(midi) / 12) - 1
  return `${note}${octave}`
}

export default function CvProbeDisplay({ sourceModuleId, color, connection, layout = 'large', routeLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const bufferRef = useRef(new Float32Array(BUFFER_LEN))
  const writeIdxRef = useRef(0)
  const minRef = useRef(1)
  const maxRef = useRef(0)
  const [value, setValue] = useState(0)
  const [noteDisplay, setNoteDisplay] = useState<string | null>(null)
  const [range, setRange] = useState({ min: 0, max: 0 })
  const [annotation, setAnnotation] = useState('')
  const lastAnnotationTime = useRef(0)
  const prevValuesRef = useRef<number[]>([])

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

    // Extract CV value (same priority order as CableSignalMonitor)
    let cv = 0
    let midi: number | null = null

    if (data.customData?.envelopeValue !== undefined) {
      cv = Math.min(1, Math.max(0, data.customData.envelopeValue as number))
    } else if (data.customData?.pressedNote !== undefined) {
      if (data.customData.pressedNote === null) {
        cv = 0.1
      } else {
        midi = data.customData.pressedNote as number
        cv = 0.5 + (midi / 12) * 0.4
      }
    } else if (data.waveform && data.waveform.length > 0) {
      // LFO or other CV with waveform — normalize from [-1,1] to [0,1]
      const sample = data.waveform[data.waveform.length - 1]
      cv = (sample + 1) / 2
    } else if (data.customData?.cvLevel !== undefined) {
      cv = Math.min(1, Math.max(0, data.customData.cvLevel as number))
    }

    // Write to circular buffer
    const buf = bufferRef.current
    const idx = writeIdxRef.current % BUFFER_LEN
    buf[idx] = cv
    writeIdxRef.current++

    // Track min/max
    if (cv < minRef.current) minRef.current = cv
    if (cv > maxRef.current) maxRef.current = cv

    // Update stats
    setValue(cv)
    setRange({ min: minRef.current, max: maxRef.current })

    // V/Oct note display for keyboard/sequencer sources
    if (midi !== null) {
      setNoteDisplay(midiToNote(midi))
    } else if (connection.signalType === 'cv' && data.customData?.pressedNote !== undefined) {
      setNoteDisplay(null)
    }

    // Draw trace
    clearCanvas(ctx)
    drawGrid(ctx, 4)

    const points: { x: number; y: number }[] = []
    const startIdx = writeIdxRef.current
    for (let i = 0; i < BUFFER_LEN; i++) {
      const sampleIdx = (startIdx + i) % BUFFER_LEN
      const x = (i / (BUFFER_LEN - 1)) * w
      const y = h - buf[sampleIdx] * (h - 4) - 2
      points.push({ x, y })
    }
    drawGlowLine(ctx, points, color, 2, 1.0)

    // Write-head indicator
    ctx.save()
    const headX = w
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.3
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

      // Track recent values for step detection
      const prev = prevValuesRef.current
      prev.push(cv)
      if (prev.length > 30) prev.shift()

      const spread = maxRef.current - minRef.current
      if (spread < 0.02) {
        setAnnotation('Static — this voltage is holding at a fixed value')
      } else if (spread > 0.1) {
        // Check for quantized steps
        let stepCount = 0
        for (let i = 1; i < prev.length; i++) {
          const delta = Math.abs(prev[i] - prev[i - 1])
          if (delta > 0.03) stepCount++
        }
        const stepRatio = stepCount / prev.length
        if (stepRatio > 0.05 && stepRatio < 0.3) {
          setAnnotation('Quantized — the signal jumps between discrete values')
        } else {
          setAnnotation('Modulation — this control voltage is changing over time')
        }
      }
    }
  })

  return (
    <>
      {/* Signal trace — fills all available vertical space */}
      <div ref={containerRef} className={styles.displayArea}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
        {/* HUD overlay — always visible */}
        <div className={styles.hudOverlay}>
          <span className={styles.hudValue} style={{ color, textShadow: `0 0 8px ${color}60` }}>
            {value.toFixed(2)}
          </span>
          <span className={styles.hudNote}>
            {noteDisplay ? `${noteDisplay} ` : ''}{range.min.toFixed(2)}–{range.max.toFixed(2)}
          </span>
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
