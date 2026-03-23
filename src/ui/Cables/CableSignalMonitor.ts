import AudioEngineManager from '@/engine/AudioEngineManager'
import {
  PULSE_DURATION_MS,
  GATE_PULSE_DURATION_MS,
  FLOW_BASE_SPEED,
  GATE_IDLE_FLOW_SPEED,
} from './cableColors'
import type { VisualizationData } from '@/types/module'
import type { Connection } from '@/types/store'

export interface CableSignalState {
  level: number                                // 0-1
  gateHigh: boolean                            // meaningful for gate cables
  pulseProgress: number                        // 0-1, traveling pulse position (0 = no pulse)
  pulseDirection: 'attack' | 'release' | null  // which kind of pulse
  flowPhase: number                            // drives dash animation from JS
  dominantFreqHz: number                       // from FFT, for frequency-reactive speed
  waveform: Float32Array | null                // raw waveform for cable visualization
}

const DEFAULT_STATE: CableSignalState = {
  level: 0,
  gateHigh: false,
  pulseProgress: 0,
  pulseDirection: null,
  flowPhase: 0,
  dominantFreqHz: 440,
  waveform: null,
}

/**
 * Samples signal levels for all active cables each animation frame.
 * Reuses source module analysers — no new Web Audio nodes created.
 */
export class CableSignalMonitor {
  private states = new Map<string, CableSignalState>()
  private frameCache = new Map<string, VisualizationData>()
  private prevGate = new Map<string, boolean>()
  // Gate pulse animation tracking
  private pulseStartTime = new Map<string, number>()
  private pulseDirections = new Map<string, 'attack' | 'release'>()
  // Flow phase accumulation (JS-driven animation)
  private flowPhases = new Map<string, number>()
  // Gate release fade
  private gateFadeStart = new Map<string, number>()
  // Envelope CV history buffer (128 samples circular)
  private cvHistory = new Map<string, Float32Array>()
  private cvHistoryWriteIdx = new Map<string, number>()
  // Delta time tracking
  private prevTime = performance.now()

  getSignalState(connectionId: string): CableSignalState {
    return this.states.get(connectionId) ?? DEFAULT_STATE
  }

  private getCvHistoryWaveform(connId: string, value: number): Float32Array {
    let buf = this.cvHistory.get(connId)
    if (!buf) {
      buf = new Float32Array(128)
      this.cvHistory.set(connId, buf)
      this.cvHistoryWriteIdx.set(connId, 0)
    }
    const idx = this.cvHistoryWriteIdx.get(connId)!
    buf[idx % 128] = value
    this.cvHistoryWriteIdx.set(connId, idx + 1)
    return buf
  }

  update(): void {
    const mgr = AudioEngineManager.getInstance()
    const connections = mgr.getActiveConnections()
    const now = performance.now()
    const dt = (now - this.prevTime) / 1000 // seconds
    this.prevTime = now

    this.frameCache.clear()

    // Remove stale entries
    const activeIds = new Set(connections.map((c) => c.id))
    for (const id of this.states.keys()) {
      if (!activeIds.has(id)) {
        this.states.delete(id)
        this.prevGate.delete(id)
        this.pulseStartTime.delete(id)
        this.pulseDirections.delete(id)
        this.flowPhases.delete(id)
        this.gateFadeStart.delete(id)
        this.cvHistory.delete(id)
        this.cvHistoryWriteIdx.delete(id)
      }
    }

    for (const conn of connections) {
      // Get visualization data from source module (cached per frame)
      let data = this.frameCache.get(conn.sourceModuleId)
      if (!data) {
        data = mgr.getVisualizationData(conn.sourceModuleId)
        this.frameCache.set(conn.sourceModuleId, data)
      }

      let level = this.computeLevel(data, conn)
      const rawGateHigh = conn.signalType === 'gate' ? level > 0.5 : false

      // Detect gate transitions BEFORE overwriting prevGate
      const wasHigh = this.prevGate.get(conn.id) ?? false
      if (conn.signalType === 'gate') {
        if (rawGateHigh && !wasHigh) {
          this.pulseStartTime.set(conn.id, now)
          this.pulseDirections.set(conn.id, 'attack')
          this.gateFadeStart.delete(conn.id)
        } else if (!rawGateHigh && wasHigh) {
          this.pulseStartTime.set(conn.id, now)
          this.pulseDirections.set(conn.id, 'release')
        }
      }

      // Compute pulse progress (gate cables use faster pulse)
      let pulseProgress = 0
      let pulseDirection: 'attack' | 'release' | null = null
      const startTime = this.pulseStartTime.get(conn.id)
      const dir = this.pulseDirections.get(conn.id)
      if (startTime !== undefined && dir) {
        const elapsed = now - startTime
        const duration = conn.signalType === 'gate' ? GATE_PULSE_DURATION_MS : PULSE_DURATION_MS
        pulseProgress = Math.min(1, elapsed / duration)
        pulseDirection = dir
        if (pulseProgress >= 1) {
          this.pulseStartTime.delete(conn.id)
          this.pulseDirections.delete(conn.id)
          pulseProgress = 0
          pulseDirection = null
        }
      }

      // Gate cable: binary level — instant on/off, no fade
      if (conn.signalType === 'gate') {
        level = rawGateHigh ? 1.0 : 0
      }

      // Waveform data for cable visualization
      let waveform: Float32Array | null = null
      if (conn.signalType === 'audio') {
        waveform = data.waveform ?? null
      } else if (conn.signalType === 'cv') {
        if (data.customData?.envelopeValue !== undefined) {
          waveform = this.getCvHistoryWaveform(conn.id, level)
        } else if (data.waveform && data.waveform.length > 0) {
          waveform = data.waveform
        } else if (level > 0) {
          // Build CV history for sources without analyser (sequencer, S&H)
          waveform = this.getCvHistoryWaveform(conn.id, level)
        }
      }

      // Dominant frequency for audio cables (from FFT spectrum)
      const dominantFreqHz = conn.signalType === 'audio'
        ? this.computeDominantFreq(data)
        : 0

      // Frequency-reactive speed multiplier (audio only)
      // 100Hz → 0.5x, 1kHz → 1.0x, 5kHz → 2.0x (log scale)
      let freqMult = 1.0
      if (conn.signalType === 'audio' && dominantFreqHz > 0) {
        freqMult = Math.max(0.5, Math.min(2.0,
          0.5 + 1.5 * Math.log10(dominantFreqHz / 100) / Math.log10(50)
        ))
      }

      // Flow phase accumulation (JS-driven variable-speed animation)
      const prevPhase = this.flowPhases.get(conn.id) ?? 0
      const baseSpeed = conn.signalType === 'gate' && !rawGateHigh
        ? GATE_IDLE_FLOW_SPEED
        : FLOW_BASE_SPEED[conn.signalType]
      const speedMult = (0.3 + level * 1.7) * freqMult
      const patternLen = conn.signalType === 'gate' && !rawGateHigh ? 30 : 24
      const newPhase = (prevPhase + dt * baseSpeed * speedMult) % patternLen
      this.flowPhases.set(conn.id, newPhase)

      this.prevGate.set(conn.id, rawGateHigh)
      this.states.set(conn.id, {
        level,
        gateHigh: rawGateHigh,
        pulseProgress,
        pulseDirection,
        flowPhase: newPhase,
        dominantFreqHz,
        waveform,
      })
    }
  }

