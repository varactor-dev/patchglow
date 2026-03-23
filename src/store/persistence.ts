import { useRackStore } from './rackStore'

const AUTOSAVE_KEY = 'patchglow-autosave'
const DEBOUNCE_MS = 500

let unsubscribe: (() => void) | null = null
let pendingTimer: number | null = null

export function initAutosave(): void {
  // Guard against duplicate subscriptions (e.g. HMR)
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }

  unsubscribe = useRackStore.subscribe(() => {
    if (pendingTimer !== null) clearTimeout(pendingTimer)
    pendingTimer = window.setTimeout(() => {
      pendingTimer = null
      flushAutosave()
    }, DEBOUNCE_MS)
  })

  // Flush pending save on tab close to prevent data loss
  window.addEventListener('beforeunload', flushAutosave)
}

function flushAutosave(): void {
  try {
    const json = useRackStore.getState().exportPatch()
    localStorage.setItem(AUTOSAVE_KEY, json)
  } catch {
    // QuotaExceededError or other storage failure — silently degrade
  }
}

export function loadAutosave(): boolean {
  const json = localStorage.getItem(AUTOSAVE_KEY)
  if (!json) return false
  try {
    useRackStore.getState().importPatch(json)
    return true
  } catch {
    // Corrupted autosave — clear it so we don't retry on every load
    localStorage.removeItem(AUTOSAVE_KEY)
    return false
  }
}

export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE_KEY)
}

export function hasAutosave(): boolean {
  return localStorage.getItem(AUTOSAVE_KEY) !== null
}
