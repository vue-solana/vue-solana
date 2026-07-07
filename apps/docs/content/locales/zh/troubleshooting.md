---
title: 故障排查
description: 常见的安装、TypeScript、钱包、RPC 和 Nuxt 问题。
ogSection: 支持
surroundOrder: 4
---

使用本指南诊断 Vue Solana 在 Vue、Nuxt、TypeScript、钱包发现、RPC 调用和交易中的常见问题。先找到与你的应用匹配的错误消息或行为，再按顺序完成检查，之后再考虑提交 issue。

## TypeScript 无法解析 `@solana/web3-compat`

`@solana/web3-compat@0.0.21` 当前的 TypeScript 元数据有问题。运行时导入仍然使用真实包。当前 Vue Solana 包会发布临时的包内声明 shim，因此文档中的 `@vue-solana/core`、`@vue-solana/vue` 和 `@vue-solana/nuxt` 导入应当不需要消费端本地 shim 就能通过类型检查。

如果 TypeScript 仍然报告缺少声明，请先确认你正在使用当前版本的 Vue Solana 包，并且没有在应用代码中直接导入 `@solana/web3-compat`。对于较旧的 Vue Solana 版本或直接 `@solana/web3-compat` 导入，请在应用中添加 `types/web3-compat.d.ts`：

```ts
declare module "@solana/web3-compat" {
  export type {
    Commitment,
    RpcResponseAndContext,
    SendOptions,
    SignatureResult,
    TransactionSignature,
  } from "@solana/web3.js";
  export {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    VersionedTransaction,
  } from "@solana/web3.js";
}
```

确保你的 `tsconfig.json` 包含该文件：

```json
{
  "include": ["src/**/*.ts", "src/**/*.vue", "types/**/*.d.ts"]
}
```

在保留这个 workaround 前，请重新检查新的 `@solana/web3-compat` 版本。一旦上游发布有效的根声明，就应移除包内 shim。

## `Vue Solana plugin is not installed`

这表示客户端代码在没有安装插件的情况下尝试使用 Solana 连接或钱包操作。当前 composable 在 Nuxt 服务端渲染期间会返回惰性的 SSR 安全状态，但真实 RPC 和钱包操作仍然需要客户端插件上下文。

Vue 中：

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
  }),
);
```

Nuxt 中，注册模块：

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
});
```

Nuxt 模块会让 Vue Solana 插件仅在客户端运行。自动导入的 composable 可以在 SSR 期间调用，但请避免在服务端直接执行 RPC 或钱包工作。需要真实 Solana 连接时，请从客户端生命周期钩子或用户操作触发 RPC 读取。

## `No Solana wallet is configured`

尚未选择或手动配置钱包。调用 `connect()` 或发送交易前，请使用 `useWallets()` 或 `useSolanaWallets()` 选择一个已发现的钱包。

```ts
const { wallets, selectWallet } = useSolanaWallets();

selectWallet(wallets.value[0]);
```

RPC 读取和余额读取不需要钱包。

## 未检测到浏览器钱包

常见原因：

- 未安装 Solana 钱包扩展。
- 钱包扩展在当前浏览器配置中被禁用。
- 应用正在 SSR 或非浏览器环境中运行。
- 钱包未实现 Wallet Standard。

安装 Phantom、Solflare 或 Backpack 等钱包，然后在页面加载后调用 `refreshWallets()`。

## 未检测到 Mobile Wallet Adapter

Android Mobile Wallet Adapter Web 注册只在支持的 Android Chrome 移动 Web 和 Chrome PWA 运行时中可用。

常见原因：

- 应用运行在桌面、iOS、Firefox Android、Brave Android、Opera Android 或其他不支持的浏览器中。
- 未安装兼容的 Solana 移动钱包。
- Vue 插件或 Nuxt 模块传入了 `mobileWallet: false`。
- 钱包发现发生在 hydration 之前，或页面还不能访问 `window`。

请在 Android Chrome 中打开应用，安装兼容钱包，然后在页面加载后调用 `refreshWallets()`。

