import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// Configuration for ESLint with Vue, TypeScript, and Vitest support
// Integrates recommended rules and skips Prettier formatting conflicts

/** To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
  * import { configureVueProject } from '@vue/eslint-config-typescript'
  * configureVueProject({ scriptLangs: ['ts', 'tsx'] })
  * More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup
*/

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint', // Configuration for files to lint
    files: ['**/*.{ts,mts,tsx,vue}'], // Targets TypeScript and Vue files
  },

  {
    name: 'app/files-to-ignore', // Configuration for files to exclude from linting
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'], // Ignores build and coverage directories
  },

  pluginVue.configs['flat/essential'], // Applies essential Vue.js linting rules
  vueTsConfigs.recommended, // Applies recommended Vue/TypeScript configurations

  {
    ...pluginVitest.configs.recommended, // Extends Vitest recommended rules
    files: ['src/**/__tests__/*'], // Targets test files specifically
  },
  skipFormatting, // Disables formatting rules to avoid conflicts with Prettier
)
