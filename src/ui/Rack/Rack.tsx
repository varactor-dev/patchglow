import { useCallback, useRef } from 'react'
import { useRackStore } from '@/store/rackStore'
import { getModule } from '@/engine/moduleRegistry'
import AudioEngineManager from '@/engine/AudioEngineManager'
import ModulePanel, { HP_PX } from '@/ui/ModulePanel/ModulePanel'
import ModuleLabel from '@/ui/ModulePanel/ModuleLabel'
import Knob from '@/ui/ModulePanel/Knob'
import Port from '@/ui/ModulePanel/Port'
import Switch from '@/ui/ModulePanel/Switch'
import CableLayer from '@/ui/Cables/CableLayer'
import type { ParameterDefinition, PortDefinition } from '@/types/module'
import panelStyles from '@/ui/ModulePanel/ModulePanel.module.css'
import styles from './Rack.module.css'

// Number of HP slots in the rack (exported so CableLayer can size its SVG)
export const RACK_HP = 84

export default function Rack() {
  const modules = useRackStore((s) => s.modules)
  const removeModule = useRackStore((s) => s.removeModule)
  const setParameter = useRackStore((s) => s.setParameter)
  const endCableDrag = useRackStore((s) => s.endCableDrag)
  const draggingCable = useRackStore((s) => s.draggingCable)
  const selectCable = useRackStore((s) => s.selectCable)
  const selectedCableId = useRackStore((s) => s.selectedCableId)

  const rackRef = useRef<HTMLDivElement>(null)

  // Cancel cable drag if released on empty rack space.
  // If the pointer is over an input port, do nothing — CableLayer's document-level
  // handler fires next and will finalize the connection via elementFromPoint.
  const handleMouseUp = useCallback((e: React.PointerEvent) => {
    if (!draggingCable) return
    let target: Element | null = document.elementFromPoint(e.clientX, e.clientY)
    while (target && target !== document.body) {
      if (target.getAttribute('data-direction') === 'input' && target.getAttribute('data-port-id')) {
        return  // over a port — let CableLayer connect
      }
      target = target.parentElement
    }
    endCableDrag()
  }, [draggingCable, endCableDrag])

  // Deselect cable on background click (replaces SVG onClick since SVG is pointer-events: none)
  const handleRackClick = useCallback(() => {
    if (selectedCableId) selectCable(null)
  }, [selectedCableId, selectCable])

  return (
    <div className={styles.rackOuter} ref={rackRef} onPointerUp={handleMouseUp} onClick={handleRackClick}>
      {/* Top rail */}
      <div className={styles.rail}>
        {Array.from({ length: RACK_HP }).map((_, i) => (
          <div key={i} className={styles.railHole} style={{ left: i * HP_PX + HP_PX / 2 - 3 }} />
        ))}
      </div>

      {/* Module bed */}
      <div className={styles.moduleBed}>
        {/* Empty HP grid guide */}
        <div
          className={styles.hpGrid}
          style={{
            backgroundSize: `${HP_PX}px 100%`,
            width: RACK_HP * HP_PX,
          }}
        />

        {/* Modules */}
        {Object.values(modules).map((mod) => {
          const registration = getModule(mod.type)
          if (!registration) return null
          const { definition, VisualizationComponent } = registration
          const { accentColor, parameters, ports } = definition

          const vizData = AudioEngineManager.getInstance().getVisualizationData(mod.instanceId)

          const handleRemove = (e: React.MouseEvent) => {
            e.preventDefault()
            removeModule(mod.instanceId)
          }

          return (
            <div
              key={mod.instanceId}
              className={styles.modulePosition}
              style={{ left: mod.position.col * HP_PX }}
            >
              <ModulePanel
                hp={definition.hp}
                accentColor={accentColor}
                onContextMenu={handleRemove}
              >
                <ModuleLabel name={definition.name} accentColor={accentColor} />

                {/* Visualization */}
                <VisualizationComponent
                  moduleId={mod.instanceId}
                  data={vizData}
                  accentColor={accentColor}
                />

                {/* Controls */}
                {parameters.length > 0 && (
                  <div className={panelStyles.controlsRow}>
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

                {/* Ports */}
                <div className={panelStyles.portsRow}>
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
      </div>

      {/* Bottom rail */}
      <div className={styles.rail}>
        {Array.from({ length: RACK_HP }).map((_, i) => (
          <div key={i} className={styles.railHole} style={{ left: i * HP_PX + HP_PX / 2 - 3 }} />
        ))}
      </div>

      {/* Cable SVG lives inside the scroll container so cables scroll with modules */}
      <CableLayer containerRef={rackRef} />
    </div>
  )
}
