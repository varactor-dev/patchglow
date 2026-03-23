import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

const HISTORY_SIZE = 32

export class SampleHoldEngine implements ModuleAudioEngine {
  private outputSignal: Tone.Signal<'number'> | null = null

  // Signal input
  private signalInputGain: Tone.Gain | null = null
  private signalAnalyser: Tone.Analyser | null = null

  // Trigger input
  private triggerInputGain: Tone.Gain | null = null
  private triggerAnalyser: Tone.Analyser | null = null
  private triggerHigh = false

  private pollInterval: number | null = null
  private heldValue = 0
  private inputValue = 0
  private history: number[] = []
  private isOff = false

  initialize(_context: Tone.BaseContext): void {
    this.outputSignal = new Tone.Signal<'number'>({ value: 0, units: 'number' })

    // Signal input
    this.signalInputGain = new Tone.Gain(1)
    this.signalAnalyser = new Tone.Analyser('waveform', 32)
    this.signalInputGain.connect(this.signalAnalyser)

    // Trigger input
    this.triggerInputGain = new Tone.Gain(1)
    this.triggerAnalyser = new Tone.Analyser('waveform', 32)
    this.triggerInputGain.connect(this.triggerAnalyser)

    // Poll trigger for rising edge
    this.pollInterval = window.setInterval(() => {
      this.pollTrigger()
      this.readInput()
    }, 5)
  }

  private readInput(): void {
    if (!this.signalAnalyser) return
    const data = this.signalAnalyser.getValue() as Float32Array
    this.inputValue = data[data.length - 1] as number
  }

  private pollTrigger(): void {
    if (!this.triggerAnalyser) return
    const data = this.triggerAnalyser.getValue() as Float32Array
    const value = data[data.length - 1] as number
    const high = value > 0.5

    if (high && !this.triggerHigh) {
      // Rising edge — sample the input
      this.heldValue = this.inputValue
      if (this.outputSignal) {
        this.outputSignal.value = this.heldValue
      }
      // Record in history
      this.history.push(this.heldValue)
      if (this.history.length > HISTORY_SIZE) {
        this.history.shift()
      }
    }
    this.triggerHigh = high
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') return this.outputSignal!
    throw new Error(`SampleHoldEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'signal-in') return this.signalInputGain!
    if (portId === 'trigger') return this.triggerInputGain!
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
        triggerHigh: this.triggerHigh,
        history: [...this.history],
        cvLevel: (this.heldValue + 1) / 2,
      },
    }
  }

  dispose(): void {
    if (this.pollInterval !== null) {
      window.clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    this.outputSignal?.dispose()
    this.signalInputGain?.dispose()
    this.signalAnalyser?.dispose()
    this.triggerInputGain?.dispose()
    this.triggerAnalyser?.dispose()
    this.outputSignal = null
    this.signalInputGain = null
    this.signalAnalyser = null
    this.triggerInputGain = null
    this.triggerAnalyser = null
  }
}
