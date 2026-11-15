import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

/**
 * Removes every `<directory>/llms.txt` under `publicDir` whose relative path is
 * not in `keep`.
 *
 * The sweep is driven by the directory listing, not by the manifest. A
 * manifest-driven candidate list only ever sees names that are still listed, so
 * the one case that matters — a locale or section *removed from the manifest* —
 * would never be visited and its committed `public/<name>/llms.txt` would keep
 * serving to agents. `keep` is the set of files the generator just wrote.
 *
 * Only directories are considered: the root `llms.txt` and `llms-full.txt` are
 * always written and are not indexes of a section or locale.
 *
 * @param {object} options
 * @param {string} options.publicDir Absolute path to the docs `public/` directory.
 * @param {ReadonlySet<string>} options.keep Relative index paths to keep, e.g. `"guides/llms.txt"`.
 * @returns {Promise<string[]>} The relative paths that were actually removed.
 */
export async function pruneStaleIndexes({ publicDir, keep }) {
  let entries;

  try {
    entries = await readdir(publicDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const removed = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const relativePath = `${entry.name}/llms.txt`;

    if (keep.has(relativePath)) {
      continue;
    }

    try {
      // `force: false` so a missing index is distinguishable from a removal
      // instead of being reported as one.
      await rm(join(publicDir, relativePath));
      removed.push(relativePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return removed;
}
