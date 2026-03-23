import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'
import { type BypassRouting, createBypassRouting, setBypassState, disposeBypassRouting } from '@/modules/_shared/bypassRouting'

export class DelayEngine implements ModuleAudioEngine {
  private delay: Tone.FeedbackDelay | null = null
  private inputGain: Tone.Gain | null = null
  private outputGain: Tone.Gain | null = null
  private timeCvGain: Tone.Gain | null = null
  private inputAnalyser: Tone.Analyser | null = null
  private outputAnalyser: Tone.Analyser | null = null
  private bypass: BypassRouting | null = null
  private isOff = false
  private isBypassed = false
  private feedbackValue = 0.4
  private inputRmsHistory: number[] = []
  private rmsHistoryMaxLen = 120  // ~2 seconds at 60fps

  initialize(_context: Tone.BaseContext): void {
    this.delay = new Tone.FeedbackDelay({
      delayTime: 0.3,
      feedback: 0.4,
      wet: 0.5,
    })

    this.inputGain = new Tone.Gain(1)
    this.outputGain = new Tone.Gain(1)
    this.inputAnalyser = new Tone.Analyser('waveform', 512)
    this.outputAnalyser = new Tone.Analyser('waveform', 512)

    // Time CV intermediary
    this.timeCvGain = new Tone.Gain(0.5) // ±1 CV → ±0.5s modulation
    this.timeCvGain.connect(this.delay.delayTime)

    this.bypass = createBypassRouting(this.inputGain, this.outputGain)

    // Chain: inputGain → inputAnalyser, inputGain → delay → processGain → outputGain → outputAnalyser
    this.inputGain.connect(this.inputAnalyser)
    this.inputGain.connect(this.delay)
    this.delay.connect(this.bypass.processGain)
    this.outputGain.connect(this.outputAnalyser)
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') return this.outputGain!
    throw new Error(`DelayEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'in') return this.inputGain!
    if (portId === 'time-cv') return this.timeCvGain!
    throw new Error(`DelayEngine: unknown input port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    if (!this.delay) return
    const v = Number(value)
    switch (parameterId) {
      case 'time':
        this.delay.delayTime.value = v
        break
      case 'feedback':
        this.delay.feedback.value = v
        this.feedbackValue = v
        break
      case 'mix':
        this.delay.wet.value = v
        break
    }
  }

  handleAction(action: string, payload?: unknown): void {
    if (action === 'setOff') {
      this.isOff = payload as boolean
      if (this.outputGain) this.outputGain.gain.value = this.isOff ? 0 : 1
    }
    if (action === 'setBypass') {
      this.isBypassed = payload as boolean
      if (this.bypass) setBypassState(this.bypass, this.isBypassed)
    }
  }

  getVisualizationData(): VisualizationData {
    if (!this.inputAnalyser || !this.outputAnalyser) return {}

    const inputWaveform = this.inputAnalyser.getValue() as Float32Array
    const outputWaveform = this.outputAnalyser.getValue() as Float32Array

    // Compute input RMS for timeline visualization
    let sum = 0
    for (let i = 0; i < inputWaveform.length; i++) {
      sum += inputWaveform[i] * inputWaveform[i]
    }
    const inputRms = Math.sqrt(sum / inputWaveform.length)
    this.inputRmsHistory.push(inputRms)
    if (this.inputRmsHistory.length > this.rmsHistoryMaxLen) {
      this.inputRmsHistory.shift()
    }

    return {
      waveform: outputWaveform,
      customData: {
        inputWaveform: Array.from(inputWaveform),
        inputRmsHistory: this.inputRmsHistory,
        feedback: this.feedbackValue,
        delayTime: this.delay?.delayTime.value ?? 0.3,
        wet: this.delay?.wet.value ?? 0.5,
      },
    }
  }

  dispose(): void {
    this.delay?.dispose()
    this.inputGain?.dispose()
    this.outputGain?.dispose()
    this.timeCvGain?.dispose()
    if (this.bypass) disposeBypassRouting(this.bypass)
    this.inputAnalyser?.dispose()
    this.outputAnalyser?.dispose()
    this.delay = null
    this.inputGain = null
    this.outputGain = null
    this.timeCvGain = null
    this.bypass = null
    this.inputAnalyser = null
    this.outputAnalyser = null
  }
}
