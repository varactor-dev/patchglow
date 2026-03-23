import type { ReactNode } from 'react'
import styles from './ModulePanel.module.css'

interface ModulePanelProps {
  hp: number
  accentColor: string
  children: ReactNode
  onContextMenu?: (e: React.MouseEvent) => void
  bypass?: boolean
}

const HP_PX = 20  // 1HP = 20px
const PANEL_HEIGHT = 380  // 3U rack height in px

export { HP_PX, PANEL_HEIGHT }

export default function ModulePanel({ hp, accentColor, children, onContextMenu, bypass }: ModulePanelProps) {
  const width = hp * HP_PX

  return (
    <div
      className={styles.panel}
      style={{
        width,
        minHeight: PANEL_HEIGHT,
        ...(bypass ? {
          borderLeft: `1px dashed ${accentColor}66`,
          borderRight: `1px dashed ${accentColor}66`,
        } : {}),
      }}
      onContextMenu={onContextMenu}
    >
      {/* Top rail screws */}
      <div className={styles.screwRow}>
        <Screw />
        <div className={styles.screwSpacer} />
        <Screw />
      </div>

      {/* Accent line at top */}
      <div
        className={styles.accentLine}
        style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}60` }}
      />

      {/* Module content */}
      <div className={styles.content}>
        {children}
      </div>

      {/* Bottom rail screws */}
      <div className={styles.screwRow}>
        <Screw />
        <div className={styles.screwSpacer} />
        <Screw />
      </div>
    </div>
  )
}

function Screw() {
  return (
    <div className={styles.screw}>
      <div className={styles.screwSlot} />
    </div>
  )
}
