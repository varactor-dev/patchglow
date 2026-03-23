import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'
import { GatePoller } from '@/modules/_shared/GatePoller'

export class EnvelopeEngine implements ModuleAudioEngine {
  private envelope: Tone.Envelope | null = null
  private outputGain: Tone.Gain | null = null
  private negateGain: Tone.Gain | null = null
  private invertOutputGain: Tone.Gain | null = null
  private dcOffset: Tone.Signal<'number'> | null = null
  private gatePoller: GatePoller | null = null
  private gateOpen = false
  private isOff = false
  private isBypassed = false

  initialize(_context: Tone.BaseContext): void {
    this.envelope = new Tone.Envelope({ attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.5 })
    this.outputGain = new Tone.Gain(1)
    this.negateGain = new Tone.Gain(-1)
    this.invertOutputGain = new Tone.Gain(1)
    this.dcOffset = new Tone.Signal({ value: 1, units: 'number' })

    // Normal output: envelope → outputGain
    this.envelope.connect(this.outputGain)

    // Inverted output: envelope → negateGain → invertOutputGain
    // Also: dcOffset → invertOutputGain (DC offset of 1)
    // Result: 1 + (-env) = 1 - env
    this.envelope.connect(this.negateGain)
    this.negateGain.connect(this.invertOutputGain)
    this.dcOffset.connect(this.invertOutputGain as unknown as Tone.InputNode)

    // Gate polling for edge detection
    this.gatePoller = new GatePoller(
      () => { this.envelope!.triggerAttack(); this.gateOpen = true },
      () => { this.envelope!.triggerRelease(); this.gateOpen = false },
    )
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') return this.outputGain!
    if (portId === 'inv-out') return this.invertOutputGain!
    throw new Error(`EnvelopeEngine: unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'gate') return this.gatePoller!.getInputNode()
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
    this.gatePoller?.dispose()
    this.envelope?.dispose()
    this.outputGain?.dispose()
    this.negateGain?.dispose()
    this.invertOutputGain?.dispose()
    this.dcOffset?.dispose()

    this.gatePoller = null
    this.envelope = null
    this.outputGain = null
    this.negateGain = null
    this.invertOutputGain = null
    this.dcOffset = null
  }
}
