import { stringifyMarkdown } from "@nuxtjs/mdc/runtime";
import { toHast } from "minimark/hast";

import {
  API_VERSION,
  acceptsHtml,
  createAgent404Markdown,
  createProblemDetails,
  isMachineReadablePath,
  isWildcardishAccept,
  markdownNegotiationVary,
  negotiateFormat,
  rateLimitHeaders,
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
 * Page resolution happens in middleware only when the client asked for a
 * non-default representation (markdown or .md suffix) or cannot be served
 * the branded HTML error page (wildcard/API accepts get RFC 9457
 * problem+json instead). Browser navigations take the zero-cost early
 * return and are rendered normally.
 *
 * Unmatched paths get a real HTTP 404 — a markdown recovery body for
 * markdown agents, problem+json for API clients, the branded error page for
 * browsers. Every response carries `Vary: Accept, Accept-Encoding` so CDNs
 * never mix variants, and 404s are `no-store` so a missing path is never
 * cached as a 200.
 *
 * All responses also carry the version and RFC rate-limit headers documented
 * in openapi.json, so agents can self-throttle and pin the surface version.
 */
export default defineEventHandler(async (event) => {
  const requestUrl = getRequestURL(event);
  let path = requestUrl.pathname.replace(/\/+$/, "") || "/";

  const rateLimit = rateLimitHeaders(600, (Math.floor(Date.now() / 1000 / 3600) + 1) * 3600);

  for (const [header, value] of Object.entries(rateLimit)) {
    setResponseHeader(event, header, value);
  }

  setResponseHeader(event, "X-Api-Version", API_VERSION);

  const acceptHeader = getRequestHeader(event, "accept");
  const hasMdSuffix = path.endsWith(".md");
  const acceptsMarkdown = negotiateFormat(acceptHeader) === "markdown";
  const wantsHtmlError = acceptsHtml(acceptHeader) && !isWildcardishAccept(acceptHeader);

  if (hasMdSuffix) {
    path = path.slice(0, -3) || "/";
  }

  if (
    isMachineReadablePath(path) ||
    isWildcardishAccept(acceptHeader) ||
    (!hasMdSuffix && !acceptsMarkdown && wantsHtmlError)
  ) {
    return;
  }

  setResponseHeader(event, "Vary", markdownNegotiationVary(getResponseHeader(event, "Vary")));

  const page = await queryCollection(event, "content").path(path).first();

  if (page?.body) {
    if (!acceptsMarkdown && !hasMdSuffix) {
      return;
    }

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

  setResponseHeader(event, "Content-Type", "application/problem+json; charset=utf-8");
  setResponseStatus(event, 404, "Not Found");

  return createProblemDetails(requestUrl.pathname);
});
