import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../dist/", import.meta.url));
const references = [
  '/// <reference path="../types/web3-compat.d.ts" />',
  '/// <reference path="../types/buffer.d.ts" />',
];

const declarationExtensions = new Set([".ts", ".mts", ".cts"]);

await prepareDeclarations(distDir);

async function prepareDeclarations(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await prepareDeclarations(filePath);
      continue;
    }

    if (!entry.name.includes(".d.") && !entry.name.endsWith(".d.ts")) {
      continue;
    }

    if (!declarationExtensions.has(extname(entry.name))) {
      continue;
    }

    const content = await readFile(filePath, "utf8");

    if (!content.includes("@solana/web3-compat") && !content.includes("buffer/")) {
      continue;
    }

    const missingReferences = references.filter((reference) => !content.includes(reference));

    if (!missingReferences.length) {
      continue;
    }

    await writeFile(filePath, `${missingReferences.join("\n")}\n${content}`);
  }
}
