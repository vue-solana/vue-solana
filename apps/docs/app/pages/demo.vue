<script setup lang="ts">
import { useDemoPage } from "~/composables/useDemoPage";

useHead({
  title: "Live Demo - Vue Solana",
});

const {
  balance,
  balanceAddress,
  balanceError,
  balanceInSol,
  canConnectWallet,
  canDisconnectWallet,
  connectWallet,
  copyWalletAddress,
  deselectWallet,
  directBlockhash,
  directConnectionError,
  directConnectionLoading,
  discoveredWalletCount,
  disconnectWallet,
  loadDirectBlockhash,
  loadWallets,
  mockTransaction,
  mockTransactionError,
  packageVersions,
  pluginInstalled,
  rpc,
  runMockTransaction,
  selectDiscoveredWallet,
  sendDevnetTransfer,
  sendTransaction,
  sendTransactionError,
  signAndSendDisabledReason,
  signAndSendReady,
  signAndSendState,
  signAndSendStatus,
  transferAmount,
  transferExplorerUrl,
  transferRecipient,
  wallet,
  walletConfigured,
  walletDiscovery,
  walletPublicKey,
  walletsLoaded,
  walletStatusColor,
  walletStatusText,
} = useDemoPage();
</script>

<template>
  <main
    class="hide-scrollbar mx-auto grid w-full max-w-[1180px] flex-1 gap-4 py-6 lg:min-h-0 lg:grid-cols-2 lg:overflow-y-auto xl:grid-cols-3"
  >
    <DemoHero :package-versions="packageVersions" />

    <DemoRpcPanel
      :plugin-installed="pluginInstalled"
      :status="rpc.status.value"
      :cluster="rpc.cluster.value"
      :endpoint="rpc.endpoint.value"
      :ws-endpoint="rpc.wsEndpoint.value"
      :latest-blockhash="rpc.latestBlockhash.value"
      :error="rpc.error.value"
      @check-rpc="rpc.checkConnection"
    />

    <DemoDirectConnectionPanel
      :blockhash="directBlockhash"
      :error="directConnectionError"
      :loading="directConnectionLoading"
      @load="loadDirectBlockhash"
    />

    <DemoBalancePanel
      v-model:address="balanceAddress"
      :loading="balance.loading.value"
      :lamports="balance.balance.value"
      :sol-balance="balanceInSol"
      :error="balanceError"
      @refresh="balance.refresh"
    />

    <DemoWalletPanel
      :wallets-loaded="walletsLoaded"
      :wallets="walletDiscovery.wallets.value"
      :discovered-wallet-count="discoveredWalletCount"
      :selected-wallet-name="walletDiscovery.selectedWallet.value?.name"
      :configured="walletConfigured"
      :public-key="walletPublicKey"
      :status-text="walletStatusText"
      :status-color="walletStatusColor"
      :can-connect="canConnectWallet"
      :can-disconnect="canDisconnectWallet"
      :connecting="wallet.connecting.value"
      :disconnecting="wallet.disconnecting.value"
      @load-wallets="loadWallets"
      @connect="connectWallet"
      @disconnect="disconnectWallet"
      @deselect="deselectWallet"
      @copy-address="copyWalletAddress"
      @select-wallet="selectDiscoveredWallet"
    />

    <DemoMockTransactionPanel
      :loading="mockTransaction.loading.value"
      :signature="mockTransaction.signature.value"
      :error="mockTransactionError"
      @run="runMockTransaction"
    />

    <DemoTransferPanel
      v-model:recipient="transferRecipient"
      v-model:amount="transferAmount"
      :wallet-ready="wallet.connected.value"
      :signature="sendTransaction.signature.value"
      :confirmation-state="signAndSendState"
      :status="signAndSendState"
      :status-text="signAndSendStatus"
      :ready="signAndSendReady"
      :loading="sendTransaction.loading.value"
      :disabled-reason="signAndSendDisabledReason"
      :explorer-url="transferExplorerUrl"
      :error="sendTransactionError"
      @send="sendDevnetTransfer"
    />
  </main>
</template>
