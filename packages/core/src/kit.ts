import {
  createClient,
  extendClient,
  getBase58Decoder,
  getBase64Encoder,
  type Address,
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
  const client = createClient().use((current) =>
    extendClient(current, {
      payer: payer!,
    }),
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

  return buildSolanaClient(endpoint, wsEndpoint, payer) as
    | SolanaClientWithPayer
    | SolanaClientWithOptionalPayer;
}

function resolvePayerFromSecretKey(
  payerSecretKey: string | undefined,
): TransactionSigner | undefined {
  if (!payerSecretKey) {
    return undefined;
  }

  const invalidError = () =>
    new Error(
      "Invalid `payerSecretKey`: expected a base64-encoded 64-byte Ed25519 keypair (secret key first).",
    );

  let keyPairBytes: Uint8Array;
  let payerAddress: Address;

  try {
    keyPairBytes = Uint8Array.from(getBase64Encoder().encode(payerSecretKey));

    if (keyPairBytes.length !== 64) {
      throw invalidError();
    }

    const derivedKeyPair = nacl.sign.keyPair.fromSeed(keyPairBytes.slice(0, 32));
    const publicKey = keyPairBytes.slice(32);

    if (!publicKey.every((value, index) => value === derivedKeyPair.publicKey[index])) {
      throw invalidError();
    }

    payerAddress = getBase58Decoder().decode(publicKey) as Address;
  } catch {
    throw invalidError();
  }

  return {
    address: payerAddress,
    async signTransactions(
      transactions: readonly { messageBytes: Uint8Array }[],
      config?: { abortSignal?: AbortSignal },
    ) {
      config?.abortSignal?.throwIfAborted();

      return transactions.map((transaction) => ({
        [payerAddress]: nacl.sign.detached(transaction.messageBytes, keyPairBytes),
      }));
    },
  } as unknown as TransactionSigner;
}

export interface SolanaSendConfig {
  abortSignal?: AbortSignal;
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
