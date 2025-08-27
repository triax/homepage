# GitHub Pages カスタムドメイン設定手順

## 概要

GitHub Pagesで `www.triax.football` カスタムドメインを設定するための完全な手順書です。

## 前提条件

- ドメイン管理権限（DNSレコードの編集権限）
- GitHubリポジトリの管理権限
- GitHub Pagesが有効になっていること（`/docs` フォルダからの公開）

## 設定手順

### 1. DNS設定（ドメインプロバイダー側）

#### 必須設定

**www サブドメイン用（CNAME レコード）:**
```
Host: www
Type: CNAME
Data: triax.github.io
TTL: 4 hrs
```

#### 推奨設定（apex domain も使用する場合）

**Apex domain用（A レコード）:**
以下4つすべてを設定：
```
Host: @
Type: A
Data: 185.199.108.153
TTL: 4 hrs

Host: @
Type: A
Data: 185.199.109.153
TTL: 4 hrs

Host: @
Type: A
Data: 185.199.110.153
TTL: 4 hrs

Host: @
Type: A
Data: 185.199.111.153
TTL: 4 hrs
```

### 2. CNAMEファイルの作成

リポジトリの `docs/CNAME` ファイルを作成：

```
www.triax.football
```

**重要な注意点:**
- ファイル名は大文字で `CNAME`（拡張子なし）
- 内容は1行のみ（改行文字も含めない）
- ドメイン名のみを記載（プロトコルやパスは含めない）

### 3. GitHubリポジトリ設定

1. リポジトリの Settings → Pages セクションへ移動
2. Source: Deploy from a branch
3. Branch: main / docs
4. Custom domain に `www.triax.football` を入力
5. Save をクリック

### 4. DNS検証とHTTPS有効化

1. DNS検証が完了するまで待機（通常5-10分）
2. 検証成功後、"Enforce HTTPS" オプションが表示される
3. "Enforce HTTPS" にチェックを入れる
4. HTTPS証明書の発行完了を待つ（最大24時間）

## DNS設定の確認方法

### digコマンドを使用した確認

```bash
# CNAMEレコードの確認
dig www.triax.football CNAME

# Aレコードの確認
dig triax.football A

# 簡潔な出力
dig +short www.triax.football CNAME
dig +short triax.football A

# 特定のDNSサーバーを使用
dig @8.8.8.8 www.triax.football  # Google DNS
dig @1.1.1.1 www.triax.football  # Cloudflare DNS
```

### 期待される出力

**CNAMEレコード:**
```
www.triax.football. → triax.github.io.
```

**Aレコード（apex domain設定時）:**
```
triax.football. → 185.199.108.153
triax.football. → 185.199.109.153
triax.football. → 185.199.110.153
triax.football. → 185.199.111.153
```

## HTTPS動作確認

```bash
# HTTPS接続テスト
curl -I https://www.triax.football

# HTTPからHTTPSへのリダイレクト確認
curl -I http://www.triax.football
```

## タイムライン

1. **DNS設定変更**: 即座
2. **DNS伝播**: 最大4時間（TTL設定による）
3. **GitHub DNS検証**: 5-10分
4. **HTTPS証明書発行**: 通常1時間以内（最大24時間）

## プロジェクトリポジトリ特有の注意事項

- ユーザー/組織サイトではなくプロジェクトリポジトリの場合
- カスタムドメイン設定後、`/homepage/` パスは自動的に削除される
- `https://triax.github.io/homepage/` → `https://www.triax.football/` へ変更

## 他のサブドメインへの影響

Apex domainのAレコード変更は、他のサブドメインには影響しません：
- `hub.triax.football` (Google App Engine) - 影響なし
- `mvp.triax.football` (Cloudflare Pages) - 影響なし
- `console.triax.football` (Cloudflare Pages) - 影響なし

## 関連ドキュメント

- [カスタムドメインのトラブルシューティング](../05-troubleshooting/custom-domain-issues.md)
- [DNS構成アーキテクチャ](../02-architecture/dns-configuration.md)
- [GitHub Pages公式ドキュメント](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

## 更新履歴

- 2025-08-26: 初版作成 - www.triax.football の設定手順を文書化