import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { KeyboardEngine } from './engine'
import KeyboardVisualization from './Visualization'

const keyboardRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new KeyboardEngine(),
  VisualizationComponent: KeyboardVisualization,
}

export default keyboardRegistration
