# PatchGlow

**A visual modular synthesizer that teaches synthesis by showing you what's happening.**

![PatchGlow Screenshot](docs/screenshots/demo-patch.png)

## What Is This?

PatchGlow is a browser-based modular synthesizer built for learning. Instead of hiding what audio signals are doing behind knobs and labels, PatchGlow makes every signal visible — oscillator waveforms dance in real time, cables ripple with the audio they carry, envelopes rise and fall on screen as they shape your sound.

It's modeled after Eurorack hardware synthesizers: you place modules in a virtual rack, connect them with patch cables, and build sounds from scratch. Each module has a focused job — an oscillator generates a waveform, a filter removes harmonics, an envelope shapes volume over time — and you wire them together to create something that sounds (and looks) alive.

PatchGlow is designed for anyone curious about how synthesizers work. No prior experience required. Start the audio, load the demo patch, and watch the signal flow from oscillator to speaker.

## Live Demo

**[patchglow.app](https://patchglow.app)**

## Features

- **8 Modules** — Oscillator, Filter, VCA, Envelope, LFO, Mixer, Keyboard, and Output
- **Waveform-Riding Cables** — patch cables show the actual audio waveform traveling through them
- **Three Signal Types** — audio (cyan), CV/control voltage (amber), and gate (green), with type-safe connections
- **Multi-Row Rack** — Eurorack-style layout with rail holes, HP grid, and mounting screws
- **Real-Time Visualizations** — every module renders its internal state live (waveforms, spectra, envelope shapes, key states)
- **Patch Save/Load** — export and import patches as JSON files
- **Autosave** — your rack state persists automatically across sessions
- **Viewport Zoom** — pinch-to-zoom, keyboard shortcuts (Cmd+/−), and auto-fit

## Quick Start

```bash
git clone https://github.com/YOURUSERNAME/patchglow.git
cd patchglow
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and click **START AUDIO**.

## Your First Patch

1. Click **START AUDIO** (or click anywhere on the overlay)
2. Click **DEMO** in the toolbar to load the subtractive voice patch
3. Click the on-screen keyboard to play notes
4. Watch the signal flow: Keyboard → Oscillator → Filter → VCA → Output
5. Try tweaking the oscillator waveform, filter cutoff, or envelope attack

Or build from scratch:

1. Click **ADD → Oscillator**, then **ADD → Output**
2. Drag from the oscillator's **OUT** port to the output's **IN** port — you'll hear a tone
3. Add a **Filter** between them, add a **Keyboard** and connect its **V/OCT** to the oscillator
4. Add an **Envelope** and **VCA** to shape notes — connect the keyboard's **GATE** to the envelope's **GATE**

## Tech Stack

- **React 18** — UI components with CSS Modules
- **TypeScript** — strict mode, no `any`
- **Vite** — dev server and production builds
- **Tone.js** — Web Audio abstraction layer
- **Zustand** — lightweight state management
- **@dnd-kit** — drag-and-drop module positioning

## Architecture

PatchGlow follows a three-layer architecture:

```
UI Layer          →  React components (Rack, ModulePanel, CableLayer, Toolbar)
State Layer       →  Zustand store (modules, connections, parameters)
Audio Layer       →  AudioEngineManager → per-module Tone.js engines
```

Each module is a self-contained package with three files:

| File | Purpose |
|------|---------|
| `definition.ts` | Static metadata: name, ports, parameters, HP width, accent color |
| `engine.ts` | Audio engine: Tone.js nodes, signal routing, parameter handling |
| `Visualization.tsx` | Real-time visual: canvas/SVG rendering driven by engine data |

The `AudioEngineManager` singleton subscribes to the Zustand store and keeps the Web Audio graph in sync — creating/disposing engine instances when modules are added/removed, and connecting/disconnecting Tone.js nodes when cables change.

See the in-app **DOCS** button for the full technical reference.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, module creation guide, and contribution checklist.

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
