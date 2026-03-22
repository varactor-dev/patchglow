import { useCallback, useRef } from 'react'
import { useRackStore } from '@/store/rackStore'
import { getModule } from '@/engine/moduleRegistry'
import AudioEngineManager from '@/engine/AudioEngineManager'
import ModulePanel, { HP_PX } from '@/ui/ModulePanel/ModulePanel'
import ModuleLabel from '@/ui/ModulePanel/ModuleLabel'
import Knob from '@/ui/ModulePanel/Knob'
import Port from '@/ui/ModulePanel/Port'
import Switch from '@/ui/ModulePanel/Switch'
import type { ParameterDefinition, PortDefinition } from '@/types/module'
import panelStyles from '@/ui/ModulePanel/ModulePanel.module.css'
import styles from './Rack.module.css'

// Number of HP slots in the rack
const RACK_HP = 84

export default function Rack() {
  const modules = useRackStore((s) => s.modules)
  const removeModule = useRackStore((s) => s.removeModule)
  const setParameter = useRackStore((s) => s.setParameter)
  const endCableDrag = useRackStore((s) => s.endCableDrag)
  const draggingCable = useRackStore((s) => s.draggingCable)

  const rackRef = useRef<HTMLDivElement>(null)

  // Cancel cable drag if released on empty rack space
  const handleMouseUp = useCallback(() => {
    if (draggingCable) endCableDrag()
  }, [draggingCable, endCableDrag])

  return (
    <div className={styles.rackOuter} ref={rackRef} onMouseUp={handleMouseUp}>
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
    </div>
  )
}
