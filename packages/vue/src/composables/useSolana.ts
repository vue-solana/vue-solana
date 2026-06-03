import { inject } from 'vue'
import { solanaInjectionKey } from '../injection'

export function useSolana() {
  const context = inject(solanaInjectionKey)

  if (!context) {
    throw new Error('Vue Solana plugin is not installed')
  }

  return context
}
