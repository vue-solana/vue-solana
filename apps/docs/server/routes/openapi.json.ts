import { defineEventHandler, setResponseHeader } from "h3";

import { SITE_URL } from "~/utils/agentRecovery";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Vue Solana Docs API",
    version: "1.0.0",
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
  "x-accept-markdown": {
    markdown_variants: [
      "Append .md to any documentation page URL (for example /getting-started.md).",
      "Send Accept: text/markdown to any documentation page URL.",
    ],
    note: "Both variants return the page's markdown source. Unmatched paths return a markdown 404 with recovery links.",
  },
  paths: {
    "/llms.txt": {
      get: {
        operationId: "getLlmsIndex",
        summary: "llms.txt index of documentation pages for agents",
        description: "Markdown link index of every documentation page, plus package overview.",
        tags: ["Agent"],
        responses: {
          "200": {
            description: "Markdown index",
            content: { "text/markdown": { schema: { type: "string" } } },
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
        responses: {
          "200": {
            description: "Markdown corpus",
            content: { "text/markdown": { schema: { type: "string" } } },
          },
        },
      },
    },
    "/sitemap.xml": {
      get: {
        operationId: "getSitemap",
        summary: "XML sitemap of every documentation URL",
        tags: ["Agent"],
        responses: {
          "200": {
            description: "Sitemap XML",
            content: { "application/xml": { schema: { type: "string" } } },
          },
        },
      },
    },
    "/openapi.json": {
      get: {
        operationId: "getOpenApiSpec",
        summary: "This OpenAPI specification",
        tags: ["Agent"],
        responses: {
          "200": {
            description: "OpenAPI 3.1 document",
            content: { "application/json": { schema: { type: "object" } } },
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
          "recovery body when markdown is requested.",
        tags: ["Docs"],
        parameters: [
          {
            name: "page",
            in: "path",
            required: true,
            description: "Documentation page path, for example getting-started or guides/wallets.",
            schema: { type: "string" },
          },
          {
            name: "Accept",
            in: "header",
            required: false,
            description: "Send text/markdown to receive the markdown variant.",
            schema: { type: "string", example: "text/markdown" },
          },
        ],
        responses: {
          "200": {
            description: "Documentation page",
            content: {
              "text/html": { schema: { type: "string" } },
              "text/markdown": { schema: { type: "string" } },
            },
          },
          "404": {
            description: "Unknown path; body lists recovery resources",
            content: {
              "text/markdown": { schema: { type: "string" } },
              "application/json": { schema: { type: "object" } },
            },
          },
        },
      },
    },
  },
} as const;

export default defineEventHandler((event) => {
  setResponseHeader(event, "Content-Type", "application/json; charset=utf-8");
  setResponseHeader(event, "Cache-Control", "public, max-age=3600");

  return spec;
});
