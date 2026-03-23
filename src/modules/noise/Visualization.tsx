import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import {
  clearWithFade,
  clearCanvas,
  drawGrid,
  drawWaveform,
  drawSpectrum,
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

const W = 80
const H_TOP = 50
const H_BOT = 30

export default function NoiseVisualization({ moduleId, accentColor, off, bypass }: Props) {
  const waveCanvasRef = useRef<HTMLCanvasElement>(null)
  const specCanvasRef = useRef<HTMLCanvasElement>(null)

  // Waveform with phosphor trail
  useAnimationFrame(() => {
    const canvas = waveCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    if (off) {
      drawOffOverlay(ctx, canvas.width, canvas.height)
      return
    }

    clearWithFade(ctx, 0.35)
    drawGrid(ctx, 2)

    const { waveform } = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    if (waveform && waveform.length > 0) {
      drawWaveform(ctx, waveform, accentColor, 0, 1, 1.0, 0.8)
    }

    if (bypass) {
      drawBypassOverlay(ctx, canvas.width, canvas.height, accentColor)
    }
  })

  // Spectrum bars
  useAnimationFrame(() => {
    const canvas = specCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    if (off) {
      drawOffOverlay(ctx, canvas.width, canvas.height)
      return
    }

    clearCanvas(ctx)

    const { spectrum } = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    if (spectrum && spectrum.length > 0) {
      const half = spectrum.slice(0, spectrum.length / 2)
      drawSpectrum(ctx, half, accentColor)
    }

    if (bypass) {
      drawBypassOverlay(ctx, canvas.width, canvas.height, accentColor)
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
