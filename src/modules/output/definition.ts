import type { ModuleDefinition } from '@/types/module'

const outputDefinition: ModuleDefinition = {
  type: 'output',
  name: 'Output',
  description: 'Master output — routes audio to your speakers',
  learningSummary: 'This is where sound leaves the synth. The oscilloscope shows exactly what waveform is playing.',
  hp: 16,
  category: 'output',
  accentColor: '#ffffff',

  ports: [
    {
      id: 'in',
      label: 'IN',
      direction: 'input',
      signalType: 'audio',
      description: 'Audio signal to output to speakers',
    },
  ],

  parameters: [
    {
      id: 'volume',
      label: 'VOLUME',
      type: 'knob',
      min: -60,
      max: 0,
      default: -12,
      unit: 'dB',
      curve: 'linear',
      description: 'Master output volume in decibels',
    },
  ],
}

export default outputDefinition
