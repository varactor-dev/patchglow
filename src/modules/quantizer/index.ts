import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { QuantizerEngine } from './engine'
import QuantizerVisualization from './Visualization'

const quantizerRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new QuantizerEngine(),
  VisualizationComponent: QuantizerVisualization,
}

export default quantizerRegistration
