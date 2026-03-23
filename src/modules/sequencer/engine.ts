import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export class SequencerEngine implements ModuleAudioEngine {
  private cvSignal: Tone.Signal<'number'> | null = null
  private gateSignal: Tone.Signal<'number'> | null = null

  // Clock & reset input polling
  private clockInputGain: Tone.Gain | null = null
  private clockAnalyser: Tone.Analyser | null = null
  private resetInputGain: Tone.Gain | null = null
  private resetAnalyser: Tone.Analyser | null = null
  private clockHigh = false
  private resetHigh = false
  private pollInterval: number | null = null

  // Internal clock
  private internalTimer: number | null = null
  private useExternalClock = false
  private stateChangeHandler: (() => void) | null = null

  // Sequencer state
  private stepPitches: number[] = Array(16).fill(0) // semitones 0-12 relative to C4
  private currentStep = 0
  private stepCount = 8
  private tempo = 120
  private gateLength = 50 // percent
  private gateHigh = false
  private gateOffTimer: number | null = null
  private isOff = false

  initialize(_context: Tone.BaseContext): void {
    this.cvSignal = new Tone.Signal<'number'>({ value: 0, units: 'number' })
    this.gateSignal = new Tone.Signal<'number'>({ value: 0, units: 'number' })

    // Clock input
    this.clockInputGain = new Tone.Gain(1)
    this.clockAnalyser = new Tone.Analyser('waveform', 32)
    this.clockInputGain.connect(this.clockAnalyser)

    // Reset input
    this.resetInputGain = new Tone.Gain(1)
    this.resetAnalyser = new Tone.Analyser('waveform', 32)
    this.resetInputGain.connect(this.resetAnalyser)

    // Poll clock & reset inputs for edge detection
    this.pollInterval = window.setInterval(() => {
      this.pollReset()
      this.pollClock()
    }, 5)

    // Defer internal clock until audio context is running
    // (avoids piling up scheduled gate values while context is suspended on iOS)
    this.deferClockUntilRunning()

    // Set initial CV
    this.updateCV()
  }

  private startInternalClock(): void {
    this.stopInternalClock()
    const stepMs = (60 / this.tempo) * 1000
    this.internalTimer = window.setInterval(() => {
      if (!this.useExternalClock) {
        this.advanceStep()
      }
    }, stepMs)
  }

  private stopInternalClock(): void {
    if (this.internalTimer !== null) {
      window.clearInterval(this.internalTimer)
      this.internalTimer = null
    }
  }

  private deferClockUntilRunning(): void {
    if (Tone.context.state === 'running') {
      this.startInternalClock()
      return
    }
    const onStateChange = () => {
      if (Tone.context.state === 'running') {
        Tone.context.rawContext.removeEventListener('statechange', onStateChange)
        this.stateChangeHandler = null
        this.currentStep = 0
        this.startInternalClock()
      }
    }
    this.stateChangeHandler = onStateChange
    Tone.context.rawContext.addEventListener('statechange', onStateChange)
  }

  private pollClock(): void {
    if (!this.clockAnalyser) return
    const data = this.clockAnalyser.getValue() as Float32Array
    const value = data[data.length - 1] as number
    const high = value > 0.5
    if (high && !this.clockHigh) {
      // Rising edge — advance step (external clock)
      if (this.useExternalClock) {
        this.advanceStep()
      }
    }
    this.clockHigh = high
  }

  private pollReset(): void {
    if (!this.resetAnalyser) return
    const data = this.resetAnalyser.getValue() as Float32Array
    const value = data[data.length - 1] as number
    const high = value > 0.5
    if (high && !this.resetHigh) {
      // Rising edge — reset to step 0
      this.currentStep = 0
      this.updateCV()
    }
    this.resetHigh = high
  }

  private advanceStep(): void {
    this.currentStep = (this.currentStep + 1) % this.stepCount
    this.updateCV()
    this.triggerGate()
  }

  private updateCV(): void {
    if (!this.cvSignal) return
    const semitone = this.stepPitches[this.currentStep] ?? 0
    // C4 = MIDI 60, output cents relative to A4 (MIDI 69)
    const midiNote = 60 + semitone
    this.cvSignal.value = (midiNote - 69) * 100
  }

  private triggerGate(): void {
    if (!this.gateSignal) return

    // Clear any pending gate-off
    if (this.gateOffTimer !== null) {
      window.clearTimeout(this.gateOffTimer)
    }

    // Retrigger: pulse low briefly then high
    if (this.gateHigh) {
      const now = Tone.now()
      this.gateSignal.cancelScheduledValues(now)
      this.gateSignal.setValueAtTime(0, now)
      this.gateSignal.setValueAtTime(1, now + 0.01)
    } else {
      this.gateSignal.value = 1
    }
    this.gateHigh = true

    // Schedule gate off after gate-length percentage of step duration
    const stepMs = (60 / this.tempo) * 1000
    const gateMs = stepMs * (this.gateLength / 100)
    this.gateOffTimer = window.setTimeout(() => {
      if (this.gateSignal) {
        this.gateSignal.value = 0
        this.gateHigh = false
      }
      this.gateOffTimer = null
    }, gateMs)
  }

  onPortConnected(portId: string): void {
    if (portId === 'clock-in') {
      this.useExternalClock = true
      this.stopInternalClock()
    }
  }

  onPortDisconnected(portId: string): void {
    if (portId === 'clock-in') {
      this.useExternalClock = false
      this.startInternalClock()
    }
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'cv-out') return this.cvSignal!
    if (portId === 'gate-out') return this.gateSignal!
    throw new Error(`SequencerEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'clock-in') return this.clockInputGain!
    if (portId === 'reset') return this.resetInputGain!
    throw new Error(`SequencerEngine: unknown input port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    switch (parameterId) {
      case 'tempo':
        this.tempo = Number(value)
        if (!this.useExternalClock) this.startInternalClock()
        break
      case 'gate-length':
        this.gateLength = Number(value)
        break
      case 'step-count':
        this.stepCount = Number(value)
        if (this.currentStep >= this.stepCount) {
          this.currentStep = 0
        }
        break
      case 'steps':
        // Hidden parameter for patch persistence — JSON array of semitones
        try {
          const arr = typeof value === 'string' ? JSON.parse(value) : value
          if (Array.isArray(arr)) {
            for (let i = 0; i < Math.min(arr.length, 16); i++) {
              this.stepPitches[i] = Math.max(0, Math.min(12, Number(arr[i])))
            }
            this.updateCV()
          }
        } catch { /* ignore bad data */ }
        break
    }
  }

  handleAction(action: string, payload?: unknown): void {
    if (action === 'contextStarted') {
      if (!this.useExternalClock && this.internalTimer === null) {
        this.currentStep = 0
        this.startInternalClock()
      }
      return
    }
    if (action === 'setStep') {
      const { step, semitone } = payload as { step: number; semitone: number }
      if (step >= 0 && step < 16) {
        this.stepPitches[step] = Math.max(0, Math.min(12, semitone))
        // If editing the current step, update CV immediately
        if (step === this.currentStep) {
          this.updateCV()
        }
      }
    }
    if (action === 'setOff') {
      this.isOff = payload as boolean
      if (this.isOff) {
        if (this.cvSignal) this.cvSignal.value = 0
        if (this.gateSignal) this.gateSignal.value = 0
      }
    }
  }

  getVisualizationData(): VisualizationData {
    return {
      customData: {
        currentStep: this.currentStep,
        stepCount: this.stepCount,
        stepPitches: [...this.stepPitches],
        gateHigh: this.gateHigh,
        tempo: this.tempo,
        noteNames: this.stepPitches.map((s) => NOTE_NAMES[s % 12]),
        gateValue: this.gateHigh ? 1 : 0,
        cvLevel: (this.stepPitches[this.currentStep] ?? 0) / 12,
      },
    }
  }

  dispose(): void {
    this.stopInternalClock()
    if (this.stateChangeHandler) {
      Tone.context.rawContext.removeEventListener('statechange', this.stateChangeHandler)
      this.stateChangeHandler = null
    }
    if (this.pollInterval !== null) {
      window.clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    if (this.gateOffTimer !== null) {
      window.clearTimeout(this.gateOffTimer)
      this.gateOffTimer = null
    }
    this.cvSignal?.dispose()
    this.gateSignal?.dispose()
    this.clockInputGain?.dispose()
    this.clockAnalyser?.dispose()
    this.resetInputGain?.dispose()
    this.resetAnalyser?.dispose()
    this.cvSignal = null
    this.gateSignal = null
    this.clockInputGain = null
    this.clockAnalyser = null
    this.resetInputGain = null
    this.resetAnalyser = null
  }
}
