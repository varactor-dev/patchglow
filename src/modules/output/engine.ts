import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

export class OutputEngine implements ModuleAudioEngine {
  private volume: Tone.Volume | null = null
  private waveformAnalyser: Tone.Analyser | null = null
  private fftAnalyser: Tone.Analyser | null = null
  private inputGain: Tone.Gain | null = null
  private isOff = false

  initialize(_context: Tone.BaseContext): void {
    this.inputGain = new Tone.Gain(1)
    this.volume = new Tone.Volume(-12)
    this.waveformAnalyser = new Tone.Analyser('waveform', 1024)
    this.fftAnalyser = new Tone.Analyser('fft', 512)

    // Chain: input → volume → analysers → destination
    this.inputGain.connect(this.volume)
    this.volume.connect(this.waveformAnalyser)
    this.volume.connect(this.fftAnalyser)
    this.volume.toDestination()
  }

  getOutputNode(_portId: string): Tone.ToneAudioNode {
    throw new Error('OutputEngine has no output ports')
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'in') {
      return this.inputGain!
    }
    throw new Error(`OutputEngine: unknown input port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    if (!this.volume) return
    if (parameterId === 'volume') {
      this.volume.volume.value = Number(value)
    }
  }

  handleAction(action: string, payload?: unknown): void {
    if (action === 'setOff') {
      this.isOff = payload as boolean
      if (this.volume) this.volume.mute = this.isOff
    }
  }

  getVisualizationData(): VisualizationData {
    if (!this.waveformAnalyser || !this.fftAnalyser) return {}

    const waveform = this.waveformAnalyser.getValue() as Float32Array

    // FFT: dB values → 0..255
    const fft = this.fftAnalyser.getValue() as Float32Array
    const spectrum = new Float32Array(fft.length)
    for (let i = 0; i < fft.length; i++) {
      spectrum[i] = Math.max(0, ((fft[i] as number) + 120) / 120 * 255)
    }

    // RMS level for meter
    let rms = 0
    for (let i = 0; i < waveform.length; i++) rms += waveform[i] * waveform[i]
    rms = Math.sqrt(rms / waveform.length)
    const dbLevel = rms > 0 ? 20 * Math.log10(rms) : -80

    return {
      waveform,
      spectrum,
      customData: { dbLevel },
    }
  }

  dispose(): void {
    this.inputGain?.dispose()
    this.volume?.dispose()
    this.waveformAnalyser?.dispose()
    this.fftAnalyser?.dispose()
    this.inputGain = null
    this.volume = null
    this.waveformAnalyser = null
    this.fftAnalyser = null
  }
}
