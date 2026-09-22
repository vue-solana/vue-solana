import { stringifyMarkdown } from "@nuxtjs/mdc/runtime";
import { toHast } from "minimark/hast";

import {
  createAgent404Markdown,
  isMachineReadablePath,
  markdownNegotiationVary,
  negotiateFormat,
} from "~/utils/agentRecovery";

/**
 * Markdown content negotiation and agent-friendly 404s in one handler.
 *
 * Nitro runs server middleware in a single pass before route rules and the
 * renderer, so page resolution and the 404 fallback must live here together:
 * splitting them into two middleware files would let whichever runs first
 * answer every request (middleware cannot observe that the renderer would
 * later 404, nor that a later middleware would have found the page).
 *
 * Every documentation page — including the homepage — can be requested as
 * markdown, two ways:
 * - `Accept: text/markdown` header (acceptmarkdown.com contract)
 * - appending `.md` to the page URL (e.g. `/getting-started.md`)
 *
 * Existing pages resolve through Nuxt Content and return their markdown
 * source. Unmatched paths get a real HTTP 404 — a markdown recovery body for
 * agents, the branded error page for browsers. Every response carries
 * `Vary: Accept, Accept-Encoding` so CDNs never mix variants, and 404s are
 * `no-store` so a missing path is never cached as a 200.
 */
export default defineEventHandler(async (event) => {
  const requestUrl = getRequestURL(event);
  let path = requestUrl.pathname.replace(/\/+$/, "") || "/";

  const hasMdSuffix = path.endsWith(".md");
  const acceptsMarkdown = negotiateFormat(getRequestHeader(event, "accept")) === "markdown";

  if (hasMdSuffix) {
    path = path.slice(0, -3) || "/";
  }

  if (isMachineReadablePath(path) || (!hasMdSuffix && !acceptsMarkdown)) {
    return;
  }

  setResponseHeader(event, "Vary", markdownNegotiationVary(getResponseHeader(event, "Vary")));

  const page = await queryCollection(event, "content").path(path).first();

  if (page?.body) {
    const markdown = await stringifyMarkdown(toHast(page.body));

    setResponseHeader(event, "Content-Type", "text/markdown; charset=utf-8");
    setResponseStatus(event, 200, "OK");

    return markdown;
  }

  setResponseHeader(event, "Cache-Control", "no-store");

  if (acceptsMarkdown || hasMdSuffix) {
    setResponseHeader(event, "Content-Type", "text/markdown; charset=utf-8");
    setResponseStatus(event, 404, "Not Found");

    return createAgent404Markdown(requestUrl.pathname);
  }

  throw createError({
    statusCode: 404,
    statusMessage: "Not Found",
    data: { path: requestUrl.pathname },
  });
});
