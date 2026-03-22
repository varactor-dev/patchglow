import type { ModuleDefinition } from '@/types/module'

const delayDefinition: ModuleDefinition = {
  type: 'delay',
  name: 'Delay',
  description: 'Echo / delay effect — repeating reflections that fade over time',
  learningSummary: 'Delay copies a sound and plays it back later. Feedback controls how many times the echo repeats. Mix blends dry and wet.',
  hp: 12,
  category: 'modifier',
  accentColor: '#38bdf8',

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
    {
      id: 'time-cv',
      label: 'TIME',
      direction: 'input',
      signalType: 'cv',
      description: 'CV control of delay time',
    },
  ],

  parameters: [
    {
      id: 'time',
      label: 'TIME',
      type: 'knob',
      min: 0.01,
      max: 2.0,
      default: 0.3,
      unit: 's',
      curve: 'exponential',
      description: 'Delay time in seconds',
    },
    {
      id: 'feedback',
      label: 'FDBK',
      type: 'knob',
      min: 0,
      max: 0.95,
      default: 0.4,
      curve: 'linear',
      description: 'Feedback amount — how many echoes',
    },
    {
      id: 'mix',
      label: 'MIX',
      type: 'knob',
      min: 0,
      max: 1,
      default: 0.5,
      curve: 'linear',
      description: 'Dry/wet mix',
    },
  ],
}

export default delayDefinition
