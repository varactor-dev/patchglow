import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

export class FilterEngine implements ModuleAudioEngine {
  private inputGain: Tone.Gain | null = null
  private filter: Tone.Filter | null = null
  private cutoffCvGain: Tone.Gain | null = null
  private waveformAnalyser: Tone.Analyser | null = null
  private fftAnalyser: Tone.Analyser | null = null
  private outputGain: Tone.Gain | null = null
  private cvAnalyser: Tone.Analyser | null = null
  private isOff = false
  private isBypassed = false
  private bypassGain: Tone.Gain | null = null
  private processGain: Tone.Gain | null = null

  initialize(_context: Tone.BaseContext): void {
    this.inputGain = new Tone.Gain(1)
    this.filter = new Tone.Filter({ frequency: 1000, type: 'lowpass', Q: 1 })
    this.waveformAnalyser = new Tone.Analyser('waveform', 1024)
    this.fftAnalyser = new Tone.Analyser('fft', 256)
    this.outputGain = new Tone.Gain(1)

    // CV intermediary: scales ±1 CV signal proportionally to the current cutoff frequency.
    // Gain is set to freq × 1.5 so modulation depth tracks the cutoff position musically.
    this.cutoffCvGain = new Tone.Gain(1000 * 1.5)
    this.cutoffCvGain.connect(this.filter.frequency as unknown as Tone.InputNode)

    // CV analyser to track modulated cutoff for visualization
    this.cvAnalyser = new Tone.Analyser('waveform', 32)
    this.cutoffCvGain.connect(this.cvAnalyser)

    this.processGain = new Tone.Gain(1)
    this.bypassGain = new Tone.Gain(0)

    // Chain: inputGain → filter → analysers → processGain → outputGain
    this.inputGain.connect(this.filter)
    this.filter.connect(this.waveformAnalyser)
    this.filter.connect(this.fftAnalyser)
    this.filter.connect(this.processGain)
    this.processGain.connect(this.outputGain)

    // Bypass path: inputGain → bypassGain → outputGain
    this.inputGain.connect(this.bypassGain)
    this.bypassGain.connect(this.outputGain)
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
      case 'frequency': {
        const freq = Number(value)
        this.filter.frequency.value = freq
        // Keep CV modulation depth proportional to the cutoff frequency
        if (this.cutoffCvGain) this.cutoffCvGain.gain.value = freq * 1.5
        break
      }
      case 'resonance':
        this.filter.Q.value = Number(value)
        break
      case 'type':
        this.filter.type = value as BiquadFilterType
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
      if (this.processGain) this.processGain.gain.value = this.isBypassed ? 0 : 1
      if (this.bypassGain) this.bypassGain.gain.value = this.isBypassed ? 1 : 0
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

    // Compute effective cutoff including CV modulation
    const baseCutoff = Number(this.filter.frequency.value)
    let effectiveCutoff = baseCutoff
    if (this.cvAnalyser) {
      const cvData = this.cvAnalyser.getValue() as Float32Array
      const cvContribution = cvData[cvData.length - 1] ?? 0
      effectiveCutoff = Math.max(20, Math.min(20000, baseCutoff + cvContribution))
    }

    return {
      waveform,
      spectrum,
      customData: {
        cutoff: effectiveCutoff,
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
    this.processGain?.dispose()
    this.bypassGain?.dispose()
    this.cvAnalyser?.dispose()
    this.inputGain = null
    this.filter = null
    this.cutoffCvGain = null
    this.waveformAnalyser = null
    this.fftAnalyser = null
    this.outputGain = null
    this.processGain = null
    this.bypassGain = null
    this.cvAnalyser = null
  }
}
