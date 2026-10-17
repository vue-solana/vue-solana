import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const LEAN_ENTRIES = [
  "packages/core/dist/address.mjs",
  "packages/core/dist/errors.mjs",
  "packages/core/dist/timeout.mjs",
  "packages/core/dist/clusters.mjs",
  "packages/core/dist/types.mjs",
];
const FORBIDDEN = [
  "ios-wallet",
  "mobile-wallet",
  "tweetnacl",
  "wallet-standard-mobile",
  "@solana-mobile",
];

let failed = false;

for (const entry of LEAN_ENTRIES) {
  const path = resolve(root, entry);
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    console.error(`FAIL: could not read ${entry}: ${error.message}`);
    failed = true;
    continue;
  }

  const hits = FORBIDDEN.filter((token) => text.includes(token));
  if (hits.length > 0) {
    console.error(`FAIL: ${entry} contains heavy edges: ${hits.join(", ")}`);
    failed = true;
  } else {
    console.log(`ok: ${entry}`);
  }
}

if (failed) {
  process.exit(1);
}
