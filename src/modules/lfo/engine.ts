import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'
import { GatePoller } from '@/modules/_shared/GatePoller'

export class LfoEngine implements ModuleAudioEngine {
  private lfo: Tone.LFO | null = null
  private outputGain: Tone.Gain | null = null
  private waveformAnalyser: Tone.Analyser | null = null
  private syncPoller: GatePoller | null = null
  private isOff = false
  private isBypassed = false

  initialize(_context: Tone.BaseContext): void {
    this.lfo = new Tone.LFO({
      frequency: 2,
      type: 'sine',
      min: -1,
      max: 1,
      amplitude: 0.5,
    })

    this.outputGain = new Tone.Gain(1)
    this.waveformAnalyser = new Tone.Analyser('waveform', 256)

    // LFO output split: one branch to outputGain (CV out), one to waveformAnalyser (visualization)
    this.lfo.connect(this.outputGain)
    this.lfo.connect(this.waveformAnalyser)
    if (Tone.context.state === 'running') {
      this.lfo.start()
    }

    // Sync input: rising edge resets LFO phase
    this.syncPoller = new GatePoller(() => { this.lfo!.phase = 0 })
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') {
      return this.outputGain!
    }
    throw new Error(`LfoEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'sync') {
      return this.syncPoller!.getInputNode()
    }
    throw new Error(`LfoEngine: unknown input port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    if (!this.lfo) return

    switch (parameterId) {
      case 'rate':
        this.lfo.frequency.value = Number(value)
        break
      case 'shape':
        this.lfo.type = value as 'sine' | 'triangle' | 'sawtooth' | 'square'
        break
      case 'depth':
        this.lfo.amplitude.value = Number(value)
        break
    }
  }

  getVisualizationData(): VisualizationData {
    const waveform = this.waveformAnalyser?.getValue() as Float32Array ?? new Float32Array(256)
    return {
      waveform,
      customData: {
        rate: this.lfo?.frequency.value ?? 2,
      },
    }
  }

  handleAction(action: string, payload?: unknown): void {
    if (action === 'contextStarted' && this.lfo) {
      try { this.lfo.start() } catch { /* may already be started */ }
    }
    if (action === 'setOff') {
      this.isOff = payload as boolean
      if (this.outputGain) this.outputGain.gain.value = this.isOff ? 0 : 1
    }
    if (action === 'setBypass') {
      this.isBypassed = payload as boolean
      // Bypass = no modulation (output 0, center value)
      if (this.outputGain) this.outputGain.gain.value = this.isBypassed ? 0 : 1
    }
  }

  dispose(): void {
    this.syncPoller?.dispose()
    this.lfo?.stop()
    this.lfo?.dispose()
    this.outputGain?.dispose()
    this.waveformAnalyser?.dispose()

    this.syncPoller = null
    this.lfo = null
    this.outputGain = null
    this.waveformAnalyser = null
  }
}
