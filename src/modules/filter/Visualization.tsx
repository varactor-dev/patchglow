import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import { clearCanvas, drawGrid, drawGlowLine } from '@/modules/_shared/drawUtils'
import AudioEngineManager from '@/engine/AudioEngineManager'
import type { VisualizationData } from '@/types/module'

interface Props {
  moduleId: string
  data: VisualizationData
  accentColor: string
}

export default function FilterVisualization({ moduleId, accentColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useAnimationFrame(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    clearCanvas(ctx)
    drawGrid(ctx, 4, '#1a1a28')

    // Fetch live engine state
    const { customData } = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const cutoff = (customData?.cutoff as number) ?? 1000
    const resonance = (customData?.resonance as number) ?? 1
    const filterType = (customData?.filterType as string) ?? 'lowpass'

    const W = canvas.width
    const H = canvas.height

    // Draw horizontal 0 dB reference line (slightly brighter)
    const y0dB = H * (1 - (0 + 30) / 50) // dB=0 mapped to canvas
    ctx.save()
    ctx.strokeStyle = '#2a2a40'
    ctx.lineWidth = 1
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.moveTo(0, y0dB)
    ctx.lineTo(W, y0dB)
    ctx.stroke()
    ctx.restore()

    // Compute 200 log-spaced frequency points and their gain
    const numPoints = 200
    const q = Math.max(0.1, resonance)
    const logMin = Math.log10(20)
    const logMax = Math.log10(20000)
    const logRange = logMax - logMin

    const pts: { x: number; y: number }[] = []

    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1)
      const f = Math.pow(10, logMin + t * logRange)
      const ratio = f / cutoff

      let gain: number
      const denom = Math.sqrt(
        Math.pow(1 - ratio * ratio, 2) + Math.pow(ratio / q, 2)
      )

      if (filterType === 'lowpass') {
        gain = 1 / denom
      } else if (filterType === 'highpass') {
        gain = (ratio * ratio) / denom
      } else {
        // bandpass
        gain = (ratio / q) / denom
      }

      // Guard against log(0)
      const safeGain = Math.max(gain, 1e-10)
      let dB = 20 * Math.log10(safeGain)
      // Clamp to [-30, +20] dB
      dB = Math.max(-30, Math.min(20, dB))

      const x = W * (Math.log10(f / 20) / Math.log10(20000 / 20))
      const y = H * (1 - (dB + 30) / 50)
      pts.push({ x, y })
    }

    drawGlowLine(ctx, pts, accentColor, 1.5)

    // Draw vertical cutoff frequency marker
    const xCutoff = W * (Math.log10(cutoff / 20) / Math.log10(1000))
    ctx.save()
    ctx.strokeStyle = accentColor
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(xCutoff, 0)
    ctx.lineTo(xCutoff, H)
    ctx.stroke()
    ctx.restore()
  })

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={120}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
