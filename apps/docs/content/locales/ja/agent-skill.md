---
title: Agent Skill
description: AI コーディングエージェント向けの Vue Solana Agent Skill をインストールします。
ogSection: ツール
surroundOrder: 3
---

Vue Solana は、Agent Skills 形式をサポートする AI コーディングエージェント向けに、インストール可能な Agent Skill を提供しています。このスキルは、Vue Solana のセットアップパターン、パッケージ選択のルール、ウォレットフローの指針、Nuxt SSR の注意点、トランザクションの落とし穴、検証コマンドをエージェントに与えます。

次のようなアプリの構築、デバッグ、レビュー、ドキュメント作成をエージェントに依頼するときに使用してください:

- `@vue-solana/core`
- `@vue-solana/vue`
- `@vue-solana/nuxt`
- Vue または Nuxt アプリでの `@vue-solana/*/kit` プリミティブ

## インストール

Skills CLI を使って GitHub リポジトリからインストールします:

```sh
# Install all skills
npx skills add vue-solana/vue-solana

# Install the Vue Solana skill
npx skills add vue-solana/vue-solana --skill vue-solana

# List available skills
npx skills add vue-solana/vue-solana --list

# Install globally
npx skills add vue-solana/vue-solana --global
```

CLI は、インストール時に選択したエージェントのスキルディレクトリへスキルを配置します。Claude の場合は現在のプロジェクトの `.claude/skills/`、`--global` を指定した場合は `~/.claude/skills/` です。

## スキルが扱う内容

- `@vue-solana/core`、`@vue-solana/vue`、`@vue-solana/vue/kit`、`@vue-solana/nuxt`、`@vue-solana/nuxt/kit` をいつ使うか。
- Vue プラグインのセットアップと、推奨されるコンポーザブルの直接 import。
- Nuxt モジュールのセットアップと自動 import されるコンポーザブル。
- `useWallets()` と `useWallet()` による統一的なウォレット検出と接続。
- ブラウザ拡張ウォレット、Android Mobile Wallet Adapter のサポート、iOS ブラウザウォレットのサポート、および現状のデスクトップネイティブウォレットの制限。
- RPC、残高、トランザクション、トークンアカウントのヘルパーの使い方。
- トランザクションを扱うコードのための `installSolanaBufferPolyfill()` ブラウザポリフィルの指針。
- Vue Solana 自体を変更する際のリポジトリの検証コマンド。

## ソース

スキルのソースは [`skills/vue-solana/SKILL.md`](https://github.com/vue-solana/vue-solana/blob/main/skills/vue-solana/SKILL.md) です。
