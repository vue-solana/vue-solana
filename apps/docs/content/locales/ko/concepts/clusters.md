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
