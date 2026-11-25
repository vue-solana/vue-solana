---
title: 클러스터
description: Solana 클러스터 이름, RPC 엔드포인트, faucet 안내입니다.
ogSection: 개념
surroundOrder: 6
---

Solana 클러스터는 validator 네트워크입니다. 앱은 연결할 클러스터를 선택합니다.

## 지원 클러스터

Vue Solana는 다음 클러스터 이름을 지원합니다.

- `mainnet`: Solana의 프로덕션 클러스터입니다. Solana의 공식 mainnet 클러스터 이름입니다. 프로덕션 앱과 실제 SOL에 사용합니다.
- `mainnet-beta`: `mainnet`의 이전 표기법입니다. 여전히 허용되며 같은 `https://api.mainnet.solana.com` 엔드포인트로 리다이렉트됩니다.
- `devnet`: 개발자 네트워크입니다. 앱을 개발할 때 사용합니다. Devnet SOL은 실제 가치가 없습니다.
- `testnet`: validator와 프로토콜 테스트 네트워크입니다. 앱 개발에서는 devnet보다 덜 일반적입니다.
- `localnet`: 보통 `http://127.0.0.1:8899`에서 실행되는 로컬 validator입니다.

Vue Solana 코드에서는 `mainnet`을 사용하세요. Solana 공식 문서는 프로덕션 클러스터를 Mainnet이라고 부르며, `mainnet`은 Solana 도구가 기대하는 클러스터 이름입니다. 이전 표기법인 `mainnet-beta`는 여전히 허용되며, 두 이름 모두 공식 `https://api.mainnet.solana.com` 엔드포인트로 확인됩니다.

