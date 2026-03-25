import { useCallback, useRef, useState } from 'react'
import AudioEngineManager from '@/engine/AudioEngineManager'
import { useRackStore } from '@/store/rackStore'
import { getAllModules } from '@/engine/moduleRegistry'
import { clearAutosave } from '@/store/persistence'
import { computeFitZoom } from '@/ui/utils/layout'
import { encodePatchToUrl } from '@/store/patchUrl'
import styles from './Toolbar.module.css'

const PRESETS = [
  { name: 'First Light', file: 'first-light.json' },
  { name: 'Pulse', file: 'pulse.json' },
  { name: 'Drift', file: 'drift.json' },
  { name: 'Echo Chamber', file: 'echo-chamber.json' },
  { name: 'Neon Dreams', file: 'neon-dreams.json' },
]

interface ToolbarProps {
  onAbout?: () => void
  onToast?: (message: string) => void
}

export default function Toolbar({ onAbout, onToast }: ToolbarProps) {
  const audioStarted = useRackStore((s) => s.audioStarted)
  const setAudioStarted = useRackStore((s) => s.setAudioStarted)
  const addModule = useRackStore((s) => s.addModule)
  const zoom = useRackStore((s) => s.zoom)
  const setZoom = useRackStore((s) => s.setZoom)
  const cableDisplayMode = useRackStore((s) => s.cableDisplayMode)
  const cycleCableDisplayMode = useRackStore((s) => s.cycleCableDisplayMode)
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
    onToast?.('Rack cleared. Click DEMO to reload the demo patch.')
  }, [importPatch, onToast])

  const handleShare = useCallback(async () => {
    try {
      const url = await encodePatchToUrl(exportPatch())
      await navigator.clipboard.writeText(url)
      onToast?.('Share link copied to clipboard!')
    } catch {
      onToast?.('Could not generate share link.')
    }
  }, [exportPatch, onToast])

  const handleLoadPreset = useCallback(async (filename: string) => {
    try {
      const res = await fetch(`/patches/${filename}`)
      const json = await res.text()
      importPatch(json)
    } catch {
      console.error('Failed to load preset')
    }
  }, [importPatch])

  const [showMenu, setShowMenu] = useState<string | null>(null)

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }, [])

  const toggleMenu = useCallback((menu: string) => {
    setShowMenu((prev) => (prev === menu ? null : menu))
  }, [])

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

      {/* Add Module buttons — inline on wide screens */}
      <div className={`${styles.addModuleGroup} ${styles.desktopOnly}`}>
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

      <div className={`${styles.divider} ${styles.desktopOnly}`} />

      {/* Patch management — inline on wide screens */}
      <div className={`${styles.addModuleGroup} ${styles.desktopOnly}`}>
        <span className={styles.groupLabel}>PATCH</span>
        <button className={styles.patchButton} onClick={handleSave}>SAVE</button>
        <button className={styles.patchButton} onClick={handleLoad}>LOAD</button>
        <button className={styles.patchButton} onClick={handleReset}>RESET</button>
        <button className={styles.patchButton} onClick={handleShare}>SHARE</button>
        <div className={styles.menuToggleWrap}>
          <button
            className={`${styles.patchButton} ${styles.demoButton}`}
            onClick={() => toggleMenu('patches')}
          >
            PATCHES
          </button>
          {showMenu === 'patches' && (
            <div className={styles.dropdownPanel}>
              {PRESETS.map((p) => (
                <button
                  key={p.file}
                  className={`${styles.patchButton} ${styles.demoButton}`}
                  onClick={() => { handleLoadPreset(p.file); setShowMenu(null) }}
                >
                  {p.name.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input for load */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className={`${styles.divider} ${styles.desktopOnly}`} />

      {/* Narrow-screen menu toggles */}
      <div className={styles.menuToggles}>
        <div className={styles.menuToggleWrap}>
          <button
            className={`${styles.patchButton} ${styles.demoButton}`}
            onClick={() => toggleMenu('add')}
          >
            + ADD
          </button>
          {showMenu === 'add' && (
            <div className={styles.dropdownPanel}>
              {availableTypes.map((def) => (
                <button
                  key={def.type}
                  className={styles.addButton}
                  style={{ borderColor: def.accentColor + '40', color: def.accentColor }}
                  onClick={() => { handleAddModule(def.type); setShowMenu(null) }}
                >
                  {def.name.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.menuToggleWrap}>
          <button
            className={`${styles.patchButton} ${styles.demoButton}`}
            onClick={() => toggleMenu('menu')}
          >
            MENU
          </button>
          {showMenu === 'menu' && (
            <div className={styles.dropdownPanel}>
              <button className={styles.patchButton} onClick={() => { handleSave(); setShowMenu(null) }}>SAVE</button>
              <button className={styles.patchButton} onClick={() => { handleLoad(); setShowMenu(null) }}>LOAD</button>
              <button className={styles.patchButton} onClick={() => { handleReset(); setShowMenu(null) }}>RESET</button>
              <button className={styles.patchButton} onClick={() => { handleShare(); setShowMenu(null) }}>SHARE</button>
              <div className={styles.dropdownDivider} />
              <button className={styles.patchButton} onClick={() => { cycleCableDisplayMode() }}>
                CABLES: {cableDisplayMode.toUpperCase()}
              </button>
              <div className={styles.dropdownDivider} />
              {PRESETS.map((p) => (
                <button
                  key={p.file}
                  className={`${styles.patchButton} ${styles.demoButton}`}
                  onClick={() => { handleLoadPreset(p.file); setShowMenu(null) }}
                >
                  {p.name.toUpperCase()}
                </button>
              ))}
              <div className={styles.dropdownDivider} />
              <button className={`${styles.patchButton} ${styles.docsButton}`} onClick={() => { window.open('/docs/guide.html', '_blank'); setShowMenu(null) }}>GUIDE</button>
              <button className={`${styles.patchButton} ${styles.docsButton}`} onClick={() => { window.open('/docs/technical.html', '_blank'); setShowMenu(null) }}>DOCS</button>
              {onAbout && <button className={`${styles.patchButton} ${styles.docsButton}`} onClick={() => { onAbout(); setShowMenu(null) }}>ABOUT</button>}
            </div>
          )}
        </div>
      </div>

      {/* Zoom controls — always visible */}
      <div className={styles.addModuleGroup}>
        <span className={`${styles.groupLabel} ${styles.desktopOnly}`}>VIEW</span>
        <button className={styles.patchButton} onClick={() => setZoom(zoom - 0.1)}>{'\u2212'}</button>
        <span className={styles.zoomDisplay}>{Math.round(zoom * 100)}%</span>
        <button className={styles.patchButton} onClick={() => setZoom(zoom + 0.1)}>+</button>
        <button className={`${styles.patchButton} ${styles.demoButton}`} onClick={() => setZoom(computeFitZoom())}>FIT</button>
        <button className={`${styles.patchButton} ${styles.docsButton}`} onClick={handleFullscreen}>
          {'⛶'}
        </button>
        <button
          className={`${styles.patchButton} ${styles.demoButton}`}
          onClick={cycleCableDisplayMode}
          title={`Cable style: ${cableDisplayMode.toUpperCase()} (C)`}
        >
          {cableDisplayMode === 'clean' ? '~' : cableDisplayMode === 'subtle' ? '~~' : '~~~'}
        </button>
      </div>

      <div className={`${styles.divider} ${styles.desktopOnly}`} />

      {/* Help / Documentation links — desktop only */}
      <div className={`${styles.addModuleGroup} ${styles.desktopOnly}`}>
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
        {onAbout && (
          <button
            className={`${styles.patchButton} ${styles.docsButton}`}
            onClick={onAbout}
          >
            ABOUT
          </button>
        )}
      </div>

      <div className={styles.spacer} />

      {/* Hint — desktop only */}
      <div className={`${styles.hint} ${styles.desktopOnly}`}>
        drag from OUT → IN to patch · right-click module to remove · Delete to remove cable
      </div>

      {/* Click-away overlay to close dropdown menus */}
      {showMenu && (
        <div className={styles.menuBackdrop} onClick={() => setShowMenu(null)} />
      )}
    </div>
  )
}
