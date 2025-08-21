COMMON_SPEC.md

本書は Club TRIAX ホームページ制作における「共通仕様（デザイン／実装ルール）」を定義する。

⸻

🎨 カラーパレット仕様

種別	カラーコード	用途例
Primary Color	#853734	ロゴ、強調テキスト、ボタンのアクティブカラーなど
Secondary Color	#1F1F1F	ヘッダー・フッター背景、見出しテキスト、セクション背景など
Base White	#F5F5F5	ページの背景、コンテンツエリア、セクション区切り、余白など

⸻

🖋 フォント仕様

font-family: "Meiryo", "Arial", sans-serif;

	•	日本語：Meiryo
	•	英語：Arial
	•	Web標準フォントのみ使用（パフォーマンスと互換性を優先）

⸻

🧭 レイアウトとレスポンシブ方針
	•	モバイルファースト設計（最小幅: 375px）
	•	Tailwind CSS 最新版（CDN）を利用
	•	ブレークポイント例：
	•	sm: 640px
	•	md: 768px
	•	lg: 1024px
	•	レスポンシブデザインは必須（画面幅に応じてメニューやレイアウトを調整）
	•	パララックス効果：要所で活用可能。過剰使用は避ける。

⸻

🖼 画像仕様
	•	フォーマット：jpg, png, webp, svg 等を混在して利用可
	•	命名：英語・スネークケース、意味のある名前（例: member_tanaka.jpg）
	•	img タグの loading 属性方針：
	•	ファーストビューの画像のみ loading="eager"
	•	その他の画像はすべて loading="lazy" を指定
	•	width / height 属性の明示、または CSS によるサイズ制御を行うこと

⸻

🔗 使用ライブラリ／スクリプト
	•	Tailwind CSS（最新版をCDN経由で読み込み）
	•	jQuery（最新版をCDN経由で読み込み）

⸻

📁 ホスティングとビルド
	•	GitHub Pages にてホスティング予定
	•	静的HTMLをベースとし、必要に応じてJSによるインタラクションを追加

⸻
