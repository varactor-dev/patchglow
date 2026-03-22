import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { EnvelopeEngine } from './engine'
import EnvelopeVisualization from './Visualization'

const envelopeRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new EnvelopeEngine(),
  VisualizationComponent: EnvelopeVisualization,
}

export default envelopeRegistration
