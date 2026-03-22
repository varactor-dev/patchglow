import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import {
  clearCanvas,
  drawGrid,
  drawWaveform,
} from '@/modules/_shared/drawUtils'
import AudioEngineManager from '@/engine/AudioEngineManager'
import type { VisualizationData } from '@/types/module'
import panelStyles from '@/ui/ModulePanel/ModulePanel.module.css'

interface Props {
  moduleId: string
  data: VisualizationData
  accentColor: string
}

const W = 160
const H = 120

export default function VcaVisualization({ moduleId, accentColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useAnimationFrame(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    clearCanvas(ctx)
    drawGrid(ctx, 3)

    const { waveform, customData } = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const outputWaveform = waveform ?? new Float32Array(256)
    const inputWaveform = (customData?.inputWaveform as Float32Array) ?? new Float32Array(256)
    const cvWaveform = (customData?.cvWaveform as Float32Array) ?? new Float32Array(256)

    // Three stacked panels: IN (top, dim), CV (mid, cyan), OUT (bottom, bright)
    drawWaveform(ctx, inputWaveform, accentColor, 0, 0.333, 1.2, 0.5)
    drawWaveform(ctx, cvWaveform, '#00e5ff', 0.333, 0.333, 1.2)
    drawWaveform(ctx, outputWaveform, accentColor, 0.667, 0.333, 1.2)

    // Panel labels
    ctx.font = '7px monospace'
    ctx.fillStyle = 'rgba(132, 204, 22, 0.35)'
    ctx.fillText('IN', 4, canvas.height * 0.08)
    ctx.fillStyle = 'rgba(0, 229, 255, 0.35)'
    ctx.fillText('CV', 4, canvas.height * 0.42)
    ctx.fillStyle = 'rgba(132, 204, 22, 0.6)'
    ctx.fillText('OUT', 4, canvas.height * 0.75)

    // Faint divider lines at 1/3 and 2/3 height
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(0, canvas.height * 0.333)
    ctx.lineTo(canvas.width, canvas.height * 0.333)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, canvas.height * 0.667)
    ctx.lineTo(canvas.width, canvas.height * 0.667)
    ctx.stroke()
  })

  return (
    <div className={panelStyles.vizScreen} style={{ width: W, height: H }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', width: W, height: H }}
      />
    </div>
  )
}
