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
    audioStarted: false,
    zoom: 1.0,
    soloModuleId: null,

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

      // Determine signal type from source port definition (read-only lookup, safe outside set)
      let signalType: SignalType = 'audio'
      if (_getModuleDefinition) {
        const modules = get().modules
        const def = _getModuleDefinition(modules[source.moduleId]?.type ?? '')
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

      // Atomic: duplicate check + insert happen inside the same set() callback
      let added = false
      set((state) => {
        const alreadyConnected = state.connections.some(
          (c) => c.sourceModuleId === source.moduleId && c.sourcePortId === source.portId &&
                 c.destModuleId === dest.moduleId && c.destPortId === dest.portId,
        )
        if (alreadyConnected) return state // no-op, reference identity preserved
        added = true
        return { connections: [...state.connections, connection] }
      })

      return added ? id : null
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
      return JSON.stringify({ version: 1, modules, connections }, null, 2)
    },

    setAudioStarted() {
      set({ audioStarted: true })
    },

    setZoom(zoom: number) {
      set({ zoom: Math.max(0.4, Math.min(1.5, zoom)) })
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
