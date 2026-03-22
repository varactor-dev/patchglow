import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { DelayEngine } from './engine'
import DelayVisualization from './Visualization'

const delayRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new DelayEngine(),
  VisualizationComponent: DelayVisualization,
}

export default delayRegistration