  private computeLevel(data: VisualizationData, conn: Connection): number {
    if (conn.signalType === 'audio') {
      return this.computeRms(data.waveform)
    }

    if (conn.signalType === 'cv') {
      // Envelope: direct envelope value (0-1)
      if (data.customData?.envelopeValue !== undefined) {
        return Math.min(1, Math.max(0, data.customData.envelopeValue as number))
      }
      // Keyboard CV: brightness varies with pitch
      if (data.customData?.pressedNote !== undefined) {
        if (data.customData.pressedNote === null) return 0.1
        const semitone = data.customData.pressedNote as number
        return 0.5 + (semitone / 12) * 0.4
      }
      // LFO or other CV with waveform: proper unipolar normalization
      if (data.waveform && data.waveform.length > 0) {
        return this.computeInstantaneous(data.waveform)
      }
      // Generic CV level (sequencer, sample & hold, etc.)
      if (data.customData?.cvLevel !== undefined) {
        return Math.min(1, Math.max(0, data.customData.cvLevel as number))
      }
      return 0
    }

    if (conn.signalType === 'gate') {
      // Keyboard gate: direct gate value
      if (data.customData?.gateValue !== undefined) {
        return (data.customData.gateValue as number) > 0.5 ? 1 : 0
      }
      // Fallback: check waveform if available
      if (data.waveform && data.waveform.length > 0) {
        return data.waveform[data.waveform.length - 1] > 0.5 ? 1 : 0
      }
      return 0
    }

    return 0
  }

  /** dB-scaled RMS: -60dB→0.0, -30dB→0.5, 0dB→1.0 */
  private computeRms(waveform?: Float32Array): number {
    if (!waveform || waveform.length === 0) return 0
    let sum = 0
    for (let i = 0; i < waveform.length; i++) {
      sum += waveform[i] * waveform[i]
    }
    const rms = Math.sqrt(sum / waveform.length)
    if (rms < 0.001) return 0 // below -60dB = silence
    const db = 20 * Math.log10(rms)
    return Math.max(0, Math.min(1, 1 + db / 60))
  }

  /** Proper unipolar normalization — auto-adapts to LFO depth/shape, pulses at correct 1:1 rate */
  private computeInstantaneous(waveform: Float32Array): number {
    let min = waveform[0]
    let max = waveform[0]
    for (let i = 1; i < waveform.length; i++) {
      if (waveform[i] < min) min = waveform[i]
      if (waveform[i] > max) max = waveform[i]
    }
    const range = max - min
    if (range < 0.01) return 0.5 // no modulation → neutral
    const sample = waveform[waveform.length - 1]
    return (sample - min) / range // 0.0 at trough, 1.0 at peak
  }

  /** Extract dominant frequency from FFT spectrum data (normalized 0-255) */
  private computeDominantFreq(data: VisualizationData): number {
    if (!data.spectrum || data.spectrum.length === 0) return 440
    const half = Math.floor(data.spectrum.length / 2)
    let maxVal = 0
    let maxIdx = 1
    for (let i = 1; i < half; i++) { // skip DC bin 0
      if (data.spectrum[i] > maxVal) {
        maxVal = data.spectrum[i]
        maxIdx = i
      }
    }
    if (maxVal < 10) return 440 // too quiet to determine
    // bin → Hz: binIndex * sampleRate / (2 * numBins)
    const binWidth = 44100 / (2 * data.spectrum.length)
    return maxIdx * binWidth
  }
}
