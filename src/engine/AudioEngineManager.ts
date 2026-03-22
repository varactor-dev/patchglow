import * as Tone from 'tone'
import { getModule } from './moduleRegistry'
import { useRackStore } from '@/store/rackStore'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'
import type { RackModule, Connection } from '@/types/store'

class AudioEngineManager {
  private engines = new Map<string, ModuleAudioEngine>()
  private started = false

  // ─── Singleton ─────────────────────────────────────────────────────────────
  private static instance: AudioEngineManager | null = null
  static getInstance(): AudioEngineManager {
    if (!AudioEngineManager.instance) {
      AudioEngineManager.instance = new AudioEngineManager()
    }
    return AudioEngineManager.instance
  }

  // ─── Bootstrap ─────────────────────────────────────────────────────────────
  init(): void {
    const store = useRackStore.getState()

    // Sync initial state
    this.syncModules(store.modules)
    this.syncConnections(store.connections)

    // Subscribe to future changes
    useRackStore.subscribe(
      (state) => state.modules,
      (modules) => this.syncModules(modules),
    )

    useRackStore.subscribe(
      (state) => state.connections,
      (connections) => this.syncConnections(connections),
    )

    useRackStore.subscribe(
      (state) => state.modules,
      (modules, prev) => {
        // Detect parameter changes by comparing each module's parameters
        for (const [id, mod] of Object.entries(modules)) {
          const prevMod = prev[id]
          if (!prevMod) continue
          for (const [paramId, value] of Object.entries(mod.parameters)) {
            if (value !== prevMod.parameters[paramId]) {
              this.updateParameter(id, paramId, value)
            }
          }
        }
      },
    )
  }

  // ─── Start audio context (must be called from user gesture) ────────────────
  async start(): Promise<void> {
    if (this.started) return
    await Tone.start()
    this.started = true
  }

  // ─── Sync modules ──────────────────────────────────────────────────────────
  private syncModules(modules: Record<string, RackModule>): void {
    // Remove engines for modules that no longer exist
    for (const [instanceId, engine] of this.engines) {
      if (!modules[instanceId]) {
        engine.dispose()
        this.engines.delete(instanceId)
      }
    }

    // Create engines for new modules
    for (const [instanceId, mod] of Object.entries(modules)) {
      if (!this.engines.has(instanceId)) {
        const registration = getModule(mod.type)
        if (!registration) {
          console.warn(`AudioEngineManager: unknown module type "${mod.type}"`)
          continue
        }

        const engine = registration.createEngine()
        engine.initialize(Tone.getContext())

        // Apply current parameter values
        for (const [paramId, value] of Object.entries(mod.parameters)) {
          engine.setParameter(paramId, value)
        }

        this.engines.set(instanceId, engine)
      }
    }

    // Re-sync connections after module changes
    const { connections } = useRackStore.getState()
    this.syncConnections(connections)
  }

  // ─── Sync connections ──────────────────────────────────────────────────────
  private syncConnections(connections: Connection[]): void {
    // Disconnect everything and reconnect from scratch.
    // This is simpler than tracking diffs and safe for the number of connections in Phase 1.
    // In a production engine you'd track diffs, but this is fine for ~20 modules.
    // Re-establish connections from store
    for (const conn of connections) {
      const sourceEngine = this.engines.get(conn.sourceModuleId)
      const destEngine = this.engines.get(conn.destModuleId)

      if (!sourceEngine || !destEngine) continue

      try {
        const outputNode = sourceEngine.getOutputNode(conn.sourcePortId)
        const inputNode = destEngine.getInputNode(conn.destPortId)
        outputNode.connect(inputNode as Tone.InputNode)
      } catch (err) {
        console.warn('AudioEngineManager: failed to connect', conn, err)
      }
    }
  }

  // ─── Parameter updates ─────────────────────────────────────────────────────
  updateParameter(instanceId: string, parameterId: string, value: number | string): void {
    const engine = this.engines.get(instanceId)
    if (engine) {
      engine.setParameter(parameterId, value)
    }
  }

  // ─── Visualization data ────────────────────────────────────────────────────
  getVisualizationData(instanceId: string): VisualizationData {
    return this.engines.get(instanceId)?.getVisualizationData() ?? {}
  }

  // ─── Master volume ─────────────────────────────────────────────────────────
  setMasterVolume(db: number): void {
    Tone.getDestination().volume.value = db
  }
}

export default AudioEngineManager
