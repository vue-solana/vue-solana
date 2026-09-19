import type { TransactionSigner } from "@vue-solana/core/kit";
import { shallowRef, onScopeDispose, type Ref } from "vue";
import { useClientCapability } from "./useClientCapability";
import { useSolanaClient } from "./useSolanaClient";

type ClientWithSubscribeToPayer = { subscribeToPayer?: (listener: () => void) => () => void };
type ClientWithSubscribeToIdentity = { subscribeToIdentity?: (listener: () => void) => () => void };

/**
 * The acting identity signer — the wallet whose assets the application is
 * acting upon. Requires the client to expose `identity` (e.g. via a Kit
 * signer plugin). Re-reads on change when the client advertises
 * `subscribeToIdentity`.
 */
export function useIdentity(): Ref<TransactionSigner> {
  useClientCapability(["identity"], {
    hookName: "useIdentity",
    providerHint:
      "Install a signer plugin, e.g. `createClient().use(generatedIdentity())` from `@solana/kit-plugin-signer`.",
  });

  const { client } = useSolanaClient();
  const identity = shallowRef<TransactionSigner>(
    (client as unknown as { identity: TransactionSigner }).identity,
  );

  const subscribable = client as unknown as ClientWithSubscribeToIdentity;

  if (typeof subscribable.subscribeToIdentity === "function") {
    const unsubscribe = subscribable.subscribeToIdentity(() => {
      identity.value = (client as unknown as { identity: TransactionSigner }).identity;
    });

    onScopeDispose(unsubscribe);
  }

  return identity;
}

/**
 * The signer that pays transaction fees and storage costs. Requires the
 * client to expose `payer` (e.g. via a Kit signer plugin). Re-reads on change
 * when the client advertises `subscribeToPayer`.
 */
export function usePayer(): Ref<TransactionSigner> {
  useClientCapability(["payer"], {
    hookName: "usePayer",
    providerHint:
      "Install a signer plugin, e.g. `createClient().use(generatedPayer())` from `@solana/kit-plugin-signer`.",
  });

  const { client } = useSolanaClient();
  const payer = shallowRef<TransactionSigner>(
    (client as unknown as { payer: TransactionSigner }).payer,
  );

  const subscribable = client as unknown as ClientWithSubscribeToPayer &
    ClientWithSubscribeToIdentity;

  if (typeof subscribable.subscribeToPayer === "function") {
    const unsubscribe = subscribable.subscribeToPayer(() => {
      payer.value = (client as unknown as { payer: TransactionSigner }).payer;
    });

    onScopeDispose(unsubscribe);
  }

  return payer;
}
