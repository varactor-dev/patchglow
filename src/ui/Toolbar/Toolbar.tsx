import { useCallback, useRef } from 'react'
import AudioEngineManager from '@/engine/AudioEngineManager'
import { useRackStore } from '@/store/rackStore'
import { getAllModules } from '@/engine/moduleRegistry'
import { clearAutosave } from '@/store/persistence'
import { RACK_HP, NUM_ROWS, ROW_HEIGHT, RAIL_HEIGHT } from '@/ui/Rack/Rack'
import { HP_PX } from '@/ui/ModulePanel/ModulePanel'
import styles from './Toolbar.module.css'

function computeFitZoom(): number {
  const contentH = NUM_ROWS * (ROW_HEIGHT + RAIL_HEIGHT) + RAIL_HEIGHT
  const contentW = RACK_HP * HP_PX
  const vh = window.innerHeight - 44
  const vw = window.innerWidth
  const fitH = (vh - 16) / contentH
  const fitW = (vw - 16) / contentW
  return Math.max(0.4, Math.min(1.0, Math.min(fitH, fitW)))
}

export default function Toolbar() {
  const audioStarted = useRackStore((s) => s.audioStarted)
  const setAudioStarted = useRackStore((s) => s.setAudioStarted)
  const addModule = useRackStore((s) => s.addModule)
  const zoom = useRackStore((s) => s.zoom)
  const setZoom = useRackStore((s) => s.setZoom)
  const modules = useRackStore((s) => s.modules)
  const exportPatch = useRackStore((s) => s.exportPatch)
  const importPatch = useRackStore((s) => s.importPatch)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleStartAudio = useCallback(async () => {
    await AudioEngineManager.getInstance().start()
    setAudioStarted()
  }, [setAudioStarted])

  // Find the next available column position (pack to the right of existing modules)
  const getNextCol = useCallback(
    (_hp: number) => {
      let rightEdge = 0
      for (const mod of Object.values(modules)) {
        const registration = getAllModules().find((r) => r.definition.type === mod.type)
        if (!registration) continue
        const edge = mod.position.col + registration.definition.hp
        if (edge > rightEdge) rightEdge = edge
      }
      return rightEdge
    },
    [modules],
  )

  const handleAddModule = useCallback(
    (type: string) => {
      const registration = getAllModules().find((r) => r.definition.type === type)
      if (!registration) return
      const col = getNextCol(registration.definition.hp)
      addModule(type, { row: 0, col })
    },
    [addModule, getNextCol],
  )

  const handleSave = useCallback(() => {
    const json = exportPatch()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'patchglow-patch.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [exportPatch])

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const json = ev.target?.result as string
        importPatch(json)
      }
      reader.readAsText(file)
      // Reset so same file can be loaded again
      e.target.value = ''
    },
    [importPatch],
  )

  const handleReset = useCallback(() => {
    if (!window.confirm('Reset rack? This will remove all modules and cables.')) return
    clearAutosave()
    importPatch('{"modules":{},"connections":[]}')
  }, [importPatch])

  const handleDemo = useCallback(async () => {
    try {
      const res = await fetch('/patches/subtractive-voice.json')
      const json = await res.text()
      importPatch(json)
    } catch {
      console.error('Failed to load demo patch')
    }
  }, [importPatch])

  const availableTypes = getAllModules().map((r) => r.definition)

  return (
    <div className={styles.toolbar}>
      {/* Logo */}
      <div className={styles.logo}>
        <span className={styles.logoText}>PatchGlow</span>
        <span className={styles.logoSub}>MODULAR</span>
      </div>

      <div className={styles.divider} />

      {/* Start Audio — must be first user gesture */}
      {!audioStarted ? (
        <button className={styles.startButton} onClick={handleStartAudio}>
          ◉ START AUDIO
        </button>
      ) : (
        <div className={styles.audioActive}>
          <span className={styles.activeDot} />
          AUDIO ACTIVE
        </div>
      )}

      <div className={styles.divider} />

      {/* Add Module buttons */}
      <div className={styles.addModuleGroup}>
        <span className={styles.groupLabel}>ADD</span>
        {availableTypes.map((def) => (
          <button
            key={def.type}
            className={styles.addButton}
            style={{
              borderColor: def.accentColor + '40',
              color: def.accentColor,
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = def.accentColor
              ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 8px ${def.accentColor}60`
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = def.accentColor + '40'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
            }}
            onClick={() => handleAddModule(def.type)}
          >
            {def.name.toUpperCase()}
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      {/* Patch management */}
      <div className={styles.addModuleGroup}>
        <span className={styles.groupLabel}>PATCH</span>
        <button className={styles.patchButton} onClick={handleSave}>SAVE</button>
        <button className={styles.patchButton} onClick={handleLoad}>LOAD</button>
        <button className={styles.patchButton} onClick={handleReset}>RESET</button>
        <button className={`${styles.patchButton} ${styles.demoButton}`} onClick={handleDemo}>DEMO</button>
      </div>

      {/* Hidden file input for load */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className={styles.divider} />

      {/* Zoom controls */}
      <div className={styles.addModuleGroup}>
        <span className={styles.groupLabel}>VIEW</span>
        <button className={styles.patchButton} onClick={() => setZoom(zoom - 0.1)}>{'\u2212'}</button>
        <span className={styles.zoomDisplay}>{Math.round(zoom * 100)}%</span>
        <button className={styles.patchButton} onClick={() => setZoom(zoom + 0.1)}>+</button>
        <button className={`${styles.patchButton} ${styles.demoButton}`} onClick={() => setZoom(computeFitZoom())}>FIT</button>
      </div>

      <div className={styles.divider} />

      {/* Help / Documentation links */}
      <div className={styles.addModuleGroup}>
        <span className={styles.groupLabel}>HELP</span>
        <button
          className={`${styles.patchButton} ${styles.docsButton}`}
          onClick={() => window.open('/docs/guide.html', '_blank')}
        >
          GUIDE
        </button>
        <button
          className={`${styles.patchButton} ${styles.docsButton}`}
          onClick={() => window.open('/docs/technical.html', '_blank')}
        >
          DOCS
        </button>
      </div>

      <div className={styles.spacer} />

      {/* Hint */}
      <div className={styles.hint}>
        drag from OUT → IN to patch · right-click module to remove · Delete to remove cable
      </div>
    </div>
  )
}
