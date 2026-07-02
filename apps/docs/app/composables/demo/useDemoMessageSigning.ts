import { computed, shallowRef } from "vue";
import { formatError } from "./errors";

export function useDemoMessageSigning() {
  const wallet = useSolanaWallet();
  const signMessage = useSolanaSignMessage();
  const messageToSign = shallowRef("Sign in to Vue Solana on devnet");
  const messageSigningError = shallowRef<unknown>(null);

  const canSignMessage = computed(() => wallet.canSignMessage.value);
  const messageSigningReady = computed(
    () => wallet.connected.value && canSignMessage.value && messageToSign.value.trim().length > 0,
  );
  const messageSigningDisabledReason = computed(() => {
    if (!wallet.wallet.value) {
      return "Select a discovered wallet first.";
    }

    if (!wallet.connected.value) {
      return "Connect the selected wallet to enable message signing.";
    }

    if (!canSignMessage.value) {
      return "Selected wallet does not support message signing.";
    }

    if (!messageToSign.value.trim()) {
      return "Enter a message to sign.";
    }

    return null;
  });
  const messageSignatureBase64 = computed(() => {
    const signature = signMessage.signature.value;

    if (!signature) {
      return null;
    }

    return btoa(String.fromCharCode(...signature));
  });
  const signedMessageText = computed(() => {
    const signedMessage = signMessage.signedMessage.value;

    if (!signedMessage) {
      return null;
    }

    return new TextDecoder().decode(signedMessage);
  });
  const messageSigningStatus = computed(() => {
    if (signMessage.status.value !== "idle") {
      return signMessage.status.value;
    }

    return wallet.connected.value ? "ready" : "waiting";
  });
  const messageSigningStatusColor = computed(() => {
    if (signMessage.status.value === "error") {
      return "error" as const;
    }

    if (signMessage.status.value === "signed") {
      return "success" as const;
    }

    if (signMessage.status.value === "signing") {
      return "warning" as const;
    }

    return wallet.connected.value ? ("success" as const) : ("neutral" as const);
  });
  const messageSigningErrorText = computed(() =>
    formatError(messageSigningError.value ?? signMessage.error.value),
  );

  async function signWalletMessage() {
    messageSigningError.value = null;

    try {
      await signMessage.execute(new TextEncoder().encode(messageToSign.value));
    } catch (error) {
      messageSigningError.value = error;
    }
  }

  return {
    canSignMessage,
    messageSignatureBase64,
    messageSigningDisabledReason,
    messageSigningError: messageSigningErrorText,
    messageSigningReady,
    messageSigningStatus,
    messageSigningStatusColor,
    messageToSign,
    signMessage,
    signedMessageText,
    signWalletMessage,
  };
}
