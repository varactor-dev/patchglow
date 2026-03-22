import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import { clearCanvas, drawGrid, drawGlowLine, drawWaveform } from '@/modules/_shared/drawUtils'
import AudioEngineManager from '@/engine/AudioEngineManager'
import type { VisualizationData } from '@/types/module'
import panelStyles from '@/ui/ModulePanel/ModulePanel.module.css'

interface Props {
  moduleId: string
  data: VisualizationData
  accentColor: string
}

const W = 160
const H_TOP = 50  // transfer curve
const H_BOT = 50  // before/after waveform

export default function DistortionVisualization({ moduleId, accentColor }: Props) {
  const curveCanvasRef = useRef<HTMLCanvasElement>(null)
  const waveCanvasRef = useRef<HTMLCanvasElement>(null)

  // Top: transfer curve (input → output mapping)
  useAnimationFrame(() => {
    const canvas = curveCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    clearCanvas(ctx)
    drawGrid(ctx, 4)

    const data = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const drive = (data.customData?.drive as number) ?? 0.3
    const mode = (data.customData?.mode as string) ?? 'soft'

    const gain = mode === 'fold' ? 1 + drive * 6 :
                 mode === 'hard' ? 1 + drive * 10 :
                 1 + drive * 20

    const points: { x: number; y: number }[] = []
    const margin = 5
    const drawW = W - margin * 2
    const drawH = H_TOP - margin * 2

    for (let i = 0; i <= drawW; i++) {
      const inputVal = (i / drawW) * 2 - 1 // -1 to 1
      let outputVal: number

      switch (mode) {
        case 'hard':
          outputVal = Math.max(-1, Math.min(1, inputVal * gain))
          break
        case 'fold':
          outputVal = Math.sin(inputVal * gain * Math.PI)
          break
        default: // soft
          outputVal = Math.tanh(inputVal * gain)
      }

      const x = margin + i
      const y = margin + drawH / 2 - outputVal * (drawH / 2) * 0.9
      points.push({ x, y })
    }

    drawGlowLine(ctx, points, accentColor, 1.5)

    // Draw linear reference line (clean = diagonal)
    ctx.save()
    ctx.globalAlpha = 0.15
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 0.5
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(margin, margin + drawH)
    ctx.lineTo(margin + drawW, margin)
    ctx.stroke()
    ctx.restore()
  })

  // Bottom: before/after waveform overlay
  useAnimationFrame(() => {
    const canvas = waveCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    clearCanvas(ctx)
    drawGrid(ctx, 4, '#141420')

    const data = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const { waveform, customData } = data
    const inputWaveform = customData?.inputWaveform as number[] | undefined

    // Input waveform (dim)
    if (inputWaveform && inputWaveform.length > 0) {
      drawWaveform(ctx, new Float32Array(inputWaveform), '#666666', 0, 1, 1.0, 0.4)
    }

    // Output waveform (bright)
    if (waveform && waveform.length > 0) {
      drawWaveform(ctx, waveform, accentColor, 0, 1, 1.5, 0.9)
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div className={panelStyles.vizScreen} style={{ width: W, height: H_TOP }}>
        <canvas
          ref={curveCanvasRef}
          width={W}
          height={H_TOP}
          style={{ display: 'block', width: W, height: H_TOP }}
        />
      </div>
      <div className={panelStyles.vizScreen} style={{ width: W, height: H_BOT }}>
        <canvas
          ref={waveCanvasRef}
          width={W}
          height={H_BOT}
          style={{ display: 'block', width: W, height: H_BOT }}
        />
      </div>
    </div>
  )
}
