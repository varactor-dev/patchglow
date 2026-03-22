import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

export class OscillatorEngine implements ModuleAudioEngine {
  private osc: Tone.Oscillator | null = null
  private waveformAnalyser: Tone.Analyser | null = null
  private fftAnalyser: Tone.Analyser | null = null
  private gainNode: Tone.Gain | null = null

  initialize(_context: Tone.BaseContext): void {
    this.osc = new Tone.Oscillator({
      frequency: 440,
      type: 'sawtooth',
    })

    this.gainNode = new Tone.Gain(0.8)
    this.waveformAnalyser = new Tone.Analyser('waveform', 1024)
    this.fftAnalyser = new Tone.Analyser('fft', 256)

    // Chain: osc → gain → analysers
    this.osc.connect(this.gainNode)
    this.gainNode.connect(this.waveformAnalyser)
    this.gainNode.connect(this.fftAnalyser)

    this.osc.start()
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') {
      return this.gainNode!
    }
    throw new Error(`OscillatorEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode | Tone.Param<'frequency'> | Tone.Param<'cents'> | Tone.Param<'normalRange'> {
    if (portId === 'voct') {
      // V/Oct input routes to detune (in cents): keyboard outputs (midiNote-69)*100 cents
      return this.osc!.detune
    }
    if (portId === 'fm') {
      // FM input routes to frequency for linear frequency modulation
      return this.osc!.frequency
    }
    throw new Error(`OscillatorEngine: unknown input port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    if (!this.osc) return

    switch (parameterId) {
      case 'frequency':
        this.osc.frequency.value = Number(value)
        break
      case 'detune':
        this.osc.detune.value = Number(value)
        break
      case 'waveform':
        this.osc.type = value as OscillatorType
        break
    }
  }

  getVisualizationData(): VisualizationData {
    if (!this.waveformAnalyser || !this.fftAnalyser) return {}

    const waveform = this.waveformAnalyser.getValue() as Float32Array
    const fft = this.fftAnalyser.getValue() as Float32Array

    // Convert fft from dB (-Infinity..0) to 0..255 for drawSpectrum
    const spectrum = new Float32Array(fft.length)
    for (let i = 0; i < fft.length; i++) {
      spectrum[i] = Math.max(0, ((fft[i] as number) + 120) / 120 * 255)
    }

    return { waveform, spectrum }
  }

  dispose(): void {
    this.osc?.stop()
    this.osc?.dispose()
    this.gainNode?.dispose()
    this.waveformAnalyser?.dispose()
    this.fftAnalyser?.dispose()
    this.osc = null
    this.gainNode = null
    this.waveformAnalyser = null
    this.fftAnalyser = null
  }
}
