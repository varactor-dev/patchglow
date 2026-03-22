import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { ReverbEngine } from './engine'
import ReverbVisualization from './Visualization'

const reverbRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new ReverbEngine(),
  VisualizationComponent: ReverbVisualization,
}

export default reverbRegistration
