import type { SignalType } from '@/types/module'

export const CABLE_COLORS: Record<SignalType, string> = {
  audio: '#ff6b35',
  cv:    '#00e5ff',
  gate:  '#ff2ecb',
}

// Animation duration in seconds for one full flow cycle
export const FLOW_DURATION: Record<SignalType, number> = {
  audio: 0.4,
  cv:    1.8,
  gate:  0.7,
}

// dasharray pattern for flow animation — short dots with wide gaps = visible "particles"
// Total pattern = 24px so stroke-dashoffset: -24 animates exactly one full cycle
export const FLOW_DASHARRAY = '4 20'
