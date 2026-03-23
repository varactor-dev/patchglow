import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import { clearCanvas, drawGrid, drawOffOverlay, drawBypassOverlay } from '@/modules/_shared/drawUtils'
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

const W = 120
const H = 80

export default function SampleHoldVisualization({ moduleId, accentColor, off, bypass }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prevHistoryLenRef = useRef(0)
  const flashRef = useRef(0)

  useAnimationFrame(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    if (off) {
      drawOffOverlay(ctx, canvas.width, canvas.height)
      return
    }

    clearCanvas(ctx)
    drawGrid(ctx, 4)

    const data = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const custom = data.customData as {
      heldValue: number
      inputValue: number
      triggerHigh: boolean
      history: number[]
    } | undefined

    if (!custom) return

    const { inputValue, history, triggerHigh } = custom
    const margin = 6
    const drawW = W - margin * 2
    const drawH = H - margin * 2
    const centerY = margin + drawH / 2

    // Detect new sample (flash on trigger)
    if (history.length > prevHistoryLenRef.current) {
      flashRef.current = 1
    }
    prevHistoryLenRef.current = history.length
    flashRef.current *= 0.92 // decay flash

    // Draw dim continuous input signal line
    ctx.save()
    ctx.globalAlpha = 0.2
    ctx.strokeStyle = '#888888'
    ctx.lineWidth = 0.5
    ctx.setLineDash([2, 2])
    const inputY = centerY - inputValue * (drawH / 2) * 0.8
    ctx.beginPath()
    ctx.moveTo(margin, inputY)
    ctx.lineTo(W - margin, inputY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Draw staircase from history
    if (history.length > 1) {
      const stepW = drawW / Math.max(history.length - 1, 1)

      // Staircase path
      const points: { x: number; y: number }[] = []
      for (let i = 0; i < history.length; i++) {
        const x = margin + i * stepW
        const y = centerY - (history[i] ?? 0) * (drawH / 2) * 0.8
        if (i > 0) {
          // Horizontal line to this step
          points.push({ x, y: points[points.length - 1].y })
        }
        // Vertical jump + hold
        points.push({ x, y })
      }
      // Extend last step to edge
      const lastY = points[points.length - 1]?.y ?? centerY
      points.push({ x: W - margin, y: lastY })

      // Draw glow staircase
      if (points.length >= 2) {
        const path = new Path2D()
        path.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          path.lineTo(points[i].x, points[i].y)
        }

        // Outer glow
        ctx.strokeStyle = accentColor
        ctx.globalAlpha = 0.2
        ctx.lineWidth = 6
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.stroke(path)

        // Core line
        ctx.globalAlpha = 0.9
        ctx.lineWidth = 1.5
        ctx.stroke(path)
      }

      // Draw sample dots at step transitions
      for (let i = 0; i < history.length; i++) {
        const x = margin + i * stepW
        const y = centerY - (history[i] ?? 0) * (drawH / 2) * 0.8
        const isLast = i === history.length - 1

        ctx.fillStyle = accentColor
        ctx.globalAlpha = isLast ? 1 : 0.5
        ctx.beginPath()
        ctx.arc(x, y, isLast ? 3 : 2, 0, Math.PI * 2)
        ctx.fill()

        // Flash on most recent sample
        if (isLast && flashRef.current > 0.05) {
          ctx.globalAlpha = flashRef.current * 0.6
          ctx.shadowColor = accentColor
          ctx.shadowBlur = 12
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }
    }

    // Trigger indicator
    ctx.globalAlpha = triggerHigh ? 0.8 : 0.15
    ctx.fillStyle = triggerHigh ? accentColor : '#444'
    ctx.fillRect(W - 10, 4, 6, 4)

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
