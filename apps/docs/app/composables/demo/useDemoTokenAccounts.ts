import { computed, shallowRef, watch } from "vue";
import { formatError } from "./errors";

export function useDemoTokenAccounts() {
  const { t } = useI18n();
  const wallet = useSolanaWallet();
  const ownerAddress = shallowRef<string | null>(null);
  const mintAddress = shallowRef("");
  const tokenAccounts = useSolanaTokenAccounts(ownerAddress);
  const tokenBalance = useSolanaTokenBalance(mintAddress, ownerAddress);

  watch(
    () => wallet.publicKey.value,
    (pk) => {
      ownerAddress.value = pk?.toBase58() ?? null;
    },
    { immediate: true },
  );

  const tokenAccountsError = computed(() => formatError(tokenAccounts.error.value));
  const tokenBalanceError = computed(() => formatError(tokenBalance.error.value));
  const tokenAccountCount = computed(() => tokenAccounts.tokenAccounts.value.length);
  const balanceDisplay = computed(() => {
    if (tokenBalance.balance.value === null) {
      return t("demo.fallback.noBalance");
    }

    return `${tokenBalance.balance.value} (${tokenBalance.decimals.value} decimals)`;
  });
  const mintReady = computed(() => Boolean(mintAddress.value.trim()));

  return {
    balanceDisplay,
    mintAddress,
    mintReady,
    tokenAccountCount,
    tokenAccounts,
    tokenAccountsError,
    tokenBalance,
    tokenBalanceError,
  };
}
