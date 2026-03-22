import styles from './ModulePanel.module.css'

interface ModuleLabelProps {
  name: string
  accentColor: string
  onPointerDown?: (e: React.PointerEvent) => void
}

export default function ModuleLabel({ name, accentColor, onPointerDown }: ModuleLabelProps) {
  return (
    <div
      className={styles.title}
      style={{
        color: accentColor,
        textShadow: `0 0 6px ${accentColor}80`,
      }}
      onPointerDown={onPointerDown}
    >
      {name}
    </div>
  )
}
