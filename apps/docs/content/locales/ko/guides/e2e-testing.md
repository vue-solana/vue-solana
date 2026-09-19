---
title: "E2E 테스팅"
description: Playwright e2e 스위트를 실행하고 UI 테스트를 위해 Solana RPC, RPC 구독, 지갑을 모킹합니다.
ogSection: Guides
surroundOrder: 14
---

이 리포지토리의 예제 앱은 `e2e/`의 Playwright 스위트로 커버됩니다. 스위트는 기본적으로 결정론적 RPC 모킹에 대해 빌드된 Vue Vite 및 Nuxt 예제 앱을 실행하고, 별도의 통합 실행에서는 실제 devnet에 대해 실행합니다.

예제 앱에 기능을 추가하거나, 예제에 표시되는 컴포저블 동작을 변경하거나, 자신의 Playwright 테스트에서 Solana RPC를 모킹하고 싶을 때 이 가이드를 사용하세요.

## 스위트 실행하기

```sh
# 패키지와 두 예제 앱을 빌드한 후 Playwright를 실행합니다.
pnpm test:e2e

# 실제 devnet에 대한 통합 실행 (RPC 모킹 없음).
pnpm test:e2e:integration

# Chromium 브라우저 바이너리를 한 번 설치합니다.
pnpm test:e2e:install
```

Playwright 설정은 두 예제 프리뷰 서버를 자동으로 시작합니다(CI 외부에서는 `reuseExistingServer`가 활성화되어 있어 수동으로 시작한 서버는 재사용됩니다).

## 모킹 모드

| 모드 | 명령                        | RPC                       | RPC 구독                     | 지갑                                |
| ---- | --------------------------- | ------------------------- | ---------------------------- | ----------------------------------- |
| 기본 | `pnpm test:e2e`             | 모킹됨 (`e2e/helpers.ts`) | 가짜 websocket 위에서 모킹됨 | 모킹된 Wallet Standard 지갑         |
| 통합 | `pnpm test:e2e:integration` | 실제 devnet               | 실제 devnet                  | 실제 설치된 지갑 (지갑 spec은 skip) |

모킹 데이터를 단언하는 spec은 `test.skip(isRealRpcRun(), ...)`으로 `E2E_REAL_RPC=true` 하에서 스스로를 skip하므로, 동일한 spec 파일이 두 모드에서 모두 실행됩니다.

## HTTP RPC 모킹

`mockSolanaRpc(page)`는 `https://api.devnet.solana.com/**`을 라우트하고 알려진 메서드에 결정론적으로 응답합니다:

```ts
import { mockSolanaRpc } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockSolanaRpc(page);
});
```

처리되는 메서드: `getLatestBlockhash`, `getBalance`, `getVersion`, `getAccountInfo`, `getHealth`. 알 수 없는 메서드는 `{ jsonrpc: "2.0", id, result: null }`을 반환합니다. CORS preflight(`OPTIONS`)는 `204`로 응답됩니다.

예제 앱에 RPC 호출을 추가할 때는 `e2e/helpers.ts`의 `createRpcResponse()`에 해당 메서드를 추가하세요. 숫자 값은 JSON-safe 값으로 유지하세요(실제 `u64::MAX`는 JavaScript의 안전한 정수 범위를 초과하므로 `rentEpoch`는 문자열로 전달됩니다).

## Websocket 위에서 RPC 구독 모킹

`mockSolanaSubscriptions(page)`는 `@solana/kit`이 사용하는 JSON-RPC 구독 프로토콜을 구현하는 가짜 `wss://api.devnet.solana.com/**` 엔드포인트로 HTTP 모킹을 확장합니다:

1. 클라이언트가 `{ jsonrpc, id, method: "<method>Subscribe", params }`를 보냅니다.
2. 서버가 `{ jsonrpc, id, result: <subscriptionId> }`로 응답합니다.
3. 업데이트는 `{ jsonrpc, method: "<method>Notification", params: { subscription: <id>, result: <payload> } }`로 도착합니다. Kit는 `params.subscription`으로 demultiplex하고 `params.result`를 변환합니다.
4. Kit는 `id` 없이 `{ method: "ping" }` keepalive를 보냅니다. 모크는 이를 무시합니다.

이 함수는 테스트에서 알림을 구동하기 위한 harness로 resolve됩니다:

```ts
import { mockSolanaSubscriptions } from "./helpers";

test("live data", async ({ page }) => {
  const subscriptions = await mockSolanaSubscriptions(page);
  await page.goto("/");

  // 시드된 값을 단언한 후 업데이트를 푸시합니다.
  subscriptions.pushAccountNotification(43_000_000_000, 123_457);
  subscriptions.pushSlotNotification(24_042, 24_040);

  // 최소 하나의 구독을 유지하는 소켓 수.
  expect(subscriptions.openSubscriptionCount()).toBeGreaterThanOrEqual(1);
});
```

- `pushAccountNotification(lamports, slot)`은 열려 있는 모든 account 구독에 `{ context: { slot }, value: { lamports, data, ... } }` 페이로드(`accountNotifications` 형태)의 `accountNotification`을 보냅니다.
- `pushSlotNotification(slot, root)`은 열려 있는 모든 slot 구독에 `{ slot, root, parent }`의 `slotNotification`을 보냅니다.
- `slotSubscribe` 요청은 테스트 주도 푸시 없이도 `useSubscription`이 데이터를 가질 수 있도록 즉시 알림 하나도 받습니다.

와이어 포맷은 매우 중요합니다: `@solana/kit`이 demultiplexing을 변경하면 구독 기반 spec(slot 및 account 알림 업데이트)이 실패하는데, 이것이 의도된 조기 경고 신호입니다.

## Wallet Standard 지갑 모킹

`registerMockWallets(page)`는 앱이 부팅되기 전에 `page.addInitScript`를 통해 두 개의 Wallet Standard 지갑을 주입합니다:

- **Mock Signer Wallet** — `standard:connect`, `standard:disconnect`, `standard:events`, `solana:signMessage`, `solana:signIn`(SIWS)을 지원합니다. `signMessage`는 시그니처 바이트 `[1..8]`을 반환하고, `signIn`은 고정된 account, message, signature를 반환합니다.
- **Mock Readonly Wallet** — connect/disconnect/events만 지원하여, 지원되지 않는 capability UI를 단언합니다.

지갑은 Wallet Standard가 기대하는 두 가지 방식 모두로 self-register합니다: `wallet-standard:app-ready`를 리슨하여(앱에 register) `wallet-standard:register-wallet`을 디스패치합니다(앱이 먼저 초기화된 경우).

## 복사해 쓸 수 있는 단언

- `e2e/helpers.ts`의 `expectNoPageErrors(page, run)`으로 흐름을 감싸서 흐름 중 `pageerror` 또는 `console.error`가 발생하면 실패하도록 하세요.
- 예제 앱의 안정적인 표면에는 텍스트나 role 셀렉터보다 `data-testid` 핸들(`getByTestId`)을 선호하세요.
- SWR 시맨틱의 경우 두 단계를 모두 단언하세요: 리마운트 직후 캐시된(stale) 값이 즉시 나타나고, 이후 revalidate된 값이 이를 대체합니다.
