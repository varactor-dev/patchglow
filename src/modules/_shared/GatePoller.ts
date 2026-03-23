import * as Tone from 'tone'

const POLL_INTERVAL_MS = 5
const GATE_THRESHOLD = 0.5
const ANALYSER_SIZE = 32

/**
 * Polls an audio input for gate/trigger signals using rising/falling edge detection.
 * Used by envelope, LFO, sample & hold, and sequencer modules.
 */
export class GatePoller {
  private inputGain: Tone.Gain
  private analyser: Tone.Analyser
  private interval: number | null = null
  private wasHigh = false

  constructor(
    private onRisingEdge: () => void,
    private onFallingEdge?: () => void,
  ) {
    this.inputGain = new Tone.Gain(1)
    this.analyser = new Tone.Analyser('waveform', ANALYSER_SIZE)
    this.inputGain.connect(this.analyser)

    this.interval = window.setInterval(() => this.poll(), POLL_INTERVAL_MS)
  }

  private poll(): void {
    const data = this.analyser.getValue() as Float32Array
    const value = data[data.length - 1] as number
    const high = value > GATE_THRESHOLD

    if (high && !this.wasHigh) {
      this.onRisingEdge()
    } else if (!high && this.wasHigh) {
      this.onFallingEdge?.()
    }
    this.wasHigh = high
  }

  /** The node to connect external gate/trigger signals to. */
  getInputNode(): Tone.Gain {
    return this.inputGain
  }

  /** Current gate state (true = high). */
  isHigh(): boolean {
    return this.wasHigh
  }

  dispose(): void {
    if (this.interval !== null) {
      window.clearInterval(this.interval)
      this.interval = null
    }
    this.analyser.dispose()
    this.inputGain.dispose()
  }
}
