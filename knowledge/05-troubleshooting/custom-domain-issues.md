# GitHub Pages カスタムドメイン トラブルシューティング

## よくあるエラーと解決方法

### 1. InvalidCNAMEError

#### エラーメッセージ
```
Both www.triax.football and its alternate name are improperly configured
Your site's DNS settings are using a custom subdomain, www.triax.football, 
that is not set up with a correct CNAME record. We recommend you change this 
to a CNAME record pointing to triax.github.io.
```

#### 原因
- Apex domain（triax.football）が GitHub Pages 以外のサービスを指している
- GitHubは www サブドメインとapex domain の両方をチェックする
- 片方でも正しく設定されていないとエラーになる

#### 解決方法

**ケース1: Squarespaceドメインフォワーディングとの競合**

問題の確認:
```bash
dig triax.football A
# 出力例: 198.49.23.145 (Squarespace)
```

解決策:
1. SquarespaceのAレコードを削除
2. GitHub Pages用のAレコードを4つ追加:
   - 185.199.108.153
   - 185.199.109.153
   - 185.199.110.153
   - 185.199.111.153

**ケース2: CNAMEファイルが存在しない**

確認:
```bash
ls docs/CNAME
```

解決策:
```bash
echo "www.triax.football" > docs/CNAME
git add docs/CNAME
git commit -m "カスタムドメイン設定用CNAMEファイルを追加"
git push
```

### 2. HTTPS が利用できない

#### エラーメッセージ
```
Enforce HTTPS — Unavailable for your site because your domain is not properly 
configured to support HTTPS (www.triax.football)
```

#### 原因と解決方法

**原因1: DNS設定が不完全**
- Apex domainのAレコードが正しくない
- DNS伝播が完了していない

確認方法:
```bash
# 複数のDNSサーバーで確認
dig @8.8.8.8 www.triax.football
dig @1.1.1.1 triax.football A
```

**原因2: GitHub側の処理待ち**
- DNS設定は正しいが、証明書発行プロセスが未完了
- 解決策: 最大24時間待つ

**原因3: キャッシュの問題**

解決策:
1. GitHub Pages設定でCustom domainを削除
2. Saveをクリック
3. 1-2分待つ
4. 再度Custom domainに `www.triax.football` を入力
5. Saveをクリック

### 3. DNS伝播の確認

#### ローカルDNSキャッシュのクリア

**macOS:**
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Linux:**
```bash
sudo systemctl restart systemd-resolved
# または
sudo service nscd restart
```

#### DNS伝播状況の確認

```bash
# TTL（Time To Live）の確認
dig www.triax.football | grep -A1 "ANSWER SECTION"

# 出力例:
# www.triax.football. 3600 IN CNAME triax.github.io.
# → 3600秒（1時間）のTTL
```

TTLの値が減っていけば、キャッシュされている証拠です。

### 4. デバッグ用コマンド集

#### DNS設定の総合確認
```bash
# 基本情報
dig www.triax.football

# CNAMEレコードのみ
dig +short www.triax.football CNAME

# Aレコードのみ
dig +short triax.football A

# 権威DNSサーバーから直接確認
dig +trace www.triax.football

# すべてのレコードタイプ
dig www.triax.football ANY
```

#### 接続テスト
```bash
# HTTP接続
curl -I http://www.triax.football

# HTTPS接続（証明書発行後）
curl -I https://www.triax.football

# リダイレクトチェーン全体
curl -IL http://triax.football
```

#### SSL証明書の確認
```bash
# 証明書の詳細確認
openssl s_client -connect www.triax.football:443 -servername www.triax.football

# 証明書の有効期限確認
echo | openssl s_client -connect www.triax.football:443 2>/dev/null | openssl x509 -noout -dates
```

### 5. タイムアウト目安

| プロセス | 通常 | 最大 |
|---------|------|------|
| DNS伝播 | 5-30分 | 4時間（TTL依存） |
| GitHub DNS検証 | 5-10分 | 1時間 |
| HTTPS証明書発行 | 15分-1時間 | 24時間 |
| エラー後の再試行 | 5分 | - |

### 6. チェックリスト

DNS設定が正しくない場合のトラブルシューティングチェックリスト：

- [ ] CNAMEファイルが `docs/CNAME` に存在する
- [ ] CNAMEファイルの内容が正しい（`www.triax.football`）
- [ ] www サブドメインのCNAMEレコードが `triax.github.io` を指している
- [ ] Apex domainのAレコードが4つとも正しい（GitHub PagesのIP）
- [ ] 他のサービス（Squarespace等）のAレコードが残っていない
- [ ] DNS伝播が完了している（複数のDNSサーバーで確認）
- [ ] GitHub Pages設定でCustom domainが設定されている
- [ ] 最後の変更から十分な時間が経過している

### 7. よくある質問

**Q: 他のサブドメイン（hub, mvp, console）への影響は？**
A: ありません。各サブドメインは独立したCNAMEレコードで管理されています。

**Q: TXTレコード（google-site-verification）は削除すべき？**
A: GitHub PagesのHTTPS化には影響しません。Google Search Consoleを使用している場合は残してください。

**Q: どのくらい待てば良い？**
A: DNS設定後、通常1時間以内にHTTPSが利用可能になります。24時間経っても解決しない場合は、設定に問題がある可能性があります。

## 関連ドキュメント

- [カスタムドメイン設定手順](../04-operations/custom-domain-setup.md)
- [DNS構成アーキテクチャ](../02-architecture/dns-configuration.md)
- [GitHub Pages公式トラブルシューティング](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)

## 更新履歴

- 2025-08-26: 初版作成 - InvalidCNAMEError とHTTPS設定問題の解決方法を文書化