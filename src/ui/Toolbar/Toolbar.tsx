import { useState, useCallback } from 'react'
import AudioEngineManager from '@/engine/AudioEngineManager'
import { useRackStore } from '@/store/rackStore'
import { getAllModules } from '@/engine/moduleRegistry'
import styles from './Toolbar.module.css'

export default function Toolbar() {
  const [audioStarted, setAudioStarted] = useState(false)
  const addModule = useRackStore((s) => s.addModule)
  const modules = useRackStore((s) => s.modules)

  const handleStartAudio = useCallback(async () => {
    await AudioEngineManager.getInstance().start()
    setAudioStarted(true)
  }, [])

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

      <div className={styles.spacer} />

      {/* Hint */}
      <div className={styles.hint}>
        drag from OUT → IN to patch · right-click module to remove · Delete to remove cable
      </div>
    </div>
  )
}
