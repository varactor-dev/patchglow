import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { DrumSynthEngine } from './engine'
import DrumSynthVisualization from './Visualization'

const drumSynthRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new DrumSynthEngine(),
  VisualizationComponent: DrumSynthVisualization,
}

export default drumSynthRegistration
