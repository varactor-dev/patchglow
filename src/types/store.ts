import type { SignalType } from './module'

// ─── Rack Module (placed instance) ───────────────────────────────────────────

export interface RackModule {
  instanceId: string
  type: string
  position: { row: number; col: number }
  parameters: Record<string, number | string>
  off?: boolean
  bypass?: boolean
}

// ─── Connection ───────────────────────────────────────────────────────────────

export interface Connection {
  id: string
  sourceModuleId: string
  sourcePortId: string
  destModuleId: string
  destPortId: string
  signalType: SignalType
  destSignalType?: SignalType
}

// ─── Dragging Cable State ────────────────────────────────────────────────────

export interface DraggingCable {
  moduleId: string
  portId: string
  signalType: SignalType
}

// ─── Rack Store Interface ────────────────────────────────────────────────────

export interface RackStore {
  // State
  modules: Record<string, RackModule>
  connections: Connection[]
  selectedCableId: string | null
  probeClickPos: { x: number; y: number } | null
  draggingCable: DraggingCable | null
  audioStarted: boolean
  zoom: number
  soloModuleId: string | null

  // Module actions
  addModule: (type: string, position: { row: number; col: number }) => string
  removeModule: (instanceId: string) => void
  moveModule: (instanceId: string, position: { row: number; col: number }) => void
  setParameter: (instanceId: string, parameterId: string, value: number | string) => void
  setModuleOff: (instanceId: string, off: boolean) => void
  setModuleBypass: (instanceId: string, bypass: boolean) => void
  setSolo: (moduleId: string | null) => void

  // Connection actions
  addConnection: (
    source: { moduleId: string; portId: string },
    dest: { moduleId: string; portId: string },
  ) => string | null
  removeConnection: (connectionId: string) => void
  selectCable: (connectionId: string | null) => void
  setProbeClickPos: (pos: { x: number; y: number } | null) => void

  // Cable drag actions
  startCableDrag: (moduleId: string, portId: string, signalType: SignalType) => void
  endCableDrag: () => void

  // Patch management
  exportPatch: () => string
  importPatch: (patchJson: string) => void

  // Audio state
  setAudioStarted: () => void

  // Zoom
  setZoom: (zoom: number) => void

  // Undo/redo
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}
