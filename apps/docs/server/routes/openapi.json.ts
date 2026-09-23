import { defineEventHandler, setResponseHeader } from "h3";

import { API_VERSION, PROBLEM_JSON_MEDIA_TYPE, SITE_URL } from "~/utils/agentRecovery";

const SPEC_VERSION = `${API_VERSION}.0.0`;

const PROBLEMS_BASE = `${SITE_URL}/problems`;

const problemSchema = {
  type: "object",
  description:
    "RFC 9457 Problem Details object returned with Content-Type: application/problem+json on machine-facing error responses.",
  required: ["type", "title", "status"],
  properties: {
    type: {
      type: "string",
      format: "uri-reference",
      description:
        "URI reference identifying the error type, resolvable under /problems/ for stable documentation of each failure mode.",
      examples: [`${PROBLEMS_BASE}/not-found`],
    },
    title: {
      type: "string",
      description: "Short human-readable summary, stable per error type.",
      examples: ["Page Not Found"],
    },
    status: {
      type: "integer",
      description: "HTTP status code, duplicated in the body for proxies that strip it.",
      examples: [404],
    },
    detail: {
      type: "string",
      description: "Human-readable explanation specific to this occurrence.",
      examples: ["The path /x/y does not exist on Vue Solana Docs."],
    },
    instance: {
      type: "string",
      description: "URI reference of the request that failed.",
      examples: ["/x/y"],
    },
    recovery: {
      type: "object",
      description:
        "Vue Solana extension: canonical URLs an agent can follow to recover (page index, full corpus, sitemap, this spec).",
      properties: {
        index: { type: "string", format: "uri", examples: [`${SITE_URL}/llms.txt`] },
        corpus: { type: "string", format: "uri", examples: [`${SITE_URL}/llms-full.txt`] },
        sitemap: { type: "string", format: "uri", examples: [`${SITE_URL}/sitemap.xml`] },
        spec: { type: "string", format: "uri", examples: [`${SITE_URL}/openapi.json`] },
      },
    },
  },
} as const;

const rateLimitHeaders = {
  "RateLimit-Limit": {
    description: "Requests allowed per window (hourly policy on this static documentation site).",
    schema: { type: "integer" },
    example: 600,
  },
  "RateLimit-Remaining": {
    description: "Requests remaining in the current window.",
    schema: { type: "integer" },
    example: 600,
  },
  "RateLimit-Reset": {
    description: "Unix epoch seconds when the current window resets.",
    schema: { type: "integer" },
    example: 1735689600,
  },
} as const;

const apiVersionHeaderParam = {
  name: "X-Api-Version",
  in: "header",
  required: false,
  description:
    "Request a specific API major version. The only released version is 1; unsupported versions return 400 problem+json.",
  schema: { type: "string", default: "1", examples: ["1"] },
} as const;

const apiVersionResponseHeader = {
  description: "Major version of the machine-readable surface serving this response.",
  schema: { type: "string" },
  example: API_VERSION,
} as const;

const standard200Headers = {
  "X-Api-Version": apiVersionResponseHeader,
  ...rateLimitHeaders,
} as const;

