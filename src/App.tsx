import { useCallback, useEffect, useRef } from 'react'

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
import Rack, { RACK_HP, NUM_ROWS, ROW_HEIGHT, RAIL_HEIGHT } from '@/ui/Rack/Rack'
import { HP_PX } from '@/ui/ModulePanel/ModulePanel'
import styles from './App.module.css'

function computeFitZoom(): number {
  const contentH = NUM_ROWS * (ROW_HEIGHT + RAIL_HEIGHT) + RAIL_HEIGHT
  const contentW = RACK_HP * HP_PX
  const vh = window.innerHeight - 44 // minus toolbar
  const vw = window.innerWidth
  const fitH = (vh - 16) / contentH  // 16px for padding (8px each side)
  const fitW = (vw - 16) / contentW
  return Math.max(0.4, Math.min(1.0, Math.min(fitH, fitW)))
}

export default function App() {
  const audioStarted = useRackStore((s) => s.audioStarted)
  const setAudioStarted = useRackStore((s) => s.setAudioStarted)
  const initializedRef = useRef(false)
  const rackAreaRef = useRef<HTMLDivElement>(null)
  const pinchRef = useRef({ dist: 0, zoom: 1 })

  const handleStartAudio = useCallback(async () => {
    await AudioEngineManager.getInstance().start()
    setAudioStarted()
  }, [setAudioStarted])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // 1. Restore autosave BEFORE engine init so engines see correct initial state
    loadAutosave()

    // 2. Init audio engine (subscribes to store, syncs modules/connections)
    AudioEngineManager.getInstance().init()

    // 3. Start autosave for future changes
    initAutosave()

    // 4. Auto-fit zoom if content doesn't fit viewport
    const fit = computeFitZoom()
    if (fit < 0.95) useRackStore.getState().setZoom(fit)
  }, [])

  // Keyboard shortcuts: Cmd/Ctrl +/- for zoom, Cmd/Ctrl+0 for fit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const { zoom, setZoom } = useRackStore.getState()
      if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        setZoom(zoom + 0.1)
      } else if (e.key === '-') {
        e.preventDefault()
        setZoom(zoom - 0.1)
      } else if (e.key === '0') {
        e.preventDefault()
        setZoom(computeFitZoom())
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Pinch-to-zoom: trackpad (ctrl+wheel) and touch gestures
  useEffect(() => {
    const el = rackAreaRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = -e.deltaY * 0.005
        const { zoom, setZoom } = useRackStore.getState()
        setZoom(zoom + delta)
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        pinchRef.current = {
          dist: Math.sqrt(dx * dx + dy * dy),
          zoom: useRackStore.getState().zoom,
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const scale = dist / pinchRef.current.dist
        useRackStore.getState().setZoom(pinchRef.current.zoom * scale)
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return (
    <div className={styles.app}>
      <Toolbar />
      <div className={styles.rackArea} ref={rackAreaRef}>
        <Rack scrollContainerRef={rackAreaRef} />
      </div>

      {/* Full-screen audio start overlay */}
      {!audioStarted && (
        <div className={styles.audioOverlay} onClick={handleStartAudio}>
          <div className={styles.overlayContent}>
            <div className={styles.overlayTitle}>PatchGlow</div>
            <button className={styles.overlayButton} type="button">
              ◉ START AUDIO
            </button>
            <div className={styles.overlayHint}>Click anywhere to begin</div>
          </div>
        </div>
      )}
    </div>
  )
}
