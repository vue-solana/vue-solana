import {
  createClient,
  extendClient,
  getBase58Decoder,
  getBase64Encoder,
  type Address,
  type SignatureBytes,
  type TransactionPartialSigner,
  type TransactionSigner,
} from "@solana/kit";
import { rpcAirdrop, solanaRpc } from "@solana/kit-plugin-rpc";
import nacl from "tweetnacl";
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

  const derivedKeyPair = nacl.sign.keyPair.fromSeed(keyPairBytes.slice(0, 32));
  const publicKey = keyPairBytes.slice(32);

  if (!publicKey.every((value, index) => value === derivedKeyPair.publicKey[index])) {
    throw invalidError();
  }

  const address = getBase58Decoder().decode(publicKey) as Address;

  return {
    address,
    async signTransactions(transactions, config) {
      config?.abortSignal?.throwIfAborted();

      return transactions.map((transaction) => ({
        [address]: nacl.sign.detached(
          new Uint8Array(transaction.messageBytes),
          keyPairBytes,
        ) as SignatureBytes,
      }));
    },
  };
}

export type SolanaClient = SolanaClientWithOptionalPayer;

export type {
  Address,
  Commitment,
  InstructionPlanInput,
  Lamports,
  Rpc,
  Signature,
  SingleTransactionPlan,
  SolanaRpcApi,
  SolanaRpcResponse,
  SuccessfulSingleTransactionPlanResult,
  TransactionMessage,
  TransactionPlan,
  TransactionPlanInput,
  TransactionPlanResult,
  TransactionSigner,
} from "@solana/kit";
export type {
  ClientWithIdentity,
  ClientWithPayer,
  ClientWithSubscribeToIdentity,
  ClientWithSubscribeToPayer,
  ClientWithTransactionPlanning,
  ClientWithTransactionSending,
} from "@solana/kit";
export type {
  CreateReactiveStoreWithInitialValueAndSlotTrackingConfig,
  ReactiveActionSource,
  ReactiveActionState,
  ReactiveActionStatus,
  ReactiveActionStore,
  ReactiveState,
  ReactiveStreamSource,
  ReactiveStreamStore,
} from "@solana/kit";
export {
  createReactiveActionStore,
  createReactiveStoreWithInitialValueAndSlotTracking,
  getAbortablePromise,
  isAbortError,
} from "@solana/kit";
export { address, lamports } from "@solana/kit";
