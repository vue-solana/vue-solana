import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("Nuxt module shipped files", () => {
  it("ships the nuxt/schema augmentation with the module entry", () => {
    // `src/runtime/types.d.ts` was removed: it never reached `dist/` (no
    // build entry), so the `declare module "nuxt/schema"` block must live in
    // `src/module.ts` — otherwise fresh consumers lose typed
    // `runtimeConfig.public.solana`.
    // Plain `join`, not `new URL(relative, import.meta.url)`: Vite rewrites
    // the latter as an asset reference and `readFileSync` rejects it with
    // "The URL must be of scheme file".
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "module.ts"), "utf8");

    expect(source).toContain('declare module "nuxt/schema"');
    expect(source).toContain("solana?: ModuleOptions");
  });

  it("keeps a typed #app shim so the runtime plugin declaration is not unknown", () => {
    // The shim once typed `defineNuxtPlugin(...): unknown`, which collapsed
    // `dist/runtime/plugin.d.ts` to `declare const _default: unknown`. The
    // passthrough return preserves the plugin's type; `app.d.ts` is not a
    // build entry so it never reaches `dist/` itself.
    const here = dirname(fileURLToPath(import.meta.url));
    const shim = readFileSync(join(here, "runtime/app.d.ts"), "utf8");

    expect(shim).toContain("defineNuxtPlugin");
    expect(shim).not.toMatch(/defineNuxtPlugin.*:\s*unknown/);
    expect(shim).toContain("nuxtApp");
  });
});
