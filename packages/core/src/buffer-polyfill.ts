import { Buffer } from "buffer/";

type GlobalWithBuffer = typeof globalThis & {
  Buffer?: typeof Buffer;
};

export function installSolanaBufferPolyfill(): typeof Buffer {
  const globalScope = globalThis as GlobalWithBuffer;

  globalScope.Buffer ??= Buffer;

  return globalScope.Buffer;
}

export { Buffer };
