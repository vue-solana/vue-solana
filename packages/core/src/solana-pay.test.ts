import { describe, it, expect } from "vitest";
import { address } from "@solana/kit";
import {
  ParseURLError,
  createQR,
  encodeURL,
  encodeTransferRequestURL,
  parseURL,
} from "../src/solana-pay";

const recipient = address("11111111111111111111111111111111");
const splToken = address("So11111111111111111111111111111111111111112");
const reference = address("SysvarRent111111111111111111111111111111111");

describe("solana pay", () => {
  it("encodes and parses a transfer url", () => {
    const url = encodeURL({
      recipient,
      amount: 100000000n,
      label: "Test",
    });
    const parsed = parseURL(url.toString()) as { recipient: string; amount: bigint; label: string };
    expect(parsed.recipient).toBe("11111111111111111111111111111111");
    expect(parsed.amount).toBe(100000000n);
    expect(parsed.label).toBe("Test");
  });

  it("round-trips SPL token, references, message, and memo fields", () => {
    const url = encodeTransferRequestURL({
      recipient,
      amount: 1500000000n,
      splToken,
      reference: [reference, splToken],
      label: "Store",
      message: "Order #1",
      memo: "memo-1",
    });

    expect(url.protocol).toBe("solana:");
    expect(url.searchParams.getAll("reference")).toEqual([
      reference.toString(),
      splToken.toString(),
    ]);

    const parsed = parseURL(url.toString()) as {
      amount: bigint;
      splToken: string;
      reference: string[];
      label: string;
      message: string;
      memo: string;
    };

    expect(parsed.amount).toBe(1500000000n);
    expect(parsed.splToken).toBe(splToken.toString());
    expect(parsed.reference).toEqual([reference.toString(), splToken.toString()]);
    expect(parsed.label).toBe("Store");
    expect(parsed.message).toBe("Order #1");
    expect(parsed.memo).toBe("memo-1");
  });

  it("rejects an invalid amount", () => {
    expect(() => parseURL(`solana:${recipient}?amount=1.1234567890`)).toThrow(ParseURLError);
    expect(() => parseURL(`solana:${recipient}?amount=-1`)).toThrow(ParseURLError);
    expect(() => parseURL(`solana:${recipient}?amount=abc`)).toThrow(ParseURLError);
  });

  it("rejects an invalid recipient and protocol", () => {
    expect(() => parseURL("solana:not-an-address")).toThrow(ParseURLError);
    expect(() => parseURL("https://example.com")).toThrow(ParseURLError);
  });

  it("renders a QR code as SVG", async () => {
    const svg = await createQR(`solana:${recipient}?amount=0.1`);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
  });
});
