import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'
import { GatePoller } from '@/modules/_shared/GatePoller'

export class DrumSynthEngine implements ModuleAudioEngine {
  // ─── Kick voice nodes ───────────────────────────────────────────────────────
  private kickOsc: Tone.Oscillator | null = null
  private kickNoise: Tone.Noise | null = null
  private kickEnvGain: Tone.Gain | null = null
  private kickClickGain: Tone.Gain | null = null
  private kickLevelGain: Tone.Gain | null = null
  private kickOutputGain: Tone.Gain | null = null

  // ─── Snare voice nodes ──────────────────────────────────────────────────────
  private snareOsc: Tone.Oscillator | null = null
  private snareNoise: Tone.Noise | null = null
  private snareFilter: Tone.BiquadFilter | null = null
  private snareToneGain: Tone.Gain | null = null
  private snareNoiseGain: Tone.Gain | null = null
  private snareLevelGain: Tone.Gain | null = null
  private snareOutputGain: Tone.Gain | null = null

  // ─── Hi-hat voice nodes ─────────────────────────────────────────────────────
  private hatNoise: Tone.Noise | null = null
  private hatFilter: Tone.BiquadFilter | null = null
  private hatEnvGain: Tone.Gain | null = null
  private hatLevelGain: Tone.Gain | null = null
  private hatOutputGain: Tone.Gain | null = null

  // ─── Mixer & analysis ──────────────────────────────────────────────────────
  private mixerGain: Tone.Gain | null = null
  private outputAnalyser: Tone.Analyser | null = null

  // ─── Clock & input polling ─────────────────────────────────────────────────
  private clockPoller: GatePoller | null = null
  private resetPoller: GatePoller | null = null
  private accentPoller: GatePoller | null = null

  // ─── Internal clock ────────────────────────────────────────────────────────
  private internalTimer: number | null = null
  private useExternalClock = false
  private stateChangeHandler: (() => void) | null = null

  // ─── Sequencer state ──────────────────────────────────────────────────────
  private kickPattern: boolean[] = [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false]
  private snarePattern: boolean[] = [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false]
  private hatPattern: boolean[] = [true,false,true,false, true,false,true,false, true,false,true,false, true,false,true,false]
  private currentStep = 0
  private stepCount = 16
  private bpm = 120

  // ─── Voice parameters ──────────────────────────────────────────────────────
  private kickBaseFreq = 144   // mapped from tone 0.3: 120 + 0.3 * 80
  private snareBaseFreq = 189  // mapped from tone 0.3: 150 + 0.3 * 130
  private decayMult = 1.15     // mapped from decay 0.5: 0.3 + 0.5 * 1.7

  // ─── Flash state for visualization ─────────────────────────────────────────
  private kickFlash = false
  private snareFlash = false
  private hatFlash = false
  private kickFlashTimer: number | null = null
  private snareFlashTimer: number | null = null
  private hatFlashTimer: number | null = null

  private sourcesStarted = false
  private isOff = false

