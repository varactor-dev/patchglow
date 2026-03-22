import type { ModuleDefinition } from '@/types/module'

const distortionDefinition: ModuleDefinition = {
  type: 'distortion',
  name: 'Distortion',
  description: 'Waveshaper — soft clip, hard clip, and wave folding for harmonic richness and grit',
  learningSummary: 'Distortion reshapes a waveform by clipping or folding it. This adds harmonics, making the sound brighter and grittier.',
  hp: 10,
  category: 'modifier',
  accentColor: '#ef4444',

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
      description: 'Audio output',
    },
  ],

  parameters: [
    {
      id: 'drive',
      label: 'DRIVE',
      type: 'knob',
      min: 0,
      max: 1,
      default: 0.3,
      curve: 'linear',
      description: 'Distortion intensity',
    },
    {
      id: 'mode',
      label: 'MODE',
      type: 'select',
      options: ['soft', 'hard', 'fold'],
      default: 'soft',
      description: 'Clipping mode — soft (tanh), hard (clip), fold (wave folding)',
    },
    {
      id: 'mix',
      label: 'MIX',
      type: 'knob',
      min: 0,
      max: 1,
      default: 1.0,
      curve: 'linear',
      description: 'Dry/wet mix',
    },
  ],
}

export default distortionDefinition
