# Google Drive 画像表示問題の解決策

## 問題
- Google Driveの画像URLが403エラーを返す
- CORS制限により、ブラウザから直接アクセスできない
- シークレットブラウザでは表示可能（リファラー制限の可能性）

## 解決策

### 1. 即時対応（推奨）
画像をGitHubリポジトリに直接保存する方法：

```bash
# 画像保存用ディレクトリを作成
mkdir -p docs/assets/members

# Google Driveから画像をダウンロード（例）
curl -L "https://drive.google.com/uc?export=download&id=1RkyEPOq0CELzOCIICoanFWrFYnWD_bZ5" -o docs/assets/members/member_1.jpg
```

### 2. 画像プロキシサービスの利用
無料の画像プロキシサービスを使用：

```javascript
// 例：wsrv.nl（無料の画像プロキシ）
function convertToProxyUrl(originalUrl) {
    return `https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}`;
}
```

### 3. Cloudflare Workers（無料枠あり）
カスタムプロキシを作成：

```javascript
// Cloudflare Worker スクリプト例
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const imageUrl = url.searchParams.get('url')

  if (!imageUrl) {
    return new Response('URL parameter required', { status: 400 })
  }

  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)'
    }
  })

  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.delete('x-frame-options')

  return new Response(response.body, {
    status: response.status,
    headers
  })
}
```

### 4. GitHub Actions による自動化
定期的に画像を取得してリポジトリに保存：

```yaml
name: Sync Member Images

on:
  schedule:
    - cron: '0 0 * * *'  # 毎日実行
  workflow_dispatch:

jobs:
  sync-images:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Fetch roster data
        run: |
          curl -s https://raw.githubusercontent.com/triax/roster-api/refs/heads/main/data/roster.json -o roster.json

      - name: Download images
        run: |
          # スクリプトで画像をダウンロード
          python scripts/download_images.py

      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/assets/members/
          git commit -m "Update member images" || exit 0
          git push
```

## 推奨アプローチ

短期的には**解決策2（画像プロキシサービス）**を使用し、長期的には**解決策4（GitHub Actions）**で自動化することを推奨します。