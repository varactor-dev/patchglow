import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { NoiseEngine } from './engine'
import NoiseVisualization from './Visualization'

const noiseRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new NoiseEngine(),
  VisualizationComponent: NoiseVisualization,
}

export default noiseRegistration
