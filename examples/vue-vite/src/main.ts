import './assets/main.css'

import { createApp } from 'vue'
import { createSolanaPlugin } from '@vue-solana/vue'
import App from './App.vue'

createApp(App)
  .use(createSolanaPlugin({
    cluster: 'devnet'
  }))
  .mount('#app')
