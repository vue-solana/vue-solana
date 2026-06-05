declare module "#app" {
  import type { App } from "vue";

  export interface NuxtApp {
    vueApp: App;
  }

  export function defineNuxtPlugin(plugin: (nuxtApp: NuxtApp) => void): unknown;
  export function useRuntimeConfig(): {
    public: Record<string, unknown>;
  };
}
