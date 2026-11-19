import type { Mock } from "vitest";
import { vi } from "vitest";

/**
 * Shared `@nuxt/kit` mock and module setup helper for the `module.*.test.ts`
 * files. Vitest hoists the `vi.mock` call from this module into every test file
 * that imports it, so all split suites exercise the same mocked module setup.
 */
interface KitMock {
  addImports: Mock;
  addPlugin: Mock;
  createResolver: Mock;
  defineNuxtModule: Mock;
}

const kit: KitMock = vi.hoisted(() => ({
  addImports: vi.fn(),
  addPlugin: vi.fn(),
  createResolver: vi.fn(() => ({
    resolve: (path: string) => `resolved:${path}`,
  })),
  defineNuxtModule: vi.fn((options: unknown) => options),
}));

vi.mock("@nuxt/kit", () => kit);

export interface ModuleUnderTest {
  meta: {
    name: string;
    configKey: string;
  };
  setup: (
    options: Record<string, unknown>,
    nuxt: {
      hook: (name: "vite:extendConfig", callback: ViteExtendConfigHook) => void;
      options: {
        runtimeConfig: {
          public: Record<string, unknown>;
        };
        vite: {
          optimizeDeps?: {
            include?: string[];
            needsInterop?: string[];
          };
        };
      };
    },
  ) => void;
}

export type ViteExtendConfigHook = (
  config: {
    optimizeDeps?: {
      include?: string[];
      needsInterop?: string[];
    };
    environments?: {
      client?: {
        optimizeDeps?: {
          include?: string[];
          needsInterop?: string[];
        };
      };
    };
  },
  context: { isClient: boolean; isServer: boolean },
) => void;

export type TestViteOptions = {
  optimizeDeps: {
    include?: string[];
    needsInterop?: string[];
  };
};

export function setupModule(
  module: ModuleUnderTest,
  options: Record<string, unknown> = {},
  context: {
    publicConfig?: Record<string, unknown>;
    vite?: TestViteOptions | Record<string, unknown>;
  } = {},
) {
  const publicConfig = context.publicConfig ?? {};
  const vite = context.vite ?? {};
  const viteExtendConfigHooks: ViteExtendConfigHook[] = [];

  module.setup(options, {
    hook: (name, callback) => {
      if (name === "vite:extendConfig") {
        viteExtendConfigHooks.push(callback as ViteExtendConfigHook);
      }
    },
    options: {
      runtimeConfig: {
        public: publicConfig,
      },
      vite,
    },
  });

  return { publicConfig, vite, viteExtendConfigHooks };
}

export { kit };
