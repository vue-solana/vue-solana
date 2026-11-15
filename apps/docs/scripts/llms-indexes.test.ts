import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { pruneStaleIndexes } from "./llms-indexes.mjs";

const roots: string[] = [];

async function makePublicDir(layout: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "llms-indexes-"));
  roots.push(root);

  for (const [relativePath, content] of Object.entries(layout)) {
    const filePath = join(root, relativePath);
    await mkdir(join(filePath, ".."), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }

  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("pruneStaleIndexes", () => {
  it("removes an index whose locale or section is no longer generated", async () => {
    const publicDir = await makePublicDir({
      "llms.txt": "root",
      "llms-full.txt": "corpus",
      "guides/llms.txt": "kept",
      "de/llms.txt": "kept",
      // `es` was dropped from the manifest, so the generator never wrote it.
      "es/llms.txt": "stale",
    });

    const removed = await pruneStaleIndexes({
      publicDir,
      keep: new Set(["llms.txt", "llms-full.txt", "guides/llms.txt", "de/llms.txt"]),
    });

    expect(removed).toEqual(["es/llms.txt"]);
    await expect(readFile(join(publicDir, "es/llms.txt"), "utf8")).rejects.toThrow();
    await expect(readFile(join(publicDir, "guides/llms.txt"), "utf8")).resolves.toBe("kept");
  });

  it("keeps the root files and leaves directories without an index alone", async () => {
    const publicDir = await makePublicDir({
      "llms.txt": "root",
      "llms-full.txt": "corpus",
      "robots.txt": "user-agent: *",
      "images/logo.svg": "<svg />",
    });

    const removed = await pruneStaleIndexes({
      publicDir,
      keep: new Set(["llms.txt", "llms-full.txt"]),
    });

    expect(removed).toEqual([]);
    await expect(readFile(join(publicDir, "robots.txt"), "utf8")).resolves.toContain("user-agent");
    await expect(readFile(join(publicDir, "images/logo.svg"), "utf8")).resolves.toBe("<svg />");
  });

  it("reports only removals, not directories that never had an index", async () => {
    const publicDir = await makePublicDir({ "llms.txt": "root" });

    const removed = await pruneStaleIndexes({ publicDir, keep: new Set(["llms.txt"]) });

    expect(removed).toEqual([]);
  });

  it("treats a missing public directory as nothing to prune", async () => {
    await expect(
      pruneStaleIndexes({
        publicDir: join(tmpdir(), "llms-indexes-does-not-exist"),
        keep: new Set(),
      }),
    ).resolves.toEqual([]);
  });
});
