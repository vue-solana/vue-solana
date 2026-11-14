// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { agentLinkHeader } from "../../app/utils/agentRecovery";

/**
 * The negotiation helpers in `app/utils/agentRecovery.ts` have unit tests;
 * this file exercises the middleware itself, which is where a regression
 * (wrong branch, dropped `Link` header, `.md` fallthrough) would actually
 * reach agents. The middleware relies on Nitro auto-imports, so the h3
 * helpers and `queryCollection` are stubbed on `globalThis` before the module
 * is imported, and `minimark` is mocked because this test is about plumbing,
 * not markdown serialization.
 */
vi.mock("minimark/stringify", () => ({
  stringify: (body: unknown) => String(body),
}));

type MockEvent = {
  url: string;
  accept?: string;
  responseHeaders: Record<string, string>;
  status: number;
};

let handler: (event: MockEvent) => Promise<unknown>;
let currentPage: { body: unknown } | null = null;

function createEvent(url: string, accept?: string): MockEvent {
  return { url, accept, responseHeaders: {}, status: 200 };
}

beforeAll(async () => {
  vi.stubGlobal("defineEventHandler", (fn: unknown) => fn);
  vi.stubGlobal("getRequestURL", (event: MockEvent) => new URL(event.url, "http://localhost"));
  vi.stubGlobal("getRequestHeader", (event: MockEvent, name: string) =>
    name.toLowerCase() === "accept" ? event.accept : undefined,
  );
  vi.stubGlobal(
    "getResponseHeader",
    (event: MockEvent, name: string) => event.responseHeaders[name],
  );
  vi.stubGlobal("setResponseHeader", (event: MockEvent, name: string, value: string) => {
    event.responseHeaders[name] = value;
  });
  vi.stubGlobal("setResponseStatus", (event: MockEvent, code: number) => {
    event.status = code;
  });
  vi.stubGlobal("queryCollection", () => ({
    path: () => ({ first: async () => currentPage }),
  }));

  const mod = await import("./markdown-negotiation");
  handler = mod.default as unknown as (event: MockEvent) => Promise<unknown>;
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("markdown-negotiation middleware", () => {
  it("serves markdown for a .md suffix even with a wildcard Accept", async () => {
    currentPage = { body: "hello markdown" };
    const event = createEvent("/getting-started.md");

    await expect(handler(event)).resolves.toBe("hello markdown");

    expect(event.status).toBe(200);
    expect(event.responseHeaders["Content-Type"]).toBe("text/markdown; charset=utf-8");
    expect(event.responseHeaders.Link).toBe(agentLinkHeader("/getting-started"));
    expect(event.responseHeaders.Vary).toContain("accept");
  });

  it("serves markdown for an explicit Accept: text/markdown and sets Link", async () => {
    currentPage = { body: "hello markdown" };
    const event = createEvent("/getting-started", "text/markdown");

    await expect(handler(event)).resolves.toBe("hello markdown");

    expect(event.responseHeaders["Content-Type"]).toBe("text/markdown; charset=utf-8");
    expect(event.responseHeaders.Link).toBe(agentLinkHeader("/getting-started"));
    expect(event.responseHeaders.Vary).toContain("accept-encoding");
  });

  it("passes browser navigations through without negotiating", async () => {
    currentPage = { body: "hello markdown" };
    const event = createEvent("/getting-started", "text/html,application/xhtml+xml");

    await expect(handler(event)).resolves.toBeUndefined();

    expect(event.responseHeaders.Link).toBeUndefined();
    expect(event.responseHeaders["Content-Type"]).toBeUndefined();
  });

  it("returns a markdown 404 with Link for an unmatched markdown request", async () => {
    currentPage = null;
    const event = createEvent("/missing", "text/markdown");

    const result = await handler(event);

    expect(String(result)).toContain("# 404");
    expect(event.status).toBe(404);
    expect(event.responseHeaders["Content-Type"]).toBe("text/markdown; charset=utf-8");
    expect(event.responseHeaders.Link).toBe(agentLinkHeader("/missing"));
    expect(event.responseHeaders["Cache-Control"]).toBe("no-store");
  });

  it("returns problem+json for an unmatched non-HTML API request", async () => {
    currentPage = null;
    const event = createEvent("/missing", "application/json");

    const result = await handler(event);

    expect(result).toMatchObject({ status: 404, title: "Page Not Found" });
    expect(event.status).toBe(404);
    expect(event.responseHeaders["Content-Type"]).toBe("application/problem+json; charset=utf-8");
  });
});
