import type { SignalType } from './module'

// ─── Rack Module (placed instance) ───────────────────────────────────────────

export interface RackModule {
  instanceId: string
  type: string
  position: { row: number; col: number }
  parameters: Record<string, number | string>
}

// ─── Connection ───────────────────────────────────────────────────────────────

export interface Connection {
  id: string
  sourceModuleId: string
  sourcePortId: string
  destModuleId: string
  destPortId: string
  signalType: SignalType
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
  draggingCable: DraggingCable | null

  // Module actions
  addModule: (type: string, position: { row: number; col: number }) => string
  removeModule: (instanceId: string) => void
  moveModule: (instanceId: string, position: { row: number; col: number }) => void
  setParameter: (instanceId: string, parameterId: string, value: number | string) => void

  // Connection actions
  addConnection: (
    source: { moduleId: string; portId: string },
    dest: { moduleId: string; portId: string },
  ) => string | null
  removeConnection: (connectionId: string) => void
  selectCable: (connectionId: string | null) => void

  // Cable drag actions
  startCableDrag: (moduleId: string, portId: string, signalType: SignalType) => void
  endCableDrag: () => void

  // Patch management
  exportPatch: () => string
  importPatch: (patchJson: string) => void
}
