import type { ModuleDefinition } from '@/types/module'

const envelopeDefinition: ModuleDefinition = {
  type: 'envelope',
  name: 'Envelope',
  description:
    'An envelope shapes a control signal over time — typically used to control volume or filter cutoff. The four stages define how the sound evolves from note-on to note-off.',
  learningSummary:
    'An envelope opens and closes like a door. Attack is how fast it opens, Release is how fast it closes.',
  hp: 10,
  category: 'modulation',
  accentColor: '#a855f7',

  ports: [
    {
      id: 'gate',
      label: 'GATE',
      direction: 'input',
      signalType: 'gate',
      description: 'Gate input — high triggers attack, low triggers release',
    },
    {
      id: 'out',
      label: 'ENV OUT',
      direction: 'output',
      signalType: 'cv',
      description: 'Envelope CV output (0 to 1)',
    },
    {
      id: 'inv-out',
      label: 'INV OUT',
      direction: 'output',
      signalType: 'cv',
      description: 'Inverted envelope CV output (1 to 0)',
    },
  ],

  parameters: [
    {
      id: 'attack',
      label: 'ATK',
      type: 'knob',
      min: 0.001,
      max: 5.0,
      default: 0.01,
      curve: 'exponential',
      unit: 's',
      description: 'Attack time — how quickly the envelope rises to peak',
    },
    {
      id: 'decay',
      label: 'DEC',
      type: 'knob',
      min: 0.001,
      max: 5.0,
      default: 0.2,
      curve: 'exponential',
      unit: 's',
      description: 'Decay time — how quickly the envelope falls to sustain level',
    },
    {
      id: 'sustain',
      label: 'SUS',
      type: 'knob',
      min: 0,
      max: 1,
      default: 0.7,
      curve: 'linear',
      unit: '',
      description: 'Sustain level — the held level while the gate is open',
    },
    {
      id: 'release',
      label: 'REL',
      type: 'knob',
      min: 0.001,
      max: 10.0,
      default: 0.5,
      curve: 'exponential',
      unit: 's',
      description: 'Release time — how quickly the envelope falls to zero after gate closes',
    },
  ],
}

export default envelopeDefinition
