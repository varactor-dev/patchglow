import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { VcaEngine } from './engine'
import VcaVisualization from './Visualization'

const vcaRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new VcaEngine(),
  VisualizationComponent: VcaVisualization,
}
export default vcaRegistration
