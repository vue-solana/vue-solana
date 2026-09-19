import { defineComponent, type PropType } from "vue";
import {
  provideSelectedWalletAccount,
  type SelectedWalletAccountOptions,
} from "../composables/useSelectedWalletAccount";

/**
 * App-wide selected wallet account provider, mirroring `@solana/react`'s
 * `SelectedWalletAccountContextProvider`.
 *
 * Wraps `provideSelectedWalletAccount`; children read state via
 * `useSelectedWalletAccount()`.
 */
export const SelectedWalletAccountProvider = defineComponent({
  name: "SelectedWalletAccountProvider",
  props: {
    filterWallet: {
      type: Function as PropType<SelectedWalletAccountOptions["filterWallet"]>,
      default: undefined,
    },
    stateSync: {
      type: [Object, null] as unknown as PropType<SelectedWalletAccountOptions["stateSync"]>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    provideSelectedWalletAccount({
      filterWallet: props.filterWallet,
      stateSync: props.stateSync,
    });

    return () => slots.default?.();
  },
});
