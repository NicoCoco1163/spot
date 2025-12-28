// @ts-check
import antfu from '@antfu/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  antfu({
    ignores: [
      'overrides/**',
    ],
  }).renamePlugins({
    import: 'import-x', // 将 antfu 的 import 插件重命名，避免与 Nuxt 的 import 插件冲突
  }),
)
