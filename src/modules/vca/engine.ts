import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

export class VcaEngine implements ModuleAudioEngine {
  private inputGain: Tone.Gain | null = null
  private cvGain: Tone.Gain | null = null
  private levelGain: Tone.Gain | null = null
  private outputGain: Tone.Gain | null = null
  // CV system: cvGain(0) + internalBias(1) = audio passes through by default.
  // When a CV cable connects, internalBias is disconnected so CV signal takes full control.
  private cvInputGain: Tone.Gain | null = null
  private internalBias: Tone.Signal<'number'> | null = null
  private bypassGain: Tone.Gain | null = null
  private isOff = false
  private isBypassed = false
  private waveformAnalyser: Tone.Analyser | null = null
  private inputAnalyser: Tone.Analyser | null = null
  private cvAnalyser: Tone.Analyser | null = null

  initialize(_context: Tone.BaseContext): void {
    this.inputGain = new Tone.Gain(1)
    this.cvGain = new Tone.Gain(0)
    this.levelGain = new Tone.Gain(1.0)
    this.outputGain = new Tone.Gain(1)

    this.waveformAnalyser = new Tone.Analyser('waveform', 256)
    this.inputAnalyser = new Tone.Analyser('waveform', 256)
    this.cvAnalyser = new Tone.Analyser('waveform', 256)

    // CV system: intrinsic gain=0, internalBias provides bias of 1 for pass-through behavior.
    // When a CV cable connects, internalBias is disconnected (via onPortConnected) so
    // the external CV signal controls cvGain.gain directly (additive onto 0).
    this.cvInputGain = new Tone.Gain(1)
    this.internalBias = new Tone.Signal<'number'>({ value: 1, units: 'number' })
    this.cvInputGain.connect(this.cvGain.gain as unknown as Tone.InputNode)
    this.internalBias.connect(this.cvGain.gain as unknown as Tone.InputNode)

    // CV analyser taps from cvInputGain (external CV signal)
    this.cvInputGain.connect(this.cvAnalyser)

    // Input analyser taps from inputGain (before VCA processing)
    this.inputGain.connect(this.inputAnalyser)

    // Bypass path: inputGain → bypassGain → outputGain
    this.bypassGain = new Tone.Gain(0)
    this.inputGain.connect(this.bypassGain)
    this.bypassGain.connect(this.outputGain)

    // Main audio chain: inputGain → cvGain → levelGain → outputGain → waveformAnalyser
    this.inputGain.connect(this.cvGain)
    this.cvGain.connect(this.levelGain)
    this.levelGain.connect(this.outputGain)
    this.outputGain.connect(this.waveformAnalyser)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'in') return this.inputGain!
    if (portId === 'cv') return this.cvInputGain!
    throw new Error(`VcaEngine: unknown input port "${portId}"`)
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') return this.outputGain!
    throw new Error(`VcaEngine: unknown output port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    if (parameterId === 'level') {
      if (this.levelGain) this.levelGain.gain.value = Number(value)
    }
  }

  handleAction(action: string, payload?: unknown): void {
    if (action === 'setOff') {
      this.isOff = payload as boolean
      if (this.outputGain) this.outputGain.gain.value = this.isOff ? 0 : 1
    }
    if (action === 'setBypass') {
      this.isBypassed = payload as boolean
      if (this.bypassGain) this.bypassGain.gain.value = this.isBypassed ? 1 : 0
      // Mute the CV-controlled processing path when bypassed
      if (this.levelGain) this.levelGain.gain.value = this.isBypassed ? 0 : 1
    }
  }

  onPortConnected(portId: string): void {
    if (portId === 'cv') {
      // Disconnect internalBias so CV signal takes full control
      try { this.internalBias?.disconnect(this.cvGain!.gain as unknown as Tone.InputNode) }
      catch { /* already disconnected */ }
    }
  }

  onPortDisconnected(portId: string): void {
    if (portId === 'cv') {
      // Reconnect internalBias so audio passes through when no CV
      try { this.internalBias?.connect(this.cvGain!.gain as unknown as Tone.InputNode) }
      catch { /* already connected */ }
    }
  }

  getVisualizationData(): VisualizationData {
    const waveform = this.waveformAnalyser?.getValue() as Float32Array ?? new Float32Array(256)
    const inputWave = this.inputAnalyser?.getValue() as Float32Array ?? new Float32Array(256)
    const cvWave = this.cvAnalyser?.getValue() as Float32Array ?? new Float32Array(256)
    return {
      waveform,
      customData: { inputWaveform: inputWave, cvWaveform: cvWave },
    }
  }

  dispose(): void {
    this.inputGain?.dispose()
    this.cvGain?.dispose()
    this.levelGain?.dispose()
    this.outputGain?.dispose()
    this.cvInputGain?.dispose()
    this.internalBias?.dispose()
    this.bypassGain?.dispose()
    this.waveformAnalyser?.dispose()
    this.inputAnalyser?.dispose()
    this.cvAnalyser?.dispose()
    this.inputGain = null
    this.cvGain = null
    this.levelGain = null
    this.outputGain = null
    this.cvInputGain = null
    this.internalBias = null
    this.bypassGain = null
    this.waveformAnalyser = null
    this.inputAnalyser = null
    this.cvAnalyser = null
  }
}
