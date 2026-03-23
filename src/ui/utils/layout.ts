import { RACK_HP, NUM_ROWS, ROW_HEIGHT, RAIL_HEIGHT } from '@/ui/Rack/Rack'
import { HP_PX } from '@/ui/ModulePanel/ModulePanel'

const TOOLBAR_HEIGHT = 44

export function computeFitZoom(): number {
  const contentH = NUM_ROWS * (ROW_HEIGHT + RAIL_HEIGHT) + RAIL_HEIGHT
  const contentW = RACK_HP * HP_PX
  const vh = window.innerHeight - TOOLBAR_HEIGHT
  const vw = window.innerWidth
  const fitH = (vh - 16) / contentH  // 16px for padding (8px each side)
  const fitW = (vw - 16) / contentW
  return Math.max(0.4, Math.min(1.0, Math.min(fitH, fitW)))
}
