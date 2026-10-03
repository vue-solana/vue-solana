---
title: "마이그레이션 가이드"
description: Vue Solana 버전 간 마이그레이션 가이드입니다. v2에서 v3으로 업그레이드와 v1.x에서 v2로 마이그레이션을 다룹니다.
ogSection: Guides
surroundOrder: 13
---

이 가이드는 Vue Solana 버전 간 마이그레이션을 다룹니다. 두 가지 주요 마이그레이션이 있습니다: v2에서 v3으로 업그레이드(최신)와 v1.x에서 v2로 마이그레이션.

## 마이그레이션: v2에서 v3으로

v3.0.0은 최신 릴리스입니다. 모듈 형식을 ESM 전용으로 변경하고 `kit` 서브패스를 `@solana/kit`의 완전한 미러로 만듭니다. Kit 마이그레이션은 이미 v2에서 완료되었으므로, v3은 패키징과 사소한 동작 변경에 중점을 둡니다.

### 변경 사항

- **ESM 전용**: 모든 `@vue-solana/*` 패키지는 ESM 전용으로 배포됩니다. `require` export 조건과 최상위 `main` 필드가 제거되었습니다.
- **Kit 완전 미러**: `@vue-solana/core/kit`, `@vue-solana/vue/kit`, `@vue-solana/nuxt/kit`은 이제 (선별된 하위 집합이 아닌) `@solana/kit` 전체를 `export *` 합니다.
- **읽기 composable 동작**: `useBalance()`, `useAccountInfo()`, `useProgramAccounts()`, `useTokenAccounts()`, `useTokenBalance()` (및 Nuxt용 `useSolana*` 동등물)는 향상된 오류 처리를 가진 통합된 상태 머신을 공유합니다.
- **의존성 표면**: 패키지의 `kit` 서브패스를 사용할 때 더 이상 자신의 `package.json`에 `@solana/kit`을 추가할 필요가 없습니다.

### 마이그레이션 방법

#### 1. 의존성 업데이트

```sh
# Vue 앱
pnpm add @vue-solana/vue@^3.0.0

# Nuxt 앱
pnpm add @vue-solana/nuxt@^3.0.0
```

#### 2. ESM 전용 패키지 처리

앱이나 스크립트가 여전히 CommonJS(`require()`)를 사용한다면 ESM으로 변환하세요. `package.json`에 `"type": "module"`을 추가하거나 파일 확장자를 `.mjs`로 변경하세요.

```ts
// require() 대신
import { createSolanaClient } from "@vue-solana/core/kit";
```

ESM으로 전환할 수 없다면 `.cjs` 빌드를 계속 제공하는 `@vue-solana/*@^2.x`를 사용하세요.

#### 3. Kit import 업데이트

완전한 미러 덕분에 패키지의 `kit` 서브패스에서 모든 것을 import하세요. 이전에 `@solana/kit`을 의존성에 추가했다면 제거할 수 있습니다.

```ts
// Vue
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

// Nuxt (자동 import된 composable은 계속 작동)
import { address, lamports } from "@vue-solana/nuxt/kit";
```

참고: 네 가지 이름(`SolanaError`, `SolanaErrorCode`, `isSolanaError`, `TransactionStatus`)은 루트 배럴과 `/kit` 서브패스에서 다르게 해석됩니다. Kit에서 발생한 오류를 catch하는 경우 `kit` 서브패스에서 `isSolanaError`를 import하세요.

```ts
import { isSolanaError } from "@vue-solana/core/kit";

try {
  await client.rpc.getBalance(account).send();
} catch (error) {
  if (isSolanaError(error, "RPC_HTTP_ERROR")) {
    // ...
  }
}
```

#### 4. 읽기 composable 오류 처리 업데이트

`refresh()`는 이제 실패 시 reject합니다(이전에는 resolve). 이를 await하는 코드를 업데이트하세요:

```ts
await refresh().catch(() => undefined);
```

템플릿의 `@click="refresh"`는 영향을 받지 않습니다.

읽기 실패 시 데이터는 빈 값으로 초기화됩니다. `error`를 명시적으로 확인하세요:

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" title="잔액을 불러올 수 없습니다." />
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

`useTokenBalance()`의 `balance`와 `decimals`는 읽기 전용 computed ref입니다. 할당을 제거하세요.

