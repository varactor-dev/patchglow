import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import { clearCanvas, drawGrid, drawOffOverlay, drawBypassOverlay } from '@/modules/_shared/drawUtils'
import AudioEngineManager from '@/engine/AudioEngineManager'
import type { VisualizationData } from '@/types/module'
import panelStyles from '@/ui/ModulePanel/ModulePanel.module.css'

function lerpColor(a: string, b: string, t: number): string {
  const p = (c: string, i: number) => parseInt(c.slice(i, i + 2), 16)
  const r = Math.round(p(a, 1) + (p(b, 1) - p(a, 1)) * t)
  const g = Math.round(p(a, 3) + (p(b, 3) - p(a, 3)) * t)
  const bl = Math.round(p(a, 5) + (p(b, 5) - p(a, 5)) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

function computeCoolAccent(hex: string): string {
  const p = (i: number) => parseInt(hex.slice(i, i + 2), 16)
  const r = Math.max(0, p(1) - 20)
  const g = p(3)
  const b = Math.min(255, p(5) + 40)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

interface Props {
  moduleId: string
  data: VisualizationData
  accentColor: string
  off?: boolean
  bypass?: boolean
}

const W = 200
const H = 90

export default function DelayVisualization({ moduleId, accentColor, off, bypass }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef(0)

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
    const { customData } = data

    const feedback = (customData?.feedback as number) ?? 0.4
    const delayTime = (customData?.delayTime as number) ?? 0.3
    const wet = (customData?.wet as number) ?? 0.5
    const rmsHistory = (customData?.inputRmsHistory as number[]) ?? []

    // Timeline: W pixels represents ~2 seconds
    const timelineSeconds = 2.0
    const pxPerSecond = W / timelineSeconds

    // Advance scroll phase
    scrollRef.current = (scrollRef.current + 1 / 60 * pxPerSecond) % (delayTime * pxPerSecond * 10 + W)

    // Draw vertical dotted time markers at delay intervals
    ctx.save()
    ctx.strokeStyle = accentColor
    ctx.globalAlpha = 0.12
    ctx.lineWidth = 1
    ctx.setLineDash([2, 4])
    for (let t = delayTime; t < timelineSeconds; t += delayTime) {
      const x = t * pxPerSecond
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.restore()

    // Get current input RMS (last entry in history)
    const currentRms = rmsHistory.length > 0 ? rmsHistory[rmsHistory.length - 1] : 0

    // Compute cool accent for echo color shift
    const coolAccent = computeCoolAccent(accentColor)

    // Draw dry signal bar at left edge
    const barWidth = 6
    const dryBrightness = Math.min(1, currentRms * 6) // boosted for visibility
    if (dryBrightness > 0.02) {
      const barHeight = H * 0.7 * dryBrightness
      const barX = 4
      const barY = (H - barHeight) / 2

      // Glow
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 0.3 * dryBrightness
      ctx.shadowColor = accentColor
      ctx.shadowBlur = 10
      ctx.fillRect(barX - 1, barY, barWidth + 2, barHeight)
      ctx.shadowBlur = 0
      ctx.restore()

      // Core
      ctx.save()
      ctx.fillStyle = accentColor
      ctx.globalAlpha = 0.9 * dryBrightness
      ctx.fillRect(barX, barY, barWidth, barHeight)
      ctx.restore()
    }

    // Draw echo bars at delay intervals
    const maxEchoes = Math.min(8, Math.ceil(Math.log(0.02) / Math.log(Math.max(0.01, feedback))))
    for (let n = 1; n <= maxEchoes; n++) {
      const echoAlpha = Math.pow(feedback, n)
      if (echoAlpha < 0.02) break

      const echoX = n * delayTime * pxPerSecond
      if (echoX > W - barWidth) break

      // Look back in history for the RMS at this echo's time offset
      const framesBack = Math.round(n * delayTime * 60)
      const histIdx = rmsHistory.length - 1 - framesBack
      const echoRms = histIdx >= 0 ? (rmsHistory[histIdx] ?? 0) : 0

      // Brighter echoes: first echo at 70% brightness, subsequent dim by feedback
      const echoBrightness = 0.7 * Math.pow(feedback, n - 1) * wet
      const barHeight = H * 0.7 * Math.min(1, echoRms * 4) * Math.min(1, echoBrightness * 2)
      const barY = (H - barHeight) / 2

      if (echoBrightness < 0.01 || barHeight < 1) continue

      // Color cooling shift: later echoes shift toward cooler shade
      const coolT = (n - 1) / Math.max(1, maxEchoes - 1)
      const echoColor = lerpColor(accentColor, coolAccent, coolT * 0.6)

      // Outer glow — wide soft halo
      ctx.save()
      ctx.fillStyle = echoColor
      ctx.globalAlpha = 0.25 * echoBrightness
      ctx.shadowColor = echoColor
      ctx.shadowBlur = 12
      ctx.fillRect(echoX - 3, barY - 2, barWidth + 6, barHeight + 4)
      ctx.shadowBlur = 0
      ctx.restore()

      // Inner glow
      ctx.save()
      ctx.fillStyle = echoColor
      ctx.globalAlpha = 0.5 * echoBrightness
      ctx.shadowColor = echoColor
      ctx.shadowBlur = 6
      ctx.fillRect(echoX - 1, barY, barWidth + 2, barHeight)
      ctx.shadowBlur = 0
      ctx.restore()

      // Core bar
      ctx.save()
      ctx.fillStyle = echoColor
      ctx.globalAlpha = 0.9 * echoBrightness
      ctx.fillRect(echoX, barY, barWidth, barHeight)
      ctx.restore()
    }

    // Draw "DRY" label at left
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.3
    ctx.font = '7px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('DRY', 7, H - 4)
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
