import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import { clearCanvas, drawGlowLine, drawOffOverlay, drawBypassOverlay } from '@/modules/_shared/drawUtils'
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

const W = 160
const H = 90

export default function EnvelopeVisualization({ moduleId, accentColor, off, bypass }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useAnimationFrame(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    if (off) {
      drawOffOverlay(ctx, canvas.width, canvas.height)
      return
    }

    clearCanvas(ctx)

    const { customData } = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const envelopeValue = (customData?.envelopeValue as number) ?? 0
    const gateOpen = (customData?.gateOpen as boolean) ?? false
    const attack = (customData?.attack as number) ?? 0.01
    const decay = (customData?.decay as number) ?? 0.2
    const sustain = (customData?.sustain as number) ?? 0.7
    const release = (customData?.release as number) ?? 0.5

    const top = canvas.height * 0.08
    const bottom = canvas.height * 0.92
    const sustainDisplay = 0.4
    const totalTime = attack + decay + sustainDisplay + release

    const xForTime = (t: number) => canvas.width * (t / totalTime)
    const sustainY = bottom - sustain * (bottom - top)

    // Build all curve points
    const allPoints = [
      { x: xForTime(0), y: bottom },
      { x: xForTime(attack), y: top },
      { x: xForTime(attack + decay), y: sustainY },
      { x: xForTime(attack + decay + sustainDisplay), y: sustainY },
      { x: xForTime(totalTime), y: bottom },
    ]

    drawGlowLine(ctx, allPoints, accentColor, 1.5)

    // Phase labels
    ctx.font = '7px monospace'
    ctx.fillStyle = 'rgba(168, 85, 247, 0.4)'
    ctx.fillText('A', xForTime(attack / 2), top - 4)
    ctx.fillText('D', xForTime(attack + decay / 2), top - 4)
    ctx.fillText('S', xForTime(attack + decay + sustainDisplay / 2), sustainY - 4)
    ctx.fillText('R', xForTime(attack + decay + sustainDisplay + release / 2), top - 4)

    // Animated dot: find X position based on gate state and envelope value
    const dotY = bottom - envelopeValue * (bottom - top)

    // Approximate dot X by tracing which segment we're in based on envelope value and gate state
    let dotX: number
    if (gateOpen) {
      // In A, D, or S phase — find approximate x from curve segments
      if (envelopeValue > sustain || envelopeValue >= 1.0) {
        // In attack or at peak: interpolate within attack segment
        const t = envelopeValue // rising from 0→1
        dotX = xForTime(attack * t)
      } else {
        // In decay or sustain: interpolate within decay/sustain segments
        // envelope value is falling from 1 → sustain
        const range = 1 - sustain
        const progress = range > 0 ? (1 - envelopeValue) / range : 1
        dotX = xForTime(attack + decay * Math.min(progress, 1))
      }
    } else {
      // In release phase: envelope falling from sustain → 0
      const progress = sustain > 0 ? 1 - envelopeValue / sustain : 1
      dotX = xForTime(attack + decay + sustainDisplay + release * Math.min(progress, 1))
    }

    // Clamp dot to canvas bounds
    dotX = Math.max(0, Math.min(canvas.width, dotX))

    ctx.save()
    ctx.beginPath()
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2)
    ctx.fillStyle = accentColor
    ctx.shadowBlur = 12
    ctx.shadowColor = accentColor
    ctx.globalAlpha = 0.9
    ctx.fill()
    ctx.restore()

    if (bypass) {
      drawBypassOverlay(ctx, canvas.width, canvas.height, accentColor)
    }
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
