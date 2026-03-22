import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { DistortionEngine } from './engine'
import DistortionVisualization from './Visualization'

const distortionRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new DistortionEngine(),
  VisualizationComponent: DistortionVisualization,
}

export default distortionRegistration
