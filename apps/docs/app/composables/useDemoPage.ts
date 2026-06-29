import { computed, shallowRef } from "vue";
import { formatError } from "./demo/errors";
import { packageVersions } from "./demo/packageVersions";
import { useDemoTransfer } from "./demo/useDemoTransfer";
import { useDemoWallet } from "./demo/useDemoWallet";
import { useDirectBlockhash } from "./demo/useDirectBlockhash";
import { useMockTransactionDemo } from "./demo/useMockTransactionDemo";

export function useDemoPage() {
  const solana = useSolana();
  const rpc = useSolanaRpc();
  const balanceAddress = shallowRef("11111111111111111111111111111111");
  const balance = useSolanaBalance(balanceAddress);
  const directConnection = useDirectBlockhash();
  const mockTransactionDemo = useMockTransactionDemo();
  const transfer = useDemoTransfer();
  const demoWallet = useDemoWallet();

  const pluginInstalled = computed(() => Boolean(solana.connection && solana.endpoint));
  const balanceInSol = computed(() => {
    if (balance.balance.value === null) {
      return "No balance loaded";
    }

    return `${balance.balance.value / 1_000_000_000} SOL`;
  });
  const balanceError = computed(() => formatError(balance.error.value));

  return {
    balance,
    balanceAddress,
    balanceError,
    balanceInSol,
    ...demoWallet,
    ...directConnection,
    ...mockTransactionDemo,
    packageVersions,
    pluginInstalled,
    rpc,
    ...transfer,
  };
}
