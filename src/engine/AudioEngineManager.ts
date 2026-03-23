import * as Tone from 'tone'
import { getModule } from './moduleRegistry'
import { useRackStore } from '@/store/rackStore'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'
import type { RackModule, Connection } from '@/types/store'

class AudioEngineManager {
  private engines = new Map<string, ModuleAudioEngine>()
  private started = false
  private activeConnections: Connection[] = []
  private soloGain: Tone.Gain | null = null
  private soloSourceNode: Tone.ToneAudioNode | null = null
  private savedMasterVolume = -12

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
          // Detect off/bypass changes
          if (mod.off !== prevMod.off) {
            this.engines.get(id)?.handleAction?.('setOff', mod.off ?? false)
          }
          if (mod.bypass !== prevMod.bypass) {
            this.engines.get(id)?.handleAction?.('setBypass', mod.bypass ?? false)
          }
        }
      },
    )

    // Subscribe to solo changes
    useRackStore.subscribe(
      (state) => state.soloModuleId,
      (soloId) => this.setSolo(soloId),
    )
  }

  // ─── Start audio context (must be called from user gesture) ────────────────
  async start(): Promise<void> {
    if (this.started) return
    // Call resume() synchronously — iOS WKWebView requires this within
    // the user gesture handler, before any await
    try { (Tone.context.rawContext as AudioContext).resume() } catch { /* ignore */ }
    try {
      await Tone.start()
    } catch { /* ignore — context may already be running */ }
    // Belt-and-suspenders: explicitly resume again if still not running
    if (Tone.context.rawContext.state !== 'running') {
      try { await Tone.context.rawContext.resume() } catch { /* ignore */ }
    }
    this.started = true
    // Start source nodes that were deferred while context was suspended (iOS fix)
    for (const engine of this.engines.values()) {
      try { engine.handleAction?.('contextStarted') } catch { /* ignore */ }
    }
  }

  // ─── Sync modules ──────────────────────────────────────────────────────────
  private syncModules(modules: Record<string, RackModule>): void {
    // Remove engines for modules that no longer exist
    for (const [instanceId, engine] of this.engines) {
      if (!modules[instanceId]) {
        try { engine.dispose() } catch (err) {
          console.warn(`AudioEngineManager: dispose failed for "${instanceId}"`, err)
        }
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

        // Apply initial off/bypass state (for engines created from imported patches)
        if (mod.off) engine.handleAction?.('setOff', true)
        if (mod.bypass) engine.handleAction?.('setBypass', true)

        this.engines.set(instanceId, engine)
      }
    }

  }

  // ─── Sync connections ──────────────────────────────────────────────────────
  private syncConnections(connections: Connection[]): void {
    const oldIds = new Set(this.activeConnections.map((c) => c.id))
    const newIds = new Set(connections.map((c) => c.id))

    // Disconnect only removed connections (avoids collateral damage to other nodes)
    for (const conn of this.activeConnections) {
      if (newIds.has(conn.id)) continue
      const sourceEngine = this.engines.get(conn.sourceModuleId)
      const destEngine = this.engines.get(conn.destModuleId)
      if (sourceEngine && destEngine) {
        // Both engines alive — sever the Web Audio connection
        try {
          const outputNode = sourceEngine.getOutputNode(conn.sourcePortId)
          const inputNode = destEngine.getInputNode(conn.destPortId)
          outputNode.disconnect(inputNode as Tone.InputNode)
        } catch { /* node may already be disconnected */ }
      }
      // Always notify surviving engines so they can restore internal state
      // (e.g. VCA reconnects internalBias when envelope module is removed)
      destEngine?.onPortDisconnected?.(conn.destPortId)
      sourceEngine?.onPortDisconnected?.(conn.sourcePortId)
    }

    // Keep stable connections, add only new ones
    const established = this.activeConnections.filter((c) => newIds.has(c.id))
    for (const conn of connections) {
      if (oldIds.has(conn.id)) continue
      const sourceEngine = this.engines.get(conn.sourceModuleId)
      const destEngine = this.engines.get(conn.destModuleId)
      if (!sourceEngine || !destEngine) continue
      try {
        const outputNode = sourceEngine.getOutputNode(conn.sourcePortId)
        const inputNode = destEngine.getInputNode(conn.destPortId)
        outputNode.connect(inputNode as Tone.InputNode)
        established.push(conn)
      } catch (err) {
        console.warn(`AudioEngineManager: failed to connect "${conn.id}"`, err)
      }
      // Notify engines of connection (e.g. oscillator gate bias disconnect)
      destEngine.onPortConnected?.(conn.destPortId)
      sourceEngine.onPortConnected?.(conn.sourcePortId)
    }

    this.activeConnections = established
  }

  // ─── Connection queries ────────────────────────────────────────────────────
  getActiveConnections(): Connection[] {
    return this.activeConnections
  }

  // ─── Parameter updates ─────────────────────────────────────────────────────
  updateParameter(instanceId: string, parameterId: string, value: number | string): void {
    const engine = this.engines.get(instanceId)
    if (engine) {
      engine.setParameter(parameterId, value)
    }
  }

  // ─── Transient engine actions (for visualization touch events, etc.) ────────
  sendAction(instanceId: string, action: string, payload?: unknown): void {
    this.engines.get(instanceId)?.handleAction?.(action, payload)
  }

  // ─── Visualization data ────────────────────────────────────────────────────
  getVisualizationData(instanceId: string): VisualizationData {
    return this.engines.get(instanceId)?.getVisualizationData() ?? {}
  }

  // ─── Solo routing ──────────────────────────────────────────────────────────
  private setSolo(moduleId: string | null): void {
    // Clean up previous solo
    if (this.soloSourceNode && this.soloGain) {
      try { this.soloSourceNode.disconnect(this.soloGain as unknown as Tone.InputNode) } catch { /* ignore */ }
    }
    if (!moduleId) {
      // Unsolo: restore master volume and clean up solo gain
      Tone.getDestination().volume.value = this.savedMasterVolume
      this.soloSourceNode = null
      if (this.soloGain) {
        this.soloGain.dispose()
        this.soloGain = null
      }
      return
    }
    // Solo: connect module output directly to speakers
    if (!this.soloGain) {
      this.soloGain = new Tone.Gain(1).toDestination()
    }
    const engine = this.engines.get(moduleId)
    if (!engine) return
    try {
      const outputNode = engine.getOutputNode('out')
      outputNode.connect(this.soloGain as unknown as Tone.InputNode)
      this.soloSourceNode = outputNode
      this.savedMasterVolume = Tone.getDestination().volume.value
      Tone.getDestination().volume.value = -Infinity // mute normal output
    } catch { /* module may not have 'out' port */ }
  }

  // ─── Master volume ─────────────────────────────────────────────────────────
  setMasterVolume(db: number): void {
    Tone.getDestination().volume.value = db
  }
}

export default AudioEngineManager