const errorResponses = {
  NotFound: {
    description:
      "Not Found — problem+json body whose recovery object links llms.txt, llms-full.txt, sitemap.xml, and this spec. " +
      "Requests carrying Accept: text/markdown receive a markdown recovery body instead.",
    headers: {
      ...standard200Headers,
      "Retry-After": { description: "Only sent with 429.", schema: { type: "integer" } },
    },
    content: {
      [PROBLEM_JSON_MEDIA_TYPE]: { schema: problemSchema },
      "text/markdown": { schema: { type: "string" } },
    },
  } as const,
  TooManyRequests: {
    description:
      "Too Many Requests — problem+json body; includes Retry-After seconds until the window resets.",
    headers: {
      ...standard200Headers,
      "Retry-After": {
        description:
          "Seconds until the rate-limit window resets; safe to retry after this many seconds.",
        schema: { type: "integer" },
        example: 60,
      },
    },
    content: { [PROBLEM_JSON_MEDIA_TYPE]: { schema: problemSchema } },
  } as const,
};

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Vue Solana Docs API",
    version: SPEC_VERSION,
    summary: "Machine-readable surface of the Vue Solana documentation site.",
    description:
      "Vue Solana documents Vue and Nuxt libraries that help developers use Solana. " +
      "This site is documentation, not a REST API: every documented path serves content. " +
      "Agents should read llms.txt for the page index, llms-full.txt for the full corpus, " +
      "sitemap.xml for the complete URL list, and request text/markdown via Accept negotiation.",
    contact: {
      name: "Vue Solana",
      url: "https://github.com/vue-solana/vue-solana",
    },
    license: {
      name: "MIT",
      url: "https://github.com/vue-solana/vue-solana/blob/main/LICENSE",
    },
  },
  servers: [{ url: SITE_URL }],
  tags: [
    {
      name: "Agent",
      description:
        "Machine-readable resources for AI agents: page index, full corpus, sitemap, and this spec.",
    },
    {
      name: "Docs",
      description: "Human documentation pages, served as HTML or negotiated markdown.",
    },
  ],
  "x-versioning-policy": {
    current: SPEC_VERSION,
    scheme:
      "Header-based major versioning via X-Api-Version (request) and X-Api-Version (response).",
    breaking_changes:
      "A breaking change to any machine-readable surface bumps the major version in X-Api-Version and info.version, " +
      "and the previous major version keeps serving for at least 6 months.",
    deprecation_signal:
      "Deprecated operations return HTTP Deprecation: true with a Sunset date header; Sunset: <http-date> marks removal.",
    error_contract:
      "All machine-facing errors use RFC 9457 application/problem+json with a stable type URI under /problems/.",
    stability:
      "Documentation content changes continuously without version bumps; only endpoint shapes (paths, headers, media types) are versioned.",
  },
  "x-accept-markdown": {
    markdown_variants: [
      "Append .md to any documentation page URL (for example /getting-started.md).",
      "Send Accept: text/markdown to any documentation page URL.",
    ],
    note: "Both variants return the page's markdown source. Unmatched paths return a markdown 404 with recovery links.",
  },
  "x-rate-limit-policy": {
    standard:
      "RFC draft-ietf-httpapi-ratelimit-headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset).",
    window: "600 requests per hour per client, reset at the top of the hour.",
    on_429: "HTTP 429 includes RateLimit-* headers and Retry-After seconds.",
    note: "This site is served statically/serverlessly; the documented budget is a courtesy ceiling, not an enforced quota.",
  },
  components: {
    schemas: {
      ProblemDetails: problemSchema,
    },
    responses: {
      NotFound: errorResponses.NotFound,
      TooManyRequests: errorResponses.TooManyRequests,
    },
  },
  paths: {
    "/llms.txt": {
      get: {
        operationId: "getLlmsIndex",
        summary: "llms.txt index of documentation pages for agents",
        description: "Markdown link index of every documentation page, plus package overview.",
        tags: ["Agent"],
        parameters: [apiVersionHeaderParam],
        responses: {
          "200": {
            description: "Markdown index",
            headers: standard200Headers,
            content: {
              "text/markdown": {
                schema: { type: "string" },
                example:
                  "# Vue Solana\n\n> Vue and Nuxt libraries that help developers use Solana.\n\n## When To Use\n\n- ...",
              },
            },
          },
        },
      },
    },
    "/llms-full.txt": {
      get: {
        operationId: "getLlmsFull",
        summary: "Complete documentation as one markdown document",
        description: "Full corpus of every documentation page concatenated in reading order.",
        tags: ["Agent"],
        parameters: [apiVersionHeaderParam],
        responses: {
          "200": {
            description: "Markdown corpus",
            headers: standard200Headers,
            content: {
              "text/markdown": {
                schema: { type: "string" },
                example: "# Vue Solana Full Documentation\n\n# Getting Started\n\n...",
              },
            },
          },
        },
      },
    },
    "/sitemap.xml": {
      get: {
        operationId: "getSitemap",
        summary: "XML sitemap of every documentation URL",
        tags: ["Agent"],
        parameters: [apiVersionHeaderParam],
        responses: {
          "200": {
            description: "Sitemap index XML referencing per-locale child sitemaps",
            headers: standard200Headers,
            content: {
              "application/xml": {
                schema: { type: "string" },
                example: '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex>...</sitemapindex>',
              },
            },
          },
        },
      },
    },
    "/openapi.json": {
      get: {
        operationId: "getOpenApiSpec",
        summary: "This OpenAPI specification",
        description:
          "Returns the OpenAPI 3.1 document describing this site's machine-readable surface: " +
          "the llms.txt index, the full corpus, the sitemap, the Accept-based markdown negotiation " +
          "contract, the RFC 9457 error model, the versioning policy, and the rate-limit headers.",
        tags: ["Agent"],
        parameters: [apiVersionHeaderParam],
        responses: {
          "200": {
            description: "OpenAPI 3.1 document",
            headers: standard200Headers,
            content: {
              "application/json": {
                schema: { type: "object" },
                example: {
                  openapi: "3.1.0",
                  info: { title: "Vue Solana Docs API", version: "1.0.0" },
                },
              },
            },
          },
        },
      },
    },
    "/{page}": {
      get: {
        operationId: "getDocumentationPage",
        summary: "Documentation page as HTML or markdown",
        description:
          "Content negotiation: Accept: text/markdown (or a .md URL suffix) returns the page " +
          "as markdown; anything else returns the server-rendered HTML page. Responses always " +
          "carry Vary: Accept, Accept-Encoding. Unmatched paths return HTTP 404 with a markdown " +
          "recovery body when markdown is requested, a problem+json body for explicit " +
          "non-HTML/non-markdown Accept headers, or the default JSON error body otherwise.",
        tags: ["Docs"],
        parameters: [apiVersionHeaderParam],
        responses: {
          "200": {
            description: "Documentation page",
            headers: {
              ...standard200Headers,
              Vary: { description: "accept, accept-encoding", schema: { type: "string" } },
            },
            content: {
              "text/html": {
                schema: { type: "string" },
                example: "<!DOCTYPE html><html>...server-rendered page...</html>",
              },
              "text/markdown": {
                schema: { type: "string" },
                example:
                  "This guide covers installing the Vue Solana packages...\n\n## Before You Start\n\n...",
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
        },
      },
    },
  },
} as const;

export default defineEventHandler((event) => {
  setResponseHeader(event, "Content-Type", "application/json; charset=utf-8");
  setResponseHeader(event, "Cache-Control", "public, max-age=3600");
  setResponseHeader(event, "X-Api-Version", API_VERSION);
  setResponseHeader(event, "RateLimit-Limit", "600");
  setResponseHeader(event, "RateLimit-Remaining", "600");
  setResponseHeader(
    event,
    "RateLimit-Reset",
    `${(Math.floor(Date.now() / 1000 / 3600) + 1) * 3600}`,
  );

  return spec;
});
