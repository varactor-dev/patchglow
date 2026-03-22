import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import { clearWithFade, drawGrid, drawWaveform } from '@/modules/_shared/drawUtils'
import AudioEngineManager from '@/engine/AudioEngineManager'
import type { VisualizationData } from '@/types/module'
import panelStyles from '@/ui/ModulePanel/ModulePanel.module.css'

interface Props {
  moduleId: string
  data: VisualizationData
  accentColor: string
}

const W = 170
const H = 80

export default function LfoVisualization({ moduleId, accentColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useAnimationFrame(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // Phosphor trail fade
    clearWithFade(ctx, 0.15)

    // Grid background
    drawGrid(ctx, 4, '#1a1a28')

    // Center / zero reference line (drawGrid already draws one, this reinforces it)
    ctx.strokeStyle = '#222234'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, canvas.height / 2)
    ctx.lineTo(canvas.width, canvas.height / 2)
    ctx.stroke()

    const { waveform, customData } = AudioEngineManager.getInstance().getVisualizationData(moduleId)

    // Full-canvas waveform
    if (waveform && waveform.length > 0) {
      drawWaveform(ctx, waveform, accentColor, 0, 1.0, 1.5)
    }

    // Moving playhead — position derived from wall-clock time and current LFO rate
    const rate = (customData?.rate as number) ?? 2
    const period = 1 / rate          // seconds per cycle
    const phase = (Date.now() / 1000 % period) / period  // 0-1 within current cycle
    const playheadX = phase * canvas.width

    ctx.save()
    ctx.strokeStyle = accentColor
    ctx.globalAlpha = 0.6
    ctx.lineWidth = 1
    ctx.shadowColor = accentColor
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, canvas.height)
    ctx.stroke()
    ctx.restore()
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
