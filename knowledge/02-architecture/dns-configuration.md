# DNS構成アーキテクチャ

## 概要

Club TRIAX のドメイン `triax.football` における DNS 構成と各サブドメインのサービス割り当てを文書化します。

## 現在のDNS構成（2025年8月26日時点）

### ドメイン構成図

```
triax.football
├── @ (apex)          → GitHub Pages (185.199.108-111.153)
├── www               → GitHub Pages (CNAME: triax.github.io)
├── hub               → Google App Engine (CNAME: ghs.googlehosted.com)
├── mvp               → Cloudflare Pages (CNAME: triax-mvp.pages.dev)
└── console           → Cloudflare Pages (CNAME: triax-console.pages.dev)
```

### 詳細なDNSレコード

| ホスト | タイプ | TTL | データ | サービス | 用途 |
|--------|--------|-----|--------|----------|------|
| @ | A | 4時間 | 185.199.108.153 | GitHub Pages | メインサイト |
| @ | A | 4時間 | 185.199.109.153 | GitHub Pages | メインサイト |
| @ | A | 4時間 | 185.199.110.153 | GitHub Pages | メインサイト |
| @ | A | 4時間 | 185.199.111.153 | GitHub Pages | メインサイト |
| @ | TXT | 4時間 | google-site-verification=... | - | Google検証用 |
| www | CNAME | 4時間 | triax.github.io | GitHub Pages | メインサイト |
| hub | CNAME | 4時間 | ghs.googlehosted.com | Google App Engine | アプリケーション |
| mvp | CNAME | 4時間 | triax-mvp.pages.dev | Cloudflare Pages | MVP版サイト |
| console | CNAME | 4時間 | triax-console.pages.dev | Cloudflare Pages | 管理コンソール |

## サービス別詳細

### GitHub Pages（メインサイト）

- **URL**: https://www.triax.football/
- **リポジトリ**: https://github.com/triax/homepage
- **デプロイ元**: `/docs` フォルダ
- **カスタムドメイン**: www.triax.football
- **SSL/TLS**: Let's Encrypt（GitHub自動発行）
- **特記事項**: 
  - プロジェクトリポジトリのため、カスタムドメイン設定により `/homepage/` パスは削除される
  - Apex domainとwwwサブドメインの両方を設定し、自動リダイレクト

### Google App Engine（hub）

- **URL**: https://hub.triax.football/
- **用途**: アプリケーションホスティング
- **管理**: Google Cloud Console
- **特記事項**: `ghs.googlehosted.com` は Google のホスティングサービス用エンドポイント

### Cloudflare Pages（mvp, console）

- **mvp URL**: https://mvp.triax.football/
- **console URL**: https://console.triax.football/
- **用途**: 
  - mvp: MVP版のウェブサイト
  - console: 管理用コンソール
- **管理**: Cloudflare Dashboard
- **特記事項**: Cloudflare の CDN とセキュリティ機能を活用

## DNS管理

### プロバイダー

- **ドメインレジストラ**: Squarespace Domains
- **DNS管理**: Squarespace DNS Manager
- **TTL設定**: 全レコード 4時間（14400秒）

### DNS伝播

- **TTL**: 4時間
- **推奨確認方法**:
  ```bash
  # ローカルDNS
  dig www.triax.football
  
  # パブリックDNS
  dig @8.8.8.8 www.triax.football  # Google
  dig @1.1.1.1 www.triax.football  # Cloudflare
  ```

## セキュリティ考慮事項

### DNSSEC

- 現在未実装
- 将来的な実装を推奨

### CAA レコード

- 現在未設定
- GitHub Pages用に設定する場合:
  ```
  @ CAA 0 issue "letsencrypt.org"
  ```

### TXTレコード

- Google Site Verification用のTXTレコードが存在
- Google Search ConsoleやGoogle App Engineの認証に使用
- セキュリティ上の問題はなし

## アーキテクチャ上の利点

1. **サービス分離**: 各サブドメインが独立したサービスを指す
2. **障害分離**: 一つのサービス障害が他に影響しない
3. **柔軟性**: サービスごとに最適なホスティングプラットフォームを選択
4. **スケーラビリティ**: 各サービスが独立してスケール可能
5. **管理の簡素化**: CNAMEレコードによる簡単な管理

## 移行履歴

### 2025年8月26日
- Apex domain を Squarespace Domain Forwarding から GitHub Pages へ移行
- 理由: www.triax.football の HTTPS 証明書発行のため
- 変更内容:
  - 削除: `@ A 198.49.23.145` (Squarespace)
  - 追加: GitHub Pages の4つのAレコード

## 監視とメンテナンス

### 定期確認項目

1. **SSL証明書の有効期限**
   - GitHub Pages: 自動更新
   - Google App Engine: Google管理
   - Cloudflare Pages: Cloudflare管理

2. **DNS解決の正常性**
   ```bash
   # 月次確認スクリプト例
   for domain in www hub mvp console; do
     echo "Checking $domain.triax.football"
     dig +short $domain.triax.football
   done
   ```

3. **サービス可用性**
   - 各エンドポイントのHTTPSステータス確認
   - レスポンスタイムの監視

## 今後の検討事項

1. **DNSSEC の導入**
   - DNS応答の改ざん防止
   - 信頼性の向上

2. **CDN の統一**
   - 現在: GitHub Pages（Fastly）、Cloudflare Pages混在
   - 検討: パフォーマンスと管理の観点から統一を検討

3. **監視システムの構築**
   - DNS解決の自動監視
   - SSL証明書期限の自動通知
   - サービス可用性の監視

## 関連ドキュメント

- [カスタムドメイン設定手順](../04-operations/custom-domain-setup.md)
- [カスタムドメインのトラブルシューティング](../05-troubleshooting/custom-domain-issues.md)
- [GitHub Pages公式ドキュメント](https://docs.github.com/en/pages)

## 更新履歴

- 2025-08-26: 初版作成 - 現在のDNS構成を文書化