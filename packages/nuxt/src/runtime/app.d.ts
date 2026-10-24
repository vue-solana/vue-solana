declare module "#app" {
  import type { App } from "vue";
  import type { ModuleOptions } from "../module";

  export interface NuxtApp {
    vueApp: App<Element>;
  }

  // Minimal mirror of the real `nuxt/dist/app` signatures (see
  // `defineNuxtPlugin` returning `Plugin<T> & ObjectPlugin<T>` and
  // `useRuntimeConfig(): RuntimeConfig`). The passthrough return preserves
  // the plugin's type so `dist/runtime/plugin.d.ts` is not `unknown`.
  export function defineNuxtPlugin<T extends Record<string, unknown> = Record<string, unknown>>(
    plugin: (nuxtApp: NuxtApp) => void | { provide?: T } | Promise<void | { provide?: T }>,
  ): (nuxtApp: NuxtApp) => void | { provide?: T } | Promise<void | { provide?: T }>;
  export function useRuntimeConfig(): {
    public: Record<string, unknown> & { solana?: ModuleOptions };
  };
}
