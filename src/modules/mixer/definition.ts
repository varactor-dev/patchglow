import type { ModuleDefinition } from '@/types/module'

const mixerDefinition: ModuleDefinition = {
  type: 'mixer',
  name: 'Mixer',
  description: 'A mixer combines multiple audio signals into one. Each channel has its own level control.',
  learningSummary: 'Signals add together when mixed. Use it to layer oscillators or combine effects.',
  hp: 8,
  category: 'utility',
  accentColor: '#f59e0b',

  ports: [
    {
      id: 'in1',
      label: 'IN 1',
      direction: 'input',
      signalType: 'audio',
    },
    {
      id: 'in2',
      label: 'IN 2',
      direction: 'input',
      signalType: 'audio',
    },
    {
      id: 'in3',
      label: 'IN 3',
      direction: 'input',
      signalType: 'audio',
    },
    {
      id: 'out',
      label: 'OUT',
      direction: 'output',
      signalType: 'audio',
    },
  ],

  parameters: [
    {
      id: 'level1',
      label: 'CH 1',
      type: 'knob',
      min: 0,
      max: 1,
      default: 0.8,
      curve: 'linear',
      unit: '',
    },
    {
      id: 'level2',
      label: 'CH 2',
      type: 'knob',
      min: 0,
      max: 1,
      default: 0.8,
      curve: 'linear',
      unit: '',
    },
    {
      id: 'level3',
      label: 'CH 3',
      type: 'knob',
      min: 0,
      max: 1,
      default: 0.8,
      curve: 'linear',
      unit: '',
    },
  ],
}

export default mixerDefinition
