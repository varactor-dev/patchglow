import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useRackStore } from '@/store/rackStore'
import { getModule } from '@/engine/moduleRegistry'
import ModulePanel, { HP_PX } from '@/ui/ModulePanel/ModulePanel'
import ModuleLabel from '@/ui/ModulePanel/ModuleLabel'
import Knob from '@/ui/ModulePanel/Knob'
import Port from '@/ui/ModulePanel/Port'
import Switch from '@/ui/ModulePanel/Switch'
import CableLayer from '@/ui/Cables/CableLayer'
import HelpPanel from '@/ui/HelpPanel/HelpPanel'
import { useDragModule } from './useDragModule'
import type { ParameterDefinition, PortDefinition } from '@/types/module'
import panelStyles from '@/ui/ModulePanel/ModulePanel.module.css'
import styles from './Rack.module.css'

// Number of HP slots per row
export const RACK_HP = 84
// Number of visible rows
export const NUM_ROWS = 3
// Heights (px)
export const ROW_HEIGHT = 380   // module bed
export const RAIL_HEIGHT = 20   // rail bar

interface RackProps {
  scrollContainerRef: React.RefObject<HTMLElement | null>
}

export default function Rack({ scrollContainerRef }: RackProps) {
  const modules = useRackStore((s) => s.modules)
  const removeModule = useRackStore((s) => s.removeModule)
  const setParameter = useRackStore((s) => s.setParameter)
  const setModuleOff = useRackStore((s) => s.setModuleOff)
  const setModuleBypass = useRackStore((s) => s.setModuleBypass)
  const setSolo = useRackStore((s) => s.setSolo)
  const soloModuleId = useRackStore((s) => s.soloModuleId)
  const endCableDrag = useRackStore((s) => s.endCableDrag)
  const draggingCable = useRackStore((s) => s.draggingCable)
  const selectCable = useRackStore((s) => s.selectCable)
  const selectedCableId = useRackStore((s) => s.selectedCableId)
  const zoom = useRackStore((s) => s.zoom)

  const [helpModule, setHelpModule] = useState<string | null>(null)

  const rackRef = useRef<HTMLDivElement>(null)
  const { dragState, handleDragStart } = useDragModule(zoom, rackRef)

  const contentW = RACK_HP * HP_PX
  const contentH = NUM_ROWS * (ROW_HEIGHT + RAIL_HEIGHT) + RAIL_HEIGHT

  const handleMouseUp = useCallback((e: React.PointerEvent) => {
    if (!draggingCable) return
    let target: Element | null = document.elementFromPoint(e.clientX, e.clientY)
    while (target && target !== document.body) {
      if (target.getAttribute('data-direction') === 'input' && target.getAttribute('data-port-id')) {
        return
      }
      target = target.parentElement
    }
    endCableDrag()
  }, [draggingCable, endCableDrag])

  const handleRackClick = useCallback(() => {
    if (selectedCableId) selectCable(null)
  }, [selectedCableId, selectCable])

  // Group modules by row
  const modulesByRow = useMemo(() => {
    const map = new Map<number, typeof modules[string][]>()
    for (const mod of Object.values(modules)) {
      const row = mod.position.row
      if (!map.has(row)) map.set(row, [])
      map.get(row)!.push(mod)
    }
    return map
  }, [modules])

  const renderRail = (key: string) => (
    <div key={key} className={styles.rail}>
      {Array.from({ length: RACK_HP }).map((_, i) => (
        <div key={i} className={styles.railHole} style={{ left: i * HP_PX + HP_PX / 2 - 3 }} />
      ))}
    </div>
  )

  return (
    <div style={{ width: contentW * zoom, height: contentH * zoom, flexShrink: 0 }}>
      <div
        ref={rackRef}
        className={styles.rackOuter}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          width: contentW,
          height: contentH,
        }}
        onPointerUp={handleMouseUp}
        onClick={handleRackClick}
      >
        {Array.from({ length: NUM_ROWS }).map((_, rowIdx) => (
          <React.Fragment key={rowIdx}>
            {/* Top rail for this row */}
            {renderRail(`rail-top-${rowIdx}`)}

            {/* Module bed */}
            <div className={styles.moduleBed}>
              <div
                className={`${styles.hpGrid} ${dragState ? styles.hpGridActive : ''}`}
                style={{
                  backgroundSize: `${HP_PX}px 100%`,
                  width: RACK_HP * HP_PX,
                }}
              />
              <div className={styles.mountingHoles}>
                {Array.from({ length: Math.floor(RACK_HP / 2) }).map((_, i) => (
                  <div key={i} className={styles.mountHole} style={{ left: i * 2 * HP_PX + HP_PX }} />
                ))}
              </div>

              {(modulesByRow.get(rowIdx) ?? []).map((mod) => {
                const registration = getModule(mod.type)
                if (!registration) return null
                const { definition, VisualizationComponent } = registration
                const { accentColor, parameters, ports } = definition
                const isDragging = dragState?.instanceId === mod.instanceId

                const isOff = mod.off ?? false
                const isBypassed = mod.bypass ?? false
                const isSoloed = soloModuleId === mod.instanceId
                const soloActive = soloModuleId !== null
                const hasAudioOut = definition.ports.some(p => p.direction === 'output' && p.signalType === 'audio')
                const isSource = definition.category === 'source'

                const handleRemove = (e: React.MouseEvent) => {
                  e.preventDefault()
                  removeModule(mod.instanceId)
                }

                return (
                  <div
                    key={mod.instanceId}
                    className={styles.modulePosition}
                    style={{
                      left: mod.position.col * HP_PX,
                      ...(isDragging ? {
                        transform: `translate(${dragState.offsetX}px, ${dragState.offsetY}px)`,
                        opacity: 0.7,
                        zIndex: 100,
                        pointerEvents: 'none' as const,
                      } : {}),
                      ...(soloActive && !isSoloed ? { opacity: 0.7 } : {}),
                    }}
                  >
                    <ModulePanel
                      hp={definition.hp}
                      accentColor={accentColor}
                      onContextMenu={handleRemove}
                      bypass={isBypassed && !isOff}
                    >
                      {isSoloed && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          pointerEvents: 'none',
                          zIndex: 5,
                          boxShadow: '0 0 12px #fbbf24, inset 0 0 6px #fbbf2440',
                          borderRadius: 2,
                        }} />
                      )}

                      {isBypassed && !isOff && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(245, 158, 11, 0.08)',
                          pointerEvents: 'none',
                          zIndex: 4,
                          borderRadius: 2,
                        }} />
                      )}

                      <ModuleLabel
                        name={definition.name}
                        accentColor={accentColor}
                        onPointerDown={(e) => handleDragStart(mod.instanceId, e)}
                        off={isOff}
                        bypass={isBypassed}
                        solo={isSoloed}
                        showSolo={hasAudioOut}
                        showBypass={!isSource}
                        onToggleOff={() => setModuleOff(mod.instanceId, !isOff)}
                        onToggleBypass={() => setModuleBypass(mod.instanceId, !isBypassed)}
                        onToggleSolo={() => setSolo(isSoloed ? null : mod.instanceId)}
                        onHelpClick={() => setHelpModule(mod.type)}
                      />

                      <div style={{
                        opacity: isOff ? 0.3 : 1,
                        transition: 'opacity 0.2s',
                      }}>
                        <VisualizationComponent
                          moduleId={mod.instanceId}
                          data={{}}
                          accentColor={accentColor}
                          off={isOff}
                          bypass={isBypassed}
                        />
                      </div>

                      {parameters.length > 0 && (
                        <div className={panelStyles.controlsRow} style={{
                          opacity: isOff ? 0.3 : isBypassed ? 0.4 : 1,
                          transition: 'opacity 0.2s',
                        }}>
                          {parameters.map((param: ParameterDefinition) => {
                            if (param.type === 'select' && param.options) {
                              return (
                                <Switch
                                  key={param.id}
                                  label={param.label}
                                  options={param.options}
                                  value={String(mod.parameters[param.id] ?? param.default)}
                                  accentColor={accentColor}
                                  onChange={(v) => setParameter(mod.instanceId, param.id, v)}
                                />
                              )
                            }
                            return (
                              <Knob
                                key={param.id}
                                label={param.label}
                                value={Number(mod.parameters[param.id] ?? param.default)}
                                min={param.min ?? 0}
                                max={param.max ?? 1}
                                default={Number(param.default)}
                                unit={param.unit}
                                curve={param.curve}
                                accentColor={accentColor}
                                onChange={(v) => setParameter(mod.instanceId, param.id, v)}
                              />
                            )
                          })}
                        </div>
                      )}

                      <div className={panelStyles.portsRow} style={{
                        opacity: isOff ? 0.3 : 1,
                        transition: 'opacity 0.2s',
                      }}>
                        {ports.map((port: PortDefinition) => (
                          <Port
                            key={port.id}
                            moduleId={mod.instanceId}
                            portId={port.id}
                            label={port.label}
                            direction={port.direction}
                            signalType={port.signalType}
                          />
                        ))}
                      </div>
                    </ModulePanel>
                  </div>
                )
              })}

              {/* Drag ghost outline */}
              {dragState && dragState.snapRow === rowIdx && (
                <div
                  className={styles.dragGhost}
                  style={{
                    left: dragState.snapCol * HP_PX,
                    width: dragState.hp * HP_PX,
                    borderColor: dragState.snapValid ? '#22d3ee' : '#ff4444',
                    boxShadow: dragState.snapValid
                      ? '0 0 12px rgba(34, 211, 238, 0.3)'
                      : '0 0 12px rgba(255, 68, 68, 0.3)',
                  }}
                />
              )}
            </div>
          </React.Fragment>
        ))}

        {/* Final bottom rail */}
        {renderRail('rail-bottom')}

        {/* Cable SVG lives inside the scroll container so cables scroll with modules */}
        <CableLayer containerRef={rackRef} scrollContainerRef={scrollContainerRef} zoom={zoom} />
      </div>

      {helpModule && <HelpPanel moduleType={helpModule} onClose={() => setHelpModule(null)} />}
    </div>
  )
}
