import { defineComponent, h } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../test-utils";
import { useAccountInfo, type UseAccountInfoOptions } from "../src/composables/useAccountInfo";

export const systemProgram = "11111111111111111111111111111111";
export const wrappedSol = "So11111111111111111111111111111111111111112";

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

export function mountUseAccountInfo(
  address: Parameters<typeof useAccountInfo>[0],
  options?: UseAccountInfoOptions,
  connection: Partial<ReturnType<typeof createMockSolanaContext>["connection"]> = {},
) {
  const context = createMockSolanaContext({
    connection: connection as ReturnType<typeof createMockSolanaContext>["connection"],
  });
  let result: ReturnType<typeof useAccountInfo> | undefined;

  const wrapper = mountWithSolana(
    defineComponent({
      setup() {
        result = useAccountInfo(address, options);

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
        throw new Error("useAccountInfo result was not initialized");
      }

      return result;
    },
  };
}
