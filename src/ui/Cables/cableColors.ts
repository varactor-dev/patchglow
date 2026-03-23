import type { SignalType } from '@/types/module'

export const CABLE_COLORS: Record<SignalType, string> = {
  audio: '#ff6b35',
  cv:    '#00e5ff',
  gate:  '#ff2ecb',
}

// dasharray pattern for flow animation — short dots with wide gaps = visible "particles"
// Total pattern = 24px so stroke-dashoffset: -24 animates exactly one full cycle
export const FLOW_DASHARRAY = '4 20'

// Gate cable dash patterns — idle is sparse/ghostly, active is dense/energetic
export const FLOW_DASHARRAY_IDLE = '2 28'    // total = 30
export const FLOW_DASHARRAY_ACTIVE = '4 16'  // total = 20

// Flow animation base speeds (pixels per second, for JS-driven animation)
export const FLOW_BASE_SPEED: Record<SignalType, number> = {
  audio: 60,   // was 24px / 0.4s
  cv:    13,   // was 24px / 1.8s
  gate:  80,   // active speed
}
export const GATE_IDLE_FLOW_SPEED = 10  // px/s when gate low

// Traveling pulse effect for gate transitions
export const PULSE_DURATION_MS = 150
export const PULSE_SEGMENT_RATIO = 0.15       // 15% of cable length
export const PULSE_COLOR_ATTACK = '#ff80e5'   // white-hot magenta for gate attack pulse

// Gate release: instant off (no fade)
export const GATE_FADE_MS = 0

// Gate-specific pulse duration (faster than general pulse)
export const GATE_PULSE_DURATION_MS = 120

// Audio cable color temperature — shifts hotter with signal level
export const AUDIO_COLOR_COLD = '#cc5500'   // deep amber (idle/low signal)
export const AUDIO_COLOR_MID  = '#ff6b35'   // normal amber (mid signal)
export const AUDIO_COLOR_HOT  = '#ffaa44'   // hot amber/yellow (loud signal)

// Signal flow "hot wire" colors per signal type (top layer particles)
export const FLOW_HOT_COLOR: Record<SignalType, string> = {
  audio: '#ffb080',  // white-hot orange
  cv:    '#80f0ff',  // bright white-cyan
  gate:  '#ff80e5',  // white-hot magenta
}
