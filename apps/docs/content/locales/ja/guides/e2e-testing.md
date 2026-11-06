---
title: "E2E テスト"
description: Playwright の e2e スイートを実行し、UI テスト用に Solana RPC、RPC サブスクリプション、ウォレットをモックします。
ogSection: ガイド
surroundOrder: 15
---

リポジトリのサンプルアプリは `e2e/` の Playwright スイートでカバーされています。このスイートはデフォルトで、ビルド済みの Vue Vite と Nuxt のサンプルアプリを決定的な RPC モックに対して実行し、別の統合実行では実際の devnet に対して実行します。

このガイドは、サンプルアプリの機能を追加するとき、サンプルで見えるコンポーザブルの動作を変更するとき、あるいは独自の Playwright テストで Solana RPC をモックしたいときに使用してください。

## スイートの実行

```sh
# Build the packages and both example apps, then run Playwright.
pnpm test:e2e

# Integration run against real devnet (no RPC mocks).
pnpm test:e2e:integration

# Install the Chromium browser binary once.
pnpm test:e2e:install
```

Playwright の設定は両方のサンプルのプレビューサーバーを自動的に起動します（CI 以外では `reuseExistingServer` が有効なので、手動で起動したサーバーは再利用されます）。

## モックモード

| モード     | コマンド                    | RPC                        | RPC サブスクリプション      | ウォレット                                                               |
| ---------- | --------------------------- | -------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| デフォルト | `pnpm test:e2e`             | モック（`e2e/helpers.ts`） | 偽の websocket 経由でモック | モックの Wallet Standard ウォレット                                      |
| 統合       | `pnpm test:e2e:integration` | 実際の devnet              | 実際の devnet               | 実際にインストールされたウォレット（ウォレット関連のスペックはスキップ） |

モックデータに対してアサートするスペックは、`E2E_REAL_RPC=true` のときに `test.skip(isRealRpcRun(), ...)` で自身をスキップするため、同じスペックファイルが両方のモードで実行されます。

## HTTP RPC のモック

`mockSolanaRpc(page)` は `https://api.devnet.solana.com/**` をルーティングし、既知のメソッドに決定的な応答を返します:

```ts
import { mockSolanaRpc } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockSolanaRpc(page);
});
```

処理されるメソッド: `getLatestBlockhash`、`getBalance`、`getVersion`、`getAccountInfo`。未知のメソッドは `{ jsonrpc: "2.0", id, result: null }` を返します。CORS プリフライト（`OPTIONS`）には `204` で応答します。

サンプルアプリに RPC 呼び出しを追加するときは、`e2e/helpers.ts` の `createRpcResponse()` にそのメソッドを追加してください。数値は JSON セーフな値として扱ってください（実際の `u64::MAX` は JavaScript の安全な整数範囲を超えるため、`rentEpoch` は文字列として渡されます）。

## WebSocket 経由の RPC サブスクリプションのモック

`mockSolanaSubscriptions(page)` は HTTP モックを拡張し、`@solana/kit` が話す JSON-RPC サブスクリプションプロトコルを実装する偽の `wss://api.devnet.solana.com/**` エンドポイントを追加します:

1. クライアントが `{ jsonrpc, id, method: "<method>Subscribe", params }` を送信します。
2. サーバーが `{ jsonrpc, id, result: <subscriptionId> }` を返します。
3. 更新は `{ jsonrpc, method: "<method>Notification", params: { subscription: <id>, result: <payload> } }` として届きます。Kit は `params.subscription` でデマルチプレックスし、`params.result` を変換します。
4. Kit は `id` なしで `{ method: "ping" }` のキープアライブを送信しますが、モックはそれを無視します。

この関数は、テストから通知を駆動するためのハーネスを返します:

```ts
import { mockSolanaSubscriptions } from "./helpers";

test("live data", async ({ page }) => {
  const subscriptions = await mockSolanaSubscriptions(page);
  await page.goto("/");

  // Assert the seeded value, then push an update.
  subscriptions.pushAccountNotification(43_000_000_000, 123_457);
  subscriptions.pushSlotNotification(24_042, 24_040);

  // How many sockets currently hold at least one subscription.
  expect(subscriptions.openSubscriptionCount()).toBeGreaterThanOrEqual(1);
});
```

- `pushAccountNotification(lamports, slot)` は、開いているすべてのアカウントサブスクリプションに `{ context: { slot }, value: { lamports, data, ... } }` ペイロード（`accountNotifications` の形）を持つ `accountNotification` を送信します。
- `pushSlotNotification(slot, root)` は、開いているすべてのスロットサブスクリプションに `{ slot, root, parent }` を持つ `slotNotification` を送信します。
- `slotSubscribe` リクエストにも即座に 1 件の通知が届くため、`useSubscription` はテストからのプッシュなしでもデータを持ちます。

ワイヤーフォーマットは重要な前提です。`@solana/kit` がデマルチプレックスの仕組みを変更すると、サブスクリプションに依存するスペック（スロット通知とアカウント通知の更新）が失敗します。これが意図された早期警告のシグナルです。

## Wallet Standard ウォレットのモック

サンプルのスペックは、スペックローカルの `registerMockWallets(page)` ヘルパー（`e2e/helpers.ts` からはエクスポートされておらず、`e2e/example-apps.spec.ts` にあります）を定義し、アプリが起動する前に `page.addInitScript` で 2 つの Wallet Standard ウォレットを注入します:

- **Mock Signer Wallet** — `standard:connect`、`standard:disconnect`、`standard:events`、`solana:signMessage`、`solana:signIn`（SIWS）をサポートします。`signMessage` は署名バイト `[1..8]` を返し、`signIn` は固定のアカウント、メッセージ、署名を返します。
- **Mock Readonly Wallet** — connect/disconnect/events のみをサポートし、未対応機能の UI を検証するために使用します。

ウォレットは Wallet Standard が想定する両方の方法で自己登録します。`wallet-standard:app-ready` をリッスンしてアプリに登録し、`wallet-standard:register-wallet` をディスパッチします（アプリが先に初期化された場合のためです）。

## 流用できるアサーション

- フローを `e2e/helpers.ts` の `expectNoPageErrors(page, run)` で包み、フロー中に発生した `pageerror` や `console.error` で失敗させてください。
- サンプルアプリの安定した箇所には、テキストやロールのセレクターよりも `data-testid` のハンドル（`getByTestId`）を優先してください。
- SWR のセマンティクスでは両方のフェーズをアサートしてください。再マウント直後に古いキャッシュ値が現れ、その後で再検証された値に置き換わります。
