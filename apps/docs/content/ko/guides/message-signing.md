---
title: 메시지 서명
description: 트랜잭션을 보내지 않고 지갑 소유권을 증명하는 메시지 서명 흐름입니다.
ogSection: 가이드
surroundOrder: 12
---

메시지 서명은 지갑이 특정 공개 키를 제어한다는 것을 증명하는 데 사용할 수 있습니다. 트랜잭션을 제출하지 않으며 SOL 잔액을 변경하지 않습니다.

## Vue에서 사용

```ts
const { signMessage, signature, signedMessage, loading, error } = useSignMessage();

await signMessage("Sign in to Vue Solana on devnet");
```

## Nuxt에서 사용

```ts
const { signMessage, signature, signedMessage } = useSolanaSignMessage();
```

## 좋은 challenge 메시지

서버 인증에 사용할 메시지는 다음을 포함해야 합니다.

- 앱 또는 도메인 이름.
- nonce.
- 만료 시간.
- 공개 키.
- 의도 설명.

예:

```txt
Sign in to example.com
Wallet: <public-key>
Nonce: <random-nonce>
Expires: <timestamp>
```

## 검증 경계

클라이언트에서 서명을 받는 것만으로 인증이 끝나지 않습니다. 서버 또는 신뢰할 수 있는 경계에서 메시지, 공개 키, 서명, nonce, 만료 시간을 검증해야 합니다.

## 오류와 unsupported 지갑

모든 지갑이 메시지 서명을 지원하는 것은 아닙니다. `signMessage` capability가 없는 경우 UI에서 기능을 비활성화하고 사용자에게 안내하세요.

## 안전 메모

- 사용자가 이해할 수 없는 임의 bytes에 서명하게 하지 마세요.
- 재사용 가능한 메시지를 인증에 사용하지 마세요.
- 트랜잭션 서명과 메시지 서명을 혼동하지 마세요.
