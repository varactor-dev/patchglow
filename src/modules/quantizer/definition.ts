import type { ModuleDefinition } from '@/types/module'

const quantizerDefinition: ModuleDefinition = {
  type: 'quantizer',
  name: 'Quantizer',
  description: 'Snaps pitch CV to the nearest note in a musical scale',
  learningSummary: 'A quantizer forces any voltage to the nearest note in your chosen key and scale — turning random or imprecise signals into music.',
  hp: 8,
  category: 'utility',
  accentColor: '#88ff88',
  ports: [
    { id: 'cv-in', label: 'IN', direction: 'input', signalType: 'cv', description: 'Unquantized pitch CV input' },
    { id: 'trig-in', label: 'TRIG', direction: 'input', signalType: 'gate', description: 'Optional trigger — quantize only on rising edge' },
    { id: 'cv-out', label: 'OUT', direction: 'output', signalType: 'cv', description: 'Quantized pitch CV output' },
    { id: 'trig-out', label: 'CHNG', direction: 'output', signalType: 'gate', description: 'Trigger pulse when output note changes' },
  ],
  parameters: [
    { id: 'root', label: 'ROOT', type: 'select', options: ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'], default: 'A', description: 'Root note of the scale' },
    { id: 'scale', label: 'SCALE', type: 'select', options: ['chromatic','major','minor','pentatonic','blues'], default: 'pentatonic', description: 'Scale type' },
  ],
}

export default quantizerDefinition
