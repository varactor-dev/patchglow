import type { ModuleDefinition } from '@/types/module'

const reverbDefinition: ModuleDefinition = {
  type: 'reverb',
  name: 'Reverb',
  description: 'Reverb effect — simulates the reflections of a physical space',
  learningSummary: 'Reverb adds the character of a room. Decay controls how long the reflections last. Damping rolls off high frequencies in the tail.',
  hp: 10,
  category: 'modifier',
  accentColor: '#818cf8',

  ports: [
    {
      id: 'in',
      label: 'IN',
      direction: 'input',
      signalType: 'audio',
      description: 'Audio input',
    },
    {
      id: 'out',
      label: 'OUT',
      direction: 'output',
      signalType: 'audio',
      description: 'Audio output (dry + wet)',
    },
  ],

  parameters: [
    {
      id: 'decay',
      label: 'DECAY',
      type: 'knob',
      min: 0.1,
      max: 15.0,
      default: 2.5,
      unit: 's',
      curve: 'exponential',
      description: 'Reverb decay time in seconds',
    },
    {
      id: 'mix',
      label: 'MIX',
      type: 'knob',
      min: 0,
      max: 1,
      default: 0.3,
      curve: 'linear',
      description: 'Dry/wet mix',
    },
    {
      id: 'damping',
      label: 'DAMP',
      type: 'knob',
      min: 0,
      max: 1,
      default: 0.5,
      curve: 'linear',
      description: 'High-frequency damping — higher = darker tail',
    },
  ],
}

export default reverbDefinition
