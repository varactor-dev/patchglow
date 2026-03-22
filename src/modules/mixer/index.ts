import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { MixerEngine } from './engine'
import MixerVisualization from './Visualization'

const mixerRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new MixerEngine(),
  VisualizationComponent: MixerVisualization,
}
export default mixerRegistration
