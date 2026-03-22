import styles from './Switch.module.css'

interface SwitchProps {
  label: string
  options: string[]
  value: string
  accentColor: string
  onChange: (value: string) => void
}

export default function Switch({ label, options, value, accentColor, onChange }: SwitchProps) {
  return (
    <div className={styles.switchWrapper}>
      <div className={styles.label}>{label}</div>
      <div className={styles.buttons}>
        {options.map((opt) => {
          const isActive = opt === value
          return (
            <button
              key={opt}
              className={`${styles.button} ${isActive ? styles.active : ''}`}
              onClick={() => onChange(opt)}
              style={{
                borderColor: isActive ? accentColor : 'var(--border-subtle)',
                color: isActive ? accentColor : 'var(--text-dim)',
                boxShadow: isActive ? `0 0 6px ${accentColor}` : 'none',
                background: isActive ? `${accentColor}18` : 'var(--bg-panel-raised)',
              }}
            >
              {opt.slice(0, 3).toUpperCase()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
