import type { ModuleDefinition } from '@/types/module'

const keyboardDefinition: ModuleDefinition = {
  type: 'keyboard',
  name: 'Keyboard',
  description: 'Computer keyboard → CV pitch + Gate signal',
  learningSummary: 'Notes have pitch (CV) and on/off state (gate). A keyboard sends both.',
  hp: 14,
  category: 'source',
  accentColor: '#ffffff',

  ports: [
    {
      id: 'cv-out',
      label: 'CV',
      direction: 'output',
      signalType: 'cv',
      description: 'Pitch as control voltage — connect to oscillator V/OCT',
    },
    {
      id: 'gate-out',
      label: 'GATE',
      direction: 'output',
      signalType: 'gate',
      description: 'Gate signal — high when key is held, triggers envelope',
    },
  ],

  parameters: [
    {
      id: 'octave',
      label: 'OCT',
      type: 'knob',
      min: -2,
      max: 4,
      default: 0,
      step: 1,
      curve: 'linear',
      description: 'Octave offset',
    },
  ],
}

export default keyboardDefinition
