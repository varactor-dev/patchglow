import { useEffect, useRef } from 'react'

// Register all modules before anything renders
import { registerModule } from '@/engine/moduleRegistry'
import oscillatorReg from '@/modules/oscillator'
import outputReg from '@/modules/output'
import keyboardReg from '@/modules/keyboard'

registerModule(oscillatorReg)
registerModule(outputReg)
registerModule(keyboardReg)

// Core
import { useRackStore } from '@/store/rackStore'
import AudioEngineManager from '@/engine/AudioEngineManager'
import Toolbar from '@/ui/Toolbar/Toolbar'
import Rack from '@/ui/Rack/Rack'
import CableLayer from '@/ui/Cables/CableLayer'
import styles from './App.module.css'

export default function App() {
  const addModule = useRackStore((s) => s.addModule)
  const addConnection = useRackStore((s) => s.addConnection)
  const rackAreaRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Init audio engine
    AudioEngineManager.getInstance().init()

    // Default patch: Oscillator (col 0) + Output (col 14)
    const oscId = addModule('oscillator', { row: 0, col: 0 })
    const outId = addModule('output', { row: 0, col: 16 })

    // Pre-connect oscillator OUT → output IN
    // (Small delay so engines have time to initialize from store subscription)
    setTimeout(() => {
      addConnection(
        { moduleId: oscId, portId: 'out' },
        { moduleId: outId, portId: 'in' },
      )
    }, 50)
  }, [addModule, addConnection])

  return (
    <div className={styles.app}>
      <Toolbar />
      <div className={styles.rackArea} ref={rackAreaRef}>
        <Rack />
        <CableLayer containerRef={rackAreaRef} />
      </div>
    </div>
  )
}
