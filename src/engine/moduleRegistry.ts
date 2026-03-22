import type { ModuleRegistration, ModuleDefinition } from '@/types/module'
import { setRegistryLookup } from '@/store/rackStore'

const registry = new Map<string, ModuleRegistration>()

export function registerModule(registration: ModuleRegistration): void {
  registry.set(registration.definition.type, registration)
}

export function getModule(type: string): ModuleRegistration | undefined {
  return registry.get(type)
}

export function getModuleDefinition(type: string): ModuleDefinition | undefined {
  return registry.get(type)?.definition
}

export function getAllModules(): ModuleRegistration[] {
  return Array.from(registry.values())
}

// Wire the registry into the store so addModule can look up default params
setRegistryLookup(getModuleDefinition)