## iOS 钱包链接没有完成

iOS 钱包支持使用 Phantom、Solflare 和 Backpack universal link。批准后，钱包应用会重定向回你的应用 URL。

常见原因：

- 应用没有运行在 iOS 浏览器中。
- 设备上没有安装 Phantom、Solflare 或 Backpack。
- Vue 插件或 Nuxt 模块传入了 `iosWallet: false`。
- 配置的 `redirectUrl` 没有返回到会刷新钱包状态的同一个应用页面。
- 钱包刷新或回调处理只在 SSR 期间运行，而不是在客户端运行。

请把 iOS 钱包工作保持在客户端，确保重定向 URL 会再次加载应用，并在重定向页面加载后调用 `refreshWallets()`。Vue 插件会在钱包刷新期间处理 iOS 回调；直接使用 core helper 的应用应先调用 `handleSolanaIosWalletCallback()`，再依赖返回的连接。

## `Solana wallet is not connected`

交易 helper 在钱包报告 `connected: true` 且 `publicKey` 非空之前被调用了。

请先调用 `connect()`，或在发送前检查 `connected.value`。

## 本地开发中刷新后钱包看起来已连接

选择已发现的钱包不应把它标记为已连接。即使浏览器扩展暴露了之前授权的账户，`connected` 也只应在 `connect()` 成功后变为 true。

如果本地 Vue 或 Nuxt 示例在刷新后仍然立即显示已连接，请重新构建工作区包并完全重启开发服务器，让 Vite/Nuxt 丢弃过期的包输出：

```sh
pnpm build:packages
pnpm dev:vue
```

Nuxt 请在重新构建包后使用 `pnpm dev:nuxt`。

## `Solana wallet does not support signTransaction`

配置的钱包没有暴露 `signAndSendTransaction` 或 `signTransaction`。请使用支持所选 Solana chain 交易签名的钱包。

## 钱包交易没有返回结果

当钱包适配器开始移动端 handoff 但浏览器 promise 从未 settle 时，可能会出现这种情况。Vue Solana 会清除 `loading` 并设置 `error`，而不是让应用卡在发送状态。如果钱包在响应丢失前已经提交交易，交易仍可能成功，因此重试前请检查钱包活动或 Solana explorer。

当 Android Mobile Wallet Adapter 钱包支持 `signTransaction` 时，Vue Solana 优先使用钱包签名加应用侧 RPC 提交。这可以避免钱包发送成功但浏览器页面没有收到适配器返回签名的常见情况。

## `Buffer is not defined`

某些 `@solana/web3-compat` 交易路径仍然期望 Node 兼容的 `Buffer` 全局变量。在浏览器 Vue 应用中，请在创建或序列化交易前初始化 Vue 包的 Buffer polyfill。Nuxt 应用使用 `@vue-solana/nuxt/buffer-polyfill`。

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

该 helper 由框架包提供，因此应用不需要为了 Vue Solana 交易示例直接安装或导入 `buffer`。

## Module `buffer` Has Been Externalized

如果控制台显示 `Module "buffer" has been externalized for browser compatibility`，请把应用中直接从 `buffer` 的导入替换为来自 `@vue-solana/vue/buffer-polyfill` 或 `@vue-solana/nuxt/buffer-polyfill` 的 `installSolanaBufferPolyfill()`，然后重启开发服务器。Vite 可能缓存了之前优化过的依赖。

## 余额读取失败

常见原因：

- 地址字符串不是有效的 Solana public key。
- RPC endpoint 不可用或被限流。
- 钱包地址所在 cluster 与配置的 RPC endpoint 不一致。

请使用 `useRpc()` 或 `useSolanaRpc()` 检查配置的 cluster 和 endpoint。

## Nuxt 自动导入缺失

确保 `@vue-solana/nuxt` 已列在 `modules` 中，并在安装包后重启 Nuxt 开发服务器。

如果 TypeScript 仍然无法识别自动导入，请重新生成 Nuxt 类型：

```sh
npx nuxi prepare
```
