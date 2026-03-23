import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { RackStore, RackModule, Connection, DraggingCable } from '@/types/store'
import type { SignalType } from '@/types/module'

// Module instance counter for unique IDs
const moduleCounters: Record<string, number> = {}

function generateInstanceId(type: string): string {
  moduleCounters[type] = (moduleCounters[type] ?? 0) + 1
  return `${type}-${moduleCounters[type]}`
}

function generateConnectionId(
  sourceModuleId: string,
  sourcePortId: string,
  destModuleId: string,
  destPortId: string,
): string {
  return `${sourceModuleId}:${sourcePortId}→${destModuleId}:${destPortId}`
}

// ─── Undo/Redo ────────────────────────────────────────────────────────────────

interface UndoSnapshot {
  modules: Record<string, RackModule>
  connections: Connection[]
}

const MAX_UNDO = 50
const undoStack: UndoSnapshot[] = []
const redoStack: UndoSnapshot[] = []
// Flag: true after a setParameter pushed an undo entry. Cleared by structural actions.
// Prevents each intermediate knob value from creating a separate undo entry.
let parameterDirty = false

function takeSnapshot(state: { modules: Record<string, RackModule>; connections: Connection[] }): UndoSnapshot {
  return { modules: { ...state.modules }, connections: [...state.connections] }
}

// Registry is imported lazily to avoid circular deps at init time
let _getModuleDefinition: ((type: string) => import('@/types/module').ModuleDefinition | undefined) | null = null

export function setRegistryLookup(
  fn: (type: string) => import('@/types/module').ModuleDefinition | undefined,
) {
  _getModuleDefinition = fn
}