  initialize(_context: Tone.BaseContext): void {
    // ─── Build kick voice ──────────────────────────────────────────────────
    this.kickOsc = new Tone.Oscillator({ frequency: 150, type: 'sine' })
    this.kickNoise = new Tone.Noise('white')
    this.kickEnvGain = new Tone.Gain(0)
    this.kickClickGain = new Tone.Gain(0)
    this.kickLevelGain = new Tone.Gain(0.8)
    this.kickOutputGain = new Tone.Gain(1)

    this.kickOsc.connect(this.kickEnvGain)
    this.kickNoise.connect(this.kickClickGain)
    this.kickEnvGain.connect(this.kickLevelGain)
    this.kickClickGain.connect(this.kickLevelGain)

    // ─── Build snare voice ─────────────────────────────────────────────────
    this.snareOsc = new Tone.Oscillator({ frequency: 200, type: 'triangle' })
    this.snareNoise = new Tone.Noise('white')
    this.snareFilter = new Tone.BiquadFilter(4000, 'bandpass')
    this.snareFilter.Q.value = 2
    this.snareToneGain = new Tone.Gain(0)
    this.snareNoiseGain = new Tone.Gain(0)
    this.snareLevelGain = new Tone.Gain(0.65)
    this.snareOutputGain = new Tone.Gain(1)

    this.snareOsc.connect(this.snareToneGain)
    this.snareNoise.connect(this.snareFilter)
    this.snareFilter.connect(this.snareNoiseGain)
    this.snareToneGain.connect(this.snareLevelGain)
    this.snareNoiseGain.connect(this.snareLevelGain)

    // ─── Build hi-hat voice ────────────────────────────────────────────────
    this.hatNoise = new Tone.Noise('white')
    this.hatFilter = new Tone.BiquadFilter(9000, 'bandpass')
    this.hatFilter.Q.value = 2
    this.hatEnvGain = new Tone.Gain(0)
    this.hatLevelGain = new Tone.Gain(0.5)
    this.hatOutputGain = new Tone.Gain(1)

    this.hatNoise.connect(this.hatFilter)
    this.hatFilter.connect(this.hatEnvGain)
    this.hatEnvGain.connect(this.hatLevelGain)

    // ─── Mixer & outputs ───────────────────────────────────────────────────
    this.mixerGain = new Tone.Gain(1)
    this.outputAnalyser = new Tone.Analyser('waveform', 256)

    // Each voice level connects to both its individual output AND the mixer
    this.kickLevelGain.connect(this.kickOutputGain)
    this.kickLevelGain.connect(this.mixerGain)

    this.snareLevelGain.connect(this.snareOutputGain)
    this.snareLevelGain.connect(this.mixerGain)

    this.hatLevelGain.connect(this.hatOutputGain)
    this.hatLevelGain.connect(this.mixerGain)

    this.mixerGain.connect(this.outputAnalyser)

    // ─── Gate pollers ──────────────────────────────────────────────────────
    this.clockPoller = new GatePoller(() => {
      if (this.useExternalClock) this.advanceStep()
    })

    this.resetPoller = new GatePoller(() => {
      this.currentStep = 0
    })

    this.accentPoller = new GatePoller(() => { /* accent only uses isHigh() state */ })

    // ─── Start sources if context is already running ───────────────────────
    if (Tone.context.state === 'running') {
      this.startSources()
    }

    // ─── Defer internal clock until audio context is running ───────────────
    this.deferClockUntilRunning()
  }

  // ─── Source lifecycle ────────────────────────────────────────────────────────

  private startSources(): void {
    if (this.sourcesStarted) return
    this.sourcesStarted = true
    try { this.kickOsc?.start() } catch { /* already started */ }
    try { this.kickNoise?.start() } catch { /* already started */ }
    try { this.snareOsc?.start() } catch { /* already started */ }
    try { this.snareNoise?.start() } catch { /* already started */ }
    try { this.hatNoise?.start() } catch { /* already started */ }
  }

  // ─── Internal clock (same pattern as SequencerEngine) ───────────────────────

  private startInternalClock(): void {
    this.stopInternalClock()
    const stepMs = (60 / this.bpm) * 1000
    this.internalTimer = window.setInterval(() => {
      if (!this.useExternalClock && !this.isOff) {
        this.advanceStep()
      }
    }, stepMs)
  }

  private stopInternalClock(): void {
    if (this.internalTimer !== null) {
      window.clearInterval(this.internalTimer)
      this.internalTimer = null
    }
  }

  private deferClockUntilRunning(): void {
    if (Tone.context.state === 'running') {
      this.startInternalClock()
      return
    }
    const onStateChange = () => {
      if (Tone.context.state === 'running') {
        Tone.context.rawContext.removeEventListener('statechange', onStateChange)
        this.stateChangeHandler = null
        this.currentStep = 0
        this.startInternalClock()
      }
    }
    this.stateChangeHandler = onStateChange
    Tone.context.rawContext.addEventListener('statechange', onStateChange)
  }

  // ─── Step sequencer ──────────────────────────────────────────────────────────

