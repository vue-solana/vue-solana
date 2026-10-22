import { loadNuxt } from "@nuxt/kit";
import type { NuxtModule } from "@nuxt/schema";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ModuleOptions } from "../src/module";

// `./module.test.ts` mocks `@nuxt/kit.defineNuxtModule` as identity so it can
// call `setup()` directly — fast, but it never proves the module survives the
// real definition wrapper (config-key/inline-option merge, real `addPlugin` /
// `addImports` registration). These cases load the *real* module through
// `loadNuxt` against the fixture app in `../test/fixture`. No build and no dev
// server: `ready: false` plus an explicit `ready()` runs module setup only, so
// the whole file stays under a second or two.
//
// `addImports` only registers an `imports:extend` hook (it does not touch
// `nuxt.options.imports`), so the imports are observed by firing that hook, the
// same way a real build would.
const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "..", "test", "fixture");

type NuxtInstance = Awaited<ReturnType<typeof loadNuxt>>;

async function loadWithModule(
  moduleOptions: Partial<ModuleOptions>,
  runtimeConfigPublic?: Record<string, unknown>,
  configKeySolana?: Record<string, unknown>,
): Promise<NuxtInstance> {
  const module = ((await import("../src/module")) as { default: NuxtModule<ModuleOptions> })
    .default;

  const nuxt = await loadNuxt({
    cwd: fixtureDir,
    dev: false,
    ready: false,
    overrides: {
      modules: [[module, moduleOptions]],
      runtimeConfig: { public: { ...(runtimeConfigPublic ?? {}) } },
      ...(configKeySolana ? { solana: configKeySolana } : {}),
    },
  });

  await nuxt.ready();

  return nuxt;
}

function pluginSources(nuxt: NuxtInstance): string[] {
  return (nuxt.options.plugins ?? []).map((plugin) =>
    typeof plugin === "string" ? plugin : String(plugin.src),
  );
}

// The module registers `<package>/runtime/plugin` (`.ts` from source, `.mjs`
// once built). Match the exact basename: Nuxt's own unhead plugin lives at
// `runtime/plugins/unhead.js`, which a loose `includes("runtime/plugin")`
// would pick up.
function hasSolanaRuntimePlugin(nuxt: NuxtInstance): boolean {
  return pluginSources(nuxt).some((src) => /(^|\/)runtime\/plugin\.(ts|mjs|js)$/.test(src));
}

async function registeredImports(nuxt: NuxtInstance): Promise<string[]> {
  const collected: Array<{ name?: string }> = [];
  await nuxt.callHook("imports:extend", collected as never);

  return collected.map((entry) => entry.name ?? "");
}

describe("real defineNuxtModule setup", () => {
  it("applies the module defaults to public runtime config", async () => {
    const nuxt = await loadWithModule({});

    expect(nuxt.options.runtimeConfig.public.solana).toMatchObject({
      cluster: "devnet",
      autoConnect: false,
    });
  });

  it("merges module options with public-runtime-config fields the module does not default", async () => {
    const nuxt = await loadWithModule(
      { cluster: "mainnet" },
      { solana: { commitment: "confirmed" } },
    );

    expect(nuxt.options.runtimeConfig.public.solana).toMatchObject({
      cluster: "mainnet",
      commitment: "confirmed",
    });
  });

  it("does not let module defaults clobber an explicit public.solana value", async () => {
    // Regression: Nuxt's `defu` merge cannot tell an untouched default from a
    // user value, so the defaults are applied only after this merge. A naive
    // `{ ...publicSolana, ...options }` with module-level defaults overwrote a
    // user's `runtimeConfig.public.solana.cluster` with `devnet`.
    const nuxt = await loadWithModule({}, { solana: { cluster: "mainnet", autoConnect: true } });

    expect(nuxt.options.runtimeConfig.public.solana).toMatchObject({
      cluster: "mainnet",
      autoConnect: true,
    });
  });

  it("lets the solana config key win over public.solana even at the default value", async () => {
    const nuxt = await loadWithModule(
      {},
      { solana: { cluster: "mainnet" } },
      { cluster: "devnet" },
    );

    expect(nuxt.options.runtimeConfig.public.solana).toMatchObject({ cluster: "devnet" });
  });

  it("lets inline options equal to a default win over public.solana", async () => {
    // Regression: Nuxt's `defu` merge could not tell `{ cluster: "devnet" }`
    // set inline apart from the module default, so the default path lost here.
    const nuxt = await loadWithModule(
      { cluster: "devnet", autoConnect: false },
      { solana: { cluster: "mainnet", autoConnect: true } },
    );

    expect(nuxt.options.runtimeConfig.public.solana).toMatchObject({
      cluster: "devnet",
      autoConnect: false,
    });
  });

  it("lets an inline autoConnect option win over public.solana", async () => {
    const nuxt = await loadWithModule({ autoConnect: true }, { solana: { autoConnect: false } });

    expect(nuxt.options.runtimeConfig.public.solana).toMatchObject({ autoConnect: true });
  });

  it("strips wallet/signer fields from public runtime config", async () => {
    const nuxt = await loadWithModule({}, { solana: { payerSecretKey: "SECRET", wallet: {} } });

    const solana = nuxt.options.runtimeConfig.public.solana as Record<string, unknown>;

    expect(solana).not.toHaveProperty("payerSecretKey");
    expect(solana).not.toHaveProperty("wallet");
    expect(solana).not.toHaveProperty("payer");
  });

  it("tolerates a non-object public.solana config", async () => {
    const nuxt = await loadWithModule({}, { solana: "not-an-object" });

    expect(nuxt.options.runtimeConfig.public.solana).toMatchObject({ cluster: "devnet" });
  });

  it("installs the runtime plugin by default", async () => {
    const nuxt = await loadWithModule({});

    expect(hasSolanaRuntimePlugin(nuxt)).toBe(true);
    expect(await registeredImports(nuxt)).not.toContain("createSolanaPlugin");
  });

  it("skips the runtime plugin and imports the setup values when clientPlugin is false", async () => {
    const nuxt = await loadWithModule({ clientPlugin: false });

    expect(hasSolanaRuntimePlugin(nuxt)).toBe(false);

    const names = await registeredImports(nuxt);

    expect(names).toContain("createSolanaPlugin");
    expect(names).toContain("solanaInjectionKey");
    expect(names).toContain("selectedWalletAccountInjectionKey");
    expect(names).toContain("useSolana");
  });
});
