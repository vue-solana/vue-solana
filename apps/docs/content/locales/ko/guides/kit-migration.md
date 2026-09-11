---
title: "Kit 마이그레이션"
description: 레거시 web3-compat 연결 API에서 @solana/kit으로 단계별로 마이그레이션합니다.
ogSection: 가이드
surroundOrder: 7
---

Vue Solana가 `@solana/web3-compat`에서 `@solana/kit`으로 이전 중입니다. 이 가이드는 이유, 각 릴리스에서 달라지는 점, 그리고 Vue 또는 Nuxt 앱을 이전하는 방법을 설명합니다. 현재 v1.1.0 API를 사용하는 앱을 기준으로 작성되어, 이중 지원 릴리스에서 오늘 바로 따라 하다가 v2.0.0 이전에 끝낼 수 있습니다.

## 왜 이전해야 하나

`@solana/web3-compat`은 더 이상 사용되지 않습니다. 솔라나 공식 지침은 새 앱이 `@solana/kit`과 그 플러그인(`@solana/kit-plugin-rpc`, `@solana/kit-plugin-signer`, `@solana/kit-plugin-wallet`) 위에 직접 구축하라는 것입니다. `web3-compat`은 레거시 상호운용 경로로만 존재합니다. 두 가지 구체적인 문제가 이전을 촉발했습니다:

- `@solana/web3-compat@0.0.21`은 손상된 TypeScript 패키지 메타데이터를 배포하여, 리포지토리 로컬 및 패키지 자체 `.d.ts` 심(shim)과 빌드 후 선언 스크립트를 강제합니다.
- `Connection` / `PublicKey` / `Transaction` 클래스 API는 레거시 형태입니다. 솔라나 생태계는 `Address`, 코덱, 플러그인 클라이언트, 트랜잭션 플래너로 이동했습니다. `web3-compat`에 머물면 `@vue-solana/*`가 낡아 보이고 모든 사용자에게 두 번째 마이그레이션을 강요합니다.

Kit는 또한 모듈성 이점을 제공합니다: 사용하는 부분만 가져옵니다. v1.x에서는 그것이 `useSolanaClient()`와 `@vue-solana/*/kit` 서브패스를 의미하고, v2 이후에는 레거시 `web3` 서브패스와 레거시 `Connection`이 완전히 사라집니다.

## 타임라인

| 릴리스          | 달라지는 것                                                                                                                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.x (현재)** | 이중 지원. `connection`, `web3` 서브패스, 모든 레거시 헬퍼가 그대로 작동합니다. Kit 표면이 추가됩니다: `createSolanaClient()`, `@vue-solana/*/kit` 서브패스, `useSolanaClient()`. 레거시 헬퍼는 타입 정의에서 `@deprecated`로 표시됩니다. |
| **v2.0.0**      | Kit 전용. `@solana/web3-compat`이 모든 패키지에서 제거됩니다. 컨텍스트에 `connection`이 없어지고 `web3` 서브패스가 삭제됩니다. `useRpc()`가 Kit RPC 컴포저블이 되고, 지갑은 `publicKey: Address`를 노출합니다.                            |

v1.x 기간 동안 마이그레이션하세요: 두 API 모두 작동하므로 단계적으로 옮기면서 계속 배포할 수 있습니다.

## 마이그레이션 맵

아래 표는 모든 레거시 심볼을 Kit 대체품에 매핑합니다.

| 레거시                                                                   | Kit 대체품                                                                                                                                                                  |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Connection`                                                             | `client.rpc` / `useSolanaClient()`                                                                                                                                          |
| `new Connection(url)`                                                    | `createSolanaClient({ endpoint: url })`의 `client.rpc`                                                                                                                      |
| `PublicKey`                                                              | `Address` (`address("...")`)                                                                                                                                                |
| `new PublicKey(s)` / `.toBase58()`                                       | `address(s)` — base58 문자열은 이미 `Address` 형태입니다                                                                                                                    |
| `Keypair` / `Keypair.generate()`                                         | `@solana/kit`의 `generateKeyPairSigner()`, 또는 `@solana/kit-plugin-signer` 변형(`signer`, `payer`, `identity`, `generated*`, `generated*WithSol`, `*FromFile`, `airdrop*`) |
| `keypair.publicKey`                                                      | signer의 `.address`                                                                                                                                                         |
| `SystemProgram.transfer`                                                 | `@solana-program/system`의 `getTransferSolInstruction`                                                                                                                      |
| `LAMPORTS_PER_SOL` 연산                                                  | `@solana/kit`의 `lamports()`                                                                                                                                                |
| `sendAndConfirmTransaction`                                              | `{ context: { signature } }`를 반환하는 `client.sendTransaction([...])`; 일괄 처리는 `client.sendTransactions`                                                              |
| `requestAirdrop`을 통한 devnet 에어드랍                                  | `client.airdrop` (`solanaDevnetRpc()` / `airdropSigner`로 활성화)                                                                                                           |
| `Transaction` / `VersionedTransaction`                                   | Kit 명령어 및 메시지 빌더                                                                                                                                                   |
| `connection.getBalance`                                                  | `client.rpc.getBalance(...).send()` — lamports를 `bigint`로 반환                                                                                                            |
| `getTokenAccountsByOwner` / `getTokenBalance` / `@solana/spl-token` 헬퍼 | `client.rpc`를 통한 `@solana-program/token` 플러그인 읽기                                                                                                                   |
| `connection.confirmTransaction` / `getSignatureStatuses`                 | Kit 트랜잭션 확인 헬퍼 / `client.rpc.getSignatureStatuses(...).send()`                                                                                                      |
| wallet-standard 흐름                                                     | Kit signer 브리징 (연결된 지갑을 `Signer`로 적응)                                                                                                                           |

현재 헬퍼가 오늘 의미하는 것:

- `VueSolanaContext.connection` → `VueSolanaContext.client.rpc`
- `useConnection()` → `useSolanaClient().rpc`
- `useRpc()` → `useSolanaClient().rpc` (`useRpc()`의 의미는 v2에서 바뀝니다)
- `parsePublicKey(value)` → `address(value)`
- `signAndSendTransaction(...)` / `confirmTransactionSignature(...)` → `client.sendTransaction([...])` 및 `client.rpc.getSignatureStatuses(...).send()`
- `getTokenAccountsByOwner(...)` 등 → `@solana-program/token` 읽기

## Vue 앱 업그레이드

### 1단계: v1.x로 업데이트

```sh
pnpm add @vue-solana/vue@^1.2.0
```

플러그인이 여전히 레거시 컨텍스트를 구성하고 기존 컴포저블이 모두 그대로 작동하므로 앱은 변경 없이 컴파일되고 실행됩니다.

### 2단계: Kit API로 전환

읽기 전용 RPC 호출을 주입된 `connection`에서 Kit 클라이언트로 옮깁니다:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();

const slot = await client.rpc.getSlot().send(); // bigint
const lamports = await client.rpc.getBalance(address("BonK...")).send(); // bigint
```