export const useRackStore = create<RackStore>()(
  subscribeWithSelector((set, get) => ({
    // ─── Initial State ───────────────────────────────────────────────────────
    modules: {},
    connections: [],
    selectedCableId: null,
    draggingCable: null,
    audioStarted: false,
    zoom: 1.0,
    soloModuleId: null,
    canUndo: false,
    canRedo: false,

    // ─── Module Actions ──────────────────────────────────────────────────────
    addModule(type, position) {
      undoStack.push(takeSnapshot(get()))
      if (undoStack.length > MAX_UNDO) undoStack.shift()
      redoStack.length = 0
      parameterDirty = false

      const instanceId = generateInstanceId(type)

      // Pull default parameter values from the module definition
      const defaultParams: Record<string, number | string> = {}
      if (_getModuleDefinition) {
        const def = _getModuleDefinition(type)
        if (def) {
          for (const param of def.parameters) {
            defaultParams[param.id] = param.default
          }
        }
      }

      const module: RackModule = {
        instanceId,
        type,
        position,
        parameters: defaultParams,
      }

      set((state) => ({
        modules: { ...state.modules, [instanceId]: module },
        canUndo: true,
        canRedo: false,
      }))

      return instanceId
    },

    removeModule(instanceId) {
      undoStack.push(takeSnapshot(get()))
      if (undoStack.length > MAX_UNDO) undoStack.shift()
      redoStack.length = 0
      parameterDirty = false
      set((state) => {
        const { [instanceId]: _removed, ...remainingModules } = state.modules
        const remainingConnections = state.connections.filter(
          (c) => c.sourceModuleId !== instanceId && c.destModuleId !== instanceId,
        )
        return {
          modules: remainingModules,
          connections: remainingConnections,
          canUndo: true,
          canRedo: false,
          selectedCableId:
            state.selectedCableId &&
            remainingConnections.find((c) => c.id === state.selectedCableId) === undefined
              ? null
              : state.selectedCableId,
        }
      })
    },

    moveModule(instanceId, position) {
      undoStack.push(takeSnapshot(get()))
      if (undoStack.length > MAX_UNDO) undoStack.shift()
      redoStack.length = 0
      parameterDirty = false
      set((state) => ({
        modules: {
          ...state.modules,
          [instanceId]: { ...state.modules[instanceId], position },
        },
        canUndo: true,
        canRedo: false,
      }))
    },

    setParameter(instanceId, parameterId, value) {
      // Batch: only push undo on first parameter change since last structural action
      if (!parameterDirty) {
        undoStack.push(takeSnapshot(get()))
        if (undoStack.length > MAX_UNDO) undoStack.shift()
        redoStack.length = 0
        parameterDirty = true
      }
      set((state) => ({
        modules: {
          ...state.modules,
          [instanceId]: {
            ...state.modules[instanceId],
            parameters: {
              ...state.modules[instanceId].parameters,
              [parameterId]: value,
            },
          },
        },
        canUndo: true,
        canRedo: false,
      }))
    },

    setModuleOff(instanceId, off) {
      set((state) => ({
        modules: { ...state.modules, [instanceId]: { ...state.modules[instanceId], off } },
        soloModuleId: off && state.soloModuleId === instanceId ? null : state.soloModuleId,
      }))
    },

    setModuleBypass(instanceId, bypass) {
      set((state) => ({
        modules: { ...state.modules, [instanceId]: { ...state.modules[instanceId], bypass } },
      }))
    },

    setSolo(moduleId) {
      set({ soloModuleId: moduleId })
    },

    // ─── Connection Actions ──────────────────────────────────────────────────
    addConnection(source, dest) {
      // Prevent self-loops (can check before entering set — invariant of the call)
      if (source.moduleId === dest.moduleId) return null

      // Determine signal types from port definitions (read-only lookup, safe outside set)
      let signalType: SignalType = 'audio'
      let destSignalType: SignalType | undefined
      if (_getModuleDefinition) {
        const modules = get().modules
        const srcDef = _getModuleDefinition(modules[source.moduleId]?.type ?? '')
        const srcPort = srcDef?.ports.find((p) => p.id === source.portId)
        if (srcPort) signalType = srcPort.signalType
        const destDef = _getModuleDefinition(modules[dest.moduleId]?.type ?? '')
        const destPort = destDef?.ports.find((p) => p.id === dest.portId)
        if (destPort && destPort.signalType !== signalType) destSignalType = destPort.signalType
      }

      const id = generateConnectionId(source.moduleId, source.portId, dest.moduleId, dest.portId)
      const connection: Connection = {
        id,
        sourceModuleId: source.moduleId,
        sourcePortId: source.portId,
        destModuleId: dest.moduleId,
        destPortId: dest.portId,
        signalType,
        ...(destSignalType ? { destSignalType } : {}),
      }

      // Atomic: duplicate check + insert happen inside the same set() callback
      let added = false
      set((state) => {
        const alreadyConnected = state.connections.some(
          (c) => c.sourceModuleId === source.moduleId && c.sourcePortId === source.portId &&
                 c.destModuleId === dest.moduleId && c.destPortId === dest.portId,
        )
        if (alreadyConnected) return state // no-op, reference identity preserved
        added = true
        undoStack.push(takeSnapshot(state))
        if (undoStack.length > MAX_UNDO) undoStack.shift()
        redoStack.length = 0
        parameterDirty = false
        return { connections: [...state.connections, connection], canUndo: true, canRedo: false }
      })

      return added ? id : null
    },

    removeConnection(connectionId) {
      undoStack.push(takeSnapshot(get()))
      if (undoStack.length > MAX_UNDO) undoStack.shift()
      redoStack.length = 0
      parameterDirty = false
      set((state) => ({
        connections: state.connections.filter((c) => c.id !== connectionId),
        selectedCableId: state.selectedCableId === connectionId ? null : state.selectedCableId,
        canUndo: true,
        canRedo: false,
      }))
    },

    selectCable(connectionId) {
      set({ selectedCableId: connectionId })
    },

    // ─── Cable Drag ──────────────────────────────────────────────────────────
    startCableDrag(moduleId, portId, signalType) {
      const dragging: DraggingCable = { moduleId, portId, signalType }
      set({ draggingCable: dragging })
    },

    endCableDrag() {
      set({ draggingCable: null })
    },

    // ─── Patch Management ────────────────────────────────────────────────────
    exportPatch() {
      const { modules, connections } = get()
      return JSON.stringify({ version: 1, modules, connections }, null, 2)
    },

    setAudioStarted() {
      set({ audioStarted: true })
    },

    setZoom(zoom: number) {
      set({ zoom: Math.max(0.4, Math.min(1.5, zoom)) })
    },

    // ─── Undo/Redo ──────────────────────────────────────────────────────────
    undo() {
      const snapshot = undoStack.pop()
      if (!snapshot) return
      redoStack.push(takeSnapshot(get()))
      parameterDirty = false
      // Restore module counters from snapshot
      for (const key of Object.keys(moduleCounters)) delete moduleCounters[key]
      for (const mod of Object.values(snapshot.modules)) {
        const match = mod.instanceId.match(/^(.+)-(\d+)$/)
        if (match) {
          const type = match[1]
          const num = parseInt(match[2], 10)
          moduleCounters[type] = Math.max(moduleCounters[type] ?? 0, num)
        }
      }
      set({
        modules: snapshot.modules,
        connections: snapshot.connections,
        canUndo: undoStack.length > 0,
        canRedo: true,
      })
    },

    redo() {
      const snapshot = redoStack.pop()
      if (!snapshot) return
      undoStack.push(takeSnapshot(get()))
      parameterDirty = false
      // Restore module counters from snapshot
      for (const key of Object.keys(moduleCounters)) delete moduleCounters[key]
      for (const mod of Object.values(snapshot.modules)) {
        const match = mod.instanceId.match(/^(.+)-(\d+)$/)
        if (match) {
          const type = match[1]
          const num = parseInt(match[2], 10)
          moduleCounters[type] = Math.max(moduleCounters[type] ?? 0, num)
        }
      }
      set({
        modules: snapshot.modules,
        connections: snapshot.connections,
        canUndo: true,
        canRedo: redoStack.length > 0,
      })
    },

    importPatch(patchJson) {
      try {
        const patch = JSON.parse(patchJson) as { version?: number; modules: Record<string, RackModule>; connections: Connection[] }
        // Accept version 1 or unversioned (pre-versioning) patches
        const modules = patch.modules ?? {}
        // Reset and restore module counters so new modules get unique IDs after loading
        for (const key of Object.keys(moduleCounters)) delete moduleCounters[key]
        for (const mod of Object.values(modules)) {
          const match = mod.instanceId.match(/^(.+)-(\d+)$/)
          if (match) {
            const type = match[1]
            const num = parseInt(match[2], 10)
            moduleCounters[type] = Math.max(moduleCounters[type] ?? 0, num)
          }
        }
        set({
          modules,
          connections: patch.connections ?? [],
          selectedCableId: null,
          draggingCable: null,
        })
      } catch {
        console.error('Failed to import patch — invalid JSON')
      }
    },
  })),
)
