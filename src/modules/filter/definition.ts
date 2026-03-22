import type { ModuleDefinition } from '@/types/module'

const filterDefinition: ModuleDefinition = {
  type: 'filter',
  name: 'Filter',
  description:
    'A resonant filter shapes the harmonic content of a signal. Cutoff determines which frequencies pass. Resonance emphasizes frequencies at the cutoff point.',
  learningSummary:
    'A filter removes or emphasizes frequencies. Sweep the cutoff to hear the sound change character.',
  hp: 12,
  category: 'modifier',
  accentColor: '#ff6b35',

  ports: [
    {
      id: 'in',
      label: 'IN',
      direction: 'input',
      signalType: 'audio',
    },
    {
      id: 'cutoff-cv',
      label: 'FREQ CV',
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
      id: 'frequency',
      label: 'CUTOFF',
      type: 'knob',
      min: 20,
      max: 20000,
      default: 1000,
      curve: 'exponential',
      unit: 'Hz',
    },
    {
      id: 'resonance',
      label: 'RES',
      type: 'knob',
      min: 0.0001,
      max: 30,
      default: 1,
      curve: 'linear',
      unit: '',
    },
    {
      id: 'type',
      label: 'TYPE',
      type: 'select',
      options: ['lowpass', 'highpass', 'bandpass'],
      default: 'lowpass',
    },
  ],
}

export default filterDefinition
