# PatchGlow Backlog

Ideas and planned features open for contribution. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.

---

## Features

| Feature | Description | Complexity |
|---------|-------------|------------|
| Guided patches | Tutorial mode walking the user through building their first patch step-by-step | Large |
| Web MIDI support | Connect a physical MIDI keyboard to the Keyboard module | Medium |
| Preset sounds | Pre-built module configurations (e.g., bass, lead, pad presets) | Small |
| Dark/light theme toggle | Add a light theme option alongside the default dark theme | Medium |

## Performance

| Improvement | Rationale |
|-------------|-----------|
| React.memo on module cards | Prevents unnecessary re-renders as module count grows |
| Bundle size analysis | No production profiling done yet; tree-shaking effectiveness unknown |
| Web Worker for signal analysis | Move cable signal monitor FFT/waveform sampling off the main thread |
| Module lazy loading | Dynamic import modules to reduce initial bundle size |

## UX Improvements

| Improvement | Description |
|-------------|-------------|
| Visual feedback for undo/redo | Show an indicator of what was undone/redone |
| Right-click cable deletion | Currently cables require select + Delete key |
| Module context menu | Right-click could offer duplicate, move to row, etc. |
| Module search/filter | Categorized dropdown or search in the ADD menu |
| Audio level metering | Master level meter or clipping indicator in the Output module |

## Testing

| Item | Description |
|------|-------------|
| End-to-end tests | Critical paths (patch save/load, connection creation) are currently untested |
