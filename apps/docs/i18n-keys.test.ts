import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "./i18n/locales/en";
import es from "./i18n/locales/es";
import ko from "./i18n/locales/ko";
import zh from "./i18n/locales/zh";

const LOCALES = { en, es, ko, zh } as const;
// `new URL(relative, import.meta.url)` is not usable here: happy-dom's `URL`
// resolves against `location.href` and ignores the base, so it yields
// `http://localhost:3000/...` and `fileURLToPath` rejects it.
const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "app");

/**
 * Every `t("...")` / `$t("...")` key used by app code. A missing key does not
 * throw in vue-i18n — it renders the key path — so nothing else in the build
 * catches it. `demo.airdrop.connectHint` shipped as the literal string
 * `demo.airdrop.connectHint` on the demo page for exactly that reason.
 */
function usedKeys(): string[] {
  const keys = new Set<string>();
  const files: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);

      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (/\.(vue|ts)$/.test(entry)) {
        files.push(path);
      }
    }
  };

  walk(APP_DIR);

  for (const file of files) {
    const source = readFileSync(file, "utf8");

    // Only static keys, and only a real `t(`/`$t(` call — without the
    // boundary `emit(` matches on its trailing `t(` and every emitted event
    // name looks like a missing translation. A template literal
    // (`t(`demo.${x}`)`) has no statically knowable set; the dynamic status
    // lookups are covered by asserting the `demo.status` branch below.
    for (const match of source.matchAll(/(?:^|[^\w$])\$?t\(\s*["']([\w.]+)["']/g)) {
      keys.add(match[1]);
    }
  }

  return [...keys];
}

function flatten(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") {
    return [prefix];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

function has(messages: object, key: string): boolean {
  return (
    key
      .split(".")
      .reduce<unknown>(
        (node, part) =>
          node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined,
        messages,
      ) !== undefined
  );
}

describe("docs i18n", () => {
  it("defines every key used by app code, in every locale", () => {
    const keys = usedKeys();

    expect(keys.length).toBeGreaterThan(0);

    for (const [locale, messages] of Object.entries(LOCALES)) {
      const missing = keys.filter((key) => !has(messages, key));

      expect(missing, `\`${locale}\` is missing keys used by app code`).toEqual([]);
    }
  });

  // `DemoAirdropCard.vue` and `DemoClientSendCard.vue` build their status label
  // from `t(\`demo.status.${status}\`)`, so no static-key scan sees those. Assert
  // the branch itself exists instead of every member of it.
  it("defines the dynamic demo.status branch in every locale", () => {
    for (const [locale, messages] of Object.entries(LOCALES)) {
      for (const status of ["idle", "running", "success", "error", "ready", "waiting"]) {
        expect(has(messages, `demo.status.${status}`), `\`${locale}\` demo.status.${status}`).toBe(
          true,
        );
      }
    }
  });

  // A key added to `en` but not translated ships the English string (or a raw
  // path) into three locales, and nothing in the build notices.
  it("keeps the locales at the same key depth", () => {
    const reference = new Set(flatten(en));

    for (const [locale, messages] of Object.entries(LOCALES)) {
      const keys = new Set(flatten(messages));
      const missing = [...reference].filter((key) => !keys.has(key));
      const extra = [...keys].filter((key) => !reference.has(key));

      expect(missing, `\`${locale}\` is missing keys present in \`en\``).toEqual([]);
      expect(extra, `\`${locale}\` has keys \`en\` does not`).toEqual([]);
    }
  });
});