#### 5. 레거시 web3 import 제거

남아있는 `@vue-solana/*/web3` import와 `@solana/web3-compat` 의존성을 제거하세요(v3에는 존재하지 않습니다).

## 마이그레이션: v1.x에서 v2.0.0으로

Vue Solana v2.0.0은 핵심 API 표면을 `@solana/web3-compat`에서 `@solana/kit`으로 전환했습니다. v1.x 앱에는 호환되지 않는 주요 변경사항입니다.

### 변경 사항

- **Kit 전용 API**: 모든 패키지에서 `@solana/web3-compat`이 제거되었습니다. context는 더 이상 `connection`을 가지지 않으며 `web3` 서브패스가 삭제되었습니다.
- **타입 변경**: `SolanaWallet.publicKey`는 이제 일반 base58 `Address` 문자열입니다(`PublicKey` 클래스가 아님).
- **Composable 변경**: `useConnection()`은 `useSolanaClient()`로 대체되었습니다. `useRpc()`은 이제 클러스터 상태와 주입된 Kit 클라이언트를 반환합니다.
- **숫자 타입**: lamports, slot, 블록 높이 등의 RPC 결과는 `bigint`입니다. 계정 데이터는 composable 출력에서 `Buffer` 대신 `Uint8Array`입니다.
- **트랜잭션 표면**: `signAndSendTransaction`, `confirmTransactionSignature` 등의 헬퍼는 이제 `Connection` 대신 Kit 클라이언트를 받으며, 입력은 Kit 타입을 사용합니다.

### 마이그레이션 방법

#### 1. 의존성 업데이트

```sh
pnpm add @vue-solana/vue@^2.0.0
# 또는
pnpm add @vue-solana/nuxt@^2.0.0
```

존재한다면 `@solana/web3-compat` 의존성을 제거하세요.

#### 2. API 호출 업데이트

| 레거시                                                   | 대체                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Connection`, `new Connection(url)`                      | `createSolanaClient({ endpoint })` / `useSolanaClient()`의 `client.rpc`                 |
| `PublicKey`, `new PublicKey(s)`, `.toBase58()`           | `address(s)`를 통한 `Address`                                                           |
| `Keypair`, `keypair.publicKey`                           | `@vue-solana/*/kit`의 `generateKeyPairSigner()`; signer의 `.address`                    |
| `SystemProgram.transfer`                                 | `@solana-program/system`의 `getTransferSolInstruction`                                  |
| `LAMPORTS_PER_SOL` 연산                                  | `@vue-solana/*/kit`의 `lamports()`                                                      |
| `sendAndConfirmTransaction`                              | Kit 트랜잭션 플래닝 사용; 지갑 서명 플로우는 `signAndSendTransaction(client, ...)` 사용 |
| `requestAirdrop` (devnet)                                | `client.airdrop()`                                                                      |
| `connection.getBalance`                                  | `client.rpc.getBalance(...).send()` (`bigint` 반환)                                     |
| `connection.confirmTransaction` / `getSignatureStatuses` | `confirmTransactionSignature(client, ...)`                                              |
| `useConnection()`                                        | `useSolanaClient()`                                                                     |
| `parsePublicKey(value)`                                  | `@vue-solana/core/address`의 `parseAddress(value)`                                      |

#### 3. 코드 예제 업데이트

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { address } from "@vue-solana/vue/kit";

const { client } = useSolanaClient();
const lamports = await client.rpc.getBalance(address("...")).send();
```

#### 4. 정리

`@vue-solana/*/web3`의 모든 import를 제거하고, `package.json`에서 `@solana/web3-compat`을 제거하고, web3-compat용으로 추가한 로컬 `.d.ts` shim을 삭제하세요. 또한 레거시 web3-compat 트랜잭션 경로에만 필요했다면 `buffer-polyfill`도 제거하세요.

### 참고 사항

- Kit의 `client.rpc`는 설정값 대신 호출별 기본값을 사용합니다. 필요시 명시적으로 `commitment`를 전달하세요: `rpc.getBalance(account, { commitment: "confirmed" }).send()`.
- 프레임워크에 독립적인 코드는 `@vue-solana/core/kit`의 `createSolanaClient()`를 사용하세요.
