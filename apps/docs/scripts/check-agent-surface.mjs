/**
 * Opt-in smoke check for the deployed documentation agent surface.
 *
 * This is the gate that would have caught the OpenAPI/static-asset mismatch:
 * nothing else in CI ever requests the docs app, so `openapi.json` could
 * document headers and content types the deployment does not serve. It is
 * deliberately not a Vitest file (unit tests must not touch the network) and
 * not part of `pnpm test`; run it against a preview or production deployment:
 *
 *   pnpm smoke:docs-surface
 *   DOCS_SURFACE_BASE_URL=http://localhost:3000 pnpm smoke:docs-surface
 *   node apps/docs/scripts/check-agent-surface.mjs --base https://example.com
 *
 * It reads the surface as an agent would and compares it with the contract in
 * `server/routes/openapi.json.ts`. Any mismatch exits non-zero with a list.
 */

const DEFAULT_BASE_URL = "https://vue-solana-docs.vercel.app";
const REQUEST_TIMEOUT_MS = 30_000;

const baseArgIndex = process.argv.indexOf("--base");
const baseUrl =
  (baseArgIndex !== -1 ? process.argv[baseArgIndex + 1] : undefined) ??
  process.env.DOCS_SURFACE_BASE_URL ??
  DEFAULT_BASE_URL;

const base = baseUrl.replace(/\/+$/, "");

/**
 * @typedef {object} Expectation
 * @property {string} path
 * @property {number} status
 * @property {string} contentType
 * @property {Record<string, string | undefined>} [headers] Headers that must match exactly.
 * @property {Record<string, string>} [requestHeaders]
 * @property {string[]} [absentHeaders]
 * @property {string[]} [presentHeaders]
 * @property {string[]} [bodyIncludes]
 */

/** @type {Expectation[]} */
const expectations = [
  {
    // Static asset served by the CDN before Nitro runs: text/plain and no
    // X-Api-Version / RateLimit-* is the documented behaviour.
    path: "/llms.txt",
    status: 200,
    contentType: "text/plain",
    absentHeaders: ["x-api-version", "ratelimit-limit"],
    bodyIncludes: ["# Vue Solana"],
  },
  {
    path: "/llms-full.txt",
    status: 200,
    contentType: "text/plain",
    absentHeaders: ["x-api-version", "ratelimit-limit"],
  },
  {
    path: "/guides/llms.txt",
    status: 200,
    contentType: "text/plain",
    absentHeaders: ["x-api-version", "ratelimit-limit"],
  },
  {
    // A Nitro route, so the version/rate-limit headers are real here.
    path: "/openapi.json",
    status: 200,
    contentType: "application/json",
    headers: { "x-api-version": "1" },
  },
  {
    path: "/getting-started",
    status: 200,
    contentType: "text/markdown",
    requestHeaders: { accept: "text/markdown" },
    headers: { "x-api-version": "1" },
    presentHeaders: ["link"],
  },
  {
    path: "/.md",
    status: 200,
    contentType: "text/markdown",
  },
  {
    path: "/definitely-not-a-page",
    status: 404,
    contentType: "text/markdown",
    requestHeaders: { accept: "text/markdown" },
    bodyIncludes: ["# 404"],
  },
  {
    // Browser navigation: HTML, and no Link header from the middleware.
    path: "/getting-started",
    status: 200,
    contentType: "text/html",
    requestHeaders: { accept: "text/html,application/xhtml+xml" },
    absentHeaders: ["link"],
  },
];

/**
 * @param {Expectation} expectation
 * @returns {Promise<string[]>} Human-readable failures; empty when it matches.
 */
async function check(expectation) {
  const url = `${base}${expectation.path}`;
  const failures = [];

  let response;

  try {
    response = await fetch(url, {
      headers: expectation.requestHeaders,
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return [`${url}: request failed (${error instanceof Error ? error.message : String(error)})`];
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (response.status !== expectation.status) {
    failures.push(`${url}: expected status ${expectation.status}, received ${response.status}`);
  }

  if (!contentType.toLowerCase().includes(expectation.contentType)) {
    failures.push(
      `${url}: expected Content-Type containing "${expectation.contentType}", received "${contentType}"`,
    );
  }

  for (const [name, value] of Object.entries(expectation.headers ?? {})) {
    const actual = response.headers.get(name);

    if (actual !== value) {
      failures.push(`${url}: expected ${name}: ${value}, received ${actual ?? "(missing)"}`);
    }
  }

  for (const name of expectation.absentHeaders ?? []) {
    const actual = response.headers.get(name);

    if (actual !== null) {
      failures.push(`${url}: expected no ${name} header, received "${actual}"`);
    }
  }

  for (const name of expectation.presentHeaders ?? []) {
    const actual = response.headers.get(name);

    if (actual === null) {
      failures.push(`${url}: expected a ${name} header`);
    }
  }

  for (const needle of expectation.bodyIncludes ?? []) {
    if (!body.includes(needle)) {
      failures.push(`${url}: body does not contain "${needle}"`);
    }
  }

  return failures;
}

const results = await Promise.all(expectations.map((expectation) => check(expectation)));
const failures = results.flat();

if (failures.length > 0) {
  console.error(`Agent surface check failed against ${base}:`);

  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }

  process.exitCode = 1;
} else {
  console.log(`Agent surface check passed against ${base} (${expectations.length} endpoints).`);
}
