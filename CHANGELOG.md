# Changelog

## v1.0.0 — Public Launch (2026-03-29)

First public release of PatchGlow.

### Modules

- 16 fully functional modules with real-time visualizations: Oscillator, Filter, VCA, Envelope, LFO, Mixer, Keyboard, Output, Noise, Delay, Reverb, Distortion, Sample & Hold, Sequencer, Drum Synth, Quantizer
- Drum Synth with synthesized kick/snare/hat and built-in 16-step sequencer
- Quantizer with piano keyboard visualization and scale selection (chromatic, major, minor, pentatonic, blues)
- Module controls: OFF, BYPASS, SOLO, HELP on every module

### Cable System

- Signal-reactive patch cables with glow and deformation based on signal content
- Three signal types: audio (amber), CV (cyan), gate (magenta)
- Cable display modes: Clean / Subtle / Full (C key to cycle)
- Cross-type signal indicator for mismatched connections
- Signal probes: click any cable to inspect live waveform and spectrum

### Patches & Persistence

- 7 demo patches: First Light, Pulse, Drift, Echo Chamber, Neon Dreams, The Grid, Beat Lab
- Patch save/load via JSON export/import
- URL-based patch sharing (compressed URL hash)
- Autosave to localStorage
- Undo/redo with Ctrl+Z / Ctrl+Shift+Z

### UI

- Multi-row Eurorack rack layout (3 rows, 84 HP each)
- Drag-and-drop module repositioning
- Viewport zoom (pinch, keyboard shortcuts, FIT button)
- Per-module educational help system
- User guide and technical reference documentation
- Touch support for iPad
