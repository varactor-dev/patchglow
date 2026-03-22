import { useEffect, useRef } from 'react'

// Shared RAF loop — all modules register callbacks here so we batch
// all canvas draws into a single requestAnimationFrame per screen refresh.
type RenderCallback = (timestamp: number) => void

const callbacks = new Set<RenderCallback>()
let rafId: number | null = null

function tick(timestamp: number) {
  callbacks.forEach((cb) => {
    try { cb(timestamp) } catch { /* don't let one module crash others */ }
  })
  if (callbacks.size > 0) {
    rafId = requestAnimationFrame(tick)
  } else {
    rafId = null
  }
}

function startLoop() {
  if (rafId === null && callbacks.size > 0) {
    rafId = requestAnimationFrame(tick)
  }
}

/**
 * Register a render callback that fires on every animation frame.
 * The callback is automatically removed when the component unmounts.
 */
export function useAnimationFrame(callback: RenderCallback) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const cb: RenderCallback = (ts) => callbackRef.current(ts)
    callbacks.add(cb)
    startLoop()
    return () => {
      callbacks.delete(cb)
    }
  }, [])
}
