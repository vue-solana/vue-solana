import { describe, expect, it } from "vitest";

import {
  createAgent404Markdown,
  isMachineReadablePath,
  markdownNegotiationVary,
  negotiateFormat,
  SITE_URL,
} from "./agentRecovery";

describe("negotiateFormat", () => {
  it("keeps HTML for browsers sending */*", () => {
    expect(negotiateFormat("*/*")).toBe("html");
    expect(negotiateFormat("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")).toBe(
      "html",
    );
  });

  it("keeps HTML when the header is missing or empty", () => {
    expect(negotiateFormat(undefined)).toBe("html");
    expect(negotiateFormat(null)).toBe("html");
    expect(negotiateFormat("")).toBe("html");
  });

  it("keeps HTML for unrelated accept types", () => {
    expect(negotiateFormat("application/json")).toBe("html");
    expect(negotiateFormat("text/plain")).toBe("html");
  });

  it("prefers markdown when text/markdown outranks text/html", () => {
    expect(negotiateFormat("text/markdown")).toBe("markdown");
    expect(negotiateFormat("text/markdown, text/html")).toBe("markdown");
    expect(negotiateFormat("text/markdown;q=1.0, text/html;q=0.8")).toBe("markdown");
  });

  it("prefers markdown against wildcard HTML defaults", () => {
    expect(negotiateFormat("text/markdown,*/*;q=0.8")).toBe("markdown");
  });

  it("keeps HTML when text/html has the higher quality", () => {
    expect(negotiateFormat("text/markdown;q=0.5, text/html;q=0.9")).toBe("html");
  });

  it("treats text/x-markdown as markdown", () => {
    expect(negotiateFormat("text/x-markdown")).toBe("markdown");
  });

  it("is case-insensitive", () => {
    expect(negotiateFormat("TEXT/MARKDOWN")).toBe("markdown");
  });
});

describe("isMachineReadablePath", () => {
  it("lets server routes and static machine files pass through untouched", () => {
    for (const path of [
      "/openapi.json",
      "/api/openapi.yaml",
      "/llms.txt",
      "/robots.txt",
      "/sitemap.xml",
      "/site.webmanifest",
      "/api/anything",
      "/_payload.json",
      "/__nuxt_content/content/query",
      "/specs.yml",
    ]) {
      expect(isMachineReadablePath(path)).toBe(true);
    }
  });

  it("treats documentation pages and audit probes as negotiable", () => {
    for (const path of [
      "/",
      "/getting-started",
      "/guides/wallets",
      "/agent-skill",
      "/roadmap",
      "/__ora-404-probe-pe3wy5tm",
      "/__ora-probe-not-machine-readable",
    ]) {
      expect(isMachineReadablePath(path)).toBe(false);
    }
  });
});

describe("markdownNegotiationVary", () => {
  it("returns the full vary list when no header exists", () => {
    expect(markdownNegotiationVary(undefined)).toBe("accept, accept-encoding");
    expect(markdownNegotiationVary("")).toBe("accept, accept-encoding");
  });

  it("keeps existing tokens and appends the required ones", () => {
    expect(markdownNegotiationVary("User-Agent")).toBe("user-agent, accept, accept-encoding");
    expect(markdownNegotiationVary("Accept-Encoding")).toBe("accept-encoding, accept");
  });

  it("does not duplicate tokens already present", () => {
    expect(markdownNegotiationVary("Accept, Accept-Encoding")).toBe("accept, accept-encoding");
    expect(markdownNegotiationVary("accept")).toBe("accept, accept-encoding");
  });
});

describe("createAgent404Markdown", () => {
  it("starts with an H1 404 heading and echoes the missing path", () => {
    const markdown = createAgent404Markdown("/does-not-exist");

    expect(markdown.startsWith("# 404")).toBe(true);
    expect(markdown).toContain("`/does-not-exist`");
  });

  it("links the recovery resources agents need", () => {
    const markdown = createAgent404Markdown("/does-not-exist");

    for (const resource of [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/llms.txt`,
      `${SITE_URL}/llms-full.txt`,
      `${SITE_URL}/openapi.json`,
      `${SITE_URL}/getting-started`,
      `${SITE_URL}/agent-skill`,
    ]) {
      expect(markdown).toContain(resource);
    }
  });

  it("mentions the markdown negotiation affordance", () => {
    expect(createAgent404Markdown("/x")).toContain("Accept: text/markdown");
  });
});
