import {
  createClient,
  createKeyPairFromBytes,
  extendClient,
  getBase58Decoder,
  getBase64Encoder,
  isSolanaError,
  signBytes,
  SOLANA_ERROR__KEYS__PUBLIC_KEY_MUST_MATCH_PRIVATE_KEY,
  type Address,
  type TransactionPartialSigner,
  type TransactionSigner,
} from "@solana/kit";
import { rpcAirdrop, solanaRpc } from "@solana/kit-plugin-rpc";
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
  getWebSocketEndpoint,
} from "./clusters";
import type { SolanaConfig } from "./types";

function buildSolanaClient(
  endpoint: string,
  wsEndpoint: string,
  payer: TransactionSigner | undefined,
) {
  // `solanaRpc` is typed as requiring `client.payer`, but the planner only reads
  // `payer` lazily — and only when it must build a message from an instruction
  // plan. So a payer-less client extends with nothing: casting the empty
  // extension keeps the plugin chain typed without installing a phantom
  // `payer: undefined` own key that `'payer' in client` would report as present.
  const client = createClient().use((current) =>
    extendClient(current, payer ? { payer } : ({} as { payer: TransactionSigner })),
  );

  return client
    .use(
      solanaRpc({
        rpcUrl: endpoint,
        rpcSubscriptionsUrl: wsEndpoint,
      }),
    )
    .use(rpcAirdrop());
}

type SolanaClientWithPayer = ReturnType<typeof buildSolanaClient>;
type SolanaClientWithOptionalPayer = Omit<SolanaClientWithPayer, "payer"> & {
  payer?: TransactionSigner;
};
type SolanaConfigWithPayer = SolanaConfig &
  ({ payer: TransactionSigner } | { payerSecretKey: string });

export function createSolanaClient(config: SolanaConfigWithPayer): SolanaClientWithPayer;
export function createSolanaClient(config?: SolanaConfig): SolanaClientWithOptionalPayer;
export function createSolanaClient(
  config: SolanaConfig = {},
): SolanaClientWithPayer | SolanaClientWithOptionalPayer {
  const cluster = config.cluster ?? DEFAULT_CLUSTER;
  const endpoint = config.endpoint ?? getClusterEndpoint(cluster);
  const wsEndpoint =
    config.wsEndpoint ??
    (config.endpoint ? getWebSocketEndpoint(endpoint) : getClusterWebSocketEndpoint(cluster));
  const payer = config.payer ?? resolvePayerFromSecretKey(config.payerSecretKey);

  return buildSolanaClient(endpoint, wsEndpoint, payer);
}

function resolvePayerFromSecretKey(
  payerSecretKey: string | undefined,
): TransactionPartialSigner | undefined {
  if (!payerSecretKey) {
    return undefined;
  }

  const invalidError = () =>
    new Error(
      "Invalid `payerSecretKey`: expected a base64-encoded 64-byte Ed25519 keypair (secret key first).",
    );

  let keyPairBytes: Uint8Array;

  try {
    keyPairBytes = Uint8Array.from(getBase64Encoder().encode(payerSecretKey));
  } catch {
    throw invalidError();
  }

  if (keyPairBytes.length !== 64) {
    throw invalidError();
  }

  // Derived from the *unverified* public half: the consistency check needs
  // WebCrypto, which is async, so it cannot run here. A keypair whose public
  // half does not match its seed therefore reports a `payer.address` that no
  // signature will ever match; `signTransactions` rejects on the first call.
  const address = getBase58Decoder().decode(keyPairBytes.slice(32)) as Address;

  // ponytail: the import is lazy because WebCrypto is async, which also moves
  // the secret/public consistency check to the first sign. Kit's own signer
  // factories import the same way. Only a mismatched pair is remapped to
  // `invalidError()`; an unavailable `crypto.subtle` keeps its own error so an
  // insecure context is not misreported as a malformed key.
  let privateKey: Promise<CryptoKey> | undefined;
  const getPrivateKey = () =>
    (privateKey ??= (async () => {
      if (!globalThis.crypto?.subtle) {
        throw new Error(
          "`payerSecretKey` signing needs WebCrypto, which browsers only expose in a secure context (https, or http on localhost).",
        );
      }

      return (await createKeyPairFromBytes(keyPairBytes)).privateKey;
    })().catch((cause: unknown) => {
      if (isSolanaError(cause, SOLANA_ERROR__KEYS__PUBLIC_KEY_MUST_MATCH_PRIVATE_KEY)) {
        throw invalidError();
      }

      throw cause;
    }));

  return {
    address,
    async signTransactions(transactions, config) {
      config?.abortSignal?.throwIfAborted();

      const key = await getPrivateKey();

      config?.abortSignal?.throwIfAborted();

      return Promise.all(
        transactions.map(async (transaction) => ({
          [address]: await signBytes(key, transaction.messageBytes),
        })),
      );
    },
  };
}

export type SolanaClient = SolanaClientWithOptionalPayer;

/**
 * The full `@solana/kit` surface, re-exported so apps need only
 * `@vue-solana/vue` (or `@vue-solana/nuxt`), never a direct `@solana/kit`
 * install. A wildcard keeps the mirror complete: a curated list silently
 * forced every consumer who needed one unlisted symbol to depend on
 * `@solana/kit` themselves, which pnpm's strict `node_modules` does not
 * resolve.
 *
 * `@vue-solana/core` re-exports this module at its root next to `./errors` and
 * `./types`, and Kit exports `SolanaError`, `SolanaErrorCode`,
 * `isSolanaError` and `TransactionStatus` under the same names. `index.ts`
 * resolves those four in favour of this package's own types; the Kit
 * originals stay reachable here.
 */
export * from "@solana/kit";
