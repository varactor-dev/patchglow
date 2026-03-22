import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

export class OscillatorEngine implements ModuleAudioEngine {
  private osc: Tone.Oscillator | null = null
  private waveformAnalyser: Tone.Analyser | null = null
  private fftAnalyser: Tone.Analyser | null = null
  private gainNode: Tone.Gain | null = null
  private voctGain: Tone.Gain | null = null
  private fmGain: Tone.Gain | null = null
  // Gate system: gateGain(0) + internalGate(1) bias = drone by default.
  // When a cable connects, internalGate is disconnected so gate signal (0/1) takes full control.
  private gateGain: Tone.Gain | null = null
  private gateInputGain: Tone.Gain | null = null
  private internalGate: Tone.Signal<'number'> | null = null

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
    this.fmGain = new Tone.Gain(1)
    this.fmGain.connect(this.osc.frequency)

    // Gate system: intrinsic gain=0, internalGate provides the bias of 1 for drone behavior.
    // When a gate cable connects, internalGate is disconnected (via onPortConnected) so
    // the external signal (0 or 1) controls gateGain.gain directly (additive onto 0).
    this.gateGain = new Tone.Gain(0)
    this.gateInputGain = new Tone.Gain(1)
    this.internalGate = new Tone.Signal<'number'>({ value: 1, units: 'number' })
    this.gateInputGain.connect(this.gateGain.gain as unknown as Tone.InputNode)
    this.internalGate.connect(this.gateGain.gain as unknown as Tone.InputNode)

    // Chain: osc → gainNode → gateGain → analysers
    this.osc.connect(this.gainNode)
    this.gainNode.connect(this.gateGain)
    this.gateGain.connect(this.waveformAnalyser)
    this.gateGain.connect(this.fftAnalyser)

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
      // V/Oct input routes to voctGain, which feeds osc.detune internally
      // Using intermediary prevents connectSignal() from overriding osc.detune
      return this.voctGain!
    }
    if (portId === 'fm') {
      // FM input routes to fmGain, which feeds osc.frequency internally
      return this.fmGain!
    }
    if (portId === 'gate') {
      // Gate input routes to gateInputGain, which adds to gateGain.gain
      return this.gateInputGain!
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

  onPortConnected(portId: string): void {
    if (portId === 'gate') {
      // Disconnect internal bias so external gate signal takes full control (0 or 1)
      this.internalGate?.disconnect(this.gateGain!.gain as unknown as Tone.InputNode)
    }
  }

  onPortDisconnected(portId: string): void {
    if (portId === 'gate') {
      // Reconnect internal bias so oscillator returns to drone behavior
      this.internalGate?.connect(this.gateGain!.gain as unknown as Tone.InputNode)
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
    this.voctGain?.dispose()
    this.fmGain?.dispose()
    this.gateGain?.dispose()
    this.gateInputGain?.dispose()
    this.internalGate?.dispose()
    this.osc = null
    this.gainNode = null
    this.waveformAnalyser = null
    this.fftAnalyser = null
    this.voctGain = null
    this.fmGain = null
    this.gateGain = null
    this.gateInputGain = null
    this.internalGate = null
  }
}
