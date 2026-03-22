import type { ModuleDefinition } from '@/types/module'

const lfoDefinition: ModuleDefinition = {
  type: 'lfo',
  name: 'LFO',
  description: 'An LFO is a slow oscillator that modulates parameters instead of making sound. It creates vibrato, tremolo, and filter sweeps.',
  learningSummary: 'An LFO is an oscillator too slow to hear — it wiggles other parameters. Patch it to a filter cutoff to hear it wobble.',
  hp: 10,
  category: 'modulation',
  accentColor: '#22d3ee',

  ports: [
    {
      id: 'out',
      label: 'OUT',
      direction: 'output',
      signalType: 'cv',
      description: 'CV modulation output — connect to any parameter input',
    },
    {
      id: 'sync',
      label: 'SYNC',
      direction: 'input',
      signalType: 'gate',
      description: 'Gate input — rising edge resets the LFO phase to the start of its cycle',
    },
  ],

  parameters: [
    {
      id: 'rate',
      label: 'RATE',
      type: 'knob',
      min: 0.01,
      max: 50,
      default: 2,
      unit: 'Hz',
      curve: 'exponential',
      description: 'Oscillation speed in Hz — lower values create slow sweeps, higher values create fast tremolo',
    },
    {
      id: 'shape',
      label: 'SHAPE',
      type: 'select',
      options: ['sine', 'triangle', 'sawtooth', 'square'],
      default: 'sine',
      description: 'Waveform shape — sine is smooth, square is snappy, sawtooth ramps up then drops',
    },
    {
      id: 'depth',
      label: 'DEPTH',
      type: 'knob',
      min: 0,
      max: 1,
      default: 0.5,
      unit: '',
      curve: 'linear',
      description: 'Modulation amount — how far the LFO swings from center',
    },
  ],
}

export default lfoDefinition
