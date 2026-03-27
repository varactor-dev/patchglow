import { useRef, useCallback } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import { clearCanvas, drawWaveform, drawOffOverlay, drawBypassOverlay } from '@/modules/_shared/drawUtils'
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

const W = 340
const H = 170
const LEFT_MARGIN = 22
const GRID_TOP = 4
const GRID_H = 130
const ROW_H = 40
const SCOPE_TOP = 140
const SCOPE_H = 26

const VOICE_COLORS = ['#ff4444', '#ff8844', '#ffcc44']
const VOICE_LABELS = ['K', 'S', 'H']

export default function DrumSynthVisualization({ moduleId, accentColor, off, bypass }: Props) {
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

    const data = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const custom = data.customData as {
      currentStep: number
      stepCount: number
      kickPattern: boolean[]
      snarePattern: boolean[]
      hatPattern: boolean[]
      kickFlash: boolean
      snareFlash: boolean
      hatFlash: boolean
    } | undefined

    if (!custom) return

    const { currentStep, stepCount, kickPattern, snarePattern, hatPattern, kickFlash, snareFlash, hatFlash } = custom
    const patterns = [kickPattern, snarePattern, hatPattern]
    const flashes = [kickFlash, snareFlash, hatFlash]
    const cellW = (W - LEFT_MARGIN) / stepCount
    const cellH = ROW_H - 6 // padding between rows

    // Draw grid cells
    for (let voice = 0; voice < 3; voice++) {
      const pattern = patterns[voice]
      const rowY = GRID_TOP + voice * ROW_H

      for (let step = 0; step < stepCount; step++) {
        const x = LEFT_MARGIN + step * cellW
        const isActive = pattern[step]
        const isCurrent = step === currentStep

        if (isActive) {
          // Filled cell with voice color
          ctx.fillStyle = isCurrent
            ? VOICE_COLORS[voice]
            : VOICE_COLORS[voice] + '66' // 0.4 opacity via hex
          ctx.fillRect(x + 1, rowY + 1, cellW - 2, cellH - 2)

          // Glow on current step with active pattern
          if (isCurrent) {
            ctx.save()
            ctx.shadowColor = VOICE_COLORS[voice]
            ctx.shadowBlur = 10
            ctx.fillStyle = VOICE_COLORS[voice]
            ctx.fillRect(x + 1, rowY + 1, cellW - 2, cellH - 2)
            ctx.restore()
          }
        } else {
          // Inactive cell outline
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
          ctx.lineWidth = 0.5
          ctx.strokeRect(x + 1, rowY + 1, cellW - 2, cellH - 2)
        }
      }
    }

    // Playhead column gradient overlay
    const activeX = LEFT_MARGIN + currentStep * cellW
    const grad = ctx.createLinearGradient(activeX, GRID_TOP, activeX + cellW, GRID_TOP)
    grad.addColorStop(0, 'rgba(255, 68, 68, 0)')
    grad.addColorStop(0.5, 'rgba(255, 68, 68, 0.08)')
    grad.addColorStop(1, 'rgba(255, 68, 68, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(activeX, GRID_TOP, cellW, GRID_H)

    // Playhead line at top
    ctx.fillStyle = accentColor
    ctx.fillRect(activeX + 2, 0, cellW - 4, 2)

    // Row labels in left margin
    ctx.font = '10px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let voice = 0; voice < 3; voice++) {
      const rowY = GRID_TOP + voice * ROW_H
      ctx.fillStyle = flashes[voice] ? VOICE_COLORS[voice] : '#555566'
      ctx.fillText(VOICE_LABELS[voice], LEFT_MARGIN / 2, rowY + cellH / 2)
    }

    // Voice trigger flash — brighten entire row
    for (let voice = 0; voice < 3; voice++) {
      if (flashes[voice]) {
        const rowY = GRID_TOP + voice * ROW_H
        ctx.save()
        ctx.fillStyle = VOICE_COLORS[voice]
        ctx.globalAlpha = 0.08
        ctx.fillRect(LEFT_MARGIN, rowY, W - LEFT_MARGIN, cellH)
        ctx.restore()
      }
    }

    // Mini waveform scope at bottom
    if (data.waveform) {
      // Draw into the SCOPE region by using yOffset/yScale
      // yOffset = SCOPE_TOP / H, yScale = SCOPE_H / H
      drawWaveform(ctx, data.waveform, accentColor, SCOPE_TOP / H, SCOPE_H / H, 1.0, 0.6)
    }

    if (bypass) {
      drawBypassOverlay(ctx, canvas.width, canvas.height, accentColor)
    }
  })

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width * W
    const y = (e.clientY - rect.top) / rect.height * H

    if (x < LEFT_MARGIN || y < GRID_TOP || y > GRID_TOP + GRID_H) return

    const vizData = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const stepCount = (vizData.customData?.stepCount as number) ?? 16
    const cellW = (W - LEFT_MARGIN) / stepCount
    const step = Math.floor((x - LEFT_MARGIN) / cellW)
    const voiceIndex = Math.floor((y - GRID_TOP) / ROW_H)

    if (step < 0 || step >= stepCount || voiceIndex < 0 || voiceIndex > 2) return

    const voices = ['kick', 'snare', 'hat'] as const
    AudioEngineManager.getInstance().sendAction(moduleId, 'toggleStep', {
      voice: voices[voiceIndex],
      step,
    })
  }, [moduleId])

  return (
    <div className={panelStyles.vizScreen} style={{ width: W, height: H }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', width: W, height: H, cursor: 'pointer', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
      />
    </div>
  )
}
