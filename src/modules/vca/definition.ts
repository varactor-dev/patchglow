import type { ModuleDefinition } from '@/types/module'

const vcaDefinition: ModuleDefinition = {
  type: 'vca',
  name: 'VCA',
  description: 'A VCA multiplies an audio signal by a control voltage. When an envelope controls the VCA, it opens and closes like a gate — shaping the volume of the sound.',
  learningSummary: 'A VCA is like a volume knob controlled by voltage. The envelope opens and closes it.',
  hp: 8,
  category: 'modifier',
  accentColor: '#84cc16',

  ports: [
    {
      id: 'in',
      label: 'IN',
      direction: 'input',
      signalType: 'audio',
    },
    {
      id: 'cv',
      label: 'CV',
      direction: 'input',
      signalType: 'cv',
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
      id: 'level',
      label: 'LEVEL',
      type: 'knob',
      min: 0,
      max: 1,
      default: 1,
      curve: 'linear',
      unit: '',
    },
  ],
}

export default vcaDefinition
