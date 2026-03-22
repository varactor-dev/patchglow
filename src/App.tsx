import { useEffect, useRef } from 'react'

// Register all modules before anything renders
import { registerModule } from '@/engine/moduleRegistry'
import oscillatorReg from '@/modules/oscillator'
import outputReg from '@/modules/output'
import keyboardReg from '@/modules/keyboard'
import filterReg from '@/modules/filter'
import envelopeReg from '@/modules/envelope'
import vcaReg from '@/modules/vca'
import lfoReg from '@/modules/lfo'
import mixerReg from '@/modules/mixer'

registerModule(oscillatorReg)
registerModule(outputReg)
registerModule(keyboardReg)
registerModule(filterReg)
registerModule(envelopeReg)
registerModule(vcaReg)
registerModule(lfoReg)
registerModule(mixerReg)

// Core
import { useRackStore } from '@/store/rackStore'
import AudioEngineManager from '@/engine/AudioEngineManager'
import { loadAutosave, initAutosave } from '@/store/persistence'
import Toolbar from '@/ui/Toolbar/Toolbar'
import Rack from '@/ui/Rack/Rack'
import styles from './App.module.css'

export default function App() {
  const addModule = useRackStore((s) => s.addModule)
  const addConnection = useRackStore((s) => s.addConnection)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // 1. Restore autosave BEFORE engine init so engines see correct initial state
    const restored = loadAutosave()

    // 2. Init audio engine (subscribes to store, syncs modules/connections)
    AudioEngineManager.getInstance().init()

    // 3. Start autosave for future changes
    initAutosave()

    // 4. If no autosave, seed default patch
    if (!restored) {
      const oscId = addModule('oscillator', { row: 0, col: 0 })
      const outId = addModule('output', { row: 0, col: 16 })
      setTimeout(() => {
        addConnection(
          { moduleId: oscId, portId: 'out' },
          { moduleId: outId, portId: 'in' },
        )
      }, 50)
    }
  }, [addModule, addConnection])

  return (
    <div className={styles.app}>
      <Toolbar />
      <div className={styles.rackArea}>
        <Rack />
      </div>
    </div>
  )
}
