import type { ModuleDefinition } from '@/types/module'

const drumSynthDefinition: ModuleDefinition = {
  type: 'drumsynth',
  name: 'Drum Synth',
  description: 'Drum machine with kick, snare, and hi-hat — click the grid to make a beat',
  learningSummary: 'Drum sounds are synthesis too — a kick is a sine wave sweeping down in pitch, a snare mixes tone with noise, a hi-hat is filtered noise.',
  hp: 20,
  category: 'source',
  accentColor: '#ff4444',
  ports: [
    { id: 'out', label: 'OUT', direction: 'output', signalType: 'audio', description: 'Mixed drum output' },
    { id: 'kick-out', label: 'KICK', direction: 'output', signalType: 'audio', description: 'Isolated kick voice' },
    { id: 'snare-out', label: 'SNR', direction: 'output', signalType: 'audio', description: 'Isolated snare voice' },
    { id: 'hat-out', label: 'HAT', direction: 'output', signalType: 'audio', description: 'Isolated hi-hat voice' },
    { id: 'clock-in', label: 'CLK', direction: 'input', signalType: 'gate', description: 'External clock overrides BPM' },
    { id: 'reset', label: 'RST', direction: 'input', signalType: 'gate', description: 'Reset to step 1' },
    { id: 'accent', label: 'ACC', direction: 'input', signalType: 'gate', description: 'Accent current step at 130% volume' },
  ],
  parameters: [
    { id: 'bpm', label: 'BPM', type: 'knob', min: 60, max: 200, default: 120, unit: 'bpm', curve: 'linear' },
    { id: 'kick', label: 'KICK', type: 'knob', min: 0, max: 1, default: 0.8, curve: 'linear' },
    { id: 'snare', label: 'SNR', type: 'knob', min: 0, max: 1, default: 0.65, curve: 'linear' },
    { id: 'hat', label: 'HAT', type: 'knob', min: 0, max: 1, default: 0.5, curve: 'linear' },
    { id: 'tone', label: 'TONE', type: 'knob', min: 0, max: 1, default: 0.3, curve: 'linear', description: 'Shifts voice pitch — deep to high' },
    { id: 'decay', label: 'DECAY', type: 'knob', min: 0, max: 1, default: 0.5, curve: 'linear', description: 'Voice decay time — tight to boomy' },
    { id: 'step-count', label: 'STEPS', type: 'select', options: ['4', '8', '16'], default: '16' },
  ],
}

export default drumSynthDefinition