  private advanceStep(): void {
    this.currentStep = (this.currentStep + 1) % this.stepCount
    const isAccented = this.accentPoller?.isHigh() ?? false
    const accentLevel = isAccented ? 1.3 : 1.0

    if (this.kickPattern[this.currentStep]) this.triggerKick(accentLevel)
    if (this.snarePattern[this.currentStep]) this.triggerSnare(accentLevel)
    if (this.hatPattern[this.currentStep]) this.triggerHat(accentLevel)
  }

  // ─── Voice triggers ──────────────────────────────────────────────────────────

  private triggerKick(accentLevel: number): void {
    if (!this.kickOsc || !this.kickEnvGain || !this.kickClickGain) return
    const now = Tone.now()
    const dm = this.decayMult

    // Pitch sweep
    this.kickOsc.frequency.cancelScheduledValues(now)
    this.kickOsc.frequency.setValueAtTime(this.kickBaseFreq, now)
    this.kickOsc.frequency.exponentialRampToValueAtTime(50, now + 0.05 * dm)

    // Amplitude envelope
    this.kickEnvGain.gain.cancelScheduledValues(now)
    this.kickEnvGain.gain.setValueAtTime(accentLevel, now)
    this.kickEnvGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 * dm)

    // Click transient
    this.kickClickGain.gain.cancelScheduledValues(now)
    this.kickClickGain.gain.setValueAtTime(0.3, now)
    this.kickClickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.002)

    this.setFlash('kick')
  }

  private triggerSnare(accentLevel: number): void {
    if (!this.snareOsc || !this.snareToneGain || !this.snareNoiseGain) return
    const now = Tone.now()
    const dm = this.decayMult

    // Body pitch sweep
    this.snareOsc.frequency.cancelScheduledValues(now)
    this.snareOsc.frequency.setValueAtTime(this.snareBaseFreq, now)
    this.snareOsc.frequency.exponentialRampToValueAtTime(120, now + 0.03 * dm)

    // Tone envelope
    this.snareToneGain.gain.cancelScheduledValues(now)
    this.snareToneGain.gain.setValueAtTime(0.4 * accentLevel, now)
    this.snareToneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 * dm)

    // Noise envelope
    this.snareNoiseGain.gain.cancelScheduledValues(now)
    this.snareNoiseGain.gain.setValueAtTime(0.6 * accentLevel, now)
    this.snareNoiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12 * dm)

    this.setFlash('snare')
  }

  private triggerHat(accentLevel: number): void {
    if (!this.hatEnvGain) return
    const now = Tone.now()
    const dm = this.decayMult
    const decayTime = 0.04 * dm

    this.hatEnvGain.gain.cancelScheduledValues(now)
    this.hatEnvGain.gain.setValueAtTime(accentLevel, now)
    this.hatEnvGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime)

    this.setFlash('hat')
  }

  private setFlash(voice: 'kick' | 'snare' | 'hat'): void {
    if (voice === 'kick') {
      this.kickFlash = true
      if (this.kickFlashTimer !== null) window.clearTimeout(this.kickFlashTimer)
      this.kickFlashTimer = window.setTimeout(() => {
        this.kickFlash = false
        this.kickFlashTimer = null
      }, 50)
    } else if (voice === 'snare') {
      this.snareFlash = true
      if (this.snareFlashTimer !== null) window.clearTimeout(this.snareFlashTimer)
      this.snareFlashTimer = window.setTimeout(() => {
        this.snareFlash = false
        this.snareFlashTimer = null
      }, 50)
    } else {
      this.hatFlash = true
      if (this.hatFlashTimer !== null) window.clearTimeout(this.hatFlashTimer)
      this.hatFlashTimer = window.setTimeout(() => {
        this.hatFlash = false
        this.hatFlashTimer = null
      }, 50)
    }
  }

  // ─── Port connections ────────────────────────────────────────────────────────

  onPortConnected(portId: string): void {
    if (portId === 'clock-in') {
      this.useExternalClock = true
      this.stopInternalClock()
    }
  }

  onPortDisconnected(portId: string): void {
    if (portId === 'clock-in') {
      this.useExternalClock = false
      this.startInternalClock()
    }
  }

  // ─── Output / input nodes ──────────────────────────────────────────────────

  getOutputNode(portId: string): Tone.ToneAudioNode {
    switch (portId) {
      case 'out': return this.mixerGain!
      case 'kick-out': return this.kickOutputGain!
      case 'snare-out': return this.snareOutputGain!
      case 'hat-out': return this.hatOutputGain!
      default: throw new Error(`DrumSynthEngine: unknown output port "${portId}"`)
    }
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    switch (portId) {
      case 'clock-in': return this.clockPoller!.getInputNode()
      case 'reset': return this.resetPoller!.getInputNode()
      case 'accent': return this.accentPoller!.getInputNode()
      default: throw new Error(`DrumSynthEngine: unknown input port "${portId}"`)
    }
  }

  // ─── Parameters ──────────────────────────────────────────────────────────────

  setParameter(parameterId: string, value: number | string): void {
    switch (parameterId) {
      case 'bpm':
        this.bpm = Number(value)
        if (!this.useExternalClock) this.startInternalClock()
        break
      case 'kick':
        if (this.kickLevelGain) this.kickLevelGain.gain.value = Number(value)
        break
      case 'snare':
        if (this.snareLevelGain) this.snareLevelGain.gain.value = Number(value)
        break
      case 'hat':
        if (this.hatLevelGain) this.hatLevelGain.gain.value = Number(value)
        break
      case 'tone': {
        const t = Number(value)
        this.kickBaseFreq = 120 + t * 80       // 120-200 Hz
        this.snareBaseFreq = 150 + t * 130     // 150-280 Hz
        if (this.hatFilter) {
          this.hatFilter.frequency.value = 6000 + t * 6000  // 6000-12000 Hz
        }
        break
      }
      case 'decay':
        this.decayMult = 0.3 + Number(value) * 1.7  // 0.3-2.0
        break
      case 'step-count':
        this.stepCount = Number(value)
        if (this.currentStep >= this.stepCount) {
          this.currentStep = 0
        }
        break
      // Hidden parameters for patch persistence — JSON boolean arrays
      case 'kickPattern':
        try {
          const arr = typeof value === 'string' ? JSON.parse(value) as unknown : value
          if (Array.isArray(arr)) {
            for (let i = 0; i < Math.min(arr.length, 16); i++) {
              this.kickPattern[i] = Boolean(arr[i])
            }
          }
        } catch { /* ignore bad data */ }
        break
      case 'snarePattern':
        try {
          const arr = typeof value === 'string' ? JSON.parse(value) as unknown : value
          if (Array.isArray(arr)) {
            for (let i = 0; i < Math.min(arr.length, 16); i++) {
              this.snarePattern[i] = Boolean(arr[i])
            }
          }
        } catch { /* ignore bad data */ }
        break
      case 'hatPattern':
        try {
          const arr = typeof value === 'string' ? JSON.parse(value) as unknown : value
          if (Array.isArray(arr)) {
            for (let i = 0; i < Math.min(arr.length, 16); i++) {
              this.hatPattern[i] = Boolean(arr[i])
            }
          }
        } catch { /* ignore bad data */ }
        break
    }
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  handleAction(action: string, payload?: unknown): void {
    if (action === 'toggleStep') {
      const { voice, step } = payload as { voice: 'kick' | 'snare' | 'hat'; step: number }
      if (step < 0 || step >= 16) return
      if (voice === 'kick') {
        this.kickPattern[step] = !this.kickPattern[step]
      } else if (voice === 'snare') {
        this.snarePattern[step] = !this.snarePattern[step]
      } else if (voice === 'hat') {
        this.hatPattern[step] = !this.hatPattern[step]
      }
      return
    }

    if (action === 'contextStarted') {
      this.startSources()
      if (!this.useExternalClock && this.internalTimer === null) {
        this.currentStep = 0
        this.startInternalClock()
      }
      return
    }

    if (action === 'setOff') {
      this.isOff = payload as boolean
      if (this.isOff) {
        // Zero all output gains
        if (this.kickOutputGain) this.kickOutputGain.gain.value = 0
        if (this.snareOutputGain) this.snareOutputGain.gain.value = 0
        if (this.hatOutputGain) this.hatOutputGain.gain.value = 0
        if (this.mixerGain) this.mixerGain.gain.value = 0
      } else {
        if (this.kickOutputGain) this.kickOutputGain.gain.value = 1
        if (this.snareOutputGain) this.snareOutputGain.gain.value = 1
        if (this.hatOutputGain) this.hatOutputGain.gain.value = 1
        if (this.mixerGain) this.mixerGain.gain.value = 1
      }
    }
  }

  // ─── Visualization data ──────────────────────────────────────────────────────

  getVisualizationData(): VisualizationData {
    return {
      waveform: this.outputAnalyser?.getValue() as Float32Array | undefined,
      customData: {
        currentStep: this.currentStep,
        stepCount: this.stepCount,
        kickPattern: [...this.kickPattern],
        snarePattern: [...this.snarePattern],
        hatPattern: [...this.hatPattern],
        kickFlash: this.kickFlash,
        snareFlash: this.snareFlash,
        hatFlash: this.hatFlash,
      },
    }
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  dispose(): void {
    // Stop internal clock
    this.stopInternalClock()

    // Remove statechange listener
    if (this.stateChangeHandler) {
      Tone.context.rawContext.removeEventListener('statechange', this.stateChangeHandler)
      this.stateChangeHandler = null
    }

    // Clear flash timers
    if (this.kickFlashTimer !== null) window.clearTimeout(this.kickFlashTimer)
    if (this.snareFlashTimer !== null) window.clearTimeout(this.snareFlashTimer)
    if (this.hatFlashTimer !== null) window.clearTimeout(this.hatFlashTimer)
    this.kickFlashTimer = null
    this.snareFlashTimer = null
    this.hatFlashTimer = null

    // Dispose gate pollers
    this.clockPoller?.dispose()
    this.resetPoller?.dispose()
    this.accentPoller?.dispose()
    this.clockPoller = null
    this.resetPoller = null
    this.accentPoller = null

    // Stop and dispose oscillators
    this.kickOsc?.stop()
    this.kickOsc?.dispose()
    this.snareOsc?.stop()
    this.snareOsc?.dispose()
    this.kickOsc = null
    this.snareOsc = null

    // Stop and dispose noise sources
    this.kickNoise?.stop()
    this.kickNoise?.dispose()
    this.snareNoise?.stop()
    this.snareNoise?.dispose()
    this.hatNoise?.stop()
    this.hatNoise?.dispose()
    this.kickNoise = null
    this.snareNoise = null
    this.hatNoise = null

    // Dispose filters
    this.snareFilter?.dispose()
    this.hatFilter?.dispose()
    this.snareFilter = null
    this.hatFilter = null

    // Dispose gain nodes
    this.kickEnvGain?.dispose()
    this.kickClickGain?.dispose()
    this.kickLevelGain?.dispose()
    this.kickOutputGain?.dispose()
    this.snareToneGain?.dispose()
    this.snareNoiseGain?.dispose()
    this.snareLevelGain?.dispose()
    this.snareOutputGain?.dispose()
    this.hatEnvGain?.dispose()
    this.hatLevelGain?.dispose()
    this.hatOutputGain?.dispose()
    this.mixerGain?.dispose()

    this.kickEnvGain = null
    this.kickClickGain = null
    this.kickLevelGain = null
    this.kickOutputGain = null
    this.snareToneGain = null
    this.snareNoiseGain = null
    this.snareLevelGain = null
    this.snareOutputGain = null
    this.hatEnvGain = null
    this.hatLevelGain = null
    this.hatOutputGain = null
    this.mixerGain = null

    // Dispose analyser
    this.outputAnalyser?.dispose()
    this.outputAnalyser = null

    this.sourcesStarted = false
  }
}
