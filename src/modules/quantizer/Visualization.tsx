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

const W = 130
const H = 100

// Piano keyboard layout
const WHITE_TO_NOTE = [0, 2, 4, 5, 7, 9, 11] // semitone for each white key: C D E F G A B
const BLACK_KEY_POSITIONS = [0, 1, 3, 4, 5] // positions between white keys: C#, D#, F#, G#, A#
const BLACK_TO_NOTE = [1, 3, 6, 8, 10] // semitone for each black key

function noteToKeyPosition(note: number): { x: number; y: number; isBlack: boolean } {
  const keyboardX = 9 // left margin to center 7 white keys (~112px) in 130px canvas
  const whiteKeyW = 16

  // Check if it's a black key
  const blackIdx = BLACK_TO_NOTE.indexOf(note)
  if (blackIdx >= 0) {
    const pos = BLACK_KEY_POSITIONS[blackIdx]
    const x = keyboardX + pos * whiteKeyW + whiteKeyW - 1
    return { x: x + 5, y: 28, isBlack: true }
  }

  // White key
  const whiteIdx = WHITE_TO_NOTE.indexOf(note)
  if (whiteIdx >= 0) {
    const x = keyboardX + whiteIdx * whiteKeyW
    return { x: x + whiteKeyW / 2, y: 50, isBlack: false }
  }

  return { x: W / 2, y: 50, isBlack: false }
}

export default function QuantizerVisualization({ moduleId, accentColor, off, bypass }: Props) {
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
      inputNoteName: string
      outputNoteName: string
      inputNoteInOctave: number
      outputNoteInOctave: number
      root: number
      scaleNotes: number[]
      active: boolean
    } | undefined

    if (!custom) return

    const { inputNoteName, outputNoteName, inputNoteInOctave, outputNoteInOctave, root, scaleNotes, active } = custom

    // -- Draw piano keyboard (one octave, C to B) --
    const keyboardX = 9
    const keyboardY = 10
    const whiteKeyW = 16
    const whiteKeyH = 55
    const blackKeyW = 10
    const blackKeyH = 33

    // White keys
    for (let i = 0; i < 7; i++) {
      const x = keyboardX + i * whiteKeyW
      const note = WHITE_TO_NOTE[i]
      const isScale = scaleNotes.includes(note)
      const isRoot = note === root

      // Fill
      if (isRoot) {
        ctx.fillStyle = accentColor
        ctx.globalAlpha = 0.6
      } else if (isScale) {
        ctx.fillStyle = accentColor
        ctx.globalAlpha = 0.3
      } else {
        ctx.fillStyle = '#1a1a28'
        ctx.globalAlpha = 0.4
      }
      ctx.fillRect(x, keyboardY, whiteKeyW - 1, whiteKeyH)

      // Border
      ctx.globalAlpha = 0.3
      ctx.strokeStyle = '#555'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x, keyboardY, whiteKeyW - 1, whiteKeyH)
    }

    // Black keys
    for (let i = 0; i < BLACK_KEY_POSITIONS.length; i++) {
      const pos = BLACK_KEY_POSITIONS[i]
      const x = keyboardX + pos * whiteKeyW + whiteKeyW - blackKeyW / 2
      const note = BLACK_TO_NOTE[i]
      const isScale = scaleNotes.includes(note)
      const isRoot = note === root

      if (isRoot) {
        ctx.fillStyle = accentColor
        ctx.globalAlpha = 0.7
      } else if (isScale) {
        ctx.fillStyle = accentColor
        ctx.globalAlpha = 0.4
      } else {
        ctx.fillStyle = '#0d0d14'
        ctx.globalAlpha = 0.9
      }
      ctx.fillRect(x, keyboardY, blackKeyW, blackKeyH)

      // Border
      ctx.globalAlpha = 0.4
      ctx.strokeStyle = '#444'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x, keyboardY, blackKeyW, blackKeyH)
    }

    ctx.globalAlpha = 1

    // -- Input indicator: diamond on input note's key --
    if (active) {
      const inputPos = noteToKeyPosition(inputNoteInOctave)
      const dSize = 4
      ctx.fillStyle = '#ff8888'
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.moveTo(inputPos.x, inputPos.y - dSize)
      ctx.lineTo(inputPos.x + dSize, inputPos.y)
      ctx.lineTo(inputPos.x, inputPos.y + dSize)
      ctx.lineTo(inputPos.x - dSize, inputPos.y)
      ctx.closePath()
      ctx.fill()

      // -- Output indicator: filled circle on quantized output key --
      const outputPos = noteToKeyPosition(outputNoteInOctave)
      ctx.fillStyle = accentColor
      ctx.globalAlpha = 1
      ctx.shadowColor = accentColor
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(outputPos.x, outputPos.y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // -- Arrow from input to output if they differ --
      if (inputNoteInOctave !== outputNoteInOctave) {
        ctx.strokeStyle = accentColor
        ctx.globalAlpha = 0.4
        ctx.lineWidth = 1
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.moveTo(inputPos.x, inputPos.y)
        ctx.lineTo(outputPos.x, outputPos.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // -- Note name text at bottom --
    ctx.globalAlpha = 0.8
    ctx.fillStyle = '#ccc'
    ctx.font = '9px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (active) {
      const label = inputNoteName === outputNoteName
        ? outputNoteName
        : `${inputNoteName} > ${outputNoteName}`
      ctx.fillText(label, W / 2, H - 14)
    } else {
      ctx.fillStyle = '#555'
      ctx.fillText('--', W / 2, H - 14)
    }

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
