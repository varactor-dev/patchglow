import { useRackStore } from './rackStore'

const AUTOSAVE_KEY = 'patchglow-autosave'
const DEBOUNCE_MS = 500

export function initAutosave(): void {
  let timer: number | null = null
  useRackStore.subscribe(() => {
    if (timer !== null) clearTimeout(timer)
    timer = window.setTimeout(() => {
      const json = useRackStore.getState().exportPatch()
      localStorage.setItem(AUTOSAVE_KEY, json)
    }, DEBOUNCE_MS)
  })
}

export function loadAutosave(): boolean {
  const json = localStorage.getItem(AUTOSAVE_KEY)
  if (!json) return false
  try {
    useRackStore.getState().importPatch(json)
    return true
  } catch {
    return false
  }
}

export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE_KEY)
}

export function hasAutosave(): boolean {
  return localStorage.getItem(AUTOSAVE_KEY) !== null
}
