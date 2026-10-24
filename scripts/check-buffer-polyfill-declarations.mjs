import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const declarationPath = resolve(root, "packages/core/dist/buffer-polyfill.d.ts");

if (!existsSync(declarationPath)) {
  console.error(`FAIL: ${declarationPath} not found (run pnpm build:packages first)`);
  process.exit(1);
}

const content = readFileSync(declarationPath, "utf8");
if (!content.includes("/// <reference path=") || !content.includes("buffer.d.ts")) {
  console.error(`FAIL: ${declarationPath} is missing the triple-slash reference to buffer.d.ts`);
  process.exit(1);
}

console.log(`ok: ${declarationPath} carries the triple-slash reference to buffer.d.ts`);
