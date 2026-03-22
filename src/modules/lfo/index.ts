import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { LfoEngine } from './engine'
import LfoVisualization from './Visualization'

const lfoRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new LfoEngine(),
  VisualizationComponent: LfoVisualization,
}
export default lfoRegistration
