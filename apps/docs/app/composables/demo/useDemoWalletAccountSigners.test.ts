// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref, shallowRef } from "vue";

const publicKey = shallowRef<string | null>(null);
const walletConnected = ref(false);

const modifyAndSignMessages = vi.fn();

vi.stubGlobal("useI18n", () => ({
  t: (key: string) => key,
}));
vi.stubGlobal("useSolanaWallet", () => ({
  connected: walletConnected,
  publicKey,
}));
vi.stubGlobal("useSolanaWalletAccountMessageSigner", () => ({
  get address() {
    if (!publicKey.value) {
      throw new Error("no account");
    }

    return publicKey.value;
  },
  modifyAndSignMessages,
}));
vi.stubGlobal("useSolanaWalletAccountTransactionSigner", () => ({
  get address() {
    if (!publicKey.value) {
      throw new Error("no account");
    }

    return publicKey.value;
  },
}));
vi.stubGlobal("useSolanaWalletAccountTransactionSendingSigner", () => ({
  get address() {
    if (!publicKey.value) {
      throw new Error("no account");
    }

    return publicKey.value;
  },
}));

describe("useDemoWalletAccountSigners", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    publicKey.value = null;
    walletConnected.value = false;
  });

  it("is not ready without a connected account", async () => {
    const { useDemoWalletAccountSigners } = await import("./useDemoWalletAccountSigners");
    const demo = useDemoWalletAccountSigners();

    expect(demo.kitSignerReady.value).toBe(false);
    expect(demo.kitSignerAddress.value).toBeNull();
    expect(demo.kitTransactionSignerAddress.value).toBeNull();
    expect(demo.kitSendingSignerAddress.value).toBeNull();
    expect(demo.kitSignerDisabledReason.value).toBe(
      "demo.walletAccountSigners.disabled.selectAccount",
    );
  });

  it("derives every signer address from the connected account", async () => {
    publicKey.value = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
    walletConnected.value = true;

    const { useDemoWalletAccountSigners } = await import("./useDemoWalletAccountSigners");
    const demo = useDemoWalletAccountSigners();

    expect(demo.kitSignerReady.value).toBe(true);
    expect(demo.kitSignerAddress.value).toBe(publicKey.value);
    expect(demo.kitTransactionSignerAddress.value).toBe(publicKey.value);
    expect(demo.kitSendingSignerAddress.value).toBe(publicKey.value);
    expect(demo.kitSignerChain).toBe("solana:devnet");
  });

  it("signs a message through the Kit message signer", async () => {
    publicKey.value = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
    walletConnected.value = true;

    const content = new Uint8Array([104, 101, 108, 108, 111]);
    const sig = new Uint8Array(64).fill(7);
    modifyAndSignMessages.mockResolvedValue([
      {
        content,
        signatures: { [publicKey.value]: sig },
      },
    ]);

    const { useDemoWalletAccountSigners } = await import("./useDemoWalletAccountSigners");
    const demo = useDemoWalletAccountSigners();
    demo.kitSignerMessage.value = "hello";

    await demo.signWithKitSigner();

    expect(modifyAndSignMessages).toHaveBeenCalledTimes(1);
    expect(demo.kitSignerStatus.value).toBe("signed");
    expect(demo.kitSignerSignature.value).toBe(btoa(String.fromCharCode(...sig)));
    expect(demo.kitSignerSignedMessage.value).toBe("hello");
    expect(demo.kitSignerError.value).toBeNull();
  });

  it("reports signing failures", async () => {
    publicKey.value = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
    walletConnected.value = true;
    modifyAndSignMessages.mockRejectedValue(new Error("rejected"));

    const { useDemoWalletAccountSigners } = await import("./useDemoWalletAccountSigners");
    const demo = useDemoWalletAccountSigners();

    await demo.signWithKitSigner();

    expect(demo.kitSignerStatus.value).toBe("error");
    expect(demo.kitSignerError.value).toContain("rejected");
  });
});