Kit 헬퍼와 타입은 재수출되므로 두 번째 의존성이 필요 없습니다:

```ts
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

const addr: Address = address("BonK9Y...");
const amount = lamports(1_000_000_000n);
```

연결된 지갑의 주소는 v1.x에서 Kit `Address`로 지갑에서 제공됩니다:

```ts
import { useWallet } from "@vue-solana/vue/useWallet";

const wallet = useWallet(); // wallet.address는 `Address | undefined`
```

프레임워크에 구애받지 않는 코드는 core 패키지를 직접 사용합니다:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });
```

네트워크 설정이나 심이 필요 없습니다: 엔드포인트는 레거시 연결과 동일한 클러스터 구성에서 해석됩니다.

### 3단계: v2 이후 마무리

v2.0.0 이후 제거:

- 모든 `@vue-solana/vue/web3` 및 `@vue-solana/core/web3` import,
- `useConnection()` 사용 (`useSolanaClient().rpc`로 대체),
- `package.json`의 `@solana/web3-compat`,
- 손상된 `web3-compat` 메타데이터를 위해 추가한 로컬 `.d.ts` 심,
- web3-compat 트랜잭션 경로에서만 가져온 경우의 `buffer-polyfill`.

`web3` 서브패스는 더 이상 존재하지 않으므로 컴파일러가 남은 모든 참조를 짚어줍니다.

## Nuxt 앱 업그레이드

### 1단계: v1.x로 업데이트

```sh
pnpm add @vue-solana/nuxt@^1.2.0
```

### 2단계: Kit API로 전환

`useSolanaClient`는 자동 import됩니다:

```ts
const { client, rpc } = useSolanaClient();

const slot = await client.rpc.getSlot().send();
```

Kit 헬퍼는 `@vue-solana/nuxt/kit`에서 사용할 수 있습니다:

```ts
import { address, lamports } from "@vue-solana/nuxt/kit";
```

### 3단계: v2 이후 마무리

`@vue-solana/nuxt/web3` import, web3-compat 의존성, 로컬 심을 제거합니다. Nuxt 모듈은 v2에서 web3-compat `optimizeDeps` 항목을 삭제합니다.

## RPC 숫자 및 바이트 참고 사항

Kit REST RPC 메서드는 네이티브 JavaScript 타입을 반환합니다:

- Lamports, 슬롯, 블록 높이는 `bigint`입니다. `bigint`에 대한 `JSON.stringify`는 예외를 던집니다. `Number(...)` 또는 `toString()`으로 변환하세요.
- 계정 데이터는 `Buffer`가 아닌 `Uint8Array`입니다. 사용 중인 `@solana/buffer/` 심은 레거시 트랜잭션 경로에만 필요합니다.

## 브리지 참고 사항 (선택)

마이그레이션 동안 클래식 클래스 API를 원한다면 `@solana/web3.js@rc`(v3)가 업그레이드 경로입니다: `PublicKey`는 `Address`의 deprecated 별칭이고, v3 `Keypair`는 Kit의 `KeyPairSigner`를 구조적으로 충족합니다. 공식 [web3.js v1 → v3 마이그레이션 가이드](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md)를 참조하세요.

## 관련 자료

- [`RPC와 클러스터`](/ko/guides/rpc-and-clusters) — 클러스터 및 엔드포인트 구성
- [`시작하기`](/ko/getting-started) — 설치 및 첫 devnet 읽기
- [`@vue-solana/core`](/ko/packages/core), [`@vue-solana/vue`](/ko/packages/vue), [`@vue-solana/nuxt`](/ko/packages/nuxt) — 패키지 레퍼런스
