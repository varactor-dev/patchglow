import * as Tone from 'tone'

export interface BypassRouting {
  processGain: Tone.Gain
  bypassGain: Tone.Gain
}

/**
 * Creates standard bypass routing between an input and output gain.
 *
 * Wires the bypass path (inputGain -> bypassGain -> outputGain) and
 * connects processGain -> outputGain. The caller inserts processGain
 * into their processing chain: lastProcessNode -> bypass.processGain.
 */
export function createBypassRouting(
  inputGain: Tone.Gain,
  outputGain: Tone.Gain,
): BypassRouting {
  const processGain = new Tone.Gain(1)
  const bypassGain = new Tone.Gain(0)

  // Bypass path: inputGain -> bypassGain -> outputGain
  inputGain.connect(bypassGain)
  bypassGain.connect(outputGain)

  // Process path terminus: processGain -> outputGain
  processGain.connect(outputGain)

  return { processGain, bypassGain }
}

export function setBypassState(routing: BypassRouting, bypassed: boolean): void {
  routing.processGain.gain.value = bypassed ? 0 : 1
  routing.bypassGain.gain.value = bypassed ? 1 : 0
}

export function disposeBypassRouting(routing: BypassRouting): void {
  routing.processGain.dispose()
  routing.bypassGain.dispose()
}
