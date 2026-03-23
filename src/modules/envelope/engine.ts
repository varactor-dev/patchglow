import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

export class EnvelopeEngine implements ModuleAudioEngine {
  private envelope: Tone.Envelope | null = null
  private outputGain: Tone.Gain | null = null
  private negateGain: Tone.Gain | null = null
  private invertOutputGain: Tone.Gain | null = null
  private dcOffset: Tone.Signal<'number'> | null = null
  private gateInputGain: Tone.Gain | null = null
  private gateAnalyser: Tone.Analyser | null = null
  private gateOpen = false
  private pollInterval: number | null = null
  private isOff = false
  private isBypassed = false

  initialize(_context: Tone.BaseContext): void {
    this.envelope = new Tone.Envelope({ attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.5 })
    this.outputGain = new Tone.Gain(1)
    this.negateGain = new Tone.Gain(-1)
    this.invertOutputGain = new Tone.Gain(1)
    this.dcOffset = new Tone.Signal({ value: 1, units: 'number' })
    this.gateInputGain = new Tone.Gain(1)
    this.gateAnalyser = new Tone.Analyser('waveform', 32)

    // Normal output: envelope → outputGain
    this.envelope.connect(this.outputGain)

    // Inverted output: envelope → negateGain → invertOutputGain
    // Also: dcOffset → invertOutputGain (DC offset of 1)
    // Result: 1 + (-env) = 1 - env
    this.envelope.connect(this.negateGain)
    this.negateGain.connect(this.invertOutputGain)
    this.dcOffset.connect(this.invertOutputGain as unknown as Tone.InputNode)

    // Gate: inputGain → analyser (for polling)
    this.gateInputGain.connect(this.gateAnalyser)

    // Poll gate every 5ms for edge detection
    this.pollInterval = window.setInterval(() => {
      const data = this.gateAnalyser!.getValue() as Float32Array
      // Use the most-recent sample (last element) for lower latency detection
      const gateValue = data[data.length - 1] as number
      const gateHigh = gateValue > 0.5
      if (gateHigh && !this.gateOpen) {
        this.envelope!.triggerAttack()
        this.gateOpen = true
      } else if (!gateHigh && this.gateOpen) {
        this.envelope!.triggerRelease()
        this.gateOpen = false
      }
    }, 5)
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') return this.outputGain!
    if (portId === 'inv-out') return this.invertOutputGain!
    throw new Error(`EnvelopeEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'gate') return this.gateInputGain!
    throw new Error(`EnvelopeEngine: unknown input port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    if (!this.envelope) return
    const v = Number(value)
    switch (parameterId) {
      case 'attack':
        this.envelope.attack = v
        break
      case 'decay':
        this.envelope.decay = v
        break
      case 'sustain':
        this.envelope.sustain = v
        break
      case 'release':
        this.envelope.release = v
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
      // Bypass = constant 1.0 output (fully open, skip gate polling)
      if (this.outputGain) this.outputGain.gain.value = this.isBypassed ? 0 : 1
    }
  }

  getVisualizationData(): VisualizationData {
    return {
      customData: {
        envelopeValue: this.envelope?.value ?? 0,
        gateOpen: this.gateOpen,
        attack: this.envelope?.attack ?? 0.01,
        decay: this.envelope?.decay ?? 0.2,
        sustain: this.envelope?.sustain ?? 0.7,
        release: this.envelope?.release ?? 0.5,
      },
    }
  }

  dispose(): void {
    if (this.pollInterval !== null) {
      window.clearInterval(this.pollInterval)
      this.pollInterval = null
    }

    this.envelope?.dispose()
    this.outputGain?.dispose()
    this.negateGain?.dispose()
    this.invertOutputGain?.dispose()
    this.dcOffset?.dispose()
    this.gateInputGain?.dispose()
    this.gateAnalyser?.dispose()

    this.envelope = null
    this.outputGain = null
    this.negateGain = null
    this.invertOutputGain = null
    this.dcOffset = null
    this.gateInputGain = null
    this.gateAnalyser = null
  }
}
