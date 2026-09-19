import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, provide, shallowRef } from "vue";
import { mount } from "@vue/test-utils";
import type { SolanaWalletInfo } from "@vue-solana/core/types";
import { solanaInjectionKey } from "../injection";
import { createMockSolanaContext } from "../../test-utils";
import {
  createSelectedWalletAccountContext,
  provideSelectedWalletAccount,
  useSelectedWalletAccount,
} from "./useSelectedWalletAccount";

const walletA: SolanaWalletInfo = {
  name: "Wallet A",
  icon: "icon-a",
  chains: ["solana:devnet"],
  accounts: [
    { address: "addr-a1", publicKey: new Uint8Array([1]), chains: ["solana:devnet"] },
    { address: "addr-a2", publicKey: new Uint8Array([2]), chains: ["solana:devnet"] },
  ],
  wallet: {},
};

const walletB: SolanaWalletInfo = {
  name: "Wallet B",
  icon: "icon-b",
  chains: ["solana:devnet"],
  accounts: [{ address: "addr-b1", publicKey: new Uint8Array([3]), chains: ["solana:devnet"] }],
  wallet: {},
};

const wallets = [walletA, walletB];

function mountWithWallets(setupOptions: Parameters<typeof provideSelectedWalletAccount>[0] = {}) {
  const captured: {
    result?: ReturnType<typeof useSelectedWalletAccount>;
  } = {};

  const Consumer = defineComponent({
    setup() {
      captured.result = useSelectedWalletAccount();

      return () => h("div");
    },
  });

  const Root = defineComponent({
    setup() {
      provideSelectedWalletAccount(setupOptions);

      return () => h(Consumer);
    },
  });

  // The Solana context must come from an ancestor: `inject` does not see
  // provides made in the same component's setup.
  const SolanaRoot = defineComponent({
    setup() {
      provide(solanaInjectionKey, createMockSolanaContext({ wallets: shallowRef(wallets) }));

      return () => h(Root);
    },
  });

  mount(SolanaRoot);

  return captured;
}

function mountWithoutProvider() {
  mount(
    defineComponent({
      setup() {
        useSelectedWalletAccount();

        return () => h("div");
      },
    }),
  );
}

