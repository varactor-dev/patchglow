import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

export class ReverbEngine implements ModuleAudioEngine {
  private reverb: Tone.Reverb | null = null
  private inputGain: Tone.Gain | null = null
  private outputGain: Tone.Gain | null = null
  private dampFilter: Tone.Filter | null = null
  private outputAnalyser: Tone.Analyser | null = null
  private decayValue = 2.5
  private dampingValue = 0.5

  initialize(_context: Tone.BaseContext): void {
    this.reverb = new Tone.Reverb({
      decay: 2.5,
      wet: 0.3,
    })

    this.inputGain = new Tone.Gain(1)
    this.outputGain = new Tone.Gain(1)
    this.dampFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: this.dampFrequency(0.5),
    })
    this.outputAnalyser = new Tone.Analyser('waveform', 512)

    // Chain: inputGain → reverb → dampFilter → outputGain → analyser
    this.inputGain.connect(this.reverb)
    this.reverb.connect(this.dampFilter)
    this.dampFilter.connect(this.outputGain)
    this.outputGain.connect(this.outputAnalyser)

    // Generate impulse response (async but Tone handles queueing)
    this.reverb.generate()
  }

  private dampFrequency(damping: number): number {
    // Map damping 0-1 → 20000-500 Hz (inverted — more damping = lower cutoff)
    return 500 + (1 - damping) * 19500
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') return this.outputGain!
    throw new Error(`ReverbEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'in') return this.inputGain!
    throw new Error(`ReverbEngine: unknown input port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    const v = Number(value)
    switch (parameterId) {
      case 'decay':
        this.decayValue = v
        if (this.reverb) {
          this.reverb.decay = v
          this.reverb.generate()
        }
        break
      case 'mix':
        if (this.reverb) this.reverb.wet.value = v
        break
      case 'damping':
        this.dampingValue = v
        if (this.dampFilter) {
          this.dampFilter.frequency.value = this.dampFrequency(v)
        }
        break
    }
  }

  getVisualizationData(): VisualizationData {
    if (!this.outputAnalyser) return {}

    const waveform = this.outputAnalyser.getValue() as Float32Array

    return {
      waveform,
      customData: {
        decay: this.decayValue,
        damping: this.dampingValue,
      },
    }
  }

  dispose(): void {
    this.reverb?.dispose()
    this.inputGain?.dispose()
    this.outputGain?.dispose()
    this.dampFilter?.dispose()
    this.outputAnalyser?.dispose()
    this.reverb = null
    this.inputGain = null
    this.outputGain = null
    this.dampFilter = null
    this.outputAnalyser = null
  }
}
