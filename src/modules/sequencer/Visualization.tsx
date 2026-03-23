import { useRef, useCallback } from 'react'
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

const W = 300
const H = 120
const GATE_BAR_H = 8
const GRID_TOP = 4
const GRID_H = H - GATE_BAR_H - GRID_TOP - 4 // space for gate bar + padding

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C']

export default function SequencerVisualization({ moduleId, accentColor, off, bypass }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const draggingRef = useRef<{ step: number; startY: number; startSemitone: number } | null>(null)

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
      stepPitches: number[]
      gateHigh: boolean
      noteNames: string[]
    } | undefined

    if (!custom) return

    const { currentStep, stepCount, stepPitches, gateHigh } = custom
    const cellW = W / stepCount
    const maxSemitone = 12

    // Draw step cells
    for (let i = 0; i < stepCount; i++) {
      const x = i * cellW
      const semitone = stepPitches[i] ?? 0
      const barH = (semitone / maxSemitone) * GRID_H
      const barY = GRID_TOP + GRID_H - barH
      const isActive = i === currentStep

      // Cell background
      ctx.fillStyle = isActive ? 'rgba(255, 46, 203, 0.15)' : 'rgba(255, 255, 255, 0.02)'
      ctx.fillRect(x + 1, GRID_TOP, cellW - 2, GRID_H)

      // Pitch bar
      if (semitone > 0) {
        ctx.fillStyle = isActive ? accentColor : 'rgba(255, 46, 203, 0.5)'
        ctx.fillRect(x + 2, barY, cellW - 4, barH)

        // Glow on active step
        if (isActive) {
          ctx.shadowColor = accentColor
          ctx.shadowBlur = 10
          ctx.fillStyle = accentColor
          ctx.fillRect(x + 2, barY, cellW - 4, barH)
          ctx.shadowBlur = 0
        }
      }

      // Note name label
      const noteName = NOTE_NAMES[semitone % 13] ?? 'C'
      ctx.fillStyle = isActive ? '#ffffff' : '#555566'
      ctx.font = '8px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(noteName, x + cellW / 2, GRID_TOP + GRID_H - 3)

      // Cell border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x + 0.5, GRID_TOP, cellW - 1, GRID_H)
    }

    // Active step column glow overlay
    const activeX = currentStep * cellW
    const grad = ctx.createLinearGradient(activeX, GRID_TOP, activeX + cellW, GRID_TOP)
    grad.addColorStop(0, 'rgba(255, 46, 203, 0)')
    grad.addColorStop(0.5, 'rgba(255, 46, 203, 0.08)')
    grad.addColorStop(1, 'rgba(255, 46, 203, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(activeX, GRID_TOP, cellW, GRID_H)

    // Gate bar at bottom
    const gateY = H - GATE_BAR_H - 2
    for (let i = 0; i < stepCount; i++) {
      const x = i * cellW
      const isActive = i === currentStep
      ctx.fillStyle = isActive && gateHigh
        ? accentColor
        : 'rgba(255, 255, 255, 0.04)'
      ctx.fillRect(x + 1, gateY, cellW - 2, GATE_BAR_H)

      if (isActive && gateHigh) {
        ctx.shadowColor = accentColor
        ctx.shadowBlur = 6
        ctx.fillStyle = accentColor
        ctx.fillRect(x + 1, gateY, cellW - 2, GATE_BAR_H)
        ctx.shadowBlur = 0
      }
    }

    // Step position indicator line at top
    ctx.fillStyle = accentColor
    ctx.fillRect(activeX + 2, 0, cellW - 4, 2)

    if (bypass) {
      drawBypassOverlay(ctx, canvas.width, canvas.height, accentColor)
    }
  })

  const getStepFromX = useCallback((clientX: number) => {
    const canvas = canvasRef.current
    if (!canvas) return -1
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const data = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const stepCount = (data.customData?.stepCount as number) ?? 8
    const cellW = W / stepCount
    const step = Math.floor((x / rect.width) * W / cellW)
    return Math.max(0, Math.min(stepCount - 1, step))
  }, [moduleId])

  const getSemitoneFromDrag = useCallback((clientY: number, startY: number, startSemitone: number) => {
    const canvas = canvasRef.current
    if (!canvas) return 0
    const rect = canvas.getBoundingClientRect()
    const pixelsPerSemitone = (rect.height * (GRID_H / H)) / 12
    const dy = startY - clientY // up = positive
    const deltaSemitones = Math.round(dy / pixelsPerSemitone)
    return Math.max(0, Math.min(12, startSemitone + deltaSemitones))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    const step = getStepFromX(e.clientX)
    if (step < 0) return

    const data = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const pitches = (data.customData?.stepPitches as number[]) ?? []
    const startSemitone = pitches[step] ?? 0

    draggingRef.current = { step, startY: e.clientY, startSemitone }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [moduleId, getStepFromX])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = draggingRef.current
    if (!drag) return
    const semitone = getSemitoneFromDrag(e.clientY, drag.startY, drag.startSemitone)
    AudioEngineManager.getInstance().sendAction(moduleId, 'setStep', {
      step: drag.step,
      semitone,
    })
  }, [moduleId, getSemitoneFromDrag])

  const handlePointerUp = useCallback(() => {
    draggingRef.current = null
  }, [])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const step = getStepFromX(e.clientX)
    if (step < 0) return
    // Reset to C4 (semitone 0)
    AudioEngineManager.getInstance().sendAction(moduleId, 'setStep', {
      step,
      semitone: 0,
    })
  }, [moduleId, getStepFromX])

  return (
    <div className={panelStyles.vizScreen} style={{ width: W, height: H }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: 'block', width: W, height: H, cursor: 'ns-resize', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  )
}
