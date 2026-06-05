import { vi } from "vitest";

export const runtimeConfig = {
  public: {
    solana: {},
  },
};

export const defineNuxtPlugin = vi.fn((plugin: unknown) => plugin);

export const useRuntimeConfig = vi.fn(() => runtimeConfig);
