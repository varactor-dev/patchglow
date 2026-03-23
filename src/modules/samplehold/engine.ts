import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'
import { GatePoller } from '@/modules/_shared/GatePoller'

const HISTORY_SIZE = 32

export class SampleHoldEngine implements ModuleAudioEngine {
  private outputSignal: Tone.Signal<'number'> | null = null

  // Signal input
  private signalInputGain: Tone.Gain | null = null
  private signalAnalyser: Tone.Analyser | null = null

  // Trigger input
  private triggerPoller: GatePoller | null = null

  private heldValue = 0
  private inputValue = 0
  private history: number[] = []
  private isOff = false

  // Read signal input on a shared interval with the trigger poller
  private inputPollInterval: number | null = null

  initialize(_context: Tone.BaseContext): void {
    this.outputSignal = new Tone.Signal<'number'>({ value: 0, units: 'number' })

    // Signal input
    this.signalInputGain = new Tone.Gain(1)
    this.signalAnalyser = new Tone.Analyser('waveform', 32)
    this.signalInputGain.connect(this.signalAnalyser)

    // Trigger input via GatePoller — on rising edge, sample the current input
    this.triggerPoller = new GatePoller(() => {
      this.heldValue = this.inputValue
      if (this.outputSignal) {
        this.outputSignal.value = this.heldValue
      }
      this.history.push(this.heldValue)
      if (this.history.length > HISTORY_SIZE) {
        this.history.shift()
      }
    })

    // Poll signal input at the same 5ms rate
    this.inputPollInterval = window.setInterval(() => this.readInput(), 5)
  }

  private readInput(): void {
    if (!this.signalAnalyser) return
    const data = this.signalAnalyser.getValue() as Float32Array
    this.inputValue = data[data.length - 1] as number
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') return this.outputSignal!
    throw new Error(`SampleHoldEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'signal-in') return this.signalInputGain!
    if (portId === 'trigger') return this.triggerPoller!.getInputNode()
    throw new Error(`SampleHoldEngine: unknown input port "${portId}"`)
  }

  setParameter(_parameterId: string, _value: number | string): void {
    // No parameters
  }

  handleAction(action: string, payload?: unknown): void {
    if (action === 'setOff') {
      this.isOff = payload as boolean
      if (this.isOff && this.outputSignal) {
        this.outputSignal.value = 0
      }
    }
  }

  getVisualizationData(): VisualizationData {
    // Build staircase waveform from history for cable visualization
    let waveform: Float32Array | undefined
    if (this.history.length > 0) {
      const buf = new Float32Array(128)
      const samplesPerStep = Math.floor(128 / Math.max(1, this.history.length))
      let idx = 0
      for (let i = 0; i < this.history.length; i++) {
        const val = this.history[i]
        const end = i === this.history.length - 1 ? 128 : idx + samplesPerStep
        for (; idx < end; idx++) buf[idx] = val
      }
      waveform = buf
    }
    return {
      waveform,
      customData: {
        heldValue: this.heldValue,
        inputValue: this.inputValue,
        triggerHigh: this.triggerPoller?.isHigh() ?? false,
        history: [...this.history],
        cvLevel: (this.heldValue + 1) / 2,
      },
    }
  }

  dispose(): void {
    if (this.inputPollInterval !== null) {
      window.clearInterval(this.inputPollInterval)
      this.inputPollInterval = null
    }
    this.triggerPoller?.dispose()
    this.outputSignal?.dispose()
    this.signalInputGain?.dispose()
    this.signalAnalyser?.dispose()
    this.triggerPoller = null
    this.outputSignal = null
    this.signalInputGain = null
    this.signalAnalyser = null
  }
}
