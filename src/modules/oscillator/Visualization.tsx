import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import {
  clearWithFade,
  clearCanvas,
  drawGrid,
  drawWaveform,
  drawSpectrum,
  findZeroCrossing,
} from '@/modules/_shared/drawUtils'
import type { VisualizationData } from '@/types/module'
import panelStyles from '@/ui/ModulePanel/ModulePanel.module.css'

interface Props {
  moduleId: string
  data: VisualizationData
  accentColor: string
}

const W = 220
const H_TOP = 80    // waveform
const H_BOT = 50    // spectrum

export default function OscillatorVisualization({ data, accentColor }: Props) {
  const waveCanvasRef = useRef<HTMLCanvasElement>(null)
  const specCanvasRef = useRef<HTMLCanvasElement>(null)

  // Top: waveform with phosphor fade
  useAnimationFrame(() => {
    const canvas = waveCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    clearWithFade(ctx, 0.28)
    drawGrid(ctx, 4)

    if (data.waveform && data.waveform.length > 0) {
      // Triggered display — find zero crossing for stable image
      const offset = findZeroCrossing(data.waveform)
      const stable = data.waveform.slice(offset)
      drawWaveform(ctx, stable.length > 0 ? stable : data.waveform, accentColor)
    }
  })

  // Bottom: FFT spectrum
  useAnimationFrame(() => {
    const canvas = specCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    clearCanvas(ctx)
    drawGrid(ctx, 6, '#141420')

    if (data.spectrum && data.spectrum.length > 0) {
      // Only use first half (bins above Nyquist are mirrored noise)
      const half = data.spectrum.slice(0, data.spectrum.length / 2)
      drawSpectrum(ctx, half, accentColor)
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Waveform screen */}
      <div className={panelStyles.vizScreen} style={{ width: W, height: H_TOP }}>
        <canvas
          ref={waveCanvasRef}
          width={W}
          height={H_TOP}
          style={{ display: 'block', width: W, height: H_TOP }}
        />
      </div>

      {/* Spectrum screen */}
      <div className={panelStyles.vizScreen} style={{ width: W, height: H_BOT }}>
        <canvas
          ref={specCanvasRef}
          width={W}
          height={H_BOT}
          style={{ display: 'block', width: W, height: H_BOT }}
        />
      </div>
    </div>
  )
}
