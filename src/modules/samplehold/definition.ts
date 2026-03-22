import type { ModuleDefinition } from '@/types/module'

const sampleHoldDefinition: ModuleDefinition = {
  type: 'samplehold',
  name: 'S&H',
  description: 'Sample and Hold — captures the input signal value on each trigger and holds it until the next',
  learningSummary: 'Sample & Hold grabs a snapshot of an input signal each time it receives a trigger, creating staircase patterns. Feed it noise for random voltages.',
  hp: 8,
  category: 'utility',
  accentColor: '#fbbf24',

  ports: [
    {
      id: 'signal-in',
      label: 'SIG',
      direction: 'input',
      signalType: 'cv',
      description: 'Signal to sample',
    },
    {
      id: 'trigger',
      label: 'TRIG',
      direction: 'input',
      signalType: 'gate',
      description: 'Trigger input — rising edge samples the signal',
    },
    {
      id: 'out',
      label: 'OUT',
      direction: 'output',
      signalType: 'cv',
      description: 'Held CV output',
    },
  ],

  parameters: [],
}

export default sampleHoldDefinition
