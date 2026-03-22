import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

const CURVE_SIZE = 1024

function makeSoftClipCurve(drive: number): Float32Array {
  const curve = new Float32Array(CURVE_SIZE)
  const gain = 1 + drive * 20
  for (let i = 0; i < CURVE_SIZE; i++) {
    const x = (i / (CURVE_SIZE - 1)) * 2 - 1
    curve[i] = Math.tanh(x * gain)
  }
  return curve
}

function makeHardClipCurve(drive: number): Float32Array {
  const curve = new Float32Array(CURVE_SIZE)
  const gain = 1 + drive * 10
  for (let i = 0; i < CURVE_SIZE; i++) {
    const x = (i / (CURVE_SIZE - 1)) * 2 - 1
    curve[i] = Math.max(-1, Math.min(1, x * gain))
  }
  return curve
}

function makeFoldCurve(drive: number): Float32Array {
  const curve = new Float32Array(CURVE_SIZE)
  const gain = 1 + drive * 6
  for (let i = 0; i < CURVE_SIZE; i++) {
    const x = (i / (CURVE_SIZE - 1)) * 2 - 1
    curve[i] = Math.sin(x * gain * Math.PI)
  }
  return curve
}

export class DistortionEngine implements ModuleAudioEngine {
  private shaper: Tone.WaveShaper | null = null
  private inputGain: Tone.Gain | null = null
  private dryGain: Tone.Gain | null = null
  private wetGain: Tone.Gain | null = null
  private outputGain: Tone.Gain | null = null
  private inputAnalyser: Tone.Analyser | null = null
  private outputAnalyser: Tone.Analyser | null = null

  private drive = 0.3
  private mode: 'soft' | 'hard' | 'fold' = 'soft'
  private mix = 1.0

  initialize(_context: Tone.BaseContext): void {
    this.shaper = new Tone.WaveShaper(makeSoftClipCurve(this.drive))
    this.inputGain = new Tone.Gain(1)
    this.dryGain = new Tone.Gain(0)     // 1 - mix
    this.wetGain = new Tone.Gain(1)     // mix
    this.outputGain = new Tone.Gain(1)
    this.inputAnalyser = new Tone.Analyser('waveform', 512)
    this.outputAnalyser = new Tone.Analyser('waveform', 512)

    // Input → analyser + dry/wet routing
    this.inputGain.connect(this.inputAnalyser)
    this.inputGain.connect(this.shaper)
    this.inputGain.connect(this.dryGain)

    // Wet path: shaper → wetGain → output
    this.shaper.connect(this.wetGain)
    this.wetGain.connect(this.outputGain)

    // Dry path: input → dryGain → output
    this.dryGain.connect(this.outputGain)

    this.outputGain.connect(this.outputAnalyser)
    this.updateMix()
  }

  private updateCurve(): void {
    if (!this.shaper) return
    let curve: Float32Array
    switch (this.mode) {
      case 'hard':
        curve = makeHardClipCurve(this.drive)
        break
      case 'fold':
        curve = makeFoldCurve(this.drive)
        break
      default:
        curve = makeSoftClipCurve(this.drive)
    }
    this.shaper.curve = curve
  }

  private updateMix(): void {
    if (this.wetGain) this.wetGain.gain.value = this.mix
    if (this.dryGain) this.dryGain.gain.value = 1 - this.mix
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') return this.outputGain!
    throw new Error(`DistortionEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'in') return this.inputGain!
    throw new Error(`DistortionEngine: unknown input port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    switch (parameterId) {
      case 'drive':
        this.drive = Number(value)
        this.updateCurve()
        break
      case 'mode':
        this.mode = value as 'soft' | 'hard' | 'fold'
        this.updateCurve()
        break
      case 'mix':
        this.mix = Number(value)
        this.updateMix()
        break
    }
  }

  getVisualizationData(): VisualizationData {
    if (!this.inputAnalyser || !this.outputAnalyser) return {}

    const inputWaveform = this.inputAnalyser.getValue() as Float32Array
    const outputWaveform = this.outputAnalyser.getValue() as Float32Array

    return {
      waveform: outputWaveform,
      customData: {
        inputWaveform: Array.from(inputWaveform),
        drive: this.drive,
        mode: this.mode,
      },
    }
  }

  dispose(): void {
    this.shaper?.dispose()
    this.inputGain?.dispose()
    this.dryGain?.dispose()
    this.wetGain?.dispose()
    this.outputGain?.dispose()
    this.inputAnalyser?.dispose()
    this.outputAnalyser?.dispose()
    this.shaper = null
    this.inputGain = null
    this.dryGain = null
    this.wetGain = null
    this.outputGain = null
    this.inputAnalyser = null
    this.outputAnalyser = null
  }
}
