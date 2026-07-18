import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type PackageJson = {
  name: string;
  exports: Record<string, unknown>;
};

describe("documented package subpaths", () => {
  it("keeps core build entries aligned with the package export map", () => {
    const expected = getExportedBuildEntries("../package.json");

    expect([...getBuildEntries("../build.config.ts")].sort()).toEqual([...expected].sort());
  });

  it("keeps Vue build entries aligned with the package export map", () => {
    const expected = getExportedBuildEntries("../../vue/package.json");

    expect([...getBuildEntries("../../vue/build.config.ts")].sort()).toEqual([...expected].sort());
  });

  it("keeps Nuxt build entries aligned with the package export map", () => {
    const expected = getExportedBuildEntries("../../nuxt/package.json", {
      root: "src/module",
      subpathPrefix: "src/runtime/",
      extraEntries: ["src/runtime/plugin"],
    });

    expect([...getBuildEntries("../../nuxt/build.config.ts")].sort()).toEqual([...expected].sort());
  });

  it("keeps core subpath docs aligned with the package export map", () => {
    const expected = getExportedSubpaths("../package.json");

    expect(
      getBacktickedListAfter("../../../apps/docs/content/packages/core.md", "Direct subpaths:"),
    ).toEqual(expected);
  });

  it("keeps Vue package docs aligned with the package export map", () => {
    const expected = getExportedSubpaths("../../vue/package.json");

    expect(
      getBacktickedListAfter(
        "../../../apps/docs/content/packages/vue.md",
        "Direct package subpaths:",
      ),
    ).toEqual(expected);
  });

  it("keeps Nuxt package docs aligned with the package export map", () => {
    const expected = getExportedSubpaths("../../nuxt/package.json");

    expect(
      getBacktickedListAfter(
        "../../../apps/docs/content/packages/nuxt.md",
        "Direct package subpaths:",
      ),
    ).toEqual(expected);
  });
});

function getExportedSubpaths(packageJsonPath: string) {
  const packageJson = readJson<PackageJson>(packageJsonPath);

  return Object.keys(packageJson.exports)
    .filter((exportPath) => exportPath !== ".")
    .map((exportPath) => `${packageJson.name}${exportPath.slice(1)}`);
}

function getExportedBuildEntries(
  packageJsonPath: string,
  options: { root?: string; subpathPrefix?: string; extraEntries?: string[] } = {},
) {
  const packageJson = readJson<PackageJson>(packageJsonPath);
  const root = options.root ?? "src/index";
  const subpathPrefix = options.subpathPrefix ?? "src/";

  return [
    ...Object.keys(packageJson.exports).map((exportPath) =>
      exportPath === "." ? root : `${subpathPrefix}${exportPath.slice(2)}`,
    ),
    ...(options.extraEntries ?? []),
  ];
}

function getBuildEntries(buildConfigPath: string) {
  const content = readText(buildConfigPath);
  const match = /entries:\s*\[([\s\S]*?)]/.exec(content);

  if (!match?.[1]) {
    throw new Error(`Could not find build entries in ${buildConfigPath}`);
  }

  return Array.from(match[1].matchAll(/"([^"]+)"/g), ([, entry]) => entry);
}

function getBacktickedListAfter(markdownPath: string, marker: string) {
  const content = readText(markdownPath);
  const markerIndex = content.indexOf(marker);

  expect(markerIndex).toBeGreaterThanOrEqual(0);

  const lines = content.slice(markerIndex).split("\n");
  const items: string[] = [];

  for (const line of lines) {
    const match = /^- `([^`]+)`/.exec(line);

    if (match) {
      const item = match[1];

      if (item) {
        items.push(item);
      }

      continue;
    }

    if (items.length > 0) {
      break;
    }
  }

  return items;
}

function readJson<T>(path: string): T {
  return JSON.parse(readText(path)) as T;
}

function readText(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}
