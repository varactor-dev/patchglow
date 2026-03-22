import type { ModuleDefinition } from '@/types/module'

const noiseDefinition: ModuleDefinition = {
  type: 'noise',
  name: 'Noise',
  description: 'Random noise generator — white, pink, and brown noise for percussion, textures, and modulation',
  learningSummary: 'Noise is random sound with no pitch. White noise has equal energy at all frequencies. Pink and brown have more bass.',
  hp: 6,
  category: 'source',
  accentColor: '#94a3b8',

  ports: [
    {
      id: 'out',
      label: 'OUT',
      direction: 'output',
      signalType: 'audio',
      description: 'Noise audio output',
    },
  ],

  parameters: [
    {
      id: 'type',
      label: 'TYPE',
      type: 'select',
      options: ['white', 'pink', 'brown'],
      default: 'white',
      description: 'Noise color — white (flat), pink (-3dB/oct), brown (-6dB/oct)',
    },
    {
      id: 'level',
      label: 'LEVEL',
      type: 'knob',
      min: 0,
      max: 1,
      default: 0.8,
      curve: 'linear',
      description: 'Output level',
    },
  ],
}

export default noiseDefinition
