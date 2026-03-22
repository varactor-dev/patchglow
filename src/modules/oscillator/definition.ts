import type { ModuleDefinition } from '@/types/module'

const oscillatorDefinition: ModuleDefinition = {
  type: 'oscillator',
  name: 'Oscillator',
  description: 'Generates a periodic waveform — the fundamental sound source',
  learningSummary: 'Sound is a repeating waveform. Frequency = pitch. Different shapes have different harmonic content.',
  hp: 14,
  category: 'source',
  accentColor: '#00e5ff',

  ports: [
    {
      id: 'voct',
      label: 'V/OCT',
      direction: 'input',
      signalType: 'cv',
      description: '1V per octave pitch control — connect from keyboard CV output',
    },
    {
      id: 'fm',
      label: 'FM',
      direction: 'input',
      signalType: 'cv',
      description: 'Frequency modulation — CV controls pitch deviation',
    },
    {
      id: 'out',
      label: 'OUT',
      direction: 'output',
      signalType: 'audio',
      description: 'Audio signal output',
    },
  ],

  parameters: [
    {
      id: 'frequency',
      label: 'FREQ',
      type: 'knob',
      min: 20,
      max: 20000,
      default: 440,
      unit: 'Hz',
      curve: 'exponential',
      description: 'Base frequency in Hz. 440 Hz = A4 (concert pitch)',
    },
    {
      id: 'detune',
      label: 'FINE',
      type: 'knob',
      min: -100,
      max: 100,
      default: 0,
      unit: 'ct',
      curve: 'linear',
      description: 'Fine-tune in cents (100 cents = 1 semitone)',
    },
    {
      id: 'waveform',
      label: 'WAVE',
      type: 'select',
      options: ['sine', 'triangle', 'sawtooth', 'square'],
      default: 'sawtooth',
      description: 'Waveform shape — determines harmonic content',
    },
  ],
}

export default oscillatorDefinition
