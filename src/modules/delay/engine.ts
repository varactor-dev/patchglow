import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

export class DelayEngine implements ModuleAudioEngine {
  private delay: Tone.FeedbackDelay | null = null
  private inputGain: Tone.Gain | null = null
  private outputGain: Tone.Gain | null = null
  private timeCvGain: Tone.Gain | null = null
  private inputAnalyser: Tone.Analyser | null = null
  private outputAnalyser: Tone.Analyser | null = null
  private feedbackValue = 0.4

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

    // Chain: inputGain → inputAnalyser, inputGain → delay → outputGain → outputAnalyser
    this.inputGain.connect(this.inputAnalyser)
    this.inputGain.connect(this.delay)
    this.delay.connect(this.outputGain)
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

  getVisualizationData(): VisualizationData {
    if (!this.inputAnalyser || !this.outputAnalyser) return {}

    const inputWaveform = this.inputAnalyser.getValue() as Float32Array
    const outputWaveform = this.outputAnalyser.getValue() as Float32Array

    return {
      waveform: outputWaveform,
      customData: {
        inputWaveform: Array.from(inputWaveform),
        feedback: this.feedbackValue,
        delayTime: this.delay?.delayTime.value ?? 0.3,
      },
    }
  }

  dispose(): void {
    this.delay?.dispose()
    this.inputGain?.dispose()
    this.outputGain?.dispose()
    this.timeCvGain?.dispose()
    this.inputAnalyser?.dispose()
    this.outputAnalyser?.dispose()
    this.delay = null
    this.inputGain = null
    this.outputGain = null
    this.timeCvGain = null
    this.inputAnalyser = null
    this.outputAnalyser = null
  }
}
