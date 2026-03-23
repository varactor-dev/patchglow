import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'
import { normalizeFFT } from '@/modules/_shared/drawUtils'

export class OscillatorEngine implements ModuleAudioEngine {
  private osc: Tone.Oscillator | null = null
  private waveformAnalyser: Tone.Analyser | null = null
  private fftAnalyser: Tone.Analyser | null = null
  private gainNode: Tone.Gain | null = null
  private voctGain: Tone.Gain | null = null
  private fmGain: Tone.Gain | null = null
  private isOff = false

  initialize(_context: Tone.BaseContext): void {
    this.osc = new Tone.Oscillator({
      frequency: 440,
      type: 'sawtooth',
    })

    this.gainNode = new Tone.Gain(0.8)
    this.waveformAnalyser = new Tone.Analyser('waveform', 1024)
    this.fftAnalyser = new Tone.Analyser('fft', 256)

    // V/Oct intermediary: external signals → voctGain → osc.detune
    // Using a Gain node prevents Tone.js connectSignal() from zeroing/overriding osc.detune directly
    this.voctGain = new Tone.Gain(1)
    this.voctGain.connect(this.osc.detune)

    // FM intermediary: same pattern for frequency — prevents connectSignal() from zeroing osc.frequency
    // Gain of 200 means a ±1 CV signal produces ±200 Hz frequency deviation — clearly audible FM
    this.fmGain = new Tone.Gain(200)
    this.fmGain.connect(this.osc.frequency)

    // Chain: osc → gainNode → analysers
    // Oscillators always run continuously — no gate. Use a VCA + Envelope to shape volume.
    this.osc.connect(this.gainNode)
    this.gainNode.connect(this.waveformAnalyser)
    this.gainNode.connect(this.fftAnalyser)

    // Only start if context is already running (module added after audio started)
    // Otherwise, contextStarted action will start it (iOS requires this)
    if (Tone.context.state === 'running') {
      this.osc.start()
    }
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') {
      return this.gainNode!
    }
    throw new Error(`OscillatorEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode | Tone.Param<'frequency'> | Tone.Param<'cents'> | Tone.Param<'normalRange'> {
    if (portId === 'voct') {
      // V/Oct input routes to voctGain, which feeds osc.detune internally
      // Using intermediary prevents connectSignal() from overriding osc.detune
      return this.voctGain!
    }
    if (portId === 'fm') {
      // FM input routes to fmGain, which feeds osc.frequency internally
      return this.fmGain!
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

    return { waveform, spectrum: normalizeFFT(fft) }
  }

  handleAction(action: string, payload?: unknown): void {
    if (action === 'contextStarted' && this.osc) {
      try { this.osc.start() } catch { /* may already be started */ }
    }
    if (action === 'setOff') {
      this.isOff = payload as boolean
      if (this.gainNode) this.gainNode.gain.value = this.isOff ? 0 : 0.8
    }
  }

  dispose(): void {
    this.osc?.stop()
    this.osc?.dispose()
    this.gainNode?.dispose()
    this.waveformAnalyser?.dispose()
    this.fftAnalyser?.dispose()
    this.voctGain?.dispose()
    this.fmGain?.dispose()
    this.osc = null
    this.gainNode = null
    this.waveformAnalyser = null
    this.fftAnalyser = null
    this.voctGain = null
    this.fmGain = null
  }
}
