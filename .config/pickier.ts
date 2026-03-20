import type { PickierConfig } from 'pickier'

const config: Partial<PickierConfig> = {
  ignores: ['**/CHANGELOG.md'],
  pluginRules: {
    'publint/file-does-not-exist': 'off',
  },
}

export default config
