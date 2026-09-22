export const SITE_URL = "https://vue-solana-docs.vercel.app";

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
 * Paths that must never be content-negotiated: server routes and static
 * machine-readable files already have a single authoritative representation,
 * so markdown requests fall through to them untouched.
 */
const MACHINE_READABLE_PREFIXES = ["/api/", "/_", "/__"];
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
- [OpenAPI spec](https://vue-solana-docs.vercel.app/openapi.json): machine-readable API surface.
- [Overview](https://vue-solana-docs.vercel.app/): documentation home page.
- [Getting Started](https://vue-solana-docs.vercel.app/getting-started): install and configure the Vue Solana packages.
- [Agent Skill](https://vue-solana-docs.vercel.app/agent-skill): installable skill for AI coding agents.
- [Troubleshooting](https://vue-solana-docs.vercel.app/troubleshooting): common setup and wallet issues.

Re-sending this request with an \`Accept: text/markdown\` header returns any
documentation page as markdown instead of HTML.
`;
}
