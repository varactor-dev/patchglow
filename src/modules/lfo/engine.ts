import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

export class LfoEngine implements ModuleAudioEngine {
  private lfo: Tone.LFO | null = null
  private outputGain: Tone.Gain | null = null
  private waveformAnalyser: Tone.Analyser | null = null
  private syncInputGain: Tone.Gain | null = null
  private syncAnalyser: Tone.Analyser | null = null
  private pollInterval: number | null = null
  private syncWasHigh = false

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

    // SYNC input chain: incoming gate → syncInputGain → syncAnalyser (polled for rising edge)
    this.syncInputGain = new Tone.Gain(1)
    this.syncAnalyser = new Tone.Analyser('waveform', 32)
    this.syncInputGain.connect(this.syncAnalyser)

    // LFO output split: one branch to outputGain (CV out), one to waveformAnalyser (visualization)
    this.lfo.connect(this.outputGain)
    this.lfo.connect(this.waveformAnalyser)
    this.lfo.start()

    // Poll syncAnalyser every 5ms for rising edge detection
    this.pollInterval = window.setInterval(() => {
      const data = this.syncAnalyser!.getValue() as Float32Array
      const syncHigh = data[0] > 0.5
      if (syncHigh && !this.syncWasHigh) {
        // Rising edge: reset LFO phase to start of cycle
        this.lfo!.phase = 0
      }
      this.syncWasHigh = syncHigh
    }, 5)
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') {
      return this.outputGain!
    }
    throw new Error(`LfoEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'sync') {
      return this.syncInputGain!
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

  handleAction(action: string): void {
    if (action === 'contextStarted' && this.lfo) {
      try { this.lfo.stop() } catch { /* ignore */ }
      this.lfo.start()
    }
  }

  dispose(): void {
    if (this.pollInterval !== null) {
      window.clearInterval(this.pollInterval)
      this.pollInterval = null
    }

    this.lfo?.stop()
    this.lfo?.dispose()
    this.outputGain?.dispose()
    this.waveformAnalyser?.dispose()
    this.syncInputGain?.dispose()
    this.syncAnalyser?.dispose()

    this.lfo = null
    this.outputGain = null
    this.waveformAnalyser = null
    this.syncInputGain = null
    this.syncAnalyser = null
    this.syncWasHigh = false
  }
}
