import type { SignalType } from '@/types/module'

export const SIGNAL_COLORS: Record<SignalType, string> = {
  audio: '#ff6b35',   // warm amber
  cv:    '#00e5ff',   // cyan
  gate:  '#ff2ecb',   // magenta
}

export const SIGNAL_LABELS: Record<SignalType, string> = {
  audio: 'AUDIO',
  cv:    'CV',
  gate:  'GATE',
}

// Animation speed for cable flow (seconds per full cycle)
export const SIGNAL_FLOW_SPEED: Record<SignalType, number> = {
  audio: 0.4,  // fast — represents high-frequency signal
  cv:    1.6,  // slow — represents slow modulation
  gate:  0.8,  // medium — discrete pulses
}

export function isCompatible(sourceType: SignalType, destType: SignalType): boolean {
  // In real Eurorack, all signals are voltage — allow cross-connections with a caveat.
  // For Phase 1 teaching clarity, require matching types.
  return sourceType === destType
}
