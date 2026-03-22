import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import { clearCanvas, drawGrid } from '@/modules/_shared/drawUtils'
import AudioEngineManager from '@/engine/AudioEngineManager'
import type { VisualizationData } from '@/types/module'
import panelStyles from '@/ui/ModulePanel/ModulePanel.module.css'

interface Props {
  moduleId: string
  data: VisualizationData
  accentColor: string
}

const W = 160
const H = 80

export default function ReverbVisualization({ moduleId, accentColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useAnimationFrame(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    clearCanvas(ctx)
    drawGrid(ctx, 4)

    const data = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const decay = (data.customData?.decay as number) ?? 2.5
    const damping = (data.customData?.damping as number) ?? 0.5
    const waveform = data.waveform

    // Compute RMS level from waveform for animation
    let rms = 0
    if (waveform && waveform.length > 0) {
      let sum = 0
      for (let i = 0; i < waveform.length; i++) {
        sum += waveform[i] * waveform[i]
      }
      rms = Math.sqrt(sum / waveform.length)
    }

    // Draw decay envelope shape
    const spikeX = 15
    const spikeTop = 10
    const baseY = H - 10

    // Tail length scaled to decay (2.5s → about 80% width, 15s → full width)
    const tailEndX = Math.min(W - 5, spikeX + (decay / 15) * (W - spikeX - 5))

    // Draw dissolving tail as particles
    const particleCount = Math.floor(120 * (decay / 5))
    const seed = Date.now() * 0.001
    ctx.save()

    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount
      const x = spikeX + t * (tailEndX - spikeX)

      // Exponential decay envelope
      const envValue = Math.exp(-t * 4)

      // Damping darkens the tail end — reduce alpha further for high damping
      const dampFactor = 1 - damping * t * 0.7

      // Pseudo-random scatter using sin
      const scatter = Math.sin(i * 127.1 + seed * (1 + i * 0.1)) * envValue * (baseY - spikeTop) * 0.4
      const y = baseY - envValue * (baseY - spikeTop) * 0.5 + scatter

      const alpha = envValue * dampFactor * (0.5 + rms * 2)
      const size = 1.5 + envValue * 2

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
      ctx.fillStyle = accentColor
      ctx.shadowColor = accentColor
      ctx.shadowBlur = size * 2
      ctx.fillRect(x - size / 2, y - size / 2, size, size)
    }

    ctx.shadowBlur = 0

    // Draw spike (initial impulse)
    ctx.globalAlpha = 0.5 + rms * 2
    ctx.fillStyle = accentColor
    ctx.shadowColor = accentColor
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(spikeX - 3, baseY)
    ctx.lineTo(spikeX, spikeTop)
    ctx.lineTo(spikeX + 3, baseY)
    ctx.fill()
    ctx.shadowBlur = 0

    // Draw envelope curve outline
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(spikeX, spikeTop)
    for (let x = spikeX; x <= tailEndX; x++) {
      const t = (x - spikeX) / (tailEndX - spikeX)
      const envValue = Math.exp(-t * 4)
      const dampFactor = 1 - damping * t * 0.5
      const y = baseY - envValue * dampFactor * (baseY - spikeTop) * 0.5
      ctx.lineTo(x, y)
    }
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
