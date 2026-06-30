import bs58 from "bs58";
import { defineComponent, h } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../test-utils";
import {
  useSignatureStatus,
  type UseSignatureStatusOptions,
} from "../src/composables/useSignatureStatus";

export const signature = bs58.encode(new Uint8Array(64).fill(1));
export const nextSignature = bs58.encode(new Uint8Array(64).fill(2));

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

export function mountUseSignatureStatus(
  signatureInput: Parameters<typeof useSignatureStatus>[0],
  options?: UseSignatureStatusOptions,
  connection: Partial<ReturnType<typeof createMockSolanaContext>["connection"]> = {},
) {
  const context = createMockSolanaContext({
    connection: connection as ReturnType<typeof createMockSolanaContext>["connection"],
  });
  let result: ReturnType<typeof useSignatureStatus> | undefined;

  const wrapper = mountWithSolana(
    defineComponent({
      setup() {
        result = useSignatureStatus(signatureInput, options);

        return () => h("div");
      },
    }),
    context,
  );

  return {
    context,
    wrapper,
    get result() {
      if (!result) {
        throw new Error("useSignatureStatus result was not initialized");
      }

      return result;
    },
  };
}
