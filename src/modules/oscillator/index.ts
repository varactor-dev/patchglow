import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { OscillatorEngine } from './engine'
import OscillatorVisualization from './Visualization'

const oscillatorRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new OscillatorEngine(),
  VisualizationComponent: OscillatorVisualization,
}

export default oscillatorRegistration
