# Contributing to PatchGlow

## Dev Setup

```bash
git clone https://github.com/YOURUSERNAME/patchglow.git
cd patchglow
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` with hot module replacement.

## How to Add a Module

Each module lives in `src/modules/<name>/` with four files:

### 1. `definition.ts` — Module Metadata

Define the module's identity, ports, and parameters:

```typescript
import type { ModuleDefinition } from '@/types/module'

const myModuleDefinition: ModuleDefinition = {
  type: 'my-module',           // unique identifier
  name: 'My Module',           // display name
  description: 'What it does',
  learningSummary: 'What it teaches the user',
  hp: 14,                      // width in Eurorack HP units (1 HP = 20px)
  category: 'modifier',        // source | modifier | modulation | utility | output
  accentColor: '#ff6600',      // module accent color (used in UI and cables)

  ports: [
    { id: 'in', label: 'IN', direction: 'input', signalType: 'audio' },
    { id: 'out', label: 'OUT', direction: 'output', signalType: 'audio' },
  ],

  parameters: [
    {
      id: 'amount',
      label: 'AMT',
      type: 'knob',
      min: 0, max: 100, default: 50,
      unit: '%',
      curve: 'linear',
    },
  ],
}

export default myModuleDefinition
```

### 2. `engine.ts` — Audio Engine

Implement the `ModuleAudioEngine` interface using Tone.js:

```typescript
import * as Tone from 'tone'
import type { ModuleAudioEngine, VisualizationData } from '@/types/module'

export class MyModuleEngine implements ModuleAudioEngine {
  private node: Tone.ToneAudioNode | null = null

  initialize(_context: Tone.BaseContext): void {
    // Create Tone.js nodes and connect internal signal chain
  }

  getOutputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'out') return this.node!
    throw new Error(`Unknown output port "${portId}"`)
  }

  getInputNode(portId: string): Tone.ToneAudioNode {
    if (portId === 'in') return this.node!
    throw new Error(`Unknown input port "${portId}"`)
  }

  setParameter(parameterId: string, value: number | string): void {
    // Apply parameter changes to Tone.js nodes
  }

  getVisualizationData(): VisualizationData {
    // Return real-time data for the visualization component
    return {}
  }

  dispose(): void {
    // Clean up all Tone.js nodes
    this.node?.dispose()
    this.node = null
  }
}
```

### 3. `Visualization.tsx` — Real-Time Display

Create a React component that renders the module's internal state:

```typescript
import { useRef } from 'react'
import { useAnimationFrame } from '@/modules/_shared/useAnimationFrame'
import type { VisualizationData } from '@/types/module'

interface Props {
  moduleId: string
  data: VisualizationData
  accentColor: string
}

export default function MyModuleVisualization({ data, accentColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useAnimationFrame(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    // Draw visualization using data from engine
  })

  return <canvas ref={canvasRef} width={200} height={60} />
}
```

### 4. `index.ts` — Registration Bundle

Export a `ModuleRegistration` that ties everything together:

```typescript
import type { ModuleRegistration } from '@/types/module'
import definition from './definition'
import { MyModuleEngine } from './engine'
import MyModuleVisualization from './Visualization'

const myModuleRegistration: ModuleRegistration = {
  definition,
  createEngine: () => new MyModuleEngine(),
  VisualizationComponent: MyModuleVisualization,
}

export default myModuleRegistration
```

### 5. Register in `App.tsx`

Add two lines at the top of `src/App.tsx`:

```typescript
import myModuleReg from '@/modules/my-module'
registerModule(myModuleReg)
```

That's it — the module will appear in the toolbar's ADD menu automatically.

## Contribution Checklist

- [ ] TypeScript strict mode — no `any`, no `@ts-ignore`
- [ ] CSS Modules for all component styles (no inline styles except dynamic values)
- [ ] All Tone.js nodes disposed in `dispose()` (set references to `null`)
- [ ] Visualization uses `useAnimationFrame` hook (not raw `requestAnimationFrame`)
- [ ] Ports use correct signal types: `audio` for sound, `cv` for control voltage, `gate` for on/off triggers
- [ ] `npm run build` passes with zero errors and zero warnings
- [ ] Module definition includes meaningful `description` and `learningSummary`

## Code Style

- **TypeScript** strict mode, no `any`
- **CSS Modules** for component-scoped styles
- **Zustand** for shared state — no prop drilling
- **Tone.js** for all Web Audio — no raw `AudioContext`
- Prefer named exports for engines, default exports for React components and registrations

## Pull Requests

1. Fork and create a feature branch
2. Follow the checklist above
3. `npm run build` must pass cleanly
4. Open a PR with a clear description of what the module/feature does and why
