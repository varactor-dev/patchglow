import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { OutputEngine } from './engine'
import OutputVisualization from './Visualization'

const outputRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new OutputEngine(),
  VisualizationComponent: OutputVisualization,
}

export default outputRegistration
