# SEO対策 — 実装済み & デプロイ後TODO

## 実装済み（コード側）

- [x] メタデータ（title / description / keywords） — 全主要ページ
- [x] Open Graph / Twitter Cards — ルートlayout + 動的OG画像生成
- [x] JSON-LD構造化データ — Organization / Service / FAQPage
- [x] sitemap.xml — 12ページ、priority・changeFrequency付き
- [x] robots.txt — `/app/`・`/api/` disallow、sitemap参照
- [x] canonical URL — `https://gia2018.com` ベース
- [x] 見出し階層 — h1→h2→h3 正しい階層
- [x] 画像alt属性 — 空altなし
- [x] lang属性 — `<html lang="ja">`
- [x] 動画preload — `preload="auto"` でLCP対策
- [x] contactページmeta — title / description / canonical

## デプロイ後にやること

- [ ] **Google Search Console に登録**
  - サイトの所有権を確認（DNS TXTレコード or HTMLファイル）
  - `https://gia2018.com` をプロパティとして追加
- [ ] **sitemap を送信**
  - Search Console → サイトマップ → `https://gia2018.com/sitemap.xml` を送信
- [ ] **インデックス登録をリクエスト**
  - Search Console → URL検査 → トップページのURLを入力 → 「インデックス登録をリクエスト」
- [ ] **Lighthouse で Core Web Vitals を計測**
  - Chrome DevTools → Lighthouse タブ → モバイル/デスクトップ両方
  - LCP / FID / CLS の数値を確認し、必要なら最適化
- [ ] **OGP表示確認**
  - https://developers.facebook.com/tools/debug/ でOG画像・タイトル確認
  - https://cards-dev.twitter.com/validator でTwitter Card確認

## 将来対応（優先度低）

- [ ] hero動画のposter画像を追加（動画初期フレームから切り出し → `/public/images/hero-poster.jpg`）
- [ ] 各サブページに個別OG画像を追加
- [ ] Aboutセクションの代表者名を入れる（現在空欄）
- [ ] 実績に数値成果を追加（クライアントデータがあれば）
- [ ] クライアントの声（テスティモニアル）を追加
- [ ] Google Analytics / Tag Manager の設置
- [ ] Bing Webmaster Tools への登録
