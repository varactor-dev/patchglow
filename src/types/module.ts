import type * as Tone from 'tone'

// ─── Signal Types ───────────────────────────────────────────────────────────

export type SignalType = 'audio' | 'cv' | 'gate'

// ─── Port Definitions ────────────────────────────────────────────────────────

export interface PortDefinition {
  id: string
  label: string
  direction: 'input' | 'output'
  signalType: SignalType
  description?: string
}

// ─── Parameter Definitions ───────────────────────────────────────────────────

export interface ParameterDefinition {
  id: string
  label: string
  type: 'knob' | 'switch' | 'select'
  min?: number
  max?: number
  default: number | string
  step?: number
  unit?: string
  description?: string
  curve?: 'linear' | 'exponential' | 'logarithmic'
  options?: string[]  // for 'select' type
}

// ─── Visualization Data ──────────────────────────────────────────────────────

export interface VisualizationData {
  waveform?: Float32Array
  spectrum?: Float32Array
  envelopeShape?: { time: number; value: number }[]
  envelopePhase?: number
  customData?: Record<string, unknown>
}

// ─── Module Definition ───────────────────────────────────────────────────────

export interface ModuleDefinition {
  type: string
  name: string
  description: string
  learningSummary: string
  hp: number
  category: 'source' | 'modifier' | 'modulation' | 'utility' | 'output'
  ports: PortDefinition[]
  parameters: ParameterDefinition[]
  accentColor: string
}

// ─── Audio Engine Instance ───────────────────────────────────────────────────

export interface ModuleAudioEngine {
  initialize(context: Tone.BaseContext): void
  getOutputNode(portId: string): Tone.ToneAudioNode | Tone.Signal<'frequency'> | Tone.Signal<'normalRange'>
  getInputNode(portId: string): Tone.ToneAudioNode | Tone.Param<'frequency'> | Tone.Param<'normalRange'> | Tone.Param<'cents'> | Tone.Signal<'frequency'>
  setParameter(parameterId: string, value: number | string): void
  getVisualizationData(): VisualizationData
  dispose(): void
  // Optional: visualizations can trigger transient engine actions (e.g. note-on/off from touch)
  handleAction?(action: string, payload?: unknown): void
  // Optional: called by AudioEngineManager when a cable is connected/disconnected from a port
  onPortConnected?(portId: string): void
  onPortDisconnected?(portId: string): void
}

// ─── Full Module Registration ────────────────────────────────────────────────

export interface ModuleRegistration {
  definition: ModuleDefinition
  createEngine: () => ModuleAudioEngine
  VisualizationComponent: React.FC<{ moduleId: string; data: VisualizationData; accentColor: string; off?: boolean; bypass?: boolean }>
}
