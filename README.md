# PatchGlow

**A visual modular synthesizer in your browser — patch, play, and *see* sound.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-patchglow.app-ff6b35)](https://patchglow.app)

<!-- TODO: Add hero screenshot or GIF -->

PatchGlow is a browser-based modular synthesizer built for learning. Every module visualizes its function in real time, patch cables glow with the actual signal flowing through them, and you can click any cable to inspect the live waveform. It's modeled after Eurorack hardware synthesizers — place modules in a virtual rack, connect them with patch cables, and build sounds from scratch.

No install, no plugins. Open the app and start patching.

## Features

- **Signal-reactive patch cables** — cables glow, pulse, and deform based on the audio, CV, or gate signal flowing through them
- **16 fully functional modules** — Oscillator, Filter, VCA, Envelope, LFO, Mixer, Keyboard, Output, Noise, Delay, Reverb, Distortion, Sample & Hold, Sequencer, Drum Synth, and Quantizer
- **Real-time visualizations** — every module renders its internal state live (waveforms, spectra, envelope shapes, drum grids, piano keys)
- **Signal probes** — click any cable to see an oscilloscope of the signal flowing through it
- **7 demo patches** — progressive presets from simple oscillator-to-speaker up to full drum machines
- **Drum Synth** — synthesized kick/snare/hat with a built-in 16-step sequencer
- **Quantizer** — snaps pitch CV to musical scales with piano keyboard visualization
- **Module controls** — OFF, BYPASS, SOLO, and HELP buttons on every module
- **Cable display modes** — press C to cycle between clean, subtle, and full signal visualization
- **Three signal types** — audio (amber), CV/control voltage (cyan), and gate (magenta) with type-safe connections
- **Patch save/load & URL sharing** — export patches as JSON or share via compressed URL
- **Undo/redo** — full patch history with Ctrl+Z / Ctrl+Shift+Z
- **Fully browser-based** — no install, no plugins, works on desktop and iPad

## Demo Patches

| Patch | Description |
|-------|-------------|
| **First Light** | Your first sound — a single oscillator connected to the output |
| **Pulse** | Simple rhythm with an LFO modulating the VCA |
| **Drift** | Evolving pad with slow modulation and filtering |
| **Echo Chamber** | Delay effect demonstration with feedback and modulation |
| **Neon Dreams** | Full showcase using all three signal types — the default patch |
| **The Grid** | TRON-inspired cinematic pad with layered modulation |
| **Beat Lab** | Drum Synth + Quantizer working together for rhythm and melody |

## Getting Started

```bash
git clone https://github.com/varactor-dev/patchglow.git
cd patchglow
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and click **START AUDIO**. Load a demo patch from the **PATCHES** menu, or build your own from scratch using the **ADD** button.

Requires [Node.js](https://nodejs.org/) 18+.

## Tech Stack

- **React 18** — UI components with CSS Modules
- **TypeScript** — strict mode, zero `any`
- **Tone.js 15** — Web Audio abstraction layer
- **Zustand 5** — lightweight state management
- **Vite 6** — dev server and production builds
- **Canvas 2D** — per-module real-time visualizations
- **SVG** — 5-layer signal-reactive cable rendering

## Project Structure

```
src/
  App.tsx               # Root component, module registration, audio init
  engine/               # AudioEngineManager singleton, signal types
  store/                # Zustand store, persistence, URL sharing
  types/                # TypeScript interfaces (modules, connections, store)
  modules/              # 16 synth modules + shared utilities
  ui/                   # React components (Rack, Cables, Toolbar, Probe, Help)
  data/                 # Educational help content for all modules
  theme/                # CSS variables, global styles, fonts
public/
  patches/              # 7 JSON demo presets
  docs/                 # User guide + technical reference
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, the module creation guide, and contribution checklist.

## Acknowledgments

PatchGlow is made possible by the generosity of the open source community:

- **[Tone.js](https://tonejs.github.io/)** — The Web Audio framework at the heart of PatchGlow's sound engine. Tone.js makes sophisticated audio synthesis accessible in the browser and without it this project simply wouldn't exist. Created by Yotam Mann.

- **[Mutable Instruments](https://pichenettes.github.io/mutable-instruments-documentation)** — Emilie Gillet's decision to open source the firmware for every Mutable Instruments Eurorack module set an extraordinary standard for generosity in the synth community. The DSP algorithms and synthesis concepts behind Plaits, Clouds, Rings, and others were an invaluable reference for understanding how great modules work.

- **[React](https://react.dev)** — The UI framework that makes PatchGlow's modular, component-based architecture possible. Each module in PatchGlow is literally a React component.

- **[Vite](https://vitejs.dev)** — The build tool that enables instant development feedback and fast production builds.

- **[Zustand](https://github.com/pmndrs/zustand)** — The lightweight state management library that tracks every module, cable, and knob position in PatchGlow.

- **[@dnd-kit](https://dndkit.com)** — The drag and drop toolkit that powers module placement and rearrangement in the rack.

- **[Patchcab](https://github.com/spectrome/patchcab)** by Spectrome — An earlier browser-based modular synth built with Tone.js and Svelte that served as architectural inspiration for PatchGlow's module and patching systems.

- **[VCV Rack](https://vcvrack.com)** — The gold standard virtual Eurorack environment. VCV Rack's approach to faithfully emulating the modular synth experience was a constant reference point for how modules should behave and interact.

- **[Orbitron](https://fonts.google.com/specimen/Orbitron)** and **[JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)** — the display and monospace fonts that give PatchGlow its retro-futurist aesthetic.

If you're inspired by PatchGlow, please explore and support these projects. Open source synthesis exists because people choose to share their work.

## License

[MIT](LICENSE) — Copyright 2025 PatchGlow Contributors

## Links

- **Live app**: [patchglow.app](https://patchglow.app)
- **Issues**: [github.com/varactor-dev/patchglow/issues](https://github.com/varactor-dev/patchglow/issues)
- **Contact**: [info@patchglow.app](mailto:info@patchglow.app)
