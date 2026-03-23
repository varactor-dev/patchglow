import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'
import { GatePoller } from '@/modules/_shared/GatePoller'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export class SequencerEngine implements ModuleAudioEngine {
  private cvSignal: Tone.Signal<'number'> | null = null
  private gateSignal: Tone.Signal<'number'> | null = null

  // Clock & reset input polling
  private clockPoller: GatePoller | null = null
  private resetPoller: GatePoller | null = null

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

    // Clock input — rising edge advances step when using external clock
    this.clockPoller = new GatePoller(() => {
      if (this.useExternalClock) this.advanceStep()
    })

    // Reset input — rising edge resets to step 0
    this.resetPoller = new GatePoller(() => {
      this.currentStep = 0
      this.updateCV()
    })

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
    if (portId === 'clock-in') return this.clockPoller!.getInputNode()
    if (portId === 'reset') return this.resetPoller!.getInputNode()
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
    if (this.gateOffTimer !== null) {
      window.clearTimeout(this.gateOffTimer)
      this.gateOffTimer = null
    }
    this.clockPoller?.dispose()
    this.resetPoller?.dispose()
    this.cvSignal?.dispose()
    this.gateSignal?.dispose()
    this.clockPoller = null
    this.resetPoller = null
    this.cvSignal = null
    this.gateSignal = null
  }
}
