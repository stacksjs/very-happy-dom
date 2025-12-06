import type { BinaryConfig } from './types'
import { loadConfig } from 'bunfig'

export const defaultConfig: BinaryConfig = {
  from: 'localhost:5173',
  verbose: true,
}

// Lazy-loaded config to avoid top-level await (enables bun --compile)
let _config: BinaryConfig | null = null

export async function getConfig(): Promise<BinaryConfig> {
  if (!_config) {
    _config = await loadConfig({
  name: 'binary',
  defaultConfig,
})
  }
  return _config
}

// For backwards compatibility - synchronous access with default fallback
export const config: BinaryConfig = defaultConfig
