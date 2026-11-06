/**
 * The authorization cache of the Mobile Wallet Adapter registered by
 * `registerSolanaMobileWallet()`, reachable from the Wallet Standard adapter.
 *
 * MWA's `signIn` only opens the wallet when its cache is empty, so the adapter
 * clears the authorization first. Without this handle, a cancelled or rejected
 * sign-in would leave the app logged out: the adapter snapshots the entry here
 * and writes it back on failure. Dependency-free on purpose — the adapter
 * imports it eagerly, while `mobile-wallet` stays a lazy import.
 *
 * Kept on `globalThis` under a registry symbol so a bundler that duplicates
 * this module between the two entries still shares one store.
 */
export interface SolanaMobileWalletAuthorizationStore {
  get(): Promise<unknown>;
  set(authorization: unknown): Promise<void>;
}

const STORE_KEY = Symbol.for("vue-solana:mobile-wallet-authorization-store");

type StoreHolder = { [STORE_KEY]?: SolanaMobileWalletAuthorizationStore };

export function setSolanaMobileWalletAuthorizationStore(
  store: SolanaMobileWalletAuthorizationStore | undefined,
): void {
  (globalThis as StoreHolder)[STORE_KEY] = store;
}

export function getSolanaMobileWalletAuthorizationStore():
  | SolanaMobileWalletAuthorizationStore
  | undefined {
  return (globalThis as StoreHolder)[STORE_KEY];
}
