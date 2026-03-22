import { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { FilterEngine } from './engine'
import FilterVisualization from './Visualization'

const filterRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new FilterEngine(),
  VisualizationComponent: FilterVisualization,
}

export default filterRegistration
