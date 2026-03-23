import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import {
  clearWithFade,
  clearCanvas,
  drawGrid,
  drawWaveform,
  drawSpectrum,
  findZeroCrossing,
  mapRange,
  drawOffOverlay,
  drawBypassOverlay,
} from '@/modules/_shared/drawUtils'
import AudioEngineManager from '@/engine/AudioEngineManager'
import type { VisualizationData } from '@/types/module'
import panelStyles from '@/ui/ModulePanel/ModulePanel.module.css'

interface Props {
  moduleId: string
  data: VisualizationData
  accentColor: string
  off?: boolean
  bypass?: boolean
}

const W = 270
const H_SCOPE = 120   // main oscilloscope — hero display
const H_SPEC  = 54    // spectrum analyzer
const W_METER = 16    // dB level meter width

export default function OutputVisualization({ moduleId, accentColor, off, bypass }: Props) {
  const scopeRef  = useRef<HTMLCanvasElement>(null)
  const specRef   = useRef<HTMLCanvasElement>(null)
  const meterRef  = useRef<HTMLCanvasElement>(null)

  // ── Oscilloscope ──────────────────────────────────────────────────────────
  useAnimationFrame(() => {
    const canvas = scopeRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    if (off) {
      drawOffOverlay(ctx, canvas.width, canvas.height)
      return
    }

    clearWithFade(ctx, 0.15)
    drawGrid(ctx, 4)

    const { waveform } = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    if (waveform && waveform.length > 0) {
      const offset = findZeroCrossing(waveform)
      const stable = waveform.slice(offset, offset + 512)
      const wave = stable.length > 10 ? stable : waveform
      // Bloom pass — wider, dimmer for phosphor glow halo
      drawWaveform(ctx, wave, accentColor, 0, 1.0, 5.0, 0.15)
      // Core pass — sharp bright trace
      drawWaveform(ctx, wave, accentColor, 0, 1.0, 2.5, 1.0)
    }

    if (bypass) {
      drawBypassOverlay(ctx, canvas.width, canvas.height, accentColor)
    }
  })

  // ── Spectrum ──────────────────────────────────────────────────────────────
  useAnimationFrame(() => {
    const canvas = specRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    if (off) {
      drawOffOverlay(ctx, canvas.width, canvas.height)
      return
    }

    clearCanvas(ctx)
    drawGrid(ctx, 8, '#141420')

    const { spectrum } = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    if (spectrum && spectrum.length > 0) {
      drawSpectrum(ctx, spectrum.slice(0, spectrum.length / 2), accentColor)
    }

    if (bypass) {
      drawBypassOverlay(ctx, canvas.width, canvas.height, accentColor)
    }
  })

  // ── Level meter ───────────────────────────────────────────────────────────
  useAnimationFrame(() => {
    const canvas = meterRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    if (off) {
      drawOffOverlay(ctx, canvas.width, canvas.height)
      return
    }

    clearCanvas(ctx)

    const { customData } = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const db = (customData?.['dbLevel'] as number) ?? -80
    const normalized = mapRange(db, -60, 0, 0, 1)
    const h = canvas.height
    const barHeight = Math.max(0, normalized * h)

    // Background
    ctx.fillStyle = '#111118'
    ctx.fillRect(0, 0, canvas.width, h)

    // Bar segments: green → yellow → red
    const y = h - barHeight
    const grd = ctx.createLinearGradient(0, h, 0, 0)
    grd.addColorStop(0, '#22c55e')
    grd.addColorStop(0.6, '#22c55e')
    grd.addColorStop(0.8, '#f59e0b')
    grd.addColorStop(1, '#ef4444')

    ctx.globalAlpha = 0.85
    ctx.fillStyle = grd
    ctx.fillRect(0, y, canvas.width, barHeight)

    // Glow on top of bar
    ctx.globalAlpha = 0.35
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, y, canvas.width, 2)
    ctx.globalAlpha = 1

    if (bypass) {
      drawBypassOverlay(ctx, canvas.width, canvas.height, accentColor)
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Oscilloscope + meter row */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <div className={panelStyles.vizScreen} style={{ width: W, height: H_SCOPE, flex: 1 }}>
          <canvas
            ref={scopeRef}
            width={W}
            height={H_SCOPE}
            style={{ display: 'block', width: '100%', height: H_SCOPE }}
          />
        </div>
        <div className={panelStyles.vizScreen} style={{ width: W_METER, height: H_SCOPE }}>
          <canvas
            ref={meterRef}
            width={W_METER}
            height={H_SCOPE}
            style={{ display: 'block', width: W_METER, height: H_SCOPE }}
          />
        </div>
      </div>

      {/* Spectrum */}
      <div className={panelStyles.vizScreen} style={{ width: '100%', height: H_SPEC }}>
        <canvas
          ref={specRef}
          width={W + W_METER + 4}
          height={H_SPEC}
          style={{ display: 'block', width: '100%', height: H_SPEC }}
        />
      </div>
    </div>
  )
}
