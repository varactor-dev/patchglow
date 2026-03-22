import { useCallback, useRef, useState } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import { clearCanvas } from '@/modules/_shared/drawUtils'
import AudioEngineManager from '@/engine/AudioEngineManager'
import type { VisualizationData } from '@/types/module'
import panelStyles from '@/ui/ModulePanel/ModulePanel.module.css'

interface Props {
  moduleId: string
  data: VisualizationData
  accentColor: string
}

// One octave of keys: C D E F G A B C
const WHITE_NOTES = [0, 2, 4, 5, 7, 9, 11, 12]   // semitones for white keys
const BLACK_NOTES = [1, 3, -1, 6, 8, 10, -1, -1]  // -1 = no black key at that position

const W = 220
const H = 60
const WHITE_W = W / WHITE_NOTES.length
const WHITE_H = H
const BLACK_W = WHITE_W * 0.55
const BLACK_H = H * 0.62

// Hit-test a canvas-space point to find which semitone key was pressed.
// Black keys are checked first (drawn on top). Returns null if no key hit.
function getSemitoneAtPoint(x: number, y: number): number | null {
  // Check black keys first — they overlap white key boundaries
  for (let i = 0; i < BLACK_NOTES.length; i++) {
    const semitone = BLACK_NOTES[i]!
    if (semitone === -1) continue
    const bx = (i + 1) * WHITE_W - BLACK_W / 2
    if (x >= bx && x <= bx + BLACK_W && y >= 0 && y <= BLACK_H) {
      return semitone
    }
  }
  // Check white keys
  const whiteIndex = Math.floor(x / WHITE_W)
  if (whiteIndex >= 0 && whiteIndex < WHITE_NOTES.length) {
    return WHITE_NOTES[whiteIndex]!
  }
  return null
}

export default function KeyboardVisualization({ moduleId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [display, setDisplay] = useState({ noteName: '', octave: 0, gateHigh: false })
  const displayRef = useRef(display)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    const rect = canvas.getBoundingClientRect()
    // Scale from CSS pixels to canvas pixels
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const semitone = getSemitoneAtPoint(x, y)
    if (semitone === null) return
    canvas.setPointerCapture(e.pointerId)
    AudioEngineManager.getInstance().sendAction(moduleId, 'noteOn', semitone)
  }, [moduleId])

  const handlePointerUp = useCallback(() => {
    AudioEngineManager.getInstance().sendAction(moduleId, 'noteOff')
  }, [moduleId])

  useAnimationFrame(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    clearCanvas(ctx)

    const { customData } = AudioEngineManager.getInstance().getVisualizationData(moduleId)
    const pressedNote = customData?.['pressedNote'] as number | null
    const newNoteName = (customData?.['pressedNoteName'] as string) ?? ''
    const newOctave = (customData?.['octave'] as number) ?? 0
    const newGateHigh = ((customData?.['gateValue'] as number) ?? 0) > 0.5

    // Update JSX display state only when values change (avoids re-render every frame)
    const prev = displayRef.current
    if (newNoteName !== prev.noteName || newOctave !== prev.octave || newGateHigh !== prev.gateHigh) {
      const next = { noteName: newNoteName, octave: newOctave, gateHigh: newGateHigh }
      displayRef.current = next
      setDisplay(next)
    }

    // Draw white keys
    WHITE_NOTES.forEach((semitone, i) => {
      const x = i * WHITE_W
      const isPressed = pressedNote === semitone

      ctx.fillStyle = isPressed ? '#00e5ff' : '#d0d0dc'
      ctx.fillRect(x + 1, 0, WHITE_W - 2, WHITE_H - 1)

      if (isPressed) {
        ctx.shadowColor = '#00e5ff'
        ctx.shadowBlur = 20
        ctx.fillRect(x + 1, 0, WHITE_W - 2, WHITE_H - 1)
        ctx.shadowBlur = 0
        // Second pass — extra bloom halo
        ctx.globalAlpha = 0.35
        ctx.shadowColor = '#00e5ff'
        ctx.shadowBlur = 28
        ctx.fillRect(x + 1, 0, WHITE_W - 2, WHITE_H - 1)
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }

      // Key border
      ctx.strokeStyle = '#2a2a3a'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, 0.5, WHITE_W - 1, WHITE_H - 1)
    })

    // Draw black keys on top
    BLACK_NOTES.forEach((semitone, i) => {
      if (semitone === -1) return
      const x = (i + 1) * WHITE_W - BLACK_W / 2
      const isPressed = pressedNote === semitone

      ctx.fillStyle = isPressed ? '#00e5ff' : '#1a1a24'
      ctx.fillRect(x, 0, BLACK_W, BLACK_H)

      if (isPressed) {
        ctx.shadowColor = '#00e5ff'
        ctx.shadowBlur = 18
        ctx.fillRect(x, 0, BLACK_W, BLACK_H)
        ctx.shadowBlur = 0
        // Second pass — extra bloom halo
        ctx.globalAlpha = 0.35
        ctx.shadowColor = '#00e5ff'
        ctx.shadowBlur = 26
        ctx.fillRect(x, 0, BLACK_W, BLACK_H)
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }

      ctx.strokeStyle = '#0a0a0f'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, 0.5, BLACK_W - 1, BLACK_H - 1)
    })

    // Keyboard label mapping hint
    const HINT_KEYS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K']
    WHITE_NOTES.forEach((_semitone, i) => {
      const x = i * WHITE_W + WHITE_W / 2
      ctx.fillStyle = '#4a4a60'
      ctx.font = '7px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(HINT_KEYS[i] ?? '', x, WHITE_H - 5)
    })
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
      <div className={panelStyles.vizScreen} style={{ width: W, height: H }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
          style={{ display: 'block', width: W, height: H, touchAction: 'none', userSelect: 'none', cursor: 'pointer' }}
        />
      </div>

      {/* Note display */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: display.gateHigh ? '#00e5ff' : 'var(--text-dim)',
        textShadow: display.gateHigh ? '0 0 8px #00e5ff' : 'none',
        letterSpacing: '0.1em',
        minHeight: '14px',
        textAlign: 'center',
        transition: 'color 80ms ease',
      }}>
        {display.noteName ? `${display.noteName}${display.octave + 4}` : '—'}
      </div>

      {/* Octave indicator */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '8px',
        color: 'var(--text-dim)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        OCT {display.octave >= 0 ? '+' : ''}{display.octave}
      </div>
    </div>
  )
}
