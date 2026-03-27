import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'
import { GatePoller } from '@/modules/_shared/GatePoller'

const SCALES: Record<string, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major:     [0, 2, 4, 5, 7, 9, 11],
  minor:     [0, 2, 3, 5, 7, 8, 10],
  pentatonic:[0, 3, 5, 7, 10],
  blues:     [0, 3, 5, 6, 7, 10],
}
const ROOT_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export class QuantizerEngine implements ModuleAudioEngine {
  private outputSignal: Tone.Signal<'number'> | null = null
  private trigSignal: Tone.Signal<'number'> | null = null

  // CV input
  private cvInputGain: Tone.Gain | null = null
  private cvAnalyser: Tone.Analyser | null = null

  // Trigger input
  private triggerPoller: GatePoller | null = null

  // Poll interval
  private inputPollInterval: number | null = null

  // State
  private root = 9 // A = index 9 in chromatic scale
  private scaleName = 'pentatonic'
  private triggerConnected = false
  private lastOutputMidi = -1
  private inputValue = 0
  private lastQuantizedCents = 0
  private isOff = false

  // Trigger output pulse timer
  private trigPulseTimer: number | null = null

  initialize(_context: Tone.BaseContext): void {
    this.outputSignal = new Tone.Signal<'number'>({ value: 0, units: 'number' })
    this.trigSignal = new Tone.Signal<'number'>({ value: 0, units: 'number' })

    // CV input chain
    this.cvInputGain = new Tone.Gain(1)
    this.cvAnalyser = new Tone.Analyser('waveform', 32)
    this.cvInputGain.connect(this.cvAnalyser)

    // Trigger input via GatePoller — on rising edge, quantize
    this.triggerPoller = new GatePoller(() => {
      this.doQuantize()
    })

    // Poll CV input at 5ms
    this.inputPollInterval = window.setInterval(() => {
      this.readInput()
      // When no trigger is connected, free-run quantization on every poll
      if (!this.triggerConnected) {
        this.doQuantize()
      }
    }, 5)
  }

  private readInput(): void {
    if (!this.cvAnalyser) return
    const data = this.cvAnalyser.getValue() as Float32Array
    // Scale audio-level input (±1) to cents: 1.0 = 2 octaves (2400 cents).
    // Noise→S&H outputs ±0.3 which becomes ±720 cents (±6 semitones) — a useful melodic range.
    this.inputValue = (data[data.length - 1] as number) * 2400
  }

  private doQuantize(): void {
    if (this.isOff || !this.outputSignal) return

    const inputCents = this.inputValue
    const quantizedCents = this.quantize(inputCents)
    this.lastQuantizedCents = quantizedCents
    this.outputSignal.value = quantizedCents

    // Check if output MIDI note changed
    const outputMidi = Math.round(69 + quantizedCents / 100)
    if (outputMidi !== this.lastOutputMidi) {
      this.lastOutputMidi = outputMidi
      this.fireTriggerPulse()
    }
  }

  private quantize(inputCents: number): number {
    const scale = SCALES[this.scaleName] ?? SCALES.chromatic
    // Convert CV cents to MIDI note (CV is cents relative to A4 = MIDI 69)
    const midiFloat = 69 + inputCents / 100
    const midi = Math.round(midiFloat)
    const noteInOctave = ((midi % 12) + 12) % 12
    const octave = Math.floor(midi / 12)

    // Find position relative to root
    const adjusted = ((noteInOctave - this.root) + 120) % 12 // +120 to ensure positive

    // Find nearest scale degree (with octave wrapping)
    let nearest = scale[0]
    let minDist = Infinity
    for (const degree of scale) {
      const dist = Math.min(Math.abs(adjusted - degree), 12 - Math.abs(adjusted - degree))
      if (dist < minDist) {
        minDist = dist
        nearest = degree
      }
    }

    // Reconstruct MIDI note
    let outputNote = octave * 12 + ((nearest + this.root) % 12)
    // Ensure we pick the closest octave
    if (Math.abs(outputNote - midi) > 6) {
      outputNote += (midi > outputNote) ? 12 : -12
    }

    return (outputNote - 69) * 100 // back to cents relative to A4
  }

  private fireTriggerPulse(): void {
    if (!this.trigSignal) return

    // Clear any pending pulse-off
    if (this.trigPulseTimer !== null) {
      window.clearTimeout(this.trigPulseTimer)
    }

    this.trigSignal.value = 1
    this.trigPulseTimer = window.setTimeout(() => {
      if (this.trigSignal) {
        this.trigSignal.value = 0
      }
      this.trigPulseTimer = null
    }, 10)
  }

  private midiToName(midi: number): string {
    const note = NOTE_NAMES[((midi % 12) + 12) % 12]
    const octave = Math.floor(midi / 12) - 1
    return `${note}${octave}`
  }

  onPortConnected(portId: string): void {
    if (portId === 'trig-in') {
      this.triggerConnected = true
    }
  }

  onPortDisconnected(portId: string): void {
    if (portId === 'trig-in') {
      this.triggerConnected = false
    }
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'cv-out') return this.outputSignal!
    if (portId === 'trig-out') return this.trigSignal!
    throw new Error(`QuantizerEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'cv-in') return this.cvInputGain!
    if (portId === 'trig-in') return this.triggerPoller!.getInputNode()
    throw new Error(`QuantizerEngine: unknown input port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    if (parameterId === 'root') {
      const idx = ROOT_NAMES.indexOf(String(value))
      if (idx >= 0) {
        this.root = idx
      }
    } else if (parameterId === 'scale') {
      this.scaleName = String(value)
    }
  }

  handleAction(action: string, payload?: unknown): void {
    if (action === 'setOff') {
      this.isOff = payload as boolean
      if (this.isOff) {
        if (this.outputSignal) this.outputSignal.value = 0
        if (this.trigSignal) this.trigSignal.value = 0
      }
    }
    if (action === 'contextStarted') {
      // No oscillators to start — no-op
    }
  }

  getVisualizationData(): VisualizationData {
    const inputMidi = Math.round(69 + this.inputValue / 100)
    const outputMidi = Math.round(69 + this.lastQuantizedCents / 100)
    const inputNoteInOctave = ((inputMidi % 12) + 12) % 12
    const outputNoteInOctave = ((outputMidi % 12) + 12) % 12
    const scale = SCALES[this.scaleName] ?? SCALES.chromatic

    return {
      customData: {
        inputNoteName: this.midiToName(inputMidi),
        outputNoteName: this.midiToName(outputMidi),
        inputNoteInOctave,
        outputNoteInOctave,
        root: this.root,
        scaleNotes: scale.map((degree) => (degree + this.root) % 12),
        active: !this.isOff && this.inputValue !== 0,
      },
    }
  }

  dispose(): void {
    if (this.inputPollInterval !== null) {
      window.clearInterval(this.inputPollInterval)
      this.inputPollInterval = null
    }
    if (this.trigPulseTimer !== null) {
      window.clearTimeout(this.trigPulseTimer)
      this.trigPulseTimer = null
    }
    this.triggerPoller?.dispose()
    this.outputSignal?.dispose()
    this.trigSignal?.dispose()
    this.cvInputGain?.dispose()
    this.cvAnalyser?.dispose()
    this.triggerPoller = null
    this.outputSignal = null
    this.trigSignal = null
    this.cvInputGain = null
    this.cvAnalyser = null
  }
}
