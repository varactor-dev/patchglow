import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { SampleHoldEngine } from './engine'
import SampleHoldVisualization from './Visualization'

const sampleHoldRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new SampleHoldEngine(),
  VisualizationComponent: SampleHoldVisualization,
}

export default sampleHoldRegistration
