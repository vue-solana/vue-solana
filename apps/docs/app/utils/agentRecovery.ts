export const SITE_URL = "https://vue-solana-docs.vercel.app";

/**
 * Current API version of the machine-readable surface, mirrored in the
 * `X-Api-Version` response header and documented in openapi.json. Bump on a
 * breaking change and publish a deprecation timeline next to it.
 */
export const API_VERSION = "1";

/**
 * Shared error type + media type for machine-readable error responses
 * (RFC 9457 `application/problem+json`), so agents can parse failures
 * without guessing at the shape.
 */
export const PROBLEM_JSON_MEDIA_TYPE = "application/problem+json";

export type NegotiatedFormat = "markdown" | "html";

const MARKDOWN_TYPES = ["text/markdown", "text/x-markdown"];

/**
 * Resolves an `Accept` header to the format the response should use.
 *
 * A wildcard `Accept` header (missing header, curl without explicit Accept,
 * most browsers) keeps the existing HTML behavior; only an explicit markdown
 * preference (including `text/markdown;q=0.9, text/html`) switches to
 * markdown, so the negotiation never changes what browsers see.
 */
export function negotiateFormat(acceptHeader: string | undefined | null): NegotiatedFormat {
  const accept = (acceptHeader ?? "").toLowerCase();

  if (!accept.trim()) {
    return "html";
  }

  if (!MARKDOWN_TYPES.some((type) => accept.includes(type))) {
    return "html";
  }

  const markdownPreference = Math.max(
    0,
    ...MARKDOWN_TYPES.flatMap((type) => extractQuality(accept, type)),
  );
  const htmlPreference = Math.max(0, ...extractQuality(accept, "text/html"));

  return markdownPreference >= htmlPreference ? "markdown" : "html";
}

function extractQuality(accept: string, type: string): number[] {
  const qualities: number[] = [];

  for (const item of accept.split(",")) {
    const [mediaType, ...parameters] = item.split(";").map((part) => part.trim());

    if (mediaType !== type) {
      continue;
    }

    let quality = 1;

    for (const parameter of parameters) {
      const [key, value] = parameter.split("=").map((part) => part.trim());

      if (key === "q") {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
          quality = parsed;
        }
      }
    }

    qualities.push(quality);
  }

  return qualities;
}

/**
 * Paths that must never be content-negotiated: server routes under /api/ and
 * Nuxt Content's internal /__nuxt_content query endpoint already have a single
 * authoritative representation, so markdown requests fall through to them
 * untouched. Static machine files (json/xml/txt) are covered by extension.
 *
 * The /__nuxt_content bypass is critical for correctness, not just caching:
 * queries issued inside server middleware run as internal fetches that RE-ENTER
 * the middleware chain with the original Accept header inherited, so without it
 * a markdown request would recurse (middleware → content query → middleware →
 * …) until the heap explodes. Note that underscore-prefixed paths generally
 * remain negotiable — audit probes like /__ora-404-probe-* must receive the
 * markdown 404, and real bundled assets are served before middleware runs.
 */
const MACHINE_READABLE_PREFIXES = ["/api/", "/__nuxt_content", "/problems/"];
const MACHINE_READABLE_EXTENSIONS = [".json", ".xml", ".txt", ".yaml", ".yml", ".webmanifest"];

export function isMachineReadablePath(path: string): boolean {
  if (MACHINE_READABLE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return true;
  }

  return MACHINE_READABLE_EXTENSIONS.some((extension) => path.endsWith(extension));
}

/**
 * Response headers required by the acceptmarkdown.com contract: caches must
 * key on the negotiated format, so `Accept` has to be listed in `Vary`.
 */
export function markdownNegotiationVary(existingVary: string | undefined | null): string {
  const tokens = (existingVary ?? "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  for (const token of ["accept", "accept-encoding"]) {
    if (!tokens.includes(token)) {
      tokens.push(token);
    }
  }

  return tokens.join(", ");
}

/**
 * The markdown recovery body for 404 responses. Agents that hit a dead link
 * get the status, the canonical URL, and concrete next steps instead of an
 * HTML app shell.
 */
