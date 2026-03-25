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

// Signal flow "hot wire" colors per signal type (top layer particles)
export const FLOW_HOT_COLOR: Record<SignalType, string> = {
  audio: '#ffb080',  // white-hot orange
  cv:    '#80f0ff',  // bright white-cyan
  gate:  '#ff80e5',  // white-hot magenta
}

// ── Color helpers ─────────────────────────────────────────────────────────────

export function lerpColor(a: string, b: string, t: number): string {
  const p = (c: string, i: number) => parseInt(c.slice(i, i + 2), 16)
  const r = Math.round(p(a, 1) + (p(b, 1) - p(a, 1)) * t)
  const g = Math.round(p(a, 3) + (p(b, 3) - p(a, 3)) * t)
  const bl = Math.round(p(a, 5) + (p(b, 5) - p(a, 5)) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

// ── Audio cable color temperature — conservative amber palette ────────────────
// All audio cables should be RECOGNIZABLY AMBER at normal signal levels.
// The color shift is subtle warmth variation, not a full color change.
const AUDIO_IDLE   = '#99440a'  // deep amber (silence)
const AUDIO_QUIET  = '#cc5500'  // warm amber (quiet)
const AUDIO_NORMAL = '#ff6b35'  // bright amber (normal) — THE DEFAULT LOOK
const AUDIO_LOUD   = '#ff8844'  // hot amber (loud) — still clearly amber
const AUDIO_GOLD   = '#ffaa55'  // gold (very loud) — orange family
const AUDIO_CLIP   = '#ffeedd'  // white-hot flash (clipping only — should be rare)

// ── Centralized cable visual params ───────────────────────────────────────────

export interface CableVisualParams {
  bodyColor: string
  bodyOpacity: number
  bodyWidth: number
  coreColor: string
  coreOpacity: number
  coreWidth: number
  glowColor: string
  glowOpacity: number
  glowBlur: number
  flowOpacity: number
  speedMult: number
  sparkRadius: number
  sparkOpacity: number
}

/**
 * Map audio signal level (0-1, dB-scaled from CableSignalMonitor) to visual params.
 * Same function for EVERY audio cable — no per-cable overrides, no length bias.
 *
 * Signal level mapping:
 *   0.00-0.01  silence: dim ghost cable, deep amber
 *   0.01-0.30  quiet: warm amber, proportional opacity
 *   0.30-0.70  normal: bright amber — where most cables sit during normal playing
 *   0.70-0.90  loud: hot amber — still clearly amber
 *   0.90-0.99  very loud: gold — noticeably warmer but still orange family
 *   0.99+      clipping: brief white-hot flash, rare and alarming
 */
export function getAudioCableVisuals(level: number): CableVisualParams {
  // Color: conservative amber temperature
  let bodyColor: string
  if (level >= 0.99) {
    bodyColor = AUDIO_CLIP
  } else if (level >= 0.90) {
    bodyColor = lerpColor(AUDIO_GOLD, AUDIO_CLIP, (level - 0.90) / 0.09)
  } else if (level >= 0.70) {
    bodyColor = lerpColor(AUDIO_LOUD, AUDIO_GOLD, (level - 0.70) / 0.20)
  } else if (level >= 0.30) {
    bodyColor = lerpColor(AUDIO_NORMAL, AUDIO_LOUD, (level - 0.30) / 0.40)
  } else if (level >= 0.01) {
    bodyColor = lerpColor(AUDIO_QUIET, AUDIO_NORMAL, (level - 0.01) / 0.29)
  } else {
    bodyColor = AUDIO_IDLE
  }

  // Opacity: idle 0.12, ramp to 1.0 by level 0.30
  const bodyOpacity = level < 0.01 ? 0.12 : 0.12 + Math.min(level / 0.30, 1) * 0.88

  // Width: quiet 2.5/1.5, normal 4/2, loud 4.5/2.5
  const bodyWidth = level < 0.30
    ? 2.5 + (level / 0.30) * 1.5
    : 4.0 + Math.min((level - 0.30) / 0.70, 1) * 0.5
  const coreWidth = level < 0.30
    ? 1.5 + (level / 0.30) * 0.5
    : 2.0 + Math.min((level - 0.30) / 0.70, 1) * 0.5

  // Glow: subtle at normal, moderate at loud
  const glowOpacity = level < 0.05 ? 0 : Math.min(level * 0.6, 0.6)
  const glowBlur = level < 0.05 ? 0 : Math.round(4 + level * 8)

  // Flow particles: invisible when idle
  const flowOpacity = level < 0.05 ? 0 : Math.min(level * 0.8, 0.8)

  // Speed multiplier: 0.3x idle → 2.0x full
  const speedMult = 0.3 + level * 1.7

  // Endpoint sparks
  const sparkRadius = 4 + level * 3
  const sparkOpacity = level * 0.5

  return {
    bodyColor,
    bodyOpacity,
    bodyWidth,
    coreColor: bodyColor,
    coreOpacity: bodyOpacity,
    coreWidth,
    glowColor: CABLE_COLORS.audio,
    glowOpacity,
    glowBlur,
    flowOpacity,
    speedMult,
    sparkRadius,
    sparkOpacity,
  }
}

/**
 * Map CV signal level (0-1) to visual params.
 * CV cables use fixed cyan color — only brightness/width changes with level.
 */
export function getCvCableVisuals(level: number): CableVisualParams {
  const color = CABLE_COLORS.cv
  const bodyOpacity = 0.12 + level * 0.88
  const bodyWidth = 2 + level * 2
  const coreWidth = 1 + level * 1
  const glowOpacity = level < 0.05 ? 0 : level * 0.6
  const glowBlur = level < 0.05 ? 0 : Math.round(4 + level * 8)
  const flowOpacity = level < 0.05 ? 0 : level * 0.8
  const speedMult = 0.3 + level * 1.7

  return {
    bodyColor: color, bodyOpacity, bodyWidth,
    coreColor: color, coreOpacity: bodyOpacity, coreWidth,
    glowColor: color, glowOpacity, glowBlur,
    flowOpacity, speedMult,
    sparkRadius: 4 + level * 3, sparkOpacity: level * 0.5,
  }
}

/**
 * Gate cable visual params for sustained states (HIGH / LOW).
 * Pulse rendering (fuse effect) is handled separately in Cable.tsx.
 */
export function getGateCableVisuals(gateHigh: boolean): CableVisualParams {
  const color = CABLE_COLORS.gate
  if (gateHigh) {
    return {
      bodyColor: color, bodyOpacity: 1.0, bodyWidth: 4,
      coreColor: color, coreOpacity: 1.0, coreWidth: 2,
      glowColor: color, glowOpacity: 0.6, glowBlur: 8,
      flowOpacity: 0.8, speedMult: 1.0,
      sparkRadius: 4, sparkOpacity: 0.6,
    }
  }
  return {
    bodyColor: color, bodyOpacity: 0.08, bodyWidth: 2,
    coreColor: color, coreOpacity: 0.08, coreWidth: 1,
    glowColor: color, glowOpacity: 0, glowBlur: 0,
    flowOpacity: 0, speedMult: 0.3,
    sparkRadius: 0, sparkOpacity: 0,
  }
}
