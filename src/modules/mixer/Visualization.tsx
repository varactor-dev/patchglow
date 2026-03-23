import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import { clearCanvas, drawOffOverlay, drawBypassOverlay } from '@/modules/_shared/drawUtils'
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
const H = 100

function calcRms(data: Float32Array): number {
  let sum = 0
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
  return Math.sqrt(sum / data.length)
}

export default function MixerVisualization({ moduleId, accentColor, off, bypass }: Props) {
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

    const { waveform, customData } = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const outData = waveform ?? new Float32Array(256)
    const ch1Data = (customData?.ch1Data as Float32Array) ?? new Float32Array(128)
    const ch2Data = (customData?.ch2Data as Float32Array) ?? new Float32Array(128)
    const ch3Data = (customData?.ch3Data as Float32Array) ?? new Float32Array(128)

    const rms1 = calcRms(ch1Data)
    const rms2 = calcRms(ch2Data)
    const rms3 = calcRms(ch3Data)
    const rmsMix = calcRms(outData)

    const bars = [
      { label: '1', rms: rms1, color: accentColor },
      { label: '2', rms: rms2, color: accentColor },
      { label: '3', rms: rms3, color: accentColor },
      { label: 'MIX', rms: rmsMix, color: accentColor },
    ]

    const barWidth = canvas.width / 5
    const gap = canvas.width / 5 / 4

    bars.forEach((bar, i) => {
      const x = gap + i * (barWidth + gap)
      const maxH = canvas.height * 0.82
      const barH = bar.rms * maxH
      const y = canvas.height * 0.08 + (maxH - barH)

      // Separator line before MIX bar
      if (i === 3) {
        ctx.save()
        ctx.globalAlpha = 0.15
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x - gap / 2, canvas.height * 0.08)
        ctx.lineTo(x - gap / 2, canvas.height * 0.9)
        ctx.stroke()
        ctx.restore()
      }

      // Background track (dim)
      ctx.globalAlpha = 0.15
      ctx.fillStyle = bar.color
      ctx.fillRect(x, canvas.height * 0.08, barWidth, maxH)

      // Active bar with glow
      ctx.globalAlpha = 0.9
      ctx.shadowColor = bar.color
      ctx.shadowBlur = 8
      ctx.fillStyle = bar.color
      ctx.fillRect(x, y, barWidth, barH)
      ctx.shadowBlur = 0

      // Label at bottom — MIX label is distinct
      if (bar.label === 'MIX') {
        ctx.globalAlpha = 0.7
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 8px monospace'
      } else {
        ctx.globalAlpha = 0.5
        ctx.fillStyle = bar.color
        ctx.font = '7px monospace'
      }
      ctx.textAlign = 'center'
      ctx.fillText(bar.label, x + barWidth / 2, canvas.height * 0.97)
    })

    ctx.globalAlpha = 1

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
