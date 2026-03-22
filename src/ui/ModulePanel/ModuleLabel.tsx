import styles from './ModulePanel.module.css'

interface ModuleLabelProps {
  name: string
  accentColor: string
}

export default function ModuleLabel({ name, accentColor }: ModuleLabelProps) {
  return (
    <div
      className={styles.title}
      style={{
        color: accentColor,
        textShadow: `0 0 6px ${accentColor}80`,
      }}
    >
      {name}
    </div>
  )
}
