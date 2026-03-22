import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import {
  clearWithFade,
  clearCanvas,
  drawGrid,
  drawWaveform,
  drawSpectrum,
} from '@/modules/_shared/drawUtils'
import AudioEngineManager from '@/engine/AudioEngineManager'
import type { VisualizationData } from '@/types/module'
import panelStyles from '@/ui/ModulePanel/ModulePanel.module.css'

interface Props {
  moduleId: string
  data: VisualizationData
  accentColor: string
}

const W = 80
const H_TOP = 50
const H_BOT = 30

export default function NoiseVisualization({ moduleId, accentColor }: Props) {
  const waveCanvasRef = useRef<HTMLCanvasElement>(null)
  const specCanvasRef = useRef<HTMLCanvasElement>(null)

  // Waveform with phosphor trail
  useAnimationFrame(() => {
    const canvas = waveCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    clearWithFade(ctx, 0.35)
    drawGrid(ctx, 2)

    const { waveform } = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    if (waveform && waveform.length > 0) {
      drawWaveform(ctx, waveform, accentColor, 0, 1, 1.0, 0.8)
    }
  })

  // Spectrum bars
  useAnimationFrame(() => {
    const canvas = specCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    clearCanvas(ctx)

    const { spectrum } = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    if (spectrum && spectrum.length > 0) {
      const half = spectrum.slice(0, spectrum.length / 2)
      drawSpectrum(ctx, half, accentColor)
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div className={panelStyles.vizScreen} style={{ width: W, height: H_TOP }}>
        <canvas
          ref={waveCanvasRef}
          width={W}
          height={H_TOP}
          style={{ display: 'block', width: W, height: H_TOP }}
        />
      </div>
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
