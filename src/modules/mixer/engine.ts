import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

export class MixerEngine implements ModuleAudioEngine {
  private ch1Gain: Tone.Gain | null = null
  private ch2Gain: Tone.Gain | null = null
  private ch3Gain: Tone.Gain | null = null
  private outputGain: Tone.Gain | null = null
  private ch1Analyser: Tone.Analyser | null = null
  private ch2Analyser: Tone.Analyser | null = null
  private ch3Analyser: Tone.Analyser | null = null
  private outputAnalyser: Tone.Analyser | null = null

  initialize(_context: Tone.BaseContext): void {
    this.ch1Gain = new Tone.Gain(0.8)
    this.ch2Gain = new Tone.Gain(0.8)
    this.ch3Gain = new Tone.Gain(0.8)
    this.outputGain = new Tone.Gain(1)

    this.ch1Analyser = new Tone.Analyser('waveform', 128)
    this.ch2Analyser = new Tone.Analyser('waveform', 128)
    this.ch3Analyser = new Tone.Analyser('waveform', 128)
    this.outputAnalyser = new Tone.Analyser('waveform', 256)

    // Each channel feeds into the output gain (signals sum naturally in Web Audio)
    this.ch1Gain.connect(this.outputGain)
    this.ch2Gain.connect(this.outputGain)
    this.ch3Gain.connect(this.outputGain)

    // Per-channel analysers for level metering
    this.ch1Gain.connect(this.ch1Analyser)
    this.ch2Gain.connect(this.ch2Analyser)
    this.ch3Gain.connect(this.ch3Analyser)

    // Output analyser for mix meter
    this.outputGain.connect(this.outputAnalyser)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'in1') return this.ch1Gain!
    if (portId === 'in2') return this.ch2Gain!
    if (portId === 'in3') return this.ch3Gain!
    throw new Error(`MixerEngine: unknown input port "${portId}"`)
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') return this.outputGain!
    throw new Error(`MixerEngine: unknown output port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    switch (parameterId) {
      case 'level1': this.ch1Gain!.gain.value = Number(value); break
      case 'level2': this.ch2Gain!.gain.value = Number(value); break
      case 'level3': this.ch3Gain!.gain.value = Number(value); break
    }
  }

  getVisualizationData(): VisualizationData {
    const ch1Data = this.ch1Analyser?.getValue() as Float32Array ?? new Float32Array(128)
    const ch2Data = this.ch2Analyser?.getValue() as Float32Array ?? new Float32Array(128)
    const ch3Data = this.ch3Analyser?.getValue() as Float32Array ?? new Float32Array(128)
    const outData = this.outputAnalyser?.getValue() as Float32Array ?? new Float32Array(256)
    return {
      waveform: outData,
      customData: { ch1Data, ch2Data, ch3Data },
    }
  }

  dispose(): void {
    this.ch1Gain?.dispose()
    this.ch2Gain?.dispose()
    this.ch3Gain?.dispose()
    this.outputGain?.dispose()
    this.ch1Analyser?.dispose()
    this.ch2Analyser?.dispose()
    this.ch3Analyser?.dispose()
    this.outputAnalyser?.dispose()
    this.ch1Gain = null
    this.ch2Gain = null
    this.ch3Gain = null
    this.outputGain = null
    this.ch1Analyser = null
    this.ch2Analyser = null
    this.ch3Analyser = null
    this.outputAnalyser = null
  }
}
