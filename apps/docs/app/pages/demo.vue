<script setup lang="ts">
import { useDemoPage } from "~/composables/useDemoPage";

const { t } = useI18n();
const title = computed(() => t("demo.seo.title"));
const description = computed(() => t("demo.seo.description"));

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogSiteName: "Vue Solana",
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
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
  canSignMessage,
  messageSignatureBase64,
  messageSigningDisabledReason,
  messageSigningError,
  messageSigningReady,
  messageSigningStatus,
  messageSigningStatusColor,
  messageToSign,
  packageVersions,
  pluginInstalled,
  rpc,
  runMockTransaction,
  selectDiscoveredWallet,
  sendDevnetTransfer,
  sendTransaction,
  sendTransactionError,
  signIn,
  signInErrorText,
  signAndSendDisabledReason,
  signAndSendReady,
  signAndSendState,
  signAndSendStatus,
  signMessage,
  signedMessageText,
  signWalletMessage,
  balanceDisplay,
  mintAddress,
  mintReady,
  tokenAccountCount,
  tokenAccounts,
  tokenAccountsError,
  tokenBalance,
  tokenBalanceError,
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
  request: liveRequest,
  requestText,
  slots: liveSlots,
  slotsText,
  tracked: liveTracked,
  trackedAddressInput,
  trackedText,
  airdrop,
  airdropErrorText,
  airdropSignature,
  clientSendPayerAddress,
  clientSendTransaction,
  clientSendTransactionError,
  clientSendTransactionStatus,
  clientSendTransactions,
  clientSendTransactionsError,
  clientSendTransactionsStatus,
  runAirdrop,
  runClientSend,
  runClientSendBatch,
  sendTransactionText,
  sendTransactionsText,
} = useDemoPage();

const sections = computed(() => [
  { id: "connection", label: t("demo.sections.connection.title") },
  { id: "balances", label: t("demo.sections.balances.title") },
  { id: "wallets", label: t("demo.sections.wallets.title") },
  { id: "signing", label: t("demo.sections.signing.title") },
  { id: "live", label: t("demo.sections.live.title") },
]);
</script>

<template>
  <main class="mx-auto w-full max-w-295 flex-1 px-4 py-6 sm:px-6 lg:px-8">
    <DemoHero :package-versions="packageVersions" />

    <DemoSectionTabs :sections="sections" class="mt-8" />

    <div class="mt-8 space-y-12">
      <DemoSection
        id="connection"
        data-demo-section
        :eyebrow="t('demo.sections.connection.eyebrow')"
        :title="t('demo.sections.connection.title')"
        :description="t('demo.sections.connection.description')"
      >
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
      </DemoSection>

      <DemoSection
        id="balances"
        data-demo-section
        :eyebrow="t('demo.sections.balances.eyebrow')"
        :title="t('demo.sections.balances.title')"
        :description="t('demo.sections.balances.description')"
      >
        <DemoBalancePanel
          v-model:address="balanceAddress"
          :loading="balance.loading.value"
          :lamports="balance.balance.value"
          :sol-balance="balanceInSol"
          :error="balanceError"
          @refresh="balance.refresh"
        />

        <DemoTokenPanel
          v-model:mint-address="mintAddress"
          :account-count="tokenAccountCount"
          :loading="tokenAccounts.loading.value"
          :error="tokenAccountsError"
          :mint-ready="mintReady"
          :balance-loading="tokenBalance.loading.value"
          :balance-display="balanceDisplay"
          :balance-error="tokenBalanceError"
          @refresh-accounts="tokenAccounts.refresh"
          @refresh-balance="tokenBalance.refresh"
        />
      </DemoSection>

      <DemoSection
        id="wallets"
        data-demo-section
        :eyebrow="t('demo.sections.wallets.eyebrow')"
        :title="t('demo.sections.wallets.title')"
        :description="t('demo.sections.wallets.description')"
      >
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
      </DemoSection>

      <DemoSection
        id="signing"
        data-demo-section
        :eyebrow="t('demo.sections.signing.eyebrow')"
        :title="t('demo.sections.signing.title')"
        :description="t('demo.sections.signing.description')"
      >
        <DemoMessageSigningPanel
          v-model:message="messageToSign"
          :wallet-ready="wallet.connected.value"
          :can-sign-message="canSignMessage"
          :signature="messageSignatureBase64"
          :signed-message="signedMessageText"
          :status="messageSigningStatus"
          :status-color="messageSigningStatusColor"
          :ready="messageSigningReady"
          :loading="signMessage.loading.value"
          :disabled-reason="messageSigningDisabledReason"
          :error="messageSigningError"
          @sign="signWalletMessage"
        />

        <DemoSignInCard
          :wallet-ready="wallet.connected.value"
          :loading="signIn.loading.value"
          :status="signIn.status.value"
          :address="signIn.signInResult.value?.account.address ?? null"
          :error-text="signInErrorText"
          @sign="signIn.signIn"
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

        <DemoMockTransactionPanel
          :loading="mockTransaction.loading.value"
          :signature="mockTransaction.signature.value"
          :error="mockTransactionError"
          @run="runMockTransaction"
        />

        <DemoClientSendCard
          :wallet-ready="wallet.connected.value"
          :can-sign-transaction="wallet.canSignTransaction.value"
          :loading="clientSendTransaction.loading.value"
          :single-status="clientSendTransactionStatus"
          :single-text="sendTransactionText"
          :single-error="clientSendTransactionError"
          :batch-loading="clientSendTransactions.loading.value"
          :batch-status="clientSendTransactionsStatus"
          :batch-text="sendTransactionsText"
          :batch-error="clientSendTransactionsError"
          :payer-address="clientSendPayerAddress"
          @send-single="runClientSend"
          @send-batch="runClientSendBatch"
        />
      </DemoSection>

      <DemoSection
        id="live"
        data-demo-section
        :eyebrow="t('demo.sections.live.eyebrow')"
        :title="t('demo.sections.live.title')"
        :description="t('demo.sections.live.description')"
      >
        <DemoPanel
          :eyebrow="t('demo.liveData.trackedAddressEyebrow')"
          :title="t('demo.liveData.trackedAddress')"
        >
          <UInput
            v-model="trackedAddressInput"
            spellcheck="false"
            placeholder="HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH"
          />
        </DemoPanel>

        <DemoLiveCard
          eyebrow="useSolanaRequest"
          :title="t('demo.liveData.request.title')"
          :status="liveRequest.status.value"
          :text="requestText"
          :error="liveRequest.error.value?.message"
        />

        <DemoLiveCard
          eyebrow="useSolanaSubscription"
          :title="t('demo.liveData.subscription.title')"
          :status="liveSlots.status.value"
          :text="slotsText"
          :error="liveSlots.error.value?.message"
        />

        <DemoLiveCard
          eyebrow="useSolanaTrackedData"
          :title="t('demo.liveData.tracked.title')"
          :status="liveTracked.status.value"
          :text="trackedText"
          :error="liveTracked.error.value?.message"
        />

        <DemoSwrCard />

        <DemoAirdropCard
          :wallet-ready="wallet.connected.value"
          :loading="airdrop.isRunning.value"
          :status="airdrop.status.value"
          :signature="airdropSignature"
          :error="airdropErrorText"
          @airdrop="runAirdrop"
        />
      </DemoSection>
    </div>
  </main>
</template>
