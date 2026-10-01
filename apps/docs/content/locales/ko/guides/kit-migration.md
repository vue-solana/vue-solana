---
title: "Kit 마이그레이션"
description: Vue 또는 Nuxt 앱을 레거시 web3-compat API에서 @solana/kit으로 옮기는 방법. v2.0.0에서 web3-compat이 제거되었고, v3.0.0부터 ESM만 배포합니다.
ogSection: 가이드
surroundOrder: 7
---

Vue Solana는 v2.0.0에서 `@solana/web3-compat`에서 `@solana/kit`으로 이전했고, v3.0.0에서 `kit` 서브패스는 `@solana/kit`의 완전 미러가 되었습니다. 이 가이드는 변경이 발생한 이유, 각 레거시 심볼의 Kit 대체품, 그리고 여전히 v1.x 표면을 사용하는 Vue 또는 Nuxt 앱을 이전하는 방법을 설명합니다. 이미 v2를 사용 중이라면 [v2에서 v3로 업그레이드](#v2에서-v3로-업그레이드)로 바로 이동하세요.

## 왜 이전해야 하나

`@solana/web3-compat`은 더 이상 사용되지 않습니다. 솔라나 공식 지침은 새 앱이 `@solana/kit`과 그 플러그인(`@solana/kit-plugin-rpc`, `@solana/kit-plugin-signer`, `@solana/kit-plugin-wallet`) 위에 직접 구축하라는 것입니다. `web3-compat`은 레거시 상호운용 경로로만 존재합니다. 두 가지 구체적인 문제가 이전을 촉발했습니다:

- `@solana/web3-compat@0.0.21`은 손상된 TypeScript 패키지 메타데이터를 배포하여, 리포지토리 로컬 및 패키지 자체 `.d.ts` 심(shim)과 빌드 후 선언 스크립트를 강제합니다.
- `Connection` / `PublicKey` / `Transaction` 클래스 API는 레거시 형태입니다. 솔라나 생태계는 `Address`, 코덱, 플러그인 클라이언트, 트랜잭션 플래너로 이동했습니다. `web3-compat`에 머물면 `@vue-solana/*`가 낡아 보이고 모든 사용자에게 두 번째 마이그레이션을 강요합니다.

Kit는 또한 모듈성 이점을 제공합니다: 사용하는 부분만 가져옵니다. v2에서는 레거시 `web3` 서브패스와 레거시 `Connection`이 사라졌고, 패키지는 Kit 중심으로 바뀌었으며 컨텍스트는 `client`만 노출합니다.

## 타임라인

| 릴리스            | 달라진 것                                                                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.x (이전)**   | 이중 지원. `connection`, `web3` 서브패스, 모든 레거시 헬퍼가 변경 없이 계속 작동했고, 그와 함께 Kit 표면이 추가되었습니다: `createSolanaClient()`, `@vue-solana/*/kit` 서브패스, `useSolanaClient()`. 레거시 헬퍼는 `@deprecated`로 표시되었습니다. |
| **v2.0.0**        | Kit 전용. `@solana/web3-compat`이 모든 패키지에서 제거되었습니다. 컨텍스트에 `connection`이 없어지고 `web3` 서브패스가 삭제되었습니다. `useRpc()`가 Kit RPC 컴포저블이 되고, 지갑은 `publicKey: Address`를 노출합니다.                              |
| **v3.0.0 (현재)** | ESM 전용 + 완전한 Kit 미러. 세 패키지 모두에서 `require` export 조건과 최상위 `main` 필드가 제거되었고, `@vue-solana/{core,vue,nuxt}/kit`이 curated list 대신 `@solana/kit` 전체를 다시 export합니다.                                               |

v1 → v2 작업은 그대로입니다: `^2.0.0`으로 업데이트하고, 컴파일러 오류를 해결하고, 컴파일러가 지적하는 레거시 import를 제거하세요. 전체 이전/이후 대응 표는 아래에 있습니다. 이미 v2를 사용 중이라면 [v2에서 v3로 업그레이드](#v2에서-v3로-업그레이드)를 참고하세요.

## 마이그레이션 맵

아래 표는 모든 레거시 심볼을 Kit 대체품에 매핑합니다.

| 레거시                                                                   | Kit 대체품                                                                                                                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Connection`                                                             | `client.rpc` / `useSolanaClient()`                                                                                                                 |
| `new Connection(url)`                                                    | `createSolanaClient({ endpoint: url })`의 `client.rpc`                                                                                             |
| `PublicKey`                                                              | `Address` (`address("...")`)                                                                                                                       |
| `new PublicKey(s)` / `.toBase58()`                                       | `address(s)` — base58 문자열은 이미 `Address` 형태입니다                                                                                           |
| `Keypair` / `Keypair.generate()`                                         | `@vue-solana/core/kit`의 `generateKeyPairSigner()`, 또는 `@solana/kit-plugin-signer` 변형(`signer`, `payer`, `identity`, `generated*`, `airdrop*`) |
| `keypair.publicKey`                                                      | signer의 `.address`                                                                                                                                |
| `SystemProgram.transfer`                                                 | `@solana-program/system`의 `getTransferSolInstruction`                                                                                             |
| `LAMPORTS_PER_SOL` 연산                                                  | `@vue-solana/core/kit`의 `lamports()`                                                                                                              |
| `sendAndConfirmTransaction`                                              | Kit 트랜잭션 계획 (업스트림 `@solana/kit-plugin-rpc` 실행기); 지갑 서명 흐름에는 `signAndSendTransaction(client, ...)` 사용                        |
| `requestAirdrop`을 통한 devnet 에어드랍                                  | `client.airdrop` (업스트림, `solanaDevnetRpc()` / `airdropSigner`로 활성화)                                                                        |
| `Transaction` / `VersionedTransaction`                                   | Kit 명령어 및 메시지 빌더; `SolanaTransaction`은 이제 원시 직렬화 바이트입니다                                                                     |
| `connection.getBalance`                                                  | `client.rpc.getBalance(...).send()` — lamports를 `bigint`로 반환                                                                                   |
| `getTokenAccountsByOwner` / `getTokenBalance` / `@solana/spl-token` 헬퍼 | `@vue-solana/core/token-accounts`의 `getTokenAccountsByOwner(client, ...)` / `getTokenBalance(client, ...)` (Kit RPC `jsonParsed` 읽기)            |
| `connection.confirmTransaction` / `getSignatureStatuses`                 | `confirmTransactionSignature(client, ...)` (`client.rpc.getSignatureStatuses(...).send()` 폴링)                                                    |
| wallet-standard 흐름                                                     | 변경 없음 — wallet-standard 탐색과 적응이 여전히 `useWallets()` / `useWallet()`을 구동합니다                                                       |

> 일부 행은 업스트림 `@solana/kit` 플러그인(signer, planner, system program)을 참조합니다. `createSolanaClient()`의 기본 클라이언트는 `@solana/kit-plugin-rpc`의 공식 planner와 RPC plan executor를 이미 설치합니다. 나머지 플러그인(signer, system program)은 필요할 때 `@solana/kit` 생태계에서 직접 설치하세요.

v2 이후 헬퍼의 대응:

- `VueSolanaContext.connection` → `VueSolanaContext.client.rpc`
- `useConnection()` → `useSolanaClient()` (v2에서 Kit 클라이언트를 반환하는 deprecated 별칭으로 유지)
- `useRpc()` → `solana.client` (v2 `useRpc()`는 클러스터 상태와 주입된 `client`를 반환)
- `parsePublicKey(value)` → `@vue-solana/core/address`의 `parseAddress(value)`
- `signAndSendTransaction(connection, ...)` / `confirmTransactionSignature(connection, ...)` → `signAndSendTransaction(client, ...)` / `confirmTransactionSignature(client, ...)`; `SolanaTransaction` 인자는 이제 직렬화된 와이어 바이트입니다
- `getTokenAccountsByOwner(connection, ...)` 등 → `getTokenAccountsByOwner(client, ...)`와 그에 기반한 읽기, `TokenAccountInfo` 반환

## v2에서 v3로 업그레이드

v3에는 호환성 깨지는 변경이 정확히 하나 있고, 편의성 개선이 하나 큽니다. Kit 마이그레이션 자체는 이미 끝났으므로 새로 대응시켜야 할 심볼은 없습니다.

```sh
pnpm add @vue-solana/vue@^3.0.0
```

```sh
pnpm add @vue-solana/nuxt@^3.0.0
```

### ESM 전용

모든 `@vue-solana/*` 패키지는 이제 ESM만 배포합니다. `require` export 조건과 최상위 `main` 필드가 제거되었기 때문에 CommonJS에서 `require("@vue-solana/core")`를 호출하면 `No "exports" main defined`로 실패하고, subpath를 require하면 `Package subpath './kit' is not defined by "exports"`로 실패합니다.

Nuxt와 Vite 앱은 이미 ESM으로 번들링되므로 변경이 필요 없습니다. 프로젝트의 스크립트, 설정 파일, Node 도구 중 아직 `require()`를 사용한다면 ESM으로 바꾸세요. `package.json`에 `"type": "module"`을 추가하거나 파일 확장자를 `.mjs`로 변경하면 됩니다. CommonJS를 벗어날 수 없다면 `.cjs` 빌드를 계속 제공하는 `@vue-solana/*@^2`를 그대로 사용하세요. [Troubleshooting](/ko/troubleshooting)의 `ERR_PACKAGE_PATH_NOT_EXPORTED` 항목을 참고하세요.

### Kit 서브패스는 이제 완전한 미러

`@vue-solana/core/kit`, `@vue-solana/vue/kit`, `@vue-solana/nuxt/kit`은 curated list를 다시 export하는 대신 `@solana/kit`을 `export *` 합니다. Kit의 모든 값과 타입을 이미 설치한 서브패스에서 바로 가져올 수 있습니다.

- v2에서 추가했다면 자신의 `package.json`에서 `@solana/kit`을 제거하세요. 더 이상 필요하지 않으며, 그대로 두면 트리에 Kit 사본이 두 개 생길 위험이 있습니다.
- 메시지 빌더, codecs, planner 헬퍼, signer factory를 이미 쓰고 있는 `@vue-solana/*/kit` import로 옮겨서 앱의 Solana 진입점을 하나로 유지하세요.

네 개의 이름은 Kit과 이 라이브러리 양쪽에 모두 존재합니다. 패키지 루트에서는 **이 라이브러리의** 버전으로, `/kit` 서브패스에서는 **Kit의** 버전으로 해석됩니다:

| 이름                | 패키지 루트 (`@vue-solana/core`)    | `kit` 서브패스 (`@vue-solana/core/kit`) |
| ------------------- | ----------------------------------- | --------------------------------------- |
| `SolanaError`       | `@vue-solana/core` 자체 에러 클래스 | Kit의 `SolanaError`                     |
| `SolanaErrorCode`   | `@vue-solana/core` 자체 코드        | Kit의 `SolanaErrorCode`                 |
| `isSolanaError`     | `@vue-solana/core` 자체 가드        | Kit의 `isSolanaError`                   |
| `TransactionStatus` | `@vue-solana/core`의 확인 상태 형태 | Kit의 `TransactionStatus`               |

Kit 에러를 잡아서 확인한다면 이 차이가 중요합니다. 루트의 `isSolanaError()`는 이 라이브러리의 `SolanaError`를 인식할 뿐 Kit의 것은 인식하지 않으므로, Kit이 던진 에러를 검사할 때는 `@vue-solana/*/kit`에서 가져오세요:

```ts
import { isSolanaError } from "@vue-solana/core/kit"; // Kit의 가드, Kit 에러와 일치

try {
  await client.rpc.getBalance(account).send();
} catch (error) {
  if (isSolanaError(error, "RPC_HTTP_ERROR")) {
    // ...
  }
}
```

나머지는 모두 내부 변경입니다. 컴포저블 상태 머신이 공유 헬퍼로 dedup되면서 `@solana/kit`이 `^8.4.0`으로 올라가고 번들도 작아졌지만, 컴포저블 시그니처와 반환 형태는 바뀌지 않았습니다.

## Vue 앱 업그레이드

### 1단계: v3로 업데이트

```sh
pnpm add @vue-solana/vue@^3.0.0
```

`web3` 서브패스가 더 이상 존재하지 않으므로 컴파일러가 이제 남은 모든 레거시 참조를 짚어줍니다.

### 2단계: Kit API로 전환

읽기 전용 RPC 호출을 주입된 `connection`에서 Kit 클라이언트로 옮깁니다:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();

const slot = await client.rpc.getSlot().send(); // bigint
const lamports = await client.rpc.getBalance(address("BonK...")).send(); // bigint
```

Vue Solana 자체 API를 흐르는 헬퍼와 타입(`address`, `lamports`, `Address`, `Commitment`, ...)은 재수출됩니다:

```ts
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

const addr: Address = address("BonK9Y...");
const amount = lamports(1_000_000_000n);
```

메시지 빌더도 같은 subpath에서 옵니다. `@vue-solana/vue/kit`는 `@solana/kit` 전체를 다시 export하므로 여기서는 `@solana/kit`을 직접 `package.json`에 추가할 필요가 없습니다. 프로그램 명령어는 자체 플러그인에서 제공됩니다. 예: `getTransferSolInstruction`은 `@solana-program/system`.

연결된 지갑의 주소는 일반 base58 `Address` 문자열입니다:

```ts
import { useWallet } from "@vue-solana/vue/useWallet";

const wallet = useWallet(); // wallet.publicKey는 `Address | null`
```

프레임워크에 구애받지 않는 코드는 core 패키지를 직접 사용합니다:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });
```

네트워크 설정이나 심이 필요 없습니다: 엔드포인트는 클러스터 구성에서 해석되고, `createSolanaContext()`는 이제 동일한 `client`를 반환합니다.

### 3단계: 레거시 표면 제거

- 모든 `@vue-solana/vue/web3` 및 `@vue-solana/core/web3` import,
- `useConnection()` 사용 (`useSolanaClient()`로 대체),
- `package.json`의 `@solana/web3-compat`,
- 손상된 `web3-compat` 메타데이터를 위해 추가한 로컬 `.d.ts` 심,
- 레거시 web3-compat 트랜잭션 경로에서만 가져온 경우의 `buffer-polyfill`.

## Nuxt 앱 업그레이드

### 1단계: v3로 업데이트

```sh
pnpm add @vue-solana/nuxt@^3.0.0
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

`@vue-solana/nuxt/kit`도 `@solana/kit` 전체를 다시 export하므로 메시지 빌더도 거기서 가져오세요 — `@solana/kit`을 직접 `package.json`에 추가하지 마세요.

### 3단계: 레거시 표면 제거

`@vue-solana/nuxt/web3` import, web3-compat 의존성, 로컬 심을 제거합니다. Nuxt 모듈은 v2에서 web3-compat `optimizeDeps` 항목을 삭제했습니다.

## RPC 숫자 및 바이트 참고 사항

Kit REST RPC 메서드는 네이티브 JavaScript 타입을 반환합니다:

- Lamports, 슬롯, 블록 높이는 `bigint`입니다. `bigint`에 대한 `JSON.stringify`는 예외를 던집니다. `Number(...)` 또는 `toString()`으로 변환하세요.
- `client.rpc`에서 가져온 계정 데이터는 base64로 인코딩됩니다; Vue Solana 읽기 컴포저블은 이를 `Uint8Array`로 정규화합니다. `buffer/` 심은 브라우저 트랜잭션 직렬화 경로에서 사용하는 Buffer 폴리필에만 필요합니다.
- Kit `client.rpc`는 `SolanaConfig`의 `commitment`를 적용하지 않으며 Kit의 호출별 기본값을 사용합니다. 커스텀 commitment에 의존한다면 각 호출에 전달하세요(예: `rpc.getBalance(account, { commitment: "confirmed" }).send()`).

## 브리지 참고 사항 (선택)

클래식 클래스 API를 원한다면 `@solana/web3.js@rc`(v3)가 업그레이드 경로입니다: `PublicKey`는 `Address`의 deprecated 별칭이고, v3 `Keypair`는 Kit의 `KeyPairSigner`를 구조적으로 충족합니다. 공식 [web3.js v1 → v3 마이그레이션 가이드](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md)를 참조하세요.

## 관련 자료

- [`RPC와 클러스터`](/ko/guides/rpc-and-clusters) — 클러스터 및 엔드포인트 구성
- [`시작하기`](/ko/getting-started) — 설치 및 첫 devnet 읽기
- [Solana Kit 문서](https://www.solanakit.com/) — 공식 Kit 가이드, 레시피, API 레퍼런스
- [`@vue-solana/core`](/ko/packages/core), [`@vue-solana/vue`](/ko/packages/vue), [`@vue-solana/nuxt`](/ko/packages/nuxt) — 패키지 레퍼런스
