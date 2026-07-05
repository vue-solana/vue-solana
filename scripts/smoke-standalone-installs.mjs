import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const tempRoot = mkdtempSync(join(tmpdir(), "vue-solana-standalone-"));
const packDir = join(tempRoot, "packs");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

mkdirSync(packDir, { recursive: true });

function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, CI: "1" },
    stdio: options.stdio ?? "inherit",
  });
}

function packWorkspacePackage(packageName, packageDir) {
  const before = new Set(readdirSync(packDir));
  run(pnpm, ["--dir", packageDir, "pack", "--pack-destination", packDir]);

  const tarballs = readdirSync(packDir).filter(
    (entry) => entry.endsWith(".tgz") && !before.has(entry),
  );
  if (tarballs.length !== 1) {
    throw new Error(`Expected one tarball for ${packageName}, found ${tarballs.length}.`);
  }

  return join(packDir, tarballs[0]);
}

function fileDependency(tarballPath, consumerDir) {
  return `file:${relative(consumerDir, tarballPath)}`;
}

function writeConsumer({ name, dependencies, devDependencies, overrides, source }) {
  const consumerDir = join(tempRoot, name);
  mkdirSync(join(consumerDir, "src"), { recursive: true });

  writeFileSync(
    join(consumerDir, "package.json"),
    `${JSON.stringify(
      {
        private: true,
        type: "module",
        scripts: {
          typecheck: "tsc --noEmit",
        },
        dependencies,
        devDependencies,
        pnpm: Object.keys(overrides).length > 0 ? { overrides } : undefined,
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(consumerDir, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          lib: ["ES2022", "DOM"],
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["src/**/*.ts"],
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(join(consumerDir, "src", "index.ts"), source);

  return consumerDir;
}

function installAndTypecheck(label, consumerDir) {
  console.log(`\n=== ${label} ===`);
  run(pnpm, ["install", "--ignore-workspace", "--no-frozen-lockfile"], { cwd: consumerDir });
  run(pnpm, ["typecheck"], { cwd: consumerDir });
}

try {
  console.log(`Using temp directory: ${tempRoot}`);
  run(pnpm, ["build:packages"]);

  const packages = {
    core: {
      tarball: packWorkspacePackage("@vue-solana/core", join(repoRoot, "packages/core")),
    },
    vue: {
      tarball: packWorkspacePackage("@vue-solana/vue", join(repoRoot, "packages/vue")),
    },
    nuxt: {
      tarball: packWorkspacePackage("@vue-solana/nuxt", join(repoRoot, "packages/nuxt")),
    },
  };

  const coreConsumer = writeConsumer({
    name: "core-consumer",
    dependencies: {
      "@vue-solana/core": fileDependency(packages.core.tarball, join(tempRoot, "core-consumer")),
    },
    devDependencies: {
      typescript: "^5.8.3",
    },
    overrides: {},
    source: `import { createSolanaContext } from "@vue-solana/core";
import { installSolanaBufferPolyfill, Buffer } from "@vue-solana/core/buffer-polyfill";
import { createSolanaConnection } from "@vue-solana/core/rpc";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction, type VersionedTransaction } from "@vue-solana/core/web3";

installSolanaBufferPolyfill();

const payer = new PublicKey("11111111111111111111111111111111");
const recipient = new PublicKey("11111111111111111111111111111111");
const transaction = new Transaction().add(
  SystemProgram.transfer({ fromPubkey: payer, toPubkey: recipient, lamports: 1 }),
);
const instruction = new TransactionInstruction({ keys: [], programId: payer, data: Buffer.from([]) });
const connection = createSolanaConnection({ cluster: "devnet" });
const context = createSolanaContext({ cluster: "devnet" });
const maybeVersionedTransaction: VersionedTransaction | undefined = undefined;

void transaction;
void instruction;
void connection;
void context;
void maybeVersionedTransaction;
`,
  });

  const vueConsumer = writeConsumer({
    name: "vue-consumer",
    dependencies: {
      "@vue-solana/vue": fileDependency(packages.vue.tarball, join(tempRoot, "vue-consumer")),
      vue: "^3.5.16",
    },
    devDependencies: {
      typescript: "^5.8.3",
    },
    overrides: {
      "@vue-solana/core": fileDependency(packages.core.tarball, join(tempRoot, "vue-consumer")),
    },
    source: `import { defineComponent } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import { installSolanaBufferPolyfill, Buffer } from "@vue-solana/vue/buffer-polyfill";
import { useConnection } from "@vue-solana/vue/useConnection";
import { useWallet } from "@vue-solana/vue/useWallet";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction, type VersionedTransaction } from "@vue-solana/vue/web3";

installSolanaBufferPolyfill();

const payer = new PublicKey("11111111111111111111111111111111");
const recipient = new PublicKey("11111111111111111111111111111111");
const transaction = new Transaction().add(
  SystemProgram.transfer({ fromPubkey: payer, toPubkey: recipient, lamports: 1 }),
);
const instruction = new TransactionInstruction({ keys: [], programId: payer, data: Buffer.from([]) });
const plugin = createSolanaPlugin({ cluster: "devnet" });
const maybeVersionedTransaction: VersionedTransaction | undefined = undefined;

export default defineComponent({
  setup() {
    const connection = useConnection();
    const wallet = useWallet();
    return { connection, wallet };
  },
});

void transaction;
void instruction;
void plugin;
void maybeVersionedTransaction;
`,
  });

  const nuxtConsumer = writeConsumer({
    name: "nuxt-consumer",
    dependencies: {
      "@vue-solana/nuxt": fileDependency(packages.nuxt.tarball, join(tempRoot, "nuxt-consumer")),
      nuxt: "^4.4.6",
    },
    devDependencies: {
      typescript: "^5.8.3",
    },
    overrides: {
      "@vue-solana/core": fileDependency(packages.core.tarball, join(tempRoot, "nuxt-consumer")),
      "@vue-solana/vue": fileDependency(packages.vue.tarball, join(tempRoot, "nuxt-consumer")),
    },
    source: `import VueSolana from "@vue-solana/nuxt";
import { installSolanaBufferPolyfill, Buffer } from "@vue-solana/nuxt/buffer-polyfill";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction, type VersionedTransaction } from "@vue-solana/nuxt/web3";

installSolanaBufferPolyfill();

const payer = new PublicKey("11111111111111111111111111111111");
const recipient = new PublicKey("11111111111111111111111111111111");
const transaction = new Transaction().add(
  SystemProgram.transfer({ fromPubkey: payer, toPubkey: recipient, lamports: 1 }),
);
const instruction = new TransactionInstruction({ keys: [], programId: payer, data: Buffer.from([]) });
const maybeVersionedTransaction: VersionedTransaction | undefined = undefined;

void VueSolana;
void transaction;
void instruction;
void maybeVersionedTransaction;
`,
  });

  installAndTypecheck("Core standalone consumer", coreConsumer);
  installAndTypecheck("Vue standalone consumer", vueConsumer);
  installAndTypecheck("Nuxt standalone consumer", nuxtConsumer);

  if (process.env.KEEP_STANDALONE_SMOKE !== "1") {
    rmSync(tempRoot, { recursive: true, force: true });
  } else {
    console.log(`\nKept temp directory: ${tempRoot}`);
  }
} catch (error) {
  console.error(
    `\nStandalone install smoke test failed. Temp directory kept for debugging: ${tempRoot}`,
  );
  throw error;
}
