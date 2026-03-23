# PatchGlow — Project Status

**Date**: 2026-03-23
**Version**: 0.1.0
**Build**: passing (1086 modules, 2.9s)
**Live**: [patchglow.app](https://patchglow.app)

---

## 1. Project Overview

PatchGlow is an open-source, browser-based modular Eurorack synthesizer emulator built as an interactive visual learning tool for synthesis. Every module visualizes what it does in real time. Every patch cable shows actual signal flowing through it. The aesthetic is retro-futurist — dark panels, neon glow, CRT warmth. The target user knows little about synthesis and learns by patching, turning knobs, and watching what happens. The guiding principle: if a knob turns and nothing visibly changes, either the knob shouldn't exist or the visualization is missing something.

~9,700 lines of TypeScript/TSX application code. Zero `any` types. TypeScript strict mode enforced throughout.

---

## 2. Module Inventory

| # | Module | HP | Category | Description | Status |
|---|--------|----|----------|-------------|--------|
| 1 | Oscillator | 14 | source | Band-limited oscillator with 4 waveforms, V/Oct + FM inputs | Complete |
| 2 | Filter | 12 | modifier | Resonant lowpass/highpass/bandpass with CV-controlled cutoff | Complete |
| 3 | Envelope | 10 | modulation | ADSR envelope generator with normal + inverted outputs | Complete |
| 4 | VCA | 8 | modifier | Voltage-controlled amplifier with CV and manual level control | Complete |
| 5 | LFO | 10 | modulation | Low-frequency oscillator (0.01-50 Hz) with sync input | Complete |
| 6 | Mixer | 8 | utility | 3-channel summing mixer with per-channel level controls | Complete |
| 7 | Keyboard | 16 | source | Computer keyboard to V/Oct pitch + gate signals with octave offset | Complete |
| 8 | Output | 16 | output | Master output with volume control, oscilloscope + spectrum display | Complete |
| 9 | Noise | 6 | source | White/pink/brown noise generator with level control | Complete |
| 10 | Delay | 12 | modifier | Feedback delay with time (0.01-2s), feedback, mix, time CV input | Complete |
| 11 | Reverb | 10 | modifier | Reverb with decay (0.1-15s), damping, and mix controls | Complete |
| 12 | Distortion | 10 | modifier | Waveshaper with 3 modes (soft clip, hard clip, wave fold) + drive + mix | Complete |
| 13 | Sample & Hold | 8 | utility | Samples input on trigger rising edge, holds until next trigger | Complete |
| 14 | Sequencer | 18 | source | Step sequencer (4/8/16 steps) with tempo, gate length, external clock/reset | Complete |

All 14 modules follow an identical 4-file structure: `definition.ts`, `engine.ts`, `Visualization.tsx`, `index.ts`. Exception: keyboard adds a 5th file for piano key CSS.

---

## 3. Feature Status

### Core Systems

| Feature | Status | Notes |
|---------|--------|-------|
| Audio engine (Tone.js + Web Audio) | Complete | Singleton AudioEngineManager syncs Tone.js graph with Zustand state |
| State management (Zustand) | Complete | subscribeWithSelector middleware for fine-grained reactivity |
| Undo/redo | Complete | Snapshot stack (max 50), parameter change batching, Ctrl+Z/Ctrl+Shift+Z |
| Patch persistence (autosave) | Complete | 500ms debounce, localStorage, beforeunload flush, quota error handling |
| Save / Load / Export (JSON files) | Complete | Versioned patch format (v1) |
| URL patch sharing | Complete | deflate-raw compression + base64url in URL hash, SHARE button |
| Welcome screen | Complete | Desktop-only, two paths: demo patch or empty rack |
| Mobile detection | Complete | Reactive via useSyncExternalStore, updates on resize/rotation |
| Touch interaction (iPad) | Complete | Pinch-to-zoom, touch cable drag, iOS-specific pointer fixes |
| Fullscreen toggle | Complete | Via toolbar button |
| About modal | Complete | Version, acknowledgments, GitHub link |
| User guide documentation | Complete | Self-contained HTML at /docs/guide.html |
| Technical documentation | Complete | Self-contained HTML at /docs/technical.html |

### Rack & Modules

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-row rack layout | Complete | 3 rows, 84 HP each, rail visualization with hole markers |
| Module drag repositioning | Complete | Snap-to-grid, overlap detection, zoom-compensated, 200ms/500ms press delay |
| Zoom controls and FIT | Complete | +/-, Ctrl+0, pinch-to-zoom, FIT button, range 40%-150% |
| OFF button | Complete | Mutes module output, dims panel to 30% opacity |
| BYPASS button | Complete | Routes signal around processing, dims controls to 40% opacity |
| SOLO button | Complete | Routes only soloed module to output, gold glow, dims others to 70% |
| HELP button | Complete | Per-module educational help panel with synthesis concepts |
| Per-module help content | Complete | 14 entries in helpContent.ts, educational focus |

### Cable System

| Feature | Status | Notes |
|---------|--------|-------|
| 5-layer cable rendering | Complete | Glow field, body, core, signal viz, selection highlight |
| Signal-reactive brightness | Complete | 8x opacity range (0.12 idle to 1.0 active) based on signal level |
| Signal-reactive width | Complete | 2px idle to 4px+ active |
| Audio cable dynamics | Complete | Heat coloring (blue-cyan-white), frequency-reactive speed, waveform riding |
| CV cable dynamics | Complete | Envelope history buffer (128 samples), instant brightness response |
| Gate cable pulse animation | Complete | Fuse-burning attack (dark-white-magenta), binary idle/active, instant release |
| Cross-type signal indicator | Complete | Dashed stripe in destination color when signal types mismatch |
| Waveform riding path | Complete | 64 sample points, bezier interpolation, amplitude modulation |
| Endpoint sparks | Complete | Bloom circles at cable-port connections |

### Visualizations (per module)

| Module | Visualization | Status |
|--------|--------------|--------|
| Oscillator | Waveform + FFT spectrum | Complete |
| Filter | Frequency response curve with resonance peak | Complete |
| Envelope | ADSR curve with animated playhead | Complete |
| VCA | Input waveform x control = output waveform | Complete |
| LFO | Oscillating wave display | Complete |
| Mixer | Per-channel level meters | Complete |
| Keyboard | Piano keys with active note highlight | Complete |
| Output | Oscilloscope + spectrum analyzer | Complete |
| Noise | Noise character visualization | Complete |
| Delay | Delay tap visualization | Complete |
| Reverb | Decay envelope visualization | Complete |
| Distortion | Transfer curve + before/after waveform | Complete |
| Sample & Hold | Staircase output display | Complete |
| Sequencer | Step grid with playhead | Complete |

### Preset Patches

| Patch | Description | Status |
|-------|-------------|--------|
| Neon Dreams | Full 15-module showcase using all signal types | Complete |
| Sequencer Melody | Step sequencer melody at 140 BPM | Complete |
| Random Melody | Noise -> S&H random pitch generation | Complete |
| Ambient Pad | Slow LFO, long reverb atmospheric | Complete |
| Basic Voice | Minimal subtractive synthesizer voice | Complete |

---

## 4. Architecture Summary

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React + TypeScript | 18.3.0 / 5.4.0 |
| Audio | Tone.js (Web Audio) | 15.1.0 |
| State | Zustand | 5.0.0 |
| Drag & Drop | @dnd-kit | 6.3.0 / 10.0.0 |
| Build | Vite | 6.4.0 |
| Styling | CSS Modules + custom properties | - |
| Cable rendering | SVG with React | - |
| Visualizations | Canvas 2D (per module) | - |

### File Structure (top level)

```
src/
  main.tsx              # React bootstrap
  App.tsx               # Root: welcome screen, audio init, zoom, module registration
  engine/               # AudioEngineManager singleton, module registry, signal types
  store/                # Zustand store (rackStore), persistence, patch URL encoding
  types/                # ModuleDefinition, RackModule, Connection, RackStore
  modules/              # 14 modules + _shared utilities (GatePoller, bypassRouting, drawUtils)
  ui/
    Toolbar/            # Top bar: audio start, add module, save/load, zoom, presets
    Rack/               # 3-row rack grid, module rendering, drag repositioning
    Cables/             # 5-layer SVG cables, signal monitor, drag preview
    ModulePanel/        # Panel wrapper, knob, port, switch, label (OFF/BYPASS/SOLO/HELP)
    HelpPanel/          # Per-module help documentation modal
    HelpTooltip/        # Contextual tooltips
    utils/              # Shared UI utilities (computeFitZoom)
  data/                 # Educational help content for all 14 modules
  theme/                # CSS variables, global reset, fonts
public/
  patches/              # 5 JSON preset patches
  docs/                 # User guide + technical reference (self-contained HTML)
```

### Module Interface Contract

Every module implements `ModuleRegistration` which bundles three things:
1. **`definition.ts`** — `ModuleDefinition`: type ID, name, HP width, category, ports (with signal types), parameters (with ranges and curves), accent color
2. **`engine.ts`** — `ModuleAudioEngine`: Tone.js audio graph, parameter updates, visualization data, dispose
3. **`Visualization.tsx`** — React component rendering real-time canvas display

Adding a new module: 4 new files + register in `App.tsx` + add help content in `helpContent.ts`.

### State Management

Zustand store (`rackStore.ts`) is the single source of truth for modules, connections, parameters, and UI state. The AudioEngineManager subscribes to store changes via `subscribeWithSelector` and keeps the Tone.js graph in sync. UI reads from the store and dispatches actions. The store avoids circular imports with the module registry via lazy injection (`setRegistryLookup()`).

### Audio Engine

`AudioEngineManager` is a singleton that:
- Creates/destroys `ModuleAudioEngine` instances when modules are added/removed
- Connects/disconnects Tone.js nodes when connections change
- Forwards parameter changes to engine instances
- Provides visualization data (waveform, spectrum, envelope) to UI at 60fps via `getVisualizationData()`

---

## 5. Code Review Findings

### Summary

A comprehensive architecture, code quality, and signal accuracy audit was performed covering every file in the codebase. The audit identified 4 critical bugs, 6 high-severity issues, 8 medium issues, and 6 low issues. All findings were organized into a 4-sprint refactoring plan and executed.

### What Was Fixed (Sprints 1-4)

**Sprint 1 — Correctness (7 fixes):**
- Mixer bypass no longer destroys channel levels (saves/restores gain values)
- Persistence subscription leak guarded (tracks unsubscribe function)
- localStorage quota errors caught silently
- Corrupt autosave entries cleared on parse failure
- `beforeunload` handler flushes pending autosave
- Engine dispose wrapped in try/catch (prevents cascading failures)
- `addConnection` duplicate check moved inside atomic `set()` callback

**Sprint 2 — Architecture (8 changes):**
- Extracted `computeFitZoom` to shared utility (`src/ui/utils/layout.ts`)
- Extracted `normalizeFFT` to shared drawUtils
- Created `GatePoller` class (replaced 4 duplicate implementations)
- Created `bypassRouting` helper (replaced 3 duplicate implementations)
- Added defensive bypass handler to noise module
- Added patch format versioning (`version: 1`)
- Module counter reset on import (prevents ID collisions)
- Removed duplicate patch file (`subtractive-voice.json`)

**Sprint 3 — Code Quality (8 changes):**
- Type aliases for Tone.js node returns (`AudioOutputNode`, `AudioInputNode`)
- `aria-label` on all icon buttons (Help, Solo, Bypass, Off)
- `role="status" aria-live="polite"` on toast notifications
- Reactive `isMobile` via `useSyncExternalStore`
- Memoized `modulesByRow` in Rack
- Improved connection error logging with connection IDs
- JSDoc on all `VisualizationData` fields
- `soloGain` cleanup in AudioEngineManager

**Sprint 4 — Future-Proofing (3 features):**
- Cross-type cable connections with visual indicator (dashed stripe + dest-colored spark)
- Undo/redo with snapshot stack (max 50), parameter batching, keyboard shortcuts
- URL-based patch sharing (deflate-raw + base64url, SHARE button)

**Net delta**: +598 lines added, -441 removed across 29 files.

### What Remains as Known Technical Debt

| Item | Severity | Description |
|------|----------|-------------|
| P3.6 — React.memo on module cards | Low | All modules re-render when any module's parameters change. Fix requires extracting inline render block (~140 lines) in Rack.tsx into a separate component. Deferred as low-priority performance item. |
| Output module inconsistent API | Low | Uses `volume.mute` for off instead of `gain.value = 0` like other modules. Functionally correct. |
| Store → Registry fragile coupling | Low | `setRegistryLookup()` injection works but is fragile. Would break if initialization order changes. |
| Mixer has no headroom management | Informational | Three full-level inputs can exceed 0dBFS. Acceptable — real Eurorack mixers also clip. |

### Signal Accuracy

**All 14 modules passed signal accuracy verification.** No signal issues found. Key checks:
- V/Oct consistent between keyboard and sequencer: both use `(midiNote - 69) * 100` cents
- Gate is clean 0/1 from all sources, all receivers use `> 0.5` threshold
- Filter uses native Web Audio BiquadFilter (mathematically correct IIR)
- Oscillator uses Tone.js PeriodicWave (band-limited, no aliasing)
- Noise types are spectrally correct (white = flat, pink = -3dB/oct, brown = -6dB/oct)
- ADSR envelope timing and curve shapes verified against Tone.Envelope specs
- Delay feedback capped at 0.95 (no runaway feedback)

---

## 6. Known Bugs and Issues

### Confirmed Bugs

None currently known. All bugs identified in the audit have been fixed.

### UI Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| Module card re-renders | Low | All module cards re-render on any parameter change due to missing React.memo (P3.6). Not perceptible on desktop with <15 modules. |
| Sequencer clock drift | Low | Internal clock uses `setInterval` which can drift under heavy load. Not perceptible at normal tempos. External clock input is precise. |
| Reverb impulse response regeneration | Low | Changing reverb decay regenerates the convolution impulse response, which takes ~100ms. Brief audio gap during regeneration. This is a Tone.Reverb limitation. |

### Browser-Specific Issues

| Browser | Issue | Status |
|---------|-------|--------|
| iOS Safari | Audio context requires user gesture to start | Handled — tap-to-start overlay |
| iOS Chrome | AudioContext resume must be synchronous in gesture handler | Fixed (commit 3128907) |
| iPhone Safari | Source nodes must defer `.start()` until context is running | Fixed (commit 71bca9e) |
| iOS all | Overlay portals needed to escape `overflow:hidden` | Fixed (commit 790062c) |
| Firefox | No known issues | - |
| Chrome desktop | No known issues | - |
| Safari desktop | No known issues | - |

### Audio Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| No headroom management in mixer | Informational | Summing 3 full-level signals clips. Expected behavior matching real hardware. |
| Delay time change artifacts | Informational | Changing delay time while audio plays causes subtle pitch artifacts. Expected BBD-style behavior from Tone.FeedbackDelay. |

---

## 7. Performance Notes

### Desktop (Chrome, M1 MacBook-class hardware)

- **Frame rate**: Stable 60fps with the full Neon Dreams patch (15 module instances, 14 cables)
- **Audio latency**: ~128 samples (2.7ms at 48kHz), determined by Web Audio buffer size
- **Build time**: 2.9s (1086 Vite modules)
- **Bundle size**: Not measured (no production profiling done yet)

### iPad

- **Frame rate**: ~55-60fps with Neon Dreams patch. Occasional drops to ~45fps during complex interactions (dragging modules while audio plays).
- **Touch responsiveness**: Good. Cable drag, module drag, and pinch-to-zoom all functional.
- **Audio startup**: Requires tap gesture (handled by overlay).

### Performance-Heavy Features

| Feature | Impact | Notes |
|---------|--------|-------|
| Cable signal visualization | Medium | Each cable runs its own signal analysis per frame (FFT, waveform sampling). Cost scales linearly with cable count. |
| Canvas visualizations | Medium | 14 individual `<canvas>` elements at 60fps. Batched via shared RAF loop (`useAnimationFrame`). |
| Analyser nodes | Low-Medium | Each module with visualization creates a Tone.Analyser. FFT computation runs in Web Audio thread. |
| Module re-renders | Low | Without React.memo, all modules re-render on any state change. Mitigated by Zustand's selector-based subscription. |

### Cable Count Degradation

No formal benchmarking done. Anecdotal observations:
- **0-15 cables**: No perceptible impact
- **15-25 cables**: Slight frame time increase on slower hardware
- **25+ cables**: Not tested (rack layout limits practical cable count since modules fill 3 rows)

The practical maximum is approximately 20 modules across 3 rows (252 HP total), which limits cable count to roughly 30-40 connections.

---

## 8. What's Next

### From SPEC.md Phase 5 (not yet built)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Signal probes | Click any cable to see a popup oscilloscope showing that cable's signal | Medium |
| Guided patches | Tutorial mode walking the user through building their first patch step-by-step | Large |
| Web MIDI support | Connect a physical MIDI keyboard | Medium |
| Preset sounds | Pre-built module configurations (e.g., oscillator presets for bass, lead, pad) | Small |
| Dark/light theme toggle | Dark is default and primary, add light option | Medium |
| Module contributions guide | Detailed CONTRIBUTING.md with template for adding new modules | Small |

### Architectural Improvements Worth Considering

| Improvement | Rationale |
|-------------|-----------|
| React.memo on module cards (P3.6) | Prevents unnecessary re-renders as module count grows |
| Bundle size analysis | No production profiling done yet. Tree-shaking effectiveness unknown. |
| Web Worker for signal analysis | Move CableSignalMonitor FFT/waveform sampling off main thread |
| Module lazy loading | Dynamic import modules to reduce initial bundle |
| E2E tests | No test suite exists. Critical paths (patch save/load, connection creation) are untested. |

### UX Issues Worth Attention

| Issue | Description |
|-------|-------------|
| No visual feedback for undo/redo | Ctrl+Z works but there's no indicator of what was undone |
| No cable deletion via right-click | Cables can only be deleted by selecting + pressing Delete |
| Module context menu is basic | Right-click only offers "Remove module" — could include duplicate, move to row, etc. |
| No module search/filter | With 14 modules, the ADD section is getting long. A filter or categorized dropdown would help. |
| Share link length | Complex patches produce long URLs. No URL shortener integration. |
| No audio level metering | No master level meter or clipping indicator in the output module |
| Rack scroll on mobile | Horizontal scrolling through a 3-row, 84HP rack on a phone is awkward |
