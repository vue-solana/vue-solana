import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The live demo at apps/docs exists to showcase the *published* @vue-solana
 * packages on npm — not the workspace sources. This guard keeps it that way:
 * if a local or ranged dependency sneaks into the docs app's dependencies, the
 * demo silently stops demonstrating what npm users get, and version bumps of
 * the library stop reaching it.
 *
 * When a release adds features the demo needs, bump the docs app's pinned
 * version instead of linking the workspace.
 */
describe("docs demo package policy", () => {
  const packageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    dependencies: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const vueSolanaDependencyEntries = Object.entries(allDependencies).filter(([name]) =>
    name.startsWith("@vue-solana/"),
  );

  it("depends on @vue-solana packages", () => {
    expect(vueSolanaDependencyEntries.length).toBeGreaterThan(0);
  });

  it("pins @vue-solana packages to published versions", () => {
    const invalidEntries = vueSolanaDependencyEntries.filter(
      ([, version]) => !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version),
    );

    expect(
      invalidEntries,
      "The docs demo must run against exact published npm versions of @vue-solana packages. " +
        "Bump the pinned version to pick up new library features instead of using a range or local protocol.",
    ).toEqual([]);
  });
});
