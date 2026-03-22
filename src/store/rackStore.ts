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

    // ─── Module Actions ──────────────────────────────────────────────────────
    addModule(type, position) {
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
      }))

      return instanceId
    },

    removeModule(instanceId) {
      set((state) => {
        const { [instanceId]: _removed, ...remainingModules } = state.modules
        const remainingConnections = state.connections.filter(
          (c) => c.sourceModuleId !== instanceId && c.destModuleId !== instanceId,
        )
        return {
          modules: remainingModules,
          connections: remainingConnections,
          selectedCableId:
            state.selectedCableId &&
            remainingConnections.find((c) => c.id === state.selectedCableId) === undefined
              ? null
              : state.selectedCableId,
        }
      })
    },

    moveModule(instanceId, position) {
      set((state) => ({
        modules: {
          ...state.modules,
          [instanceId]: { ...state.modules[instanceId], position },
        },
      }))
    },

    setParameter(instanceId, parameterId, value) {
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
      }))
    },

    // ─── Connection Actions ──────────────────────────────────────────────────
    addConnection(source, dest) {
      const state = get()

      // Prevent duplicate connections to the same dest port
      const alreadyConnected = state.connections.some(
        (c) => c.destModuleId === dest.moduleId && c.destPortId === dest.portId,
      )
      if (alreadyConnected) return null

      // Prevent self-loops
      if (source.moduleId === dest.moduleId) return null

      // Determine signal type from source port definition
      let signalType: SignalType = 'audio'
      if (_getModuleDefinition) {
        const def = _getModuleDefinition(state.modules[source.moduleId]?.type ?? '')
        const port = def?.ports.find((p) => p.id === source.portId)
        if (port) signalType = port.signalType
      }

      const id = generateConnectionId(source.moduleId, source.portId, dest.moduleId, dest.portId)
      const connection: Connection = {
        id,
        sourceModuleId: source.moduleId,
        sourcePortId: source.portId,
        destModuleId: dest.moduleId,
        destPortId: dest.portId,
        signalType,
      }

      set((state) => ({
        connections: [...state.connections, connection],
      }))

      return id
    },

    removeConnection(connectionId) {
      set((state) => ({
        connections: state.connections.filter((c) => c.id !== connectionId),
        selectedCableId: state.selectedCableId === connectionId ? null : state.selectedCableId,
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
      return JSON.stringify({ modules, connections }, null, 2)
    },

    importPatch(patchJson) {
      try {
        const patch = JSON.parse(patchJson) as { modules: Record<string, RackModule>; connections: Connection[] }
        set({
          modules: patch.modules ?? {},
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
