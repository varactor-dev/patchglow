import type { ModuleDefinition } from '@/types/module'

const sequencerDefinition: ModuleDefinition = {
  type: 'sequencer',
  name: 'Sequencer',
  description: 'Step sequencer — generates pitched CV and gate patterns from an editable step grid',
  learningSummary: 'A sequencer plays a repeating pattern of notes. Each step has a pitch and the sequencer advances through them at a set tempo.',
  hp: 18,
  category: 'source',
  accentColor: '#ff2ecb',

  ports: [
    {
      id: 'cv-out',
      label: 'CV',
      direction: 'output',
      signalType: 'cv',
      description: 'Pitch CV output — 1V/Oct cents relative to A4',
    },
    {
      id: 'gate-out',
      label: 'GATE',
      direction: 'output',
      signalType: 'gate',
      description: 'Gate output — high while step is active',
    },
    {
      id: 'clock-in',
      label: 'CLK',
      direction: 'input',
      signalType: 'gate',
      description: 'External clock input — rising edge advances step',
    },
    {
      id: 'reset',
      label: 'RST',
      direction: 'input',
      signalType: 'gate',
      description: 'Reset input — rising edge resets to step 1',
    },
  ],

  parameters: [
    {
      id: 'tempo',
      label: 'BPM',
      type: 'knob',
      min: 30,
      max: 300,
      default: 120,
      unit: 'bpm',
      curve: 'linear',
      description: 'Internal clock tempo in beats per minute',
    },
    {
      id: 'gate-length',
      label: 'GATE',
      type: 'knob',
      min: 5,
      max: 95,
      default: 50,
      unit: '%',
      curve: 'linear',
      description: 'Gate length as percentage of step duration',
    },
    {
      id: 'step-count',
      label: 'STEPS',
      type: 'select',
      options: ['4', '8', '16'],
      default: '8',
      description: 'Number of active steps in the sequence',
    },
  ],
}

export default sequencerDefinition
