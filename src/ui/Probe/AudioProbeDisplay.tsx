import { useEffect, useRef, useState } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import {
  clearWithFade,
  drawGrid,
  drawWaveform,
  drawSpectrum,
  findZeroCrossing,
} from '@/modules/_shared/drawUtils'
import AudioEngineManager from '@/engine/AudioEngineManager'
import styles from './SignalProbe.module.css'

interface Props {
  sourceModuleId: string
  color: string
  layout?: 'large' | 'medium' | 'small'
  routeLabel?: string
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function freqToNote(freq: number): string {
  if (freq <= 0) return '—'
  const midi = 12 * Math.log2(freq / 440) + 69
  const note = NOTE_NAMES[Math.round(midi) % 12]
  const octave = Math.floor(Math.round(midi) / 12) - 1
  return `${note}${octave}`
}

export default function AudioProbeDisplay({ sourceModuleId, color, layout = 'large', routeLabel }: Props) {
  const scopeRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const [stats, setStats] = useState({ db: -60, freq: 0, note: '—' })
  const [annotation, setAnnotation] = useState('')
  const lastAnnotationTime = useRef(0)

  // ResizeObserver — keep canvas pixel buffer matched to container + DPR
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      sizeRef.current = { w: width, h: height }
      const dpr = window.devicePixelRatio || 1
      const canvas = scopeRef.current
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

  // Single animation frame: scope + spectrum (merged) + stats + annotations
  useAnimationFrame(() => {
    const { w, h } = sizeRef.current
    if (w === 0 || h === 0) return
    const canvas = scopeRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    clearWithFade(ctx, 0.15)
    drawGrid(ctx, 4)

    const data = AudioEngineManager.getInstance().getVisualizationData(sourceModuleId)
    const { waveform, spectrum } = data

    // Draw scope
    if (waveform && waveform.length > 0) {
      const offset = findZeroCrossing(waveform)
      const stable = waveform.slice(offset, offset + 512)
      const wave = stable.length > 10 ? stable : waveform

      if (layout !== 'small') {
        // Scope: top 72%, spectrum: bottom 28%
        const scopeFrac = 0.72
        // Bloom pass
        drawWaveform(ctx, wave, color, 0, scopeFrac, 5.0, 0.15)
        // Core pass
        drawWaveform(ctx, wave, color, 0, scopeFrac, 2.5, 1.0)
      } else {
        // Small: scope fills entire canvas
        drawWaveform(ctx, wave, color, 0, 1.0, 5.0, 0.15)
        drawWaveform(ctx, wave, color, 0, 1.0, 2.5, 1.0)
      }
    }

    // Draw spectrum in bottom region (medium/large only)
    if (layout !== 'small' && spectrum && spectrum.length > 0) {
      drawSpectrum(ctx, spectrum.slice(0, spectrum.length / 2), color, 0.72, 1.0)
    }

    // Compute RMS dB
    let rms = 0
    if (waveform && waveform.length > 0) {
      let sum = 0
      for (let i = 0; i < waveform.length; i++) {
        sum += waveform[i] * waveform[i]
      }
      rms = Math.sqrt(sum / waveform.length)
    }
    const db = rms > 0.001 ? 20 * Math.log10(rms) : -60

    // Dominant frequency from spectrum
    let freq = 0
    if (spectrum && spectrum.length > 0) {
      const half = Math.floor(spectrum.length / 2)
      let maxVal = 0
      let maxIdx = 1
      for (let i = 1; i < half; i++) {
        if (spectrum[i] > maxVal) {
          maxVal = spectrum[i]
          maxIdx = i
        }
      }
      if (maxVal > 10) {
        const binWidth = 44100 / (2 * spectrum.length)
        freq = maxIdx * binWidth
      }
    }

    const note = freq > 0 ? freqToNote(freq) : '—'
    setStats({ db: Math.max(-60, Math.round(db)), freq: Math.round(freq), note })

    // Throttled annotations
    const now = performance.now()
    if (now - lastAnnotationTime.current > 500) {
      lastAnnotationTime.current = now
      if (rms < 0.001) {
        setAnnotation('Signal near silence')
      } else if (spectrum && spectrum.length > 0) {
        const half = Math.floor(spectrum.length / 2)
        let peaks = 0
        const threshold = 30
        for (let i = 2; i < half - 1; i++) {
          if (spectrum[i] > threshold && spectrum[i] > spectrum[i - 1] && spectrum[i] > spectrum[i + 1]) {
            peaks++
          }
        }
        const lowEnergy = spectrum.slice(1, Math.floor(half / 4)).reduce((a, b) => a + b, 0)
        const highEnergy = spectrum.slice(Math.floor(half / 2), half).reduce((a, b) => a + b, 0)
        const ratio = lowEnergy > 0 ? highEnergy / lowEnergy : 1

        if (ratio < 0.05 && lowEnergy > 100) {
          setAnnotation('Filtered — frequencies above the cutoff removed')
        } else if (peaks <= 2) {
          setAnnotation('Pure tone — single frequency (sine wave)')
        } else {
          setAnnotation('Rich harmonic content — multiple frequencies present')
        }
      }
    }
  })

  return (
    <>
      {/* Canvas — fills all available vertical space */}
      <div ref={containerRef} className={styles.displayArea}>
        <canvas
          ref={scopeRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
        {/* HUD overlay — always visible */}
        <div className={styles.hudOverlay}>
          <span className={styles.hudValue} style={{ color, textShadow: `0 0 8px ${color}60` }}>
            {stats.db} dB
          </span>
          <span className={styles.hudNote}>
            {stats.freq > 0 ? `${stats.freq}Hz ${stats.note}` : ''}
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
