// Dependency-free on purpose: `@vue-solana/vue` checks this before dynamically
// importing `mobile-wallet`, which drags in `@solana-mobile/wallet-standard-mobile`
// and its ~98 KB protocol graph. Keeping the check here means an app that is not
// Android never downloads any of it.
export function isSolanaMobileWalletSupported(): boolean {
  // Mirrors the adapter's own `getIsLocalAssociationSupported`: any secure-context
  // Android browser, not just Chrome. Local association needs HTTPS, so that is the
  // real requirement; Firefox and Samsung Internet support it too.
  return (
    typeof window !== "undefined" && window.isSecureContext && /android/i.test(navigator.userAgent)
  );
}
