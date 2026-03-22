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

const W = 200
const H = 90

export default function DelayVisualization({ moduleId, accentColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useAnimationFrame(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    clearWithFade(ctx, 0.3)
    drawGrid(ctx, 4)

    const data = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const { waveform, customData } = data

    if (!waveform || waveform.length === 0) return

    const inputWaveform = customData?.inputWaveform as number[] | undefined
    const feedback = (customData?.feedback as number) ?? 0.4

    // Draw echo traces — cascading copies with decreasing opacity
    const echoCount = 4
    for (let echo = echoCount; echo >= 0; echo--) {
      const alpha = Math.pow(feedback, echo)
      const xOffset = echo * (W / (echoCount + 2))
      const sliceW = W - xOffset

      if (echo === 0 && inputWaveform) {
        // Input: dim white trace
        const inputData = new Float32Array(inputWaveform)
        ctx.save()
        ctx.globalAlpha = 0.3
        drawWaveform(ctx, inputData, '#ffffff', 0, 1, 1.0, 0.3)
        ctx.restore()
      } else {
        // Echo traces with offset and fading
        const sliceSamples = Math.floor(waveform.length * (sliceW / W))
        if (sliceSamples <= 0) continue
        const slice = waveform.slice(0, sliceSamples)

        // Render at offset position via temporary canvas translation
        ctx.save()
        ctx.translate(xOffset, 0)

        const pts: { x: number; y: number }[] = []
        const step = slice.length / sliceW
        const centerY = H / 2
        const amplitude = H / 2 * 0.8

        for (let x = 0; x < sliceW; x++) {
          const i = Math.floor(x * step)
          const y = centerY - (slice[i] ?? 0) * amplitude
          pts.push({ x, y })
        }

        if (pts.length >= 2) {
          // Glow line with echo-appropriate opacity
          const path = new Path2D()
          path.moveTo(pts[0].x, pts[0].y)
          for (let i = 1; i < pts.length; i++) {
            path.lineTo(pts[i].x, pts[i].y)
          }

          // Outer glow
          ctx.strokeStyle = accentColor
          ctx.globalAlpha = 0.15 * alpha
          ctx.lineWidth = 6
          ctx.lineJoin = 'round'
          ctx.lineCap = 'round'
          ctx.stroke(path)

          // Core
          ctx.globalAlpha = 0.8 * alpha
          ctx.lineWidth = 1.2
          ctx.stroke(path)
        }

        ctx.restore()
      }
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
