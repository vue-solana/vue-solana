import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/module', 'src/runtime/plugin'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true
  },
  externals: ['@nuxt/kit', '@vue-solana/core', '@vue-solana/vue', 'nuxt', 'vue']
})
