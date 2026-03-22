import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

// Computer keyboard layout: A-L keys = C4 through C5 (one octave + 1)
// Matches standard piano mapping
const KEY_NOTE_MAP: Record<string, number> = {
  'a': 0,  // C
  'w': 1,  // C#
  's': 2,  // D
  'e': 3,  // D#
  'd': 4,  // E
  'f': 5,  // F
  't': 6,  // F#
  'g': 7,  // G
  'y': 8,  // G#
  'h': 9,  // A
  'u': 10, // A#
  'j': 11, // B
  'k': 12, // C (octave up)
}


export class KeyboardEngine implements ModuleAudioEngine {
  private cvSignal: Tone.Signal<'number'> | null = null
  private gateSignal: Tone.Signal<'number'> | null = null
  private octave = 0
  private currentNote: number | null = null
  // Stack of currently pressed keys (most recent last) for last-key-priority
  private pressedKeys: string[] = []

  // For visualization
  private pressedNote: number | null = null
  private pressedNoteName = ''

  noteOn(semitone: number): void {
    const midiNote = 60 + semitone + this.octave * 12
    // Output cents relative to A4 (MIDI 69) so the signal connects to osc.detune
    this.cvSignal!.value = (midiNote - 69) * 100

    if (this.currentNote !== null) {
      // Retrigger: pulse gate low for 10ms so envelope poll detects the low→high transition
      // and fires a fresh triggerAttack. 10ms > 2× the 5ms poll interval, ensuring detection.
      const now = Tone.now()
      this.gateSignal!.cancelScheduledValues(now)
      this.gateSignal!.setValueAtTime(0, now)
      this.gateSignal!.setValueAtTime(1, now + 0.01)
    } else {
      this.gateSignal!.value = 1
    }

    this.currentNote = semitone
    this.pressedNote = semitone
    this.pressedNoteName = NOTE_NAMES[semitone % 12]!
  }

  /** Switch CV to a new semitone without retriggering the gate (for key fallback). */
  private switchPitch(semitone: number): void {
    const midiNote = 60 + semitone + this.octave * 12
    this.cvSignal!.value = (midiNote - 69) * 100
    this.currentNote = semitone
    this.pressedNote = semitone
    this.pressedNoteName = NOTE_NAMES[semitone % 12]!
  }

  noteOff(): void {
    // Cancel any pending retrigger pulse before setting gate low,
    // so the scheduled gate=1 at +10ms doesn't override the noteOff
    this.gateSignal!.cancelScheduledValues(Tone.now())
    this.gateSignal!.value = 0
    this.currentNote = null
    this.pressedKeys = []
    this.pressedNote = null
    this.pressedNoteName = ''
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return
    const key = e.key.toLowerCase()
    if (!(key in KEY_NOTE_MAP)) return
    // Remove if already in stack (shouldn't happen, but defensive)
    this.pressedKeys = this.pressedKeys.filter((k) => k !== key)
    this.pressedKeys.push(key)
    this.noteOn(KEY_NOTE_MAP[key]!)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    if (!(key in KEY_NOTE_MAP)) return
    // Remove this key from the pressed stack
    this.pressedKeys = this.pressedKeys.filter((k) => k !== key)

    if (this.pressedKeys.length > 0) {
      // Other keys still held — revert to the most recently pressed remaining key
      // without retriggering the gate (smooth pitch change, continuous sound)
      const fallbackKey = this.pressedKeys[this.pressedKeys.length - 1]!
      this.switchPitch(KEY_NOTE_MAP[fallbackKey]!)
    } else {
      // No keys held — release
      this.noteOff()
    }
  }

  private onBlur = () => {
    if (this.currentNote !== null) {
      this.noteOff()
    }
  }

  handleAction(action: string, payload?: unknown): void {
    if (action === 'noteOn') this.noteOn(payload as number)
    if (action === 'noteOff') this.noteOff()
  }

  initialize(_context: Tone.BaseContext): void {
    this.cvSignal = new Tone.Signal<'number'>({ value: 0, units: 'number' })
    this.gateSignal = new Tone.Signal<'number'>({ value: 0, units: 'number' })

    document.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'cv-out') return this.cvSignal!
    if (portId === 'gate-out') return this.gateSignal!
    throw new Error(`KeyboardEngine: unknown output port "${portId}"`)
  }

  getInputNode(_portId: string): Tone.ToneAudioNode {
    throw new Error('KeyboardEngine has no input ports')
  }

  setParameter(parameterId: string, value: number | string): void {
    if (parameterId === 'octave') {
      this.octave = Math.round(Number(value))
      // If a note is held, retune immediately using the same cents formula
      if (this.currentNote !== null) {
        const midiNote = 60 + this.currentNote + this.octave * 12
        this.cvSignal!.value = (midiNote - 69) * 100
      }
    }
  }

  getVisualizationData(): VisualizationData {
    return {
      customData: {
        pressedNote: this.pressedNote,
        pressedNoteName: this.pressedNoteName,
        octave: this.octave,
        gateValue: this.gateSignal?.value ?? 0,
      },
    }
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    this.cvSignal?.dispose()
    this.gateSignal?.dispose()
    this.cvSignal = null
    this.gateSignal = null
  }
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
