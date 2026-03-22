import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { SequencerEngine } from './engine'
import SequencerVisualization from './Visualization'

const sequencerRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new SequencerEngine(),
  VisualizationComponent: SequencerVisualization,
}

export default sequencerRegistration
