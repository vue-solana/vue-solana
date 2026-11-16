import { computed, shallowRef } from "vue";
import { createSignableMessage } from "@vue-solana/nuxt/kit";
import { formatError } from "./errors";

/**
 * Demo of the Kit signer adapters: the connected wallet account exposed as
 * `MessageModifyingSigner`, `TransactionModifyingSigner`, and
 * `TransactionSendingSigner`. Message signing runs for real; the transaction
 * signers are shown derived so their addresses and reactive account binding are
 * visible without sending anything to devnet.
 */
export function useDemoWalletAccountSigners() {
  const { t } = useI18n();
  const wallet = useSolanaWallet();
  const kitSignerChain = "solana:devnet";

  // The signers take a ref so they follow the connected account address.
  const account = wallet.publicKey;
  const kitSignerMessage = shallowRef(t("demo.walletAccountSigners.defaultMessage"));
  const kitSignerSignature = shallowRef<string | null>(null);
  const kitSignerSignedMessage = shallowRef<string | null>(null);
  const kitSignerError = shallowRef<unknown>(null);
  const kitSignerStatus = shallowRef<"idle" | "signing" | "signed" | "error">("idle");

  const messageSigner = useSolanaWalletAccountMessageSigner(account);
  const transactionSigner = useSolanaWalletAccountTransactionSigner(account, kitSignerChain);
  const sendingSigner = useSolanaWalletAccountTransactionSendingSigner(account, kitSignerChain);

  const addressOf = (signer: { readonly address: string }) => {
    try {
      return signer.address;
    } catch {
      return null;
    }
  };

  const kitSignerAddress = computed(() => addressOf(messageSigner));
  const kitTransactionSignerAddress = computed(() => addressOf(transactionSigner));
  const kitSendingSignerAddress = computed(() => addressOf(sendingSigner));

  const kitSignerReady = computed(
    () =>
      wallet.connected.value && Boolean(account.value) && kitSignerMessage.value.trim().length > 0,
  );

  const kitSignerDisabledReason = computed(() => {
    if (!account.value) {
      return t("demo.walletAccountSigners.disabled.selectAccount");
    }

    if (!wallet.connected.value) {
      return t("demo.walletAccountSigners.disabled.connectWallet");
    }

    if (!kitSignerMessage.value.trim()) {
      return t("demo.walletAccountSigners.disabled.enterMessage");
    }

    return null;
  });

  const kitSignerStatusColor = computed(() => {
    if (kitSignerStatus.value === "error") {
      return "error" as const;
    }

    if (kitSignerStatus.value === "signed") {
      return "success" as const;
    }

    if (kitSignerStatus.value === "signing") {
      return "warning" as const;
    }

    return account.value ? ("success" as const) : ("neutral" as const);
  });

  const errorText = computed(() => formatError(kitSignerError.value));

  async function signWithKitSigner() {
    kitSignerError.value = null;
    kitSignerSignature.value = null;
    kitSignerSignedMessage.value = null;
    kitSignerStatus.value = "signing";

    try {
      const [result] = await messageSigner.modifyAndSignMessages([
        createSignableMessage(kitSignerMessage.value),
      ]);
      const address = messageSigner.address;
      const bytes = result?.signatures[address];

      if (!bytes) {
        throw new Error("The wallet did not return a signature for the connected account.");
      }

      kitSignerSignature.value = btoa(String.fromCharCode(...new Uint8Array(bytes)));
      kitSignerSignedMessage.value = new TextDecoder().decode(new Uint8Array(result.content));
      kitSignerStatus.value = "signed";
    } catch (cause) {
      kitSignerError.value = cause;
      kitSignerStatus.value = "error";
    }
  }

  return {
    kitSignerError: errorText,
    kitSignerMessage,
    kitSignerSignedMessage,
    kitSignerSignature,
    kitSignerStatus,
    messageSigner,
    kitSignerAddress,
    kitSignerChain,
    kitSignerDisabledReason,
    kitSignerReady,
    kitSignerStatusColor,
    kitSendingSignerAddress,
    kitTransactionSignerAddress,
    sendingSigner,
    signWithKitSigner,
    transactionSigner,
  };
}
