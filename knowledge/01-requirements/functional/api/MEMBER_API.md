
# MEMBER_API.md

メンバー情報の取得と表示に関するAPI仕様を定義する。

---

## エンドポイント

```
https://raw.githubusercontent.com/triax/roster-api/refs/heads/main/data/roster.json
```

---

## レスポンス形式

### Expected Response JSON

```json
{
  "version": "1.0",
  "updated_at": "2025-08-03T16:22:09.842Z",
  "members": [
    {
      "timestamp": "2025-08-01T00:38:53.000Z",
      "name": {
        "default": "恩地　遼",
        "hiragana": "おんち　りょう",
        "alphabet": "Ryo Onchi"
      },
      "position": "QB",
      "jersey": 1,
      "next_introduction": "7月から復帰してきたエースRB！秋シーズンは暴れてくれるでしょう！",
      "role": "QBパートリーダー",
      "photos": {
        "serious": "https://drive.usercontent.google.com/download?id=1RkyEPOq0CELzOCIICoanFWrFYnWD_bZ5&export=view",
        "casual": [
          "https://drive.usercontent.google.com/download?id=1peoJ3_pSss3ydbSI3Kh0Env0AwuL4FEC&export=view"
        ]
      },
      "university": "横浜国立大学",
      "enthusiasm": "チームに貢献できるよう頑張ります！",
      "watchme": "ホルダー",
      "hobbies": "野球観戦",
      "favorite": "松尾 汐恩(横浜DeNAベイスターズ)",
      "gifts": "なんでも嬉しいです！",
      "what_i_like_about_triax": "おじさんでも優しく受け入れてくれるところ"
    }
  ]
}
```

---

## データ型定義

### Roster Response

| フィールド | 型 | 必須 | 説明 |
|----------|---|-----|------|
| version | string | ✓ | APIバージョン |
| updated_at | string (ISO 8601) | ✓ | 最終更新日時 |
| members | Member[] | ✓ | メンバー配列 |

### Member

| フィールド | 型 | 必須 | 説明 |
|----------|---|-----|------|
| timestamp | string (ISO 8601) | ✓ | メンバー情報更新日時 |
| name | Name | ✓ | 名前情報 |
| position | string | ✓ | ポジション (QB/RB/WR/TE/OL/DL/LB/DB/K/P) |
| jersey | number | ✓ | 背番号 |
| next_introduction | string | | 次のメンバー紹介文 |
| role | string | | チーム内の役割・役職 |
| photos | Photos | ✓ | 写真URL |
| university | string | | 出身大学 |
| enthusiasm | string | | 意気込み |
| watchme | string | | 注目ポイント |
| hobbies | string | | 趣味 |
| favorite | string | | お気に入り・推し |
| gifts | string | | 欲しいプレゼント |
| what_i_like_about_triax | string | | TRIAXの好きなところ |

### Name

| フィールド | 型 | 必須 | 説明 |
|----------|---|-----|------|
| default | string | ✓ | 標準表記（漢字） |
| hiragana | string | | ひらがな表記 |
| alphabet | string | | アルファベット表記 |

### Photos

| フィールド | 型 | 必須 | 説明 |
|----------|---|-----|------|
| serious | string | ✓ | 真面目な写真のURL |
| casual | string[] | | カジュアル写真のURL配列 |

---

## 使用例

### データ取得

```javascript
async function fetchRoster() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/triax/roster-api/refs/heads/main/data/roster.json');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch roster:', error);
    return null;
  }
}
```

### メンバー表示

```javascript
function displayMembers(data) {
  const container = document.getElementById('members-container');

  data.members.forEach(member => {
    const card = createMemberCard(member);
    container.appendChild(card);
  });
}

function createMemberCard(member) {
  const card = document.createElement('div');
  card.className = 'member-card';
  card.innerHTML = `
    <img src="${member.photos.serious}" alt="${member.name.default}" loading="lazy">
    <h3>${member.name.default}</h3>
    <p class="number">#${member.jersey}</p>
    <p class="position">${member.position}</p>
    ${member.role ? `<p class="role">${member.role}</p>` : ''}
  `;
  return card;
}
```

### ポジション別フィルタリング

```javascript
function filterByPosition(members, position) {
  if (!position || position === 'ALL') return members;

  return members.filter(member => member.position === position);
}

// ポジション別にグループ化
function groupByPosition(members) {
  return members.reduce((groups, member) => {
    const position = member.position;
    if (!groups[position]) groups[position] = [];
    groups[position].push(member);
    return groups;
  }, {});
}
```

---

## エラーハンドリング

### 想定されるエラー

1. **ネットワークエラー**: API接続失敗
2. **JSONパースエラー**: 不正なレスポンス形式
3. **データ欠損**: 必須フィールドの欠如

### エラー時の表示

```javascript
function showErrorMessage() {
  const container = document.getElementById('members-container');
  container.innerHTML = `
    <div class="error-message">
      <p>メンバー情報の取得に失敗しました。</p>
      <button onclick="retryFetch()">再試行</button>
    </div>
  `;
}
```

---

## キャッシュ戦略

- ブラウザキャッシュを活用（Cache-Control: max-age=3600）
- localStorage に一時保存（オフライン対応）
- 更新日時での差分チェック

```javascript
const CACHE_KEY = 'triax_roster_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1時間

function getCachedRoster() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_DURATION) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }

  return data;
}

function setCachedRoster(data) {
  const cacheData = {
    data: data,
    timestamp: Date.now()
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
}

// 使用例
async function getRosterWithCache() {
  // キャッシュチェック
  const cached = getCachedRoster();
  if (cached) return cached;

  // APIから取得
  const data = await fetchRoster();
  if (data) {
    setCachedRoster(data);
  }
  return data;
}
```

---

## 注意事項

1. **画像URL**: Google Driveの画像URLは直接アクセス可能な形式で提供されています
2. **背番号**: `jersey`フィールドは数値型です（文字列ではありません）
3. **ポジション**: 単一の文字列として提供されます（オブジェクトではありません）
4. **オプションフィールド**: 多くのフィールドは任意で、メンバーによって値が空の場合があります