describe("useSelectedWalletAccount", () => {
  it("throws outside a provider", () => {
    expect(() => mountWithoutProvider()).toThrow(
      "useSelectedWalletAccount must be used inside a SelectedWalletAccountProvider",
    );
  });

  it("selects and clears an account", () => {
    const captured = mountWithWallets();
    const [selectedAccount, setSelectedWalletAccount] = captured.result!;

    expect(selectedAccount.value).toBeNull();

    setSelectedWalletAccount({ ...walletA.accounts[0]!, walletName: "Wallet A" });

    expect(selectedAccount.value).toMatchObject({
      address: "addr-a1",
      walletName: "Wallet A",
    });

    setSelectedWalletAccount(null);

    expect(selectedAccount.value).toBeNull();
  });

  it("exposes unfiltered wallets when no filter is configured", () => {
    const captured = mountWithWallets();
    const [, , filteredWallets] = captured.result!;

    expect(filteredWallets.value.map((wallet) => wallet.name)).toEqual(["Wallet A", "Wallet B"]);
  });

  it("filters wallets by account and hides wallets left without accounts", () => {
    const captured = mountWithWallets({
      filterWallet: (walletName, account) =>
        walletName === "Wallet B" || account.address === "addr-a2",
    });
    const [, , filteredWallets] = captured.result!;

    expect(filteredWallets.value.map((wallet) => wallet.name)).toEqual(["Wallet A", "Wallet B"]);
    expect(filteredWallets.value[0]?.accounts.map((account) => account.address)).toEqual([
      "addr-a2",
    ]);
  });

  it("hides a wallet once every one of its accounts is filtered out", () => {
    const captured = mountWithWallets({
      filterWallet: (walletName) => walletName === "Wallet A",
    });
    const [, , filteredWallets] = captured.result!;

    expect(filteredWallets.value.map((wallet) => wallet.name)).toEqual(["Wallet A"]);
  });

  it("persists the selection through stateSync", () => {
    const stored: string[] = [];
    const restored: string | null = null;
    const captured = mountWithWallets({
      stateSync: {
        storeSelectedWallet: (key) => {
          stored.push(key);
        },
        getSelectedWallet: () => restored,
        deleteSelectedWallet: () => {
          stored.length = 0;
        },
      },
    });
    const [, setSelectedWalletAccount] = captured.result!;

    setSelectedWalletAccount({ ...walletB.accounts[0]!, walletName: "Wallet B" });
    expect(stored).toEqual(["Wallet B:addr-b1"]);

    setSelectedWalletAccount(null);
    expect(stored).toEqual([]);
  });

  it("restores the persisted selection on mount when available", async () => {
    const captured = mountWithWallets({
      stateSync: {
        storeSelectedWallet: () => undefined,
        getSelectedWallet: () => "Wallet B:addr-b1",
        deleteSelectedWallet: () => undefined,
      },
    });
    const [selectedAccount] = captured.result!;

    // Restoration resolves asynchronously after the initial render.
    await Promise.resolve();
    await Promise.resolve();

    expect(selectedAccount.value).toMatchObject({
      address: "addr-b1",
      walletName: "Wallet B",
    });
  });

  it("builds a working context from an explicit Solana context outside a component (Nuxt)", () => {
    // The Nuxt runtime plugin creates this context outside any component
    // setup, where `inject` cannot resolve the Solana context. Passing it
    // explicitly must drive filteredWallets and selection.
    const walletsRef = shallowRef<SolanaWalletInfo[]>(wallets);
    const context = createSelectedWalletAccountContext({}, { wallets: walletsRef });

    expect(context.filteredWallets.value.map((wallet) => wallet.name)).toEqual([
      "Wallet A",
      "Wallet B",
    ]);

    context.setSelectedWalletAccount({ ...walletA.accounts[0]!, walletName: "Wallet A" });

    expect(context.selectedWalletAccount.value).toMatchObject({
      address: "addr-a1",
      walletName: "Wallet A",
    });
  });

  it("restores the persisted selection once the underlying wallet appears later", async () => {
    // Wallets are discovered asynchronously after app boot; restore must not
    // give up when they are not present on the first attempt.
    const walletsRef = shallowRef<SolanaWalletInfo[]>([]);
    const context = createSelectedWalletAccountContext(
      {
        stateSync: {
          storeSelectedWallet: () => undefined,
          getSelectedWallet: () => "Wallet B:addr-b1",
          deleteSelectedWallet: () => undefined,
        },
      },
      { wallets: walletsRef },
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(context.selectedWalletAccount.value).toBeNull();

    walletsRef.value = wallets;
    await nextTick();

    expect(context.selectedWalletAccount.value).toMatchObject({
      address: "addr-b1",
      walletName: "Wallet B",
    });
  });

  it("clears the pending restore when the user picks an account first", async () => {
    const walletsRef = shallowRef<SolanaWalletInfo[]>([]);
    const context = createSelectedWalletAccountContext(
      {
        stateSync: {
          storeSelectedWallet: () => undefined,
          getSelectedWallet: () => "Wallet B:addr-b1",
          deleteSelectedWallet: () => undefined,
        },
      },
      { wallets: walletsRef },
    );

    await Promise.resolve();
    context.setSelectedWalletAccount({ ...walletA.accounts[0]!, walletName: "Wallet A" });

    walletsRef.value = wallets;
    await nextTick();

    // The user's explicit choice wins; the persisted backlog never overrides it.
    expect(context.selectedWalletAccount.value).toMatchObject({
      address: "addr-a1",
      walletName: "Wallet A",
    });
  });

  it("ignores an async restore that resolves after the user cleared the selection", async () => {
    let resolveStored!: (key: string | null) => void;
    const stored = new Promise<string | null>((resolve) => {
      resolveStored = resolve;
    });
    const context = createSelectedWalletAccountContext(
      {
        stateSync: {
          storeSelectedWallet: () => undefined,
          getSelectedWallet: () => stored,
          deleteSelectedWallet: () => undefined,
        },
      },
      { wallets: shallowRef<SolanaWalletInfo[]>(wallets) },
    );

    context.setSelectedWalletAccount(null);
    resolveStored("Wallet B:addr-b1");

    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    expect(context.selectedWalletAccount.value).toBeNull();
  });

  it("restores a wallet whose name itself contains a colon", async () => {
    const colonWallet: SolanaWalletInfo = {
      name: "Foo:Bar",
      icon: "icon",
      chains: ["solana:devnet"],
      accounts: [{ address: "addr-c1", publicKey: new Uint8Array([9]), chains: ["solana:devnet"] }],
      wallet: {},
    };
    const context = createSelectedWalletAccountContext(
      {
        stateSync: {
          storeSelectedWallet: () => undefined,
          getSelectedWallet: () => "Foo:Bar:addr-c1",
          deleteSelectedWallet: () => undefined,
        },
      },
      { wallets: shallowRef<SolanaWalletInfo[]>([colonWallet]) },
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(context.selectedWalletAccount.value).toMatchObject({
      address: "addr-c1",
      walletName: "Foo:Bar",
    });
  });

  it("applies the persisted selection on a cross-tab storage event", async () => {
    let stored: string | null = null;
    const context = createSelectedWalletAccountContext(
      {
        stateSync: {
          storeSelectedWallet: (key) => {
            stored = key;
          },
          getSelectedWallet: () => stored,
          deleteSelectedWallet: () => {
            stored = null;
          },
        },
      },
      { wallets: shallowRef<SolanaWalletInfo[]>(wallets) },
    );

    await Promise.resolve();
    expect(context.selectedWalletAccount.value).toBeNull();

    stored = "Wallet B:addr-b1";
    window.dispatchEvent(new Event("storage"));

    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    expect(context.selectedWalletAccount.value).toMatchObject({
      address: "addr-b1",
      walletName: "Wallet B",
    });
  });

  it("swallows a rejected stateSync write or delete", async () => {
    const context = createSelectedWalletAccountContext(
      {
        stateSync: {
          storeSelectedWallet: () => Promise.reject(new Error("quota exceeded")),
          getSelectedWallet: () => null,
          deleteSelectedWallet: () => Promise.reject(new Error("quota exceeded")),
        },
      },
      { wallets: shallowRef<SolanaWalletInfo[]>(wallets) },
    );

    expect(() => {
      context.setSelectedWalletAccount({ ...walletA.accounts[0]!, walletName: "Wallet A" });
    }).not.toThrow();
    expect(context.selectedWalletAccount.value).toMatchObject({ address: "addr-a1" });

    context.setSelectedWalletAccount(null);
    expect(context.selectedWalletAccount.value).toBeNull();

    await Promise.resolve();
  });
});
