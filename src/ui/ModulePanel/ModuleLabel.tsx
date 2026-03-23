import styles from './ModulePanel.module.css'

interface ModuleLabelProps {
  name: string
  accentColor: string
  onPointerDown?: (e: React.PointerEvent) => void
  off?: boolean
  bypass?: boolean
  solo?: boolean
  onToggleOff?: () => void
  onToggleBypass?: () => void
  onToggleSolo?: () => void
  onHelpClick?: () => void
  showSolo?: boolean
  showBypass?: boolean
}

function stopDrag(e: React.PointerEvent) {
  e.stopPropagation()
}

/* ── SVG icons (10x10 viewBox, stroke-based, 1.5px stroke) ── */

function IconHelp({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M3.5 3.5C3.5 2.4 4.3 1.5 5 1.5C5.7 1.5 6.5 2.1 6.5 3C6.5 3.9 5.7 4.2 5 4.7V5.8"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="8" r="0.75" fill={color} />
    </svg>
  )
}

function IconSolo({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="4" stroke={color} strokeWidth="1.5" />
      <circle cx="5" cy="5" r="1.2" fill={color} />
    </svg>
  )
}

function IconBypass({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="3.5" stroke={color} strokeWidth="1.5" />
      <line
        x1="2.2" y1="7.8"
        x2="7.8" y2="2.2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconPower({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M3 3.2A3.5 3.5 0 1 0 7 3.2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="5" y1="1"
        x2="5" y2="5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function ModuleLabel({
  name,
  accentColor,
  onPointerDown,
  off = false,
  bypass = false,
  solo = false,
  onToggleOff,
  onToggleBypass,
  onToggleSolo,
  onHelpClick,
  showSolo = true,
  showBypass = true,
}: ModuleLabelProps) {
  const helpColor = accentColor
  const soloColor = '#fbbf24'
  const bypassColor = '#f59e0b'
  const offColor = '#ef4444'

  return (
    <div className={styles.title}>
      {/* ── draggable name region ── */}
      <span
        className={styles.titleText}
        style={{
          color: accentColor,
          textShadow: `0 0 6px ${accentColor}80`,
        }}
        onPointerDown={onPointerDown}
      >
        {name}
      </span>

      {/* ── indicator buttons ── */}
      <span className={styles.btnGroup}>
        {/* Help */}
        <button
          className={styles.titleBtn}
          style={{ color: helpColor }}
          title="Help"
          onPointerDown={stopDrag}
          onClick={onHelpClick}
        >
          <IconHelp color={helpColor} />
        </button>

        {/* Solo */}
        {showSolo && (
          <button
            className={`${styles.titleBtn}${solo ? ` ${styles.titleBtnActive}` : ''}`}
            style={{
              color: soloColor,
              ...(solo ? { filter: `drop-shadow(0 0 4px ${soloColor})` } : {}),
            }}
            title="Solo"
            onPointerDown={stopDrag}
            onClick={onToggleSolo}
          >
            <IconSolo color={soloColor} />
          </button>
        )}

        {/* Bypass */}
        {showBypass && (
          <button
            className={`${styles.titleBtn}${bypass ? ` ${styles.titleBtnActive}` : ''}`}
            style={{
              color: bypassColor,
              ...(bypass ? { filter: `drop-shadow(0 0 4px ${bypassColor})` } : {}),
            }}
            title="Bypass"
            onPointerDown={stopDrag}
            onClick={onToggleBypass}
          >
            <IconBypass color={bypassColor} />
          </button>
        )}

        {/* Off */}
        <button
          className={`${styles.titleBtn}${off ? ` ${styles.titleBtnActive}` : ''}`}
          style={{
            color: offColor,
            ...(off ? { filter: `drop-shadow(0 0 4px ${offColor})` } : {}),
          }}
          title="Off"
          onPointerDown={stopDrag}
          onClick={onToggleOff}
        >
          <IconPower color={offColor} />
        </button>
      </span>
    </div>
  )
}
