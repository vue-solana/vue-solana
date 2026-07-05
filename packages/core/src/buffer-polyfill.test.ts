import { afterEach, describe, expect, it } from "vitest";
import { Buffer, installSolanaBufferPolyfill } from "./buffer-polyfill";

type GlobalWithBuffer = Omit<typeof globalThis, "Buffer"> & {
  Buffer?: typeof Buffer;
};

const globalScope = globalThis as GlobalWithBuffer;
const originalBuffer = globalScope.Buffer;

afterEach(() => {
  globalScope.Buffer = originalBuffer;
});

describe("installSolanaBufferPolyfill", () => {
  it("installs Buffer on globalThis when it is missing", () => {
    delete globalScope.Buffer;

    const installed = installSolanaBufferPolyfill();

    expect(installed).toBe(Buffer);
    expect(globalScope.Buffer).toBe(Buffer);
  });

  it("keeps an existing Buffer implementation", () => {
    class ExistingBuffer extends Buffer {}
    globalScope.Buffer = ExistingBuffer;

    const installed = installSolanaBufferPolyfill();

    expect(installed).toBe(ExistingBuffer);
    expect(globalScope.Buffer).toBe(ExistingBuffer);
  });
});