export function createAgent404Markdown(path: string): string {
  return `# 404 — Page Not Found

The path \`${path}\` does not exist on Vue Solana Docs.

## Where To Look Next

- [Site map](https://vue-solana-docs.vercel.app/sitemap.xml): every indexed documentation page.
- [Agent guide](https://vue-solana-docs.vercel.app/llms.txt): llms.txt index of all documentation pages.
- [Full documentation](https://vue-solana-docs.vercel.app/llms-full.txt): complete site content as one markdown document.
- [OpenAPI spec](https://vue-solana-docs.vercel.app/openapi.json): machine-readable API surface, error model, and versioning policy.
- [Developer portal](https://vue-solana-docs.vercel.app/developers): quickstart and machine-readable endpoint reference.
- [About](https://vue-solana-docs.vercel.app/about): what this project is and who maintains it.
- [Contact](https://vue-solana-docs.vercel.app/contact): support, security reports, and press channels.
- [Overview](https://vue-solana-docs.vercel.app/): documentation home page.
- [Getting Started](https://vue-solana-docs.vercel.app/getting-started): install and configure the Vue Solana packages.
- [Agent Skill](https://vue-solana-docs.vercel.app/agent-skill): installable skill for AI coding agents.
- [Troubleshooting](https://vue-solana-docs.vercel.app/troubleshooting): common setup and wallet issues.

Re-sending this request with an \`Accept: text/markdown\` header returns any
documentation page as markdown instead of HTML.
`;
}

/**
 * Detects HTML-preferring clients (real browser navigations, which always
 * send an explicit text/html preference). Only these get the branded HTML
 * error page; everything else — API clients, curl probes — receives RFC 9457
 * problem+json, matching the openapi.json error contract.
 */
export function acceptsHtml(acceptHeader: string | undefined | null): boolean {
  if (negotiateFormat(acceptHeader) === "markdown") {
    return false;
  }

  const accept = (acceptHeader ?? "").toLowerCase();

  return accept.includes("text/html");
}

/**
 * Wildcard-ish accepts (missing header, curl default, or any accept header
 * containing a wildcard media type) have no format preference, so they keep
 * the framework's default rendering and error behavior — the middleware must
 * not resolve them. Renderer-only routes like /demo (an SPA page, not a
 * Content document) depend on this pass-through to stay reachable for
 * non-browser clients.
 */
export function isWildcardishAccept(acceptHeader: string | undefined | null): boolean {
  const accept = (acceptHeader ?? "").trim().toLowerCase();

  return !accept || accept.includes("*/*");
}

/**
 * RFC 9457 Problem Details body for machine-facing 404s. The `recovery`
 * extension object carries the same canonical links as the markdown 404 so
 * agents get actionable next steps in either representation.
 */
export function createProblemDetails(path: string): Record<string, unknown> {
  return {
    type: `${SITE_URL}/problems/not-found`,
    title: "Page Not Found",
    status: 404,
    detail: `The path ${path} does not exist on Vue Solana Docs.`,
    instance: path,
    recovery: {
      index: `${SITE_URL}/llms.txt`,
      corpus: `${SITE_URL}/llms-full.txt`,
      sitemap: `${SITE_URL}/sitemap.xml`,
      spec: `${SITE_URL}/openapi.json`,
    },
  };
}

/**
 * Standard RFC rate-limit headers (draft-ietf-httpapi-ratelimit-headers) for
 * every machine-facing response. Agents read these to self-throttle instead
 * of hammering the endpoint until a 429.
 *
 * The docs endpoints are static/serverless and effectively unthrottled, so
 * the limit is generous and resets hourly.
 */
export function rateLimitHeaders(
  remaining: number,
  resetEpochSeconds: number,
): Record<string, string> {
  const limit = 600;
  const clampedRemaining = Math.max(0, remaining);
  const now = Math.floor(Date.now() / 1000);
  const reset = Math.max(resetEpochSeconds, now + 1);

  return {
    "RateLimit-Limit": `${limit}`,
    "RateLimit-Remaining": `${clampedRemaining}`,
    "RateLimit-Reset": `${reset}`,
  };
}