공식 참고 자료: [Solana Clusters](https://solana.com/docs/references/clusters)

## RPC 엔드포인트

RPC 엔드포인트는 앱이 Solana를 읽거나 쓰는 데 사용하는 HTTP URL입니다.

예시:

- `https://api.devnet.solana.com`
- `https://api.mainnet.solana.com`
- `http://127.0.0.1:8899`

RPC 요청은 `useSolanaClient()` 또는 `useSolanaRpc()`의 `client.rpc`, 또는 `@vue-solana/core`의 `createSolanaClient()` / `createSolanaContext()`를 통해 전송됩니다. 레거시 `Connection` 클래스와 `web3` 하위 경로는 v2.0.0에서 제거되었습니다. 공개 엔드포인트는 시작하기에 유용하지만, 프로덕션 앱은 일반적으로 안정성과 rate limit 때문에 전용 RPC provider를 사용합니다.

공식 참고 자료: [Solana RPC](https://solana.com/docs/rpc)

## 호스팅 RPC 제공자

Solana 공개 엔드포인트는 모두가 공유합니다. `getLatestBlockhash()` 또는 `getBalance()`를 처음 호출하기에는 가장 빠르지만, 다른 사람이 사용할 앱의 기반으로는 적합하지 않습니다. 엔드포인트가 바쁘면 요청이 rate-limited될 수 있고 latency도 예측하기 어려우며, 사용량 dashboard나 support 계약이 없습니다. 호스팅 RPC 제공자는 키가 있는 HTTP / WebSocket 엔드포인트, 공개된 quota, metrics, 트래픽 증가 시 명확한 upgrade 경로를 제공합니다.

Vue Solana는 특정 제공자에 의존하지 않습니다. 모든 RPC 호출은 `endpoint`（선택적으로 `wsEndpoint`）로 만든 Kit client를 거치므로, 제공자를 바꾸는 것은 composable을 다시 작성하는 것이 아니라 설정을 바꾸는 일입니다. 코드는 [커스텀 RPC 엔드포인트](/ko/guides/rpc-and-clusters#커스텀-rpc-엔드포인트)를 참고하세요.

### 사용하는 이유

- **예측 가능한 한도.** 공개 엔드포인트는 모든 사용자와 하나의 budget을 공유합니다. 제공자를 쓰면 키마다 자체 quota가 있고 초과 시 동작도 문서화되어 있습니다.
- **Subscriptions.** `useSubscription()`과 `useTrackedData()`에는 WebSocket 연결이 필요합니다. 제공자는 해당 `wss://` URL을 노출하고 보통 더 많은 동시 subscription을 허용합니다.
- **관측 가능성.** dashboard에 요청 수, 오류, latency가 표시되므로 장애가 앱에서 발생했는지 RPC 계층에서 발생했는지 구분할 수 있습니다.
- **Production 경로.** 튜토리얼이 실제 앱이 되면 component 코드를 바꾸지 않고 한도를 올릴 수 있습니다.

### 선택 전에 확인할 것

- **해당 플랜이 지원하는 메서드.** 사용 가능 여부는 cluster와 제공자에 따라 다릅니다. Chainstack은 Solana의 무거운 scan 메서드 일부를 mainnet에서 유료로 표시하며 devnet에는 archive node가 없습니다.
- **사용량을 어떻게 세는지.** Chainstack은 Request Units를 사용합니다 (full node 요청 1건당 1 RU). Alchemy는 메서드에 따라 달라지는 Compute Units를 사용합니다. "초당 요청 수"만 비교하면 오해할 수 있습니다.
- **WebSocket, webhook, gRPC가 무료 플랜에 포함되는지.** 단순 HTTP 읽기가 동작해도 앱이 그중 하나를 필요로 할 수 있습니다.
- **API 키를 어디에 둘지.** 브라우저 bundle의 endpoint URL은 사용자에게 보입니다. 제공자 dashboard에서 키를 제한하거나 server route 뒤에 두세요.

### 무료로 시작할 수 있는 선택지

| 제공자                                        | 무료 플랜                                                                    | 적합한 경우                                                                                       | 확인 사항                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Chainstack](https://chainstack.com/pricing/) | Developer: 월 0달러, 월 3,000,000 RU, 전체 25 RPS, 프로젝트 1개, WebSockets. | Request Units 기반의 명확한 과금과 네트워크별 한도. 공개 엔드포인트에서 넘어가기 좋은 단계입니다. | [처리량 가이드라인](https://docs.chainstack.com/docs/limits)에 따르면 Developer는 Solana devnet에서 25 RPS이지만 Solana mainnet에서는 5 RPS입니다. `getProgramAccounts`, `getSupply`, `getTokenAccountsByOwner`는 mainnet에서 유료이며 devnet에는 archive node가 없습니다. 초과분은 추가 100만 RU당 20달러입니다. |
| [Alchemy](https://www.alchemy.com/pricing)    | Free: 월 3,000만 CU, 15 RPS, 앱 5개, webhook 5개, 모든 mainnet 및 testnet.   | 바로 붙여 넣을 수 있는 devnet HTTP / WSS URL, 사용량 dashboard, 학습과 demo용 webhook.            | [Solana Devnet RPC](https://www.alchemy.com/rpc/solana-devnet)에 엔드포인트와 devnet에서 제공되지 않는 API(Token, NFT, Prices, Debug, Trace 등)가 나열되어 있습니다. 과금은 생 요청 수가 아닌 Compute Units 기준이며 gRPC는 유료입니다.                                                                           |

Quota와 가격은 변경됩니다. 링크된 제공자 페이지를 기준으로 삼으세요. 위 숫자는 시작점일 뿐 Vue Solana의 보장이 아닙니다.

제공자는 RPC 접근을 제공할 뿐 테스트용 SOL은 제공하지 않습니다. 트랜잭션을 보내려면 아래 faucet에서 devnet SOL을 계속 받아야 합니다.

## WebSocket 엔드포인트

WebSocket 엔드포인트는 subscription과 실시간 업데이트에 사용됩니다. `wsEndpoint`를 명시적으로 전달하지 않으면 Vue Solana가 RPC 엔드포인트에서 WebSocket 엔드포인트를 유도합니다.

예시:

- `wss://api.devnet.solana.com`
- `wss://api.mainnet.solana.com`
- `ws://127.0.0.1:8900`

## 클러스터 설정

Vue:

```ts
createSolanaPlugin({
  cluster: "devnet",
});
```

Nuxt:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

커스텀 엔드포인트도 전달할 수 있습니다.

```ts
createSolanaPlugin({
  cluster: "mainnet",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

## Devnet 또는 Testnet SOL 받기

공식 faucet을 사용하세요.

```txt
https://faucet.solana.com
```

`Devnet` 또는 `Testnet`을 선택하고 지갑 주소를 붙여 넣은 뒤 SOL을 요청합니다.

Solana CLI가 설치되어 있다면 airdrop도 요청할 수 있습니다.

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

Devnet과 testnet SOL은 실제 가치가 없습니다. 테스트 중에는 실제 자금이 있는 지갑을 절대 사용하지 마세요.
