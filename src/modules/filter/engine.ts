import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

export class FilterEngine implements ModuleAudioEngine {
  private inputGain: Tone.Gain | null = null
  private filter: Tone.Filter | null = null
  private cutoffCvGain: Tone.Gain | null = null
  private waveformAnalyser: Tone.Analyser | null = null
  private fftAnalyser: Tone.Analyser | null = null
  private outputGain: Tone.Gain | null = null

  initialize(_context: Tone.BaseContext): void {
    this.inputGain = new Tone.Gain(1)
    this.filter = new Tone.Filter({ frequency: 1000, type: 'lowpass', Q: 1 })
    this.waveformAnalyser = new Tone.Analyser('waveform', 1024)
    this.fftAnalyser = new Tone.Analyser('fft', 256)
    this.outputGain = new Tone.Gain(1)

    // CV intermediary: scales ±1 CV signal to ±2000 Hz offset on filter.frequency
    this.cutoffCvGain = new Tone.Gain(2000)
    this.cutoffCvGain.connect(this.filter.frequency as unknown as Tone.InputNode)

    // Chain: inputGain → filter → analysers → outputGain
    this.inputGain.connect(this.filter)
    this.filter.connect(this.waveformAnalyser)
    this.filter.connect(this.fftAnalyser)
    this.filter.connect(this.outputGain)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'in') return this.inputGain!
    if (portId === 'cutoff-cv') return this.cutoffCvGain!
    throw new Error(`FilterEngine: unknown input port "${portId}"`)
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') return this.outputGain!
    throw new Error(`FilterEngine: unknown output port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    if (!this.filter) return

    switch (parameterId) {
      case 'frequency':
        this.filter.frequency.value = Number(value)
        break
      case 'resonance':
        this.filter.Q.value = Number(value)
        break
      case 'type':
        this.filter.type = value as BiquadFilterType
        break
    }
  }

  getVisualizationData(): VisualizationData {
    if (!this.waveformAnalyser || !this.fftAnalyser || !this.filter) return {}

    const waveform = this.waveformAnalyser.getValue() as Float32Array
    const fft = this.fftAnalyser.getValue() as Float32Array

    // Convert fft from dB to 0..255 for drawSpectrum
    const spectrum = new Float32Array(fft.length)
    for (let i = 0; i < fft.length; i++) {
      spectrum[i] = Math.max(0, ((fft[i] as number) + 120) / 120 * 255)
    }

    return {
      waveform,
      spectrum,
      customData: {
        cutoff: this.filter.frequency.value,
        resonance: this.filter.Q.value,
        filterType: this.filter.type,
      },
    }
  }

  dispose(): void {
    this.inputGain?.dispose()
    this.filter?.dispose()
    this.cutoffCvGain?.dispose()
    this.waveformAnalyser?.dispose()
    this.fftAnalyser?.dispose()
    this.outputGain?.dispose()
    this.inputGain = null
    this.filter = null
    this.cutoffCvGain = null
    this.waveformAnalyser = null
    this.fftAnalyser = null
    this.outputGain = null
  }
}
