import { useMemo } from 'react'
import styles from './HelpTooltip.module.css'

interface HelpTooltipProps {
  text: string
  accentColor: string
  anchorRect: DOMRect | null
}

const TOOLTIP_GAP = 8

export default function HelpTooltip({ text, accentColor, anchorRect }: HelpTooltipProps) {
  if (!anchorRect) return null

  const { posStyle, placement } = useMemo(() => {
    const anchorCenterX = anchorRect.left + anchorRect.width / 2
    const spaceAbove = anchorRect.top

    // If less than 60px above anchor, place below
    const placeBelow = spaceAbove < 60
    const top = placeBelow
      ? anchorRect.bottom + TOOLTIP_GAP
      : anchorRect.top - TOOLTIP_GAP

    return {
      posStyle: {
        left: anchorCenterX,
        top,
        transform: placeBelow
          ? 'translateX(-50%)'
          : 'translateX(-50%) translateY(-100%)',
        '--accent-color': accentColor,
      } as React.CSSProperties,
      placement: placeBelow ? styles.below : styles.above,
    }
  }, [anchorRect, accentColor])

  return (
    <div
      className={`${styles.tooltip} ${placement}`}
      style={posStyle}
    >
      {text}
    </div>
  )
}
