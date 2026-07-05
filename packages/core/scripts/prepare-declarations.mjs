import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../dist/", import.meta.url));
const typesDir = fileURLToPath(new URL("../types/", import.meta.url));
const shims = ["web3-compat.d.ts", "buffer.d.ts"];

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

    const references = getReferences(filePath);
    const missingReferences = references.filter((reference) => !content.includes(reference));

    if (!missingReferences.length) {
      continue;
    }

    await writeFile(filePath, `${missingReferences.join("\n")}\n${content}`);
  }
}

function getReferences(filePath) {
  const declarationDir = dirname(filePath);

  return shims.map((shim) => {
    const referencePath = relative(declarationDir, join(typesDir, shim)).split(sep).join("/");

    return `/// <reference path="${referencePath}" />`;
  });
}
