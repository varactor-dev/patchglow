import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'
import { normalizeFFT } from '@/modules/_shared/drawUtils'

export class NoiseEngine implements ModuleAudioEngine {
  private noise: Tone.Noise | null = null
  private gainNode: Tone.Gain | null = null
  private waveformAnalyser: Tone.Analyser | null = null
  private fftAnalyser: Tone.Analyser | null = null
  private isOff = false

  initialize(_context: Tone.BaseContext): void {
    this.noise = new Tone.Noise('white')
    this.gainNode = new Tone.Gain(0.8)
    this.waveformAnalyser = new Tone.Analyser('waveform', 512)
    this.fftAnalyser = new Tone.Analyser('fft', 128)

    this.noise.connect(this.gainNode)
    this.gainNode.connect(this.waveformAnalyser)
    this.gainNode.connect(this.fftAnalyser)

    if (Tone.context.state === 'running') {
      this.noise.start()
    }
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') return this.gainNode!
    throw new Error(`NoiseEngine: unknown output port "${portId}"`)
  }

  getInputNode(_portId: string): Tone.ToneAudioNode {
    throw new Error('NoiseEngine has no input ports')
  }

  setParameter(parameterId: string, value: number | string): void {
    if (!this.noise) return
    switch (parameterId) {
      case 'type':
        this.noise.type = value as 'white' | 'pink' | 'brown'
        break
      case 'level':
        this.gainNode!.gain.value = Number(value)
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
    if (action === 'contextStarted' && this.noise) {
      try { this.noise.start() } catch { /* may already be started */ }
    }
    if (action === 'setOff') {
      this.isOff = payload as boolean
      if (this.gainNode) this.gainNode.gain.value = this.isOff ? 0 : 0.8
    }
    // Noise is a source module — bypass is not exposed in UI but handled defensively
    if (action === 'setBypass') { /* no-op for source modules */ }
  }

  dispose(): void {
    this.noise?.stop()
    this.noise?.dispose()
    this.gainNode?.dispose()
    this.waveformAnalyser?.dispose()
    this.fftAnalyser?.dispose()
    this.noise = null
    this.gainNode = null
    this.waveformAnalyser = null
    this.fftAnalyser = null
  }
}
