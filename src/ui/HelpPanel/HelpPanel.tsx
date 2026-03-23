import { useEffect } from 'react'
import { getModule } from '@/engine/moduleRegistry'
import { helpContent } from '@/data/helpContent'
import styles from './HelpPanel.module.css'

interface HelpPanelProps {
  moduleType: string
  onClose: () => void
}

const PORT_TYPE_COLORS: Record<string, string> = {
  audio: '#ff6b35',
  cv: '#00e5ff',
  gate: '#ff2ecb',
}

export default function HelpPanel({ moduleType, onClose }: HelpPanelProps) {
  const registration = getModule(moduleType)
  const help = helpContent[moduleType]
  const accentColor = registration?.definition.accentColor ?? '#888'
  const moduleName = registration?.definition.name ?? moduleType

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const cssVars = {
    '--accent-color': accentColor,
    '--accent-glow': `${accentColor}40`,
    '--accent-muted': `${accentColor}18`,
  } as React.CSSProperties

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.panel}
        style={cssVars}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          {'\u00D7'}
        </button>

        {/* Module name */}
        <h2 className={styles.moduleTitle} style={{ color: accentColor }}>
          {moduleName}
        </h2>

        {help ? (
          <>
            {/* WHAT IT DOES */}
            <h3 className={styles.sectionHeading}>WHAT IT DOES</h3>
            <p className={styles.bodyText}>{help.whatItDoes}</p>

            {/* SIGNAL FLOW */}
            <h3 className={styles.sectionHeading}>SIGNAL FLOW</h3>
            <div className={styles.signalFlow}>{help.signalFlow}</div>

            {/* CONTROLS */}
            {help.controls && help.controls.length > 0 && (
              <>
                <h3 className={styles.sectionHeading}>CONTROLS</h3>
                {help.controls.map((ctrl) => (
                  <div key={ctrl.name} className={styles.controlItem}>
                    <div className={styles.controlName}>{ctrl.name}</div>
                    <div className={styles.controlDesc}>{ctrl.description}</div>
                    {ctrl.tryThis && (
                      <div className={styles.controlTry}>Try this: {ctrl.tryThis}</div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* PORTS */}
            {help.ports && help.ports.length > 0 && (
              <>
                <h3 className={styles.sectionHeading}>PORTS</h3>
                {help.ports.map((port) => (
                  <div key={port.name} className={styles.portItem}>
                    <span
                      className={styles.portDot}
                      style={{ backgroundColor: PORT_TYPE_COLORS[port.type] ?? '#888' }}
                    />
                    <span className={styles.portName}>{port.name}</span>
                    <span className={styles.portArrow}>
                      {port.direction === 'in' ? '\u2192' : '\u2190'}
                    </span>
                    <span className={styles.portConnect}>{port.connectTo}</span>
                  </div>
                ))}
              </>
            )}

            {/* WHAT THE DISPLAY SHOWS */}
            {help.vizGuide && (
              <>
                <h3 className={styles.sectionHeading}>WHAT THE DISPLAY SHOWS</h3>
                <p className={styles.vizGuide}>{help.vizGuide}</p>
              </>
            )}

            {/* TRY THIS */}
            {help.tryThis && (
              <>
                <h3 className={styles.sectionHeading}>TRY THIS</h3>
                <div className={styles.tryThisBox}>{help.tryThis}</div>
              </>
            )}
          </>
        ) : (
          <p className={styles.bodyText}>
            No help content available for this module yet.
          </p>
        )}
      </div>
    </div>
  )
}